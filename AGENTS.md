# Repository Guidelines

## Project Structure & Module Organization

- `manifest.json` defines the Chrome extension entry points and permissions.
- `src/` contains the extension logic:
  - `src/content.js` handles content script behavior and keybindings.
  - `src/background.js` manages extension lifecycle and storage.
  - `src/vim-state-machine.js` and `src/vim-motions.js` implement the FSM and motions.
  - `src/options/` contains the options UI (`options.html`, `options.js`, `options.css`).
  - `src/shared-utils.js` provides shared helpers for scripts.
- `icons/` stores extension icon assets.
- `options-screenshot.png` is used in documentation.

## Build, Test, and Development Commands

There is no build step. Develop by editing source files and reloading the extension:

- Load the project in Chrome: `chrome://extensions` → Enable Developer mode → Load unpacked → select repo root.
- Reload after changes: click the extension reload button in `chrome://extensions`.

## Coding Style & Naming Conventions

- JavaScript uses 2-space indentation, semicolons, and mostly single-quoted strings.
- Prefer small, focused helpers (see `src/shared-utils.js`) and descriptive function names.
- File naming is kebab-case or plain words (example: `vim-state-machine.js`).

## Testing Guidelines

- No automated tests are currently present.
- For changes, manually verify on a few sites listed in the options page and confirm:
  - Mode indicator updates correctly.
  - Motions (`h`, `j`, `k`, `l`, `w`, `b`, `dw`, `cw`) behave as expected.

## Commit & Pull Request Guidelines

- Commit messages in history are short, imperative, and sentence-case (example: `Fix multiple script injection error`).
- Occasional prefixes like `fix:` appear; use them consistently if introduced in a series.
- Pull requests should describe user-facing changes, include steps to verify, and add screenshots for UI changes (options page or indicator changes).

## Configuration Tips

- Default enabled sites are managed in `src/shared-utils.js`.
- Manifest changes require a full extension reload in `chrome://extensions`.
