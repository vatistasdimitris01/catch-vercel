# CATCH

A beautiful terminal UI for downloading source code from any Vercel deployment. Built with [Ink](https://github.com/vadimdemedes/ink) and React.

```
██████  ██████  ███████ ████████ ██████  ██████  ██    ██
██   ██ ██   ██ ██         ██    ██   ██ ██   ██  ██  ██
██████  ██████  █████      ██    ██████  ██████    ████
██      ██      ██         ██    ██      ██  ██     ██
██      ██      ███████    ██    ██      ██   ██    ██
```

## Install

```bash
git clone https://github.com/vatistasdimitris01/catch-vercel.git
cd catch-vercel
npm install
npm run dev
```

Or install globally:

```bash
npm install -g catch-vercel
catch
```

## Usage

```bash
npm run dev
```

1. Paste your **Vercel token** (get one at [vercel.com/account/tokens](https://vercel.com/account/tokens))
2. Paste a **deployment ID** or full Vercel dashboard URL
3. Hit enter — CATCH does the rest

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Switch between input fields |
| `Tab` | Toggle focus |
| `Enter` | Start download (validates both fields) |
| `Esc` | Clear current field |
| `←` / `→` | Move cursor within field |
| `^c` | Quit |

## What it does

- Authenticates with the Vercel API using your token
- Resolves the deployment (supports `dpl_xxx` IDs, full Vercel dashboard URLs, and `latest`)
- Auto-detects team scope across all your teams
- Fetches the file tree from the deployment
- Downloads every source file, skipping ones already cached
- Shows a live progress bar with download/skip/fail counters
- Displays a full file tree and stats on completion

## Output

```
out/
└── dpl_xxxxx/
    ├── source/          # Downloaded source files
    └── download-log.txt # Full operation log
```

## Configuration

CATCH also supports CLI args and environment variables (the original [vercel-deploy-source-downloader](https://github.com/numanaral/vercel-deploy-source-downloader) interface):

```bash
# Environment variables
VERCEL_TOKEN=xxx VERCEL_DEPLOYMENT=dpl_xxx npm run dev

# Or use a .env file
echo "VERCEL_TOKEN=xxx" > .env
echo "VERCEL_DEPLOYMENT=dpl_xxx" >> .env
npm run dev
```

### `.env` format

```env
VERCEL_TOKEN=your_token_here
VERCEL_DEPLOYMENT=dpl_xxxxx
VERCEL_PROJECT=my-project
VERCEL_TEAM=my-team
VERCEL_OUTPUT=./out
```

## Requirements

- Node.js >= 18.0.0

## How it works

1. **Token** — passed to Vercel API as `Authorization: Bearer <token>`
2. **Deployment resolution** — tries the raw ID and `dpl_` prefix across your personal account and all teams
3. **File tree** — fetched from `vercel.com/api/file-tree/<url>?base=src`
4. **File download** — each file's base64 content is fetched from the Vercel files API and decoded
5. **Caching** — existing non-empty files are skipped on re-run

## Credits

This project builds on top of two open-source projects:

- **[vercel-deploy-source-downloader](https://github.com/numanaral/vercel-deploy-source-downloader)** by [Numan Aral](https://numanaral.dev) — the Vercel API integration, file tree traversal, download logic, and caching system. The core `src/download.ts` module is adapted from his work. Licensed under MIT.

- **[STRM](https://github.com/vatistasdimitris01/STRM)** — the Ink-based terminal UI design, floating input field style, logo rendering, cursor animation, and overall TUI architecture. The visual language and component patterns are inspired by STRM. Licensed under MIT.

## License

MIT
