# CATCH

A beautiful terminal UI for downloading source code from any Vercel deployment. Built with [Ink](https://github.com/vadimdemedes/ink) and React.

```
  ░██████     ░███    ░██████████  ░██████  ░██     ░██
 ░██   ░██   ░██░██       ░██     ░██   ░██ ░██     ░██
░██         ░██  ░██      ░██    ░██        ░██     ░██
░██        ░█████████     ░██    ░██        ░██████████
░██        ░██    ░██     ░██    ░██        ░██     ░██
 ░██   ░██ ░██    ░██     ░██     ░██   ░██ ░██     ░██
  ░██████  ░██    ░██     ░██      ░██████  ░██     ░██
```

## Install

```bash
git clone https://github.com/vatistasdimitris01/catch-vercel.git
cd catch-vercel
npm install
npm run dev
```

## How to use

Run `npm run dev` and you'll see the TUI:

```
  ░██████     ░███    ░██████████  ░██████  ░██     ░██
 ░██   ░██   ░██░██       ░██     ░██   ░██ ░██     ░██
░██         ░██  ░██      ░██    ░██        ░██     ░██
░██        ░█████████     ░██    ░██        ░██████████
░██        ░██    ░██     ░██    ░██        ░██     ░██
 ░██   ░██ ░██    ░██     ░██     ░██   ░██ ░██     ░██
  ░██████  ░██    ░██     ░██      ░██████  ░██     ░██

               download source code from any vercel deployment

   ╭─ vercel token ──────────────────────────────────────────╮
   │ ›                                                        │
   ╰──────────────────────────────────────────────────────────╯

   ╭─ deployment id or url ──────────────────────────────────╮
   │ ›                                                        │
   ╰──────────────────────────────────────────────────────────╯

               ↑↓ switch fields · ↵ download · esc clear · ^c quit
```

1. **Tab** or **↑↓** to focus the **vercel token** field
2. Paste your token (get one at [vercel.com/account/tokens](https://vercel.com/account/tokens))
3. **Tab** or **↓** to focus the **deployment id or url** field
4. Paste a deployment ID (`dpl_xxx`) or a full Vercel dashboard URL (`vercel.com/scope/project/id/source`)
5. Hit **Enter** — CATCH validates both fields are filled, then starts downloading

If a field is empty when you hit Enter, CATCH shows a red error and moves focus to the empty field.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Switch between input fields |
| `Tab` | Toggle focus between fields |
| `Enter` | Start download (validates both fields are filled) |
| `Esc` | Clear current field, or switch if already empty |
| `←` / `→` | Move cursor within the field |
| `^c` | Quit |

## Download screen

Once you hit Enter, CATCH shows a live progress screen:

```
═══════════════════════════════════════════════════
  catching source files
═══════════════════════════════════════════════════

  ⠹ fetching file tree...

  progress                                  42%
  ████████████████████████░░░░░░░░░░░░░░░░░░░░░

  ↓ caught          12     → skipped      48     × failed        0     of 318

  src/components/App.tsx

  press esc to cancel
```

- Live progress bar with percentage
- Counters for caught / skipped / failed files
- Current file being downloaded
- Press **Esc** to cancel and go back to the inputs

## Completion screen

When all files are done:

```
═══════════════════════════════════════════════════
  all files caught
═══════════════════════════════════════════════════

  deployment  dpl_aBcxxxxxxxxxxxxxxxxxxxxyZa
  project     my-project
  output      /path/to/out

  files       318
  caught      270
  skipped      48
  size        5.79 MB

  file types:
    tsx            42 files
    ts             38 files
    json           12 files
    css             8 files

  tree:
    📁 src
      📄 App.tsx
      📄 index.ts
    📄 package.json

  press esc or ^c to exit
```

## Output

```
out/
└── dpl_xxxxx/
    ├── source/          # Downloaded source files
    └── download-log.txt # Full operation log
```

Re-running the same deployment skips files already downloaded.

## How it works

1. **Token** — entered directly in the TUI, passed to Vercel API as `Authorization: Bearer <token>`
2. **Deployment** — entered directly in the TUI, supports `dpl_xxx` IDs, full Vercel dashboard URLs, or `latest`
3. **Team resolution** — auto-detects across all your Vercel teams
4. **File tree** — fetched from `vercel.com/api/file-tree/<url>?base=src`
5. **File download** — each file's base64 content is fetched from the Vercel files API and decoded
6. **Caching** — existing non-empty files are skipped on re-run

## Requirements

- Node.js >= 18.0.0

## Credits

This project builds on top of two open-source projects:

- **[vercel-deploy-source-downloader](https://github.com/numanaral/vercel-deploy-source-downloader)** by [Numan Aral](https://numanaral.dev) — the Vercel API integration, file tree traversal, download logic, and caching system. The core `src/download.ts` module is adapted from his work. Licensed under MIT.

- **[STRM](https://github.com/vatistasdimitris01/STRM)** — the Ink-based terminal UI design, floating input field style, logo rendering, cursor animation, and overall TUI architecture. The visual language and component patterns are inspired by STRM. Licensed under MIT.

## License

MIT
