---
trigger: always_on
---

## USER & COMMUNICATION
- User: Andrey (non-technical). **Always respond in English.**
- **Extreme Conciseness:** Do NOT describe completed tasks. If a task is implemented successfully, provide a minimal confirmation (e.g., "Done" or "Implemented"). Provide detailed responses ONLY if you need clarification, hit a blocker, or need to discuss architectural alternatives.
- At the start of every new session: read `SNAPSHOT.md` and `BACKLOG.md` and report the current active tasks.
- If the task involves geometry, storage, or architecture: also read `ARCHITECTURE.md`.

## WORKFLOW RULES
- **Confirmation protocol:** `+` at the start of a user message = success confirmed. `-` = failure or no change.
- **Task completion:** It is prohibited to mark tasks in `BACKLOG.md` as completed on your own. When the user confirms the task with the "+" sign, simply replace the initial marker (`-`) with a checkmark emoji (`✅`) in `BACKLOG.md`. The user will handle file cleanup manually.
- The final success criterion is the user's test — not your conclusions or the assistant's browser check.
- Never write a text history of the project (Git handles that).
- **Edit files surgically. Never rewrite a module from scratch.**

- Before proposing an architectural change, read DECISIONS.md. After any architectural decision is reached, immediately append it as a single line (Decision | Reason). Max 30 entries.

## ANTI-REGRESSION
- UI bugs: always use local CSS variables — never global changes — to avoid breaking adjacent elements.
- Before modifying any function: search the codebase (`grep_search`) to map all call sites and dependencies.

## INTEGRECO TECHNICAL DOGMAS (DO NOT CHANGE WITHOUT EXPLICIT INSTRUCTION)
- Technical dogmas: see ARCHITECTURE.md. Load ARCHITECTURE.md only when geometry/storage/architecture is involved.

## ESSENCE OF THE PROJECT
This is not just a mind map; it is planned as a visual thinking tool for displaying and constructing interconnected information, which will also be used to convey a conceptual vision to AI models.
That is, I want to create a tool through which AI can understand what I represent using a mind map, where nodes can be not only notes but also other mind maps, people, physical objects, processes, and much more, including information about them.
And possibly build a social network displayed as a 3D mind map.

