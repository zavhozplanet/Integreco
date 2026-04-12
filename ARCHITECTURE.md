# Integreco — Архитектура проекта

> **СТАТИЧНЫЙ ДОКУМЕНТ:** ИИ-агентам ЗАПРЕЩЕНО редактировать этот файл. Для трекинга текущих задач используйте `BACKLOG.md`.

## 1. Суть проекта
**Integreco** — интерактивная офлайн-first майнд-карта для визуального мышления.
**Ключевые особенности:**
- Работа на десктопах и тачскринах (адаптивный UI, минимум текста).
- Локальное хранение через File System Access API (PWA-архитектура).
- Модульная структура, гибридные узлы (Multi-Nodes) и работа в одной вкладке (Single Window SPA).

## 2. Стек и файловая структура
- **Vanilla JS + SVG**, без бандлеров.
- **`index.html`** — минимальная оболочка.
- **`styles/main.css`** — единый файл стилей проекта.
- **`src/*.js`** — логические модули (состояние, геометрия, управление, UI).
- *Внимание:* Файлы `package.json` и `vite.config.ts` — это оставшиеся артефакты от прошлых сред разработки, React и Tailwind в проекте НЕ используются.

## 3. Структура данных (State)
**Узел (Node):**
`{ id, type ('node'|'root'|'note'|'group'|'multi'), x, y, width, height, label, note, color, locked, nodes[], bg: {} }`

**Линия (Edge):**
`{ id, from, to, shape ('straight'|'bezier'|'elbow'), dash, width, color, dir, cp1x, cp1y, cp2x, cp2y, bend, collapsed, isLink, label }`

**Глобальные переменные:** `nodes[]`, `edges[]`, `idC`, `zoom`, `panX`, `panY`, `selN`, `selE`.
