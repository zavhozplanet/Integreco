# Integreco — Backlog
> Agents: Mark completed items ONLY after the user confirms with the "+" symbol. Never mark items yourself.

## 🔴 Active Tasks

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


(3)
- **Expand Frame Options:** - Add more frame types (inspired by other mind-map tools) to the settings menu. Implement scrolling. Keep the current 3 types at the top.



## 🟡 Roadmap (Long-term Evolution & AI Integration)

- **Single Window SPA** — Handle multiple maps within one window (tabs/switcher). 🔴 HIGH PRIORITY
- **Markdown Knowledge Base (Obsidian-like)** — Transition to a file-system-based architecture. Nodes are saved as `.md` files with YAML metadata, and links are represented as `[[WikiLinks]]`.
- **AI Sandbox & Ghost Nodes** — Safe AI interaction layer. AI suggestions are saved to an `_AI_Proposals/` inbox and displayed on the canvas as semi-transparent "ghost nodes" awaiting user approval. Includes automatic snapshot backups.
- **Autonomous AI Agent (LLM OS / Hermes)** — Local agent running in the background, featuring a self-learning loop and graph topology analysis based on the local Markdown vault.
- **AI Export** — Serialize graph subsets into semantic JSON-LD or custom Markdown context formats for external LLMs (Claude, GPT).
- **3D View** — Optional 3D rendering mode for spatial graph navigation.
- **Electron Wrapper** — Desktop application for unrestricted, fast file system access (essential for seamless local AI agent operation).
- **Social / Sync Layer** — Lightweight backend (e.g., Supabase, PocketBase) for optional cloud sync and collaborative features.
- **Fractal Social Network** — "Users as nodes" concept. Cross-map semantic linking where AI acts as a mediator/facilitator in contextual discussions (indicated by pulsating nodes).
- **Obsidian Plugin** — Deep two-way synchronization with the Obsidian ecosystem.
- **GitHub Sync / Cloud Sync (PouchDB)** — Automatic sync alternatives.
- **Shareable Links** — View-only public links and templates.
