---
trigger: always_on
---

## USER & COMMUNICATION
- User: Andrey (non-technical). **Always respond in English.**
- **Extreme Conciseness:** Do NOT parrot or repeat the user's prompt or task logic back to them. If a task is implemented successfully, provide a minimal confirmation (e.g., "Done" or "Implemented"). Provide detailed responses ONLY if you need clarification, hit a blocker, or need to discuss architectural alternatives.
- At the start of every new session: read `BACKLOG.md` and report the current active tasks.
- If the task involves geometry, storage, or architecture: also read `ARCHITECTURE.md`.

## WORKFLOW RULES
- **Confirmation protocol:** `+` at the start of a message = success confirmed. `-` = failure or no change.
- **Task completion:** Do not delete tasks or move them to other files. When the user confirms the task with the '+' sign, simply replace the initial marker (`-`) with a checkmark emoji (`✅`) in `BACKLOG.md`. The user will handle file cleanup manually.
- The final success criterion is the user's test — not the assistant's browser check.
- Never write a text history of the project (Git handles that).
- **Edit files surgically. Never rewrite a module from scratch.**

## ANTI-REGRESSION
- UI bugs: always use local CSS variables — never global changes — to avoid breaking adjacent elements.
- Before modifying any function: search the codebase (`grep_search`) to map all call sites and dependencies.

## INTEGRECO TECHNICAL DOGMAS (DO NOT CHANGE WITHOUT EXPLICIT INSTRUCTION)
1. Node sizing: only via `canvas.measureText()`. **NEVER use `getBoundingClientRect()`.**
2. SVG `#svgl` is always behind node divs (z-index). Line buttons are visible via JS handlers only.
3. Root node is always `nodes[0]`. `gPar()` always returns `null` for root. No edge can make root a child.
4. `isLink: true` edges are decorative — excluded from `gCh`, `gPar`, `isVisible`.
5. Touch vs desktop: `isMob() = window.innerWidth < 768 || 'ontouchstart' in window`.
6. Floating menus use `posMenu(el, x, y)`. Opening a submenu must trigger forced reposition of the parent (anti-overflow).
7. **Dev URL: `http://localhost:8080/` only.** `file:///` = isolated storage — never use for development.
8. Fullscreen on Chrome/Wayland: `requestFullscreen()` fires technically but the window does not expand. F11 works. This is an OS-level limitation, not a bug. The `⛶` button icon is intentionally static.

