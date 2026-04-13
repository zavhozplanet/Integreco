# Integreco 🧠

**Integreco** is an interactive offline-first mind map for visual thinking, concept building, and relationship graphs. Inspired by Mindomo and Obsidian, with a focus on minimal UI and maximum use of icons over text.

## ✨ Key Features

- **Offline-first & Local Storage:** All data (maps, backgrounds, images) is stored locally via the File System Access API and IndexedDB.
- **Vanilla JS + SVG:** Pure JavaScript with no frameworks (React, Vue) or bundlers. Instant load times, lightweight codebase.
- **Hybrid Nodes (Multi-Nodes):** Scalable blocks with support for precise connection points anywhere on their borders.
- **PWA Ready:** Installable on desktop or mobile via Service Worker support.
- **Stealth Mode & Glassmorphism:** A clean, customizable UI that stays out of your way — hide it completely for presentations.

## 🚀 How to Run

The project uses the File System Access API for local file management, so it must be served through a local web server — opening `index.html` directly will not work.

**Option 1: Local server (recommended)**
1. Download or clone the project.
2. Start a local web server in the project folder:
   - In VS Code / Antigravity: click **Go Live** (Live Server extension).
   - With Python: run `python -m http.server 8080` in the terminal.
3. Open `http://localhost:8080` in your browser.

**Option 2: GitHub Pages**
The project can be hosted on any static hosting service (GitHub Pages, Vercel, Netlify) and will run directly in the browser.

## 🛠 Tech Stack

- HTML5 / CSS3 (custom properties for theming)
- Vanilla JavaScript (ES6+, modular architecture)
- SVG (Bézier curve rendering for edges)
- File System Access API / IndexedDB

## 📝 Project Status

Actively in development. Current tasks and architectural decisions are tracked in `BACKLOG.md` and `ARCHITECTURE.md`.
