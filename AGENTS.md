# Repository Guidelines

## Project Structure & Module Organization
- Root: `quantum_christmas_tree_prd.md` (product requirements). Keep it updated when scope or UI changes.
- Assets: `图片/` holds provided photos; do not rename without updating references. Avoid committing private photos to public forks; use placeholders when sharing.
- Future code: place the main demo in `index.html` (static, offline-first). If the codebase grows, use `src/` for JS/CSS and `public/` for static assets.

## Build, Test, and Development Commands
- Static open: `open index.html` (mac) or `python3 -m http.server 8000` then `http://localhost:8000` for local testing.
- Optional static server: `npx serve .` for a quick local host with correct MIME types.
- No automated tests yet; add `npm test` or Playwright/Cypress scripts once UI is implemented.

## Coding Style & Naming Conventions
- Language: HTML/CSS/JS. Prefer ES modules, functional style, and minimal globals.
- Formatting: 2-space indentation; default Prettier settings if a formatter is introduced. Keep files ASCII unless assets require otherwise.
- Naming: kebab-case for files (`index.html`, `main.js`), camelCase for JS variables/functions, SCSS-like BEM for CSS class names if needed.
- Comments: short, intent-focused; avoid noise.

## Testing Guidelines
- Short-term: manual checklist (hand-gesture flow, photo loading from `图片/`, offline fallback, performance mode switch).
- When automated tests exist: name files `*.spec.js` under `tests/` or `__tests__/`; ensure key flows (load, gesture toggle, photo carousel) are covered. Target 50%+ coverage initially, higher for core gesture logic.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subject (e.g., `Add photo billboard rendering`, `Fix offline cache busting`). Group related changes; avoid bundling PRD and code refactors in one commit when possible.
- PRs: include summary, testing notes (commands run or manual checklist), screenshots/GIFs for UI changes, and mention any privacy-sensitive data handling. Link related issues when applicable.

## Security & Privacy Notes
- Keep all processing client-side; do not add external telemetry or upload user photos.
- If deploying to GitHub Pages, consider replacing personal photos with placeholders in public branches; document local overrides in `README` or comments. Use `Content-Security-Policy` headers (no inline scripts if CSP is strict) when adding HTTP server configs.
