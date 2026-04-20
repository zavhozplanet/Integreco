
- **(1) Canvas Background & Map Background Logic:**
  - In the canvas menu (image section), add a toggle switch: "Canvas Background" vs "Map Background".
  - Add image zoom buttons (active ONLY when the switch is set to "Map Background").
  - Move the "Add from folder" button from the canvas menu to the image catalog window.

  - **"Map Background" Mode Logic:** - Ties the image to a specific root node. The root node is pinned to a new image layer (above the canvas background). 
    - Panning/zooming the canvas normally scales both the map and the image proportionally.



(2)
- if the background menu is clicked on the canvas background – the background menu opens with the "canvas" button enabled.
- if the background menu is clicked on an already added map background – the background menu opens with the "map" button enabled, the toggle switch turned on, and with active adjustments and map background menu buttons.
- Add an "on - off" toggle switch to the map background menu (enables and disables the map background image, similar to the toggle switch that enables/disables the background in the canvas menu).
- Remove zoom buttons and change the icon on the map background menu settings button from a gear to "background catalog" (using the same icon as the background catalog button in the canvas background menu).
- When opening nested menus and windows, maintain the reverse sequence upon closing (do not close the previous menu or window when closing the current one).
- when adding a map background, it automatically fits into the background boundaries (shifts and zooms so that all its objects are within the map background boundaries).
- moving the root node moves the entire map along with its background relative to the canvas background (identical to moving the map via MMB drag on the map background).

(3)
- add a "positioning" button to the map background menu with a coordinate plane icon (x-axis + y-axis).
The positioning button opens a near-fullscreen window displaying the current map background with the map overlaid on it.
The map is unavailable for editing and is displayed as a static layer on top of the background.
The map layer can be panned and zoomed relative to the background.
The window header includes:
+ a button to center the map relative to the background (map center corresponds to the root node).
+ map zoom buttons relative to the background.
(Minimum zoom – 25% relative to the background.
Maximum zoom – default).
+ "save" button (green checkmark).
+ "cancel" button.
+ "close" button.
Clicking outside this window closes it and discards changes, if any.
Upon saving, the map retains its position and scale relative to the map background, and its root node is anchored to the map background at the current position.

- **Multiple Root Nodes (Multiple Maps):**
    - Switching to "Map Background" opens a preview grid of all root nodes. The currently viewed map's root is highlighted.
    - Roots without images show a checkerboard background (like Photoshop).
    - Each preview has a checkbox and a "+" button. Checkbox toggles the visibility of the currently attached image (disabled if no image was ever attached).
    - Clicking "+" or double-clicking a preview selects that node, closes the selection window, and opens the image catalog.
    - Selecting an image anchors it to that root node, closes the catalog, and centers the root node on the screen.

  - **Locking/Pinning Mechanics:** - A root node attached to a map background guarantees they move together (glued).
    - Adding a map background automatically enables the lock (`locked`/`pinned` state) for that root node. It cannot be unlocked from the object menu until the background is disabled via the preview checkbox.
    - Disabling the checkbox unlocks all objects on that map. Re-enabling it restores the locks, scale, and defaults as they were before.
  - **Visibility:** The image is visible as long as the checkbox in the root preview grid is checked.


- ✅ **Recycle Bin Overhaul:**
  - Replace individual restore buttons with a single global "Restore" button.
  - Add checkboxes to every map/object card, and a "Select All" checkbox in the header.
  - "Restore" button recovers checked items to the catalog. *Constraint:* Object restoration is only allowed if no new objects were moved/created on the map. Note restoration is only allowed if the parent object's text wasn't edited.
  - "Delete" button permanently removes checked items.
  - Add a "Clear All" button.

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


- **Text Formatting Menu:** ✅ Right-click (RMB) on a text field opens standard options: font size/family, color, alignment.
