# Current Project Status (SNAPSHOT)
> AI ATTENTION: This file must not exceed 30 lines. OVERWRITE old data instead of adding new data. No history.

## 🎯 Current Session Focus
* Implementing granular text formatting controls and per-selection formatting logic.

## ✅ Latest Implemented Changes (Maximum 3 items)
* Implemented granular formatting defaults (variant, size, align, color) with per-block toggles.
* Switched to independent Bold/Italic toggles and added formatting buttons to node/multi-select menus.
* Added logic to apply text defaults specifically to new/empty text categories in existing objects.

## 🏗️ Migration Details
* Build pipeline: Vite + TypeScript (concatenation plugin preserves global scope).
* Deployment: Automatic via `.github/workflows/deploy.yml` on push to `main`.
* Text styles: Moved from `textVariant` to separate `fontWeight` and `fontStyle` properties.

## 🚧 Known Issues / Blockers
* Architectural decision pending: How to implement rich text (formatting selected text) in plain text fields.

## ⏭️ Next Step (From BACKLOG.md)
* Implement formatting for selected text (Rich Text support) following architectural decision.
