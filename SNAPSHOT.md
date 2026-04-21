# Current Project Status (SNAPSHOT)
> AI ATTENTION: This file must not exceed 30 lines. OVERWRITE old data instead of adding new data. No history.

## 🎯 Current Session Focus
* Refining the Note Panel's Markdown-first workflow and ensuring robust cross-object style persistence.

## ✅ Latest Implemented Changes (Maximum 3 items)
* Implemented selection-aware text formatting with a blue indicator and strikethrough support.
* Refactored Note Panel to include manual View/Edit modes for both title and body with real-time Markdown rendering.
* Implemented Markdown-aware copy/cut/paste that bundles titles as `# Headers` for seamless "Node = File" integration.

## 🏗️ Migration Details
* Build pipeline: Vite + TypeScript (concatenation plugin preserves global scope).
* State Persistence: Fixed saving/loading of `noteDefaults` and `defaultFlags` to local storage.
* Global scope: Exposed new `noteTab` and formatting functions in `src/expose-globals.ts`.

## 🚧 Known Issues / Blockers
* Need to ensure `parseMd` security remains robust against XSS when processing user-provided links.

## ⏭️ Next Step (From BACKLOG.md)
* Implement the "Markdown Vault" structure: Map hierarchy as folders and `[[Node]]` semantic links within texts.
