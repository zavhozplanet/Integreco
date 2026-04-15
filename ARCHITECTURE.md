# Integreco — Architecture

> **STATIC DOCUMENT. AI agents must NOT edit this file.** For task tracking use `BACKLOG.md`.

## 1. Project Concept
**Integreco** — interactive offline-first mind map for visual thinking and concept graphs.
- Desktop + touchscreen. Minimal text UI — icons and symbols over words.
- Local storage via File System Access API + IndexedDB (`storage.js`).
is an interactive offline-first mind map for visual thinking, concept building, and relationship graphs. Inspired by Mindomo and Obsidian, with a focus on minimal UI and maximum use of icons over text.
I want to create a tool that works stably on any device, both online and offline.

## 2. Stack & File Structure
- **Vanilla JS + SVG.** No frameworks, no bundlers.
- `index.html` — minimal shell. `styles/main.css` — all styles.
- Nodes: `<div class="node">` absolutely positioned on `#canvas` (8000×8000px).
- Edges: SVG `#svgl` behind node divs, `pointer-events:none`.
- Transform: `canvas.style.transform = translate(panX,panY) scale(zoom)`, `transform-origin:0 0`.
- ⚠️ `package.json` / `vite.config.ts` are AI Studio artifacts. React and Tailwind are **not used**.

### Module load order (`src/`):
`storage.js` → `state.js` → `utils.js` → `create-delete.js` → `smart-placement.js` → `layout.js` → `geometry.js` → `selection.js` → `edit.js` → `drag.js` → `input-mouse.js` → `input-touch.js` → `menus.js` → `link-mode.js` → `branch-view.js` → `mobile-rename.js` → `notes.js` → `trash.js` → `line-panel.js` → `ui.js` → `catalog.js` → `menu.js` → `map-bg.js` → `init.js`

## 3. Data Structures

**Node:**
`{ id, type('node'|'root'|'note'|'group'|'multi'), x, y, width, height, label, note, color, locked, nodes[], bg:{color,image,pattern}, mapBg }`

**Edge:**
`{ id, from, to, shape('straight'|'bezier'|'elbow'), dash('solid'|'dashed'|'dotted'|'link'), width, color, dir('forward'|'backward'|'both'|'none'), cp1x, cp1y, cp2x, cp2y, bend(0.1–0.9), collapsed, isLink, label }`

**Key globals:** `nodes[]`, `edges[]`, `idC`, `zoom`, `panX`, `panY`, `selN`, `selE`, `selNSet`, `hist[]`, `fut[]`, `glDefaults`, `linkDefaults`, `nodeDefaults`, `trash[]`, `canvasBg`

## 4. Architectural Rules — NEVER violate without explicit discussion

1. Node sizing: only via `canvas.measureText()`. **NEVER use `getBoundingClientRect()`.**
2. SVG `#svgl` always behind node divs (z-index). Line buttons visible via JS handlers only.
3. Root node = always `nodes[0]`. `gPar()` always returns `null` for root. No edge can make root a child.
4. `isLink: true` edges are decorative — excluded from `gCh`, `gPar`, `isVisible` hierarchy logic.
5. Touch vs desktop: `isMob() = window.innerWidth < 768 || 'ontouchstart' in window`.
6. Floating menus use `posMenu(el, x, y)`. Opening a submenu (`openSubmenu`) must trigger forced parent reposition to prevent off-screen overflow.
7. **Dev URL: `http://localhost:8080/` only.** `file:///` or other ports = isolated storage, never use for development.
8. Fullscreen on Chrome/Wayland: `requestFullscreen()` fires technically but the window does not physically expand. F11 works. Known OS-level limitation, not an app bug. Button icon `⛶` is intentionally static.
9. **Edit files surgically. Never rewrite a module from scratch.**
10. `storageAPI._currentFilename` tracks the current map file. Each browser tab saves to its own file.
