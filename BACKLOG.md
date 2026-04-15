# Integreco — Backlog
> Agents: Mark completed items ONLY after the user confirms with the "+" symbol. Never mark items yourself.

## 🔴 Active Tasks

(0)
IDE Agent Request — Step 1: TypeScript + Vite migration
Goal
Migrate the Integreco project from its current Vanilla JS / no-bundler setup to a proper Vite + TypeScript build pipeline. The user-facing app must remain identical — no feature changes, no UI changes, no logic refactoring.
Before writing a single line of code, read:

index.html — entry point and script loading strategy
package.json + vite.config.ts + tsconfig.json — understand what's already wired up vs. what's skeleton-only
All files in src/ — understand the module graph, data shapes for nodes/edges/canvas, and how the app is structured
sw.js, manifest.json, metadata.json — PWA assets that must survive the migration untouched
.agents/rules/ — follow any project-specific agent rules found there

Build your own migration plan based on what you actually find. Do not rely on any external assumptions.
Required outcomes:

npm run dev serves a fully working app (all existing interactions must work)
npm run build completes with zero TypeScript errors and produces a functional dist/
A src/types/graph.ts (or equivalent) file exists with typed interfaces that accurately reflect the actual data model you find in the code — nodes, edges, canvas, document
All src/ files are .ts
PWA (Service Worker + manifest) works in both dev and prod

Constraints:

No UI frameworks (no React, Vue, etc.)
No logic refactoring — only add types, rename files, fix the build pipeline
No new features — those come in later steps
Existing save files (JSON) must still load correctly after the migration

Out of scope: AI export, 3D view, Electron, backend sync.


(6)
  - **"Map Background smart zoom" Mode Logic:**
  - Add a "smart zoom" toggle to the map background positioning menu.
When enabled, the background image cannot be resized or moved. Increasing the background image size proportionally increases the length of links between objects (objects behave as if they were pinned to the map background image).
By default, if the map has its own background, the smart zoom toggle is enabled.
  
(1)
- **Export to Standalone HTML:**
  - Add an "html" option in the main menu's download submenu. 
  - Goal: Download a self-contained, view-only version of the map that works offline.
  - Features allowed: Panning, zooming, opening node/note/group contents (double-click), collapsing/expanding branches.
  - UI restrictions: Hide all menus except the main menu (which will only contain "Share", "Download" (no backup option), and "Stealth Mode"). Keep zoom/center/minimap controls, main menu button, and fullscreen button.

(5)
- **"Copy Style" Feature:**
  - Add a "Copy Style" toggle in the settings submenu.
  - When enabled, opens a window identical to the Map Catalog, but with only two buttons per card: "Preview" and "Apply", plus a "Cancel" button top-right.
  - *Preview:* Opens a view-only thumbnail of that map (almost full screen, draggable, zoomable) to inspect the style. Top buttons: "Apply" and "Cancel".
  - *Apply:* Applies all style defaults from the selected map to the current map. Closes the catalog/preview windows but keeps the settings submenu open.
  - Disabling the toggle reverts the current map to default styles.
  - If any manual style change is made after copying, the toggle becomes inactive (styles cannot be reverted via toggle anymore).

(2)
- **Text Formatting Menu:** - Right-click (RMB) on a text field opens standard options: font size/family, color, alignment.

(3)
- **Expand Frame Options:** - Add more frame types (inspired by other mind-map tools) to the settings menu. Implement scrolling. Keep the current 3 types at the top.

(4)
- **"Open Object as Map" Button:** - Add to the object context menu. Creates a new map in a new tab with the selected object acting as the new root node.

## 🟡 Roadmap (Low Priority)

- **Single Window SPA** — Handle multiple maps within one window (tabs/switcher). 🔴 HIGH PRIORITY
- **GitHub Sync** — Automatic sync without Syncthing.
- **Shareable Links** — View-only links and templates.
- **Cloud Sync** (PouchDB/CouchDB)
- **AI Integration** (Map analysis/generation via LLM)
- **Obsidian Plugin**
- **External API**
- **Google Drive / Keep Integration**
