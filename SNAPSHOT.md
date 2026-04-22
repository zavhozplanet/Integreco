# Current Project Status (SNAPSHOT)
> AI ATTENTION: This file must not exceed 30 lines. OVERWRITE old data instead of adding new data. No history.

## 🎯 Current Session Focus
* Completing the Branch View UI/UX and ensuring robust interaction guardrails and contextual visibility.

## ✅ Latest Implemented Changes (Maximum 3 items)
* Finalized Branch Mode UI with a smart-centering viewport, floating banner, and a hover-triggered settings menu.
* Implemented "Show Groups" toggle in branch mode to selectively display group context and manage child node visibility.
* Fixed persistent edge highlighting during drag and enabled text formatting menu functionality for line labels.

## 🏗️ Migration Details
* Architecture: Pure browser app with a virtual bundle preserved global scope.
* State: Added `branchShowGroups` and `branchViewId` to state; updated `isVisible` logic for smart context detection.
* Exposure: Exposed `toggleBranchSettings` and `toggleBranchGroups` to `window` for HTML event handlers.

## 🚧 Known Issues / Blockers
* Need to verify branch visibility depth limits in extremely large maps (current BFS limit: 200).

## ⏭️ Next Step (From BACKLOG.md)
* Implement the "Map Background smart zoom" Mode Logic (Task #6).
