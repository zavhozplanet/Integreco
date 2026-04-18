# Current Project Status (SNAPSHOT)
> AI ATTENTION: This file must not exceed 30 lines. OVERWRITE old data instead of adding new data. No history.

## 🎯 Current Session Focus
* Refining UI visual consistency and structural hierarchy manipulation via connecting lines.

## ✅ Latest Implemented Changes (Maximum 3 items)
* Synchronized branch thumbnails (previews) with actual node, group, and multi-node visual styles (shapes, colors, borders).
* Implemented "Hierarchy Lock" for lines, allowing hierarchy flipping (parent-child swap) by changing arrow direction.
* Fixed hierarchy resolution for bidirectional/arrowless lines using a root-proximity algorithm (`getDepthFromRoot`).

## 🏗️ Migration Details
* Build pipeline: Vite + TypeScript (concatenation plugin preserves global scope).
* Deployment: Automatic via `.github/workflows/deploy.yml` on push to `main`.
* Assets: Hashed JS/CSS in `dist/assets/`, static files in `public/`.

## 🚧 Known Issues / Blockers
* No blockers identified. UI and hierarchy manipulation features are stable and confirmed by user.

## ⏭️ Next Step (From BACKLOG.md)
* Implement "Map Background smart zoom" mode (pinned objects behavior).
