import {
  writeFileSync,
  mkdirSync,
  statSync,
  existsSync,
  readdirSync,
} from "fs";
import { dirname, join } from "path";
import https from "https";

interface FileNode {
  name: string;
  type: "file" | "directory" | "lambda";
  link?: string;
  children?: FileNode[];
}

interface DownloadCallbacks {
  onStatus: (msg: string) => void;
  onFileStart: (name: string, total: number) => void;
  onFileDone: (
    kind: "downloaded" | "skipped" | "failed",
    path: string
  ) => void;
  onProgress: (
    downloaded: number,
    skipped: number,
    failed: number,
    current: string
  ) => void;
  onDone: (stats: DownloadStats) => void;
  onError: (msg: string) => void;
}

export interface DownloadStats {
  totalFiles: number;
  downloaded: number;
  skipped: number;
  failed: number;
  totalSize: number;
  extensions: Record<string, number>;
  treeLines: string[];
  outputDir: string;
  failedFiles: string[];
  deploymentId: string;
  deploymentUrl: string;
  projectName: string;
}

interface TreeStructure {
  [key: string]: TreeStructure | null;
}

function makeRequest<T>(url: string, token: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { Authorization: `Bearer ${token}` } }, (res) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${data.slice(0, 200)}`));
          }
        });
      })
      .on("error", reject);
  });
}

function resolveFileUrl(
  link: string,
  deploymentId: string,
  teamId: string
): string | null {
  const hashMatch = link.match(/\/files\/([a-f0-9]+)$/);
  if (hashMatch) {
    let url = `https://vercel.com/api/v7/deployments/${deploymentId}/files/${hashMatch[1]}`;
    if (teamId) url += `?teamId=${teamId}`;
    return url;
  }
  if (link.startsWith("http")) {
    const u = new URL(link);
    if (teamId && !u.searchParams.has("teamId")) u.searchParams.set("teamId", teamId);
    return u.toString();
  }
  if (link.startsWith("/")) {
    const u = new URL(link, "https://vercel.com");
    if (teamId && !u.searchParams.has("teamId")) u.searchParams.set("teamId", teamId);
    return u.toString();
  }
  return null;
}

function downloadFileContent(
  fileUrl: string,
  token: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https
      .get(fileUrl, { headers: { Authorization: `Bearer ${token}` } }, (res) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error.message || JSON.stringify(json.error)));
              return;
            }
            if (!json.data) {
              reject(new Error(`Unexpected response (no data field)`));
              return;
            }
            resolve(Buffer.from(json.data, "base64"));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function generateTree(filePaths: string[], baseDir: string): string[] {
  const tree: string[] = [];
  const structure: TreeStructure = {};

  filePaths.forEach((fp) => {
    const rel = fp.replace(baseDir + "/", "");
    const parts = rel.split("/");
    let cur: TreeStructure = structure;
    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        cur[part] = null;
      } else {
        if (!cur[part]) cur[part] = {};
        cur = cur[part]!;
      }
    });
  });

  const build = (obj: TreeStructure, prefix = "") => {
    const entries = Object.entries(obj).sort(([a], [b]) => {
      const aDir = obj[a] !== null;
      const bDir = obj[b] !== null;
      if (aDir && !bDir) return -1;
      if (!aDir && bDir) return 1;
      return a.localeCompare(b);
    });
    entries.forEach(([key, value], idx) => {
      const last = idx === entries.length - 1;
      const conn = last ? "└── " : "├── ";
      const icon = value === null ? "📄 " : "📁 ";
      tree.push(prefix + conn + icon + key);
      if (value !== null) {
        build(value, prefix + (last ? "    " : "│   "));
      }
    });
  };

  build(structure);
  return tree;
}

export async function runDownload(
  token: string,
  deploymentInput: string,
  outputDir: string,
  callbacks: DownloadCallbacks
): Promise<void> {
  const { onStatus, onFileStart, onFileDone, onProgress, onDone, onError } =
    callbacks;

  const downloadedFiles: string[] = [];
  const skippedFiles: string[] = [];
  const failedFiles: string[] = [];

  try {
    let deploymentId = "";
    let deploymentUrl = "";
    let projectName = "";
    let teamId = "";

    const parseDashboardUrl = (input: string) => {
      const m = input.match(/vercel\.com\/([^/]+)\/([^/]+)\/([a-zA-Z0-9]+)/);
      if (m) return { scope: m[1], project: m[2], buildId: m[3] };
      return null;
    };

    const resolveTeams = async () => {
      const r = await makeRequest<Record<string, unknown>>(
        "https://api.vercel.com/v2/teams",
        token
      );
      return (r.teams || []) as Array<{ id: string; slug: string; name: string }>;
    };

    const getLatestDeployment = async (
      t: string,
      proj?: string,
      tid?: string
    ) => {
      let url = "https://api.vercel.com/v6/deployments?limit=100";
      if (tid) url += `&teamId=${tid}`;
      const r = await makeRequest<{ deployments: any[] }>(url, t);
      if (!r.deployments?.length) throw new Error("No deployments found");
      let deps = r.deployments;
      if (proj) {
        deps = deps.filter((d) => d.name === proj);
        if (!deps.length) throw new Error(`No deployments for project: ${proj}`);
      }
      deps = deps.filter((d) => d.state === "READY");
      if (!deps.length) throw new Error("No ready deployments found");
      deps.sort((a, b) => b.created - a.created);
      return {
        deploymentId: deps[0].uid,
        deploymentUrl: deps[0].url,
        projectName: deps[0].name,
        teamId: tid || "",
      };
    };

    const fetchDeployment = async (id: string, tid?: string) => {
      let url = `https://api.vercel.com/v13/deployments/${id}`;
      if (tid) url += `?teamId=${tid}`;
      return makeRequest<Record<string, unknown>>(url, token);
    };

    if (deploymentInput === "latest" || !deploymentInput) {
      onStatus("resolving latest deployment...");
      try {
        const info = await getLatestDeployment(token);
        deploymentId = info.deploymentId;
        deploymentUrl = info.deploymentUrl;
        projectName = info.projectName;
        teamId = info.teamId;
      } catch {
        const teams = await resolveTeams();
        let found = false;
        for (const team of teams) {
          try {
            const info = await getLatestDeployment(token, undefined, team.id);
            deploymentId = info.deploymentId;
            deploymentUrl = info.deploymentUrl;
            projectName = info.projectName;
            teamId = team.id;
            found = true;
            break;
          } catch {
            continue;
          }
        }
        if (!found) throw new Error("No deployments found in any scope");
      }
    } else {
      const dashInfo = parseDashboardUrl(deploymentInput);
      let buildId = dashInfo?.buildId || deploymentInput;
      if (!dashInfo && !buildId.startsWith("dpl_")) {
        onStatus("resolving teams...");
      }

      const idsToTry = [buildId];
      if (!buildId.startsWith("dpl_")) idsToTry.push(`dpl_${buildId}`);

      const teamScopes: Array<{ id: string; label: string }> = [{ id: "", label: "personal account" }];
      const teams = await resolveTeams();

      if (dashInfo) {
        const scopeTeam = teams.find((t) => t.slug === dashInfo.scope);
        if (scopeTeam) teamScopes.push({ id: scopeTeam.id, label: scopeTeam.name });
        for (const t of teams) {
          if (t.slug !== dashInfo.scope) teamScopes.push({ id: t.id, label: t.name });
        }
      } else {
        for (const t of teams) teamScopes.push({ id: t.id, label: t.name });
      }

      let found = false;
      let deploymentInfo: Record<string, unknown> | null = null;

      for (const scope of teamScopes) {
        if (found) break;
        for (const id of idsToTry) {
          const result = await fetchDeployment(id, scope.id || undefined);
          if (!(result as any).error) {
            deploymentInfo = result;
            deploymentId = id;
            teamId = scope.id;
            found = true;
            break;
          }
        }
      }

      if (!found || !deploymentInfo) {
        throw new Error(
          `Deployment "${buildId}" not found across ${teamScopes.length} scope(s).`
        );
      }

      deploymentUrl = (deploymentInfo.url as string) || "";
      projectName = (deploymentInfo.name as string) || "";
    }

    onStatus(`deployment: ${deploymentId}`);
    onStatus(`url: ${deploymentUrl}`);
    onStatus(`project: ${projectName}`);

    onStatus("fetching file tree...");

    let treeUrl = `https://vercel.com/api/file-tree/${deploymentUrl}?base=src`;
    if (teamId) treeUrl += `&teamId=${teamId}`;

    const fileTreeResponse = await makeRequest<FileNode[] | Record<string, unknown>>(
      treeUrl,
      token
    );

    if (!Array.isArray(fileTreeResponse)) {
      throw new Error("File tree API did not return an array");
    }

    const fileTree: FileNode[] = fileTreeResponse;

    const getDirectoryTree = async (dirName: string): Promise<FileNode[]> => {
      let url = `https://vercel.com/api/file-tree/${deploymentUrl}?base=src/${dirName}`;
      if (teamId) url += `&teamId=${teamId}`;
      return new Promise((resolve, reject) => {
        https
          .get(url, { headers: { Authorization: `Bearer ${token}` } }, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            });
          })
          .on("error", reject);
      });
    };

    const basePath = outputDir;
    let totalDiscovered = 0;

    const countNodes = (nodes: FileNode[]): number => {
      let c = 0;
      for (const n of nodes) {
        if (n.type === "file") c++;
        if (n.type === "directory" && n.children) c += countNodes(n.children);
      }
      return c;
    };

    totalDiscovered = countNodes(fileTree);
    onFileStart("connecting...", totalDiscovered);

    const processNode = async (
      node: FileNode,
      curPath: string = "",
      relPath: string = ""
    ): Promise<void> => {
      const fullPath = join(curPath, node.name);
      const relativeFilePath = relPath ? `${relPath}/${node.name}` : node.name;

      if (node.type === "directory") {
        mkdirSync(fullPath, { recursive: true });
        let children = node.children;
        if (!children) {
          try {
            children = await getDirectoryTree(relativeFilePath);
            node.children = children;
          } catch {
            return;
          }
        }
        if (children && Array.isArray(children)) {
          for (const child of children) {
            await processNode(child, fullPath, relativeFilePath);
          }
        }
      } else if (node.type === "file" && node.link) {
        try {
          const fileUrl = resolveFileUrl(node.link, deploymentId, teamId);
          if (!fileUrl) return;

          if (existsSync(fullPath)) {
            const stats = statSync(fullPath);
            if (stats.size > 0) {
              skippedFiles.push(fullPath);
              onFileDone("skipped", relativeFilePath);
              onProgress(
                downloadedFiles.length,
                skippedFiles.length,
                failedFiles.length,
                relativeFilePath
              );
              return;
            }
          }

          const content = await downloadFileContent(fileUrl, token);
          mkdirSync(dirname(fullPath), { recursive: true });
          writeFileSync(fullPath, content);
          downloadedFiles.push(fullPath);
          onFileDone("downloaded", relativeFilePath);
          onProgress(
            downloadedFiles.length,
            skippedFiles.length,
            failedFiles.length,
            relativeFilePath
          );
        } catch {
          failedFiles.push(fullPath);
          onFileDone("failed", relativeFilePath);
          onProgress(
            downloadedFiles.length,
            skippedFiles.length,
            failedFiles.length,
            relativeFilePath
          );
        }
      }
    };

    for (const node of fileTree) {
      await processNode(node, basePath);
    }

    const allFiles = [...downloadedFiles, ...skippedFiles];
    let totalSize = 0;
    const extensions: Record<string, number> = {};
    allFiles.forEach((f) => {
      try {
        totalSize += statSync(f).size;
      } catch {}
      const ext = f.split(".").pop() || "?";
      extensions[ext] = (extensions[ext] || 0) + 1;
    });

    const treeLines = generateTree(allFiles, basePath);

    onDone({
      totalFiles: allFiles.length,
      downloaded: downloadedFiles.length,
      skipped: skippedFiles.length,
      failed: failedFiles.length,
      totalSize,
      extensions,
      treeLines,
      outputDir: basePath,
      failedFiles,
      deploymentId,
      deploymentUrl,
      projectName,
    });
  } catch (err: any) {
    onError(err.message || String(err));
  }
}
