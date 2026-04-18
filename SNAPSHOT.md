# Current Project Status (SNAPSHOT)
> AI ATTENTION: This file must not exceed 30 lines. OVERWRITE old data instead of adding new data. No history.

## 🎯 Current Session Focus
* Resolving branch collapse logic conflicts with connection lines (links).

## ✅ Latest Implemented Changes (Maximum 3 items)
* Isolated connecting lines from structural hierarchy traversals (`gCh`, `gPar`, `isBaseVisible`).
* Refined link collapse previews to show only direct targets without recursive branch thumbnails.
* Prepared detailed hand-off report regarding unresolved line behavior for the next AI session.

## 🏗️ Migration Details
* Build pipeline: Vite + TypeScript (concatenation plugin preserves global scope).
* Deployment: Automatic via `.github/workflows/deploy.yml` on push to `main`.
* Assets: Hashed JS/CSS in `dist/assets/`, static files in `public/`.

## 🚧 Known Issues / Blockers
* Connecting line behaviors (collapse states and visibility impacts) appear unchanged in the user's browser, potentially due to Vite HMR caching or edge-case data structure definitions.

## ⏭️ Next Step (From BACKLOG.md)
* Hand over the connection line collapse issue to the next AI session or proceed with gradual type annotation.
