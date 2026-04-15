# Integreco — Architecture

> **STATIC DOCUMENT. AI agents must NOT edit this file.** For task tracking use `BACKLOG.md`.

## 1. Project Concept
**Integreco** — interactive offline-first mind map for visual thinking and concept graphs.
- Desktop + touchscreen. Minimal text UI — icons and symbols over words.
- Local storage via File System Access API + IndexedDB (`storage.js`).
is an interactive offline-first mind map for visual thinking, concept building, and relationship graphs. Inspired by Mindomo and Obsidian, with a focus on minimal UI and maximum use of icons over text.
I want to create a tool that works stably on any device, both online and offline.

## 2. Stack & File Structure
- **TypeScript + SVG.** Bundled via Vite with a concatenation plugin that merges all `.ts` files into a single scope.
- `index.html` — app shell. `styles/main.css` — all styles. `src/main.ts` — single entry point.
- Nodes: `<div class="node">` absolutely positioned on `#canvas` (8000×8000px).
- Edges: SVG `#svgl` behind node divs, `pointer-events:none`.
- Transform: `canvas.style.transform = translate(panX,panY) scale(zoom)`, `transform-origin:0 0`.
- Type definitions: `src/types/graph.ts`. Type-checking: `tsc --noEmit` with `module: "None"`.
- All source files have `@ts-nocheck` — types are opt-in per file during gradual migration.

### Module load order (`src/`) — concatenated by vite.config.ts plugin:
`storage.ts` → `state.ts` → `utils.ts` → `create-delete.ts` → `smart-placement.ts` → `layout.ts` → `geometry.ts` → `selection.ts` → `edit.ts` → `drag.ts` → `input-mouse.ts` → `input-touch.ts` → `menus.ts` → `link-mode.ts` → `branch-view.ts` → `mobile-rename.ts` → `notes.ts` → `trash.ts` → `line-panel.ts` → `ui.ts` → `catalog.ts` → `menu.ts` → `map-bg.ts` → `init.ts`

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
