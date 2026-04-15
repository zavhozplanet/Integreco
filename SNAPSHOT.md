# Current Project Status (SNAPSHOT)
> AI ATTENTION: This file must not exceed 30 lines. OVERWRITE old data instead of adding new data. No history.

## 🎯 Current Session Focus
* Post-migration stabilization and GitHub Pages deployment configuration.

## ✅ Latest Implemented Changes (Maximum 3 items)
* Fixed broken HTML handlers by bridging module-scoped functions to `window` via `src/expose-globals.ts`.
* Configured GitHub Pages deployment: added `base: '/Integreco/'` and created a GitHub Actions workflow.
* Consolidated PWA assets (sw.js, manifest.json) and cleaned up building artifacts.

## 🏗️ Migration Details
* Build pipeline: Vite + TypeScript (concatenation plugin preserves global scope).
* Deployment: Automatic via `.github/workflows/deploy.yml` on push to `main`.
* Assets: Hashed JS/CSS in `dist/assets/`, static files in `public/`.

## 🚧 Known Issues / Blockers
* Type safety: Most files still use `@ts-nocheck`; type coverage needs gradual improvement.
* PWA: Service worker upgraded to v4, needs testing in production environment.

## ⏭️ Next Step (From BACKLOG.md)
* Gradual type annotation: remove `@ts-nocheck` per file and apply interfaces from `graph.ts`.
