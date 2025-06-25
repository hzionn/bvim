# Project Plan: Vim-Keybinds-for-Web-Textfields

## 1. Objective

To create a Chromium browser extension that enables developers and writers to use basic Vim keybindings for navigation within text fields (`<textarea>`, `<input type="text">`) on specified websites. This will improve productivity and provide a more comfortable text editing experience on web pages like ChatGPT, Gemini, and other similar platforms.

## 2. Core Features

- **Vim Modes:** Implement basic "Normal" and "Insert" modes.
  - **Insert Mode:** Default behavior. All keystrokes are entered as text.
  - **Normal Mode:** Activated by pressing `Esc`. Keystrokes are interpreted as Vim commands. Pressing `i` returns to Insert Mode.
- **Basic Navigation:** In Normal Mode, the following keys will move the cursor:
  - `h`: Move cursor left.
  - `l`: Move cursor right.
  - `k`: Move cursor up one line.
  - `j`: Move cursor down one line.
- **Configurable Websites:** The extension will only activate on a user-defined list of websites.
- **Popup UI:** A simple browser action popup to:
  - Enable or disable the extension globally.
  - Provide a shortcut to the options page.
  - Quickly add the current site to the active list.
- **Options Page:** A dedicated page for managing the list of websites where the extension is active.

## 3. Technical Architecture

The extension will be built using standard web technologies: HTML, CSS, and JavaScript.

- **`manifest.json`**: The core file defining the extension's properties.
  - `manifest_version`: 3
  - `name`, `version`, `description`.
  - `permissions`: `storage` (to save the list of websites), `activeTab`.
  - `action`: Defines the `popup.html` for the browser toolbar icon.
  - `options_page`: Points to `options.html`.
  - `content_scripts`: This will inject `content.js` into the web pages that match the URLs stored in `chrome.storage`.
  - `icons`: Standard icons for the extension.

- **`content.js`**: The main logic that runs on the specified web pages.
  - It will add `keydown` event listeners to text fields.
  - It will maintain the state (Normal Mode vs. Insert Mode).
  - When in Normal Mode, it will intercept keystrokes (`h`, `j`, `k`, `l`), prevent their default action, and instead manipulate the text field's `selectionStart` and `selectionEnd` properties to move the cursor.

- **`popup/` (`popup.html`, `popup.js`)**:
  - Provides the main on/off switch.
  - Communicates with the background script or content script to enable/disable functionality.
  - Reads and writes to `chrome.storage.sync`.

- **`options/` (`options.html`, `options.js`)**:
  - Provides a user interface to add, view, and remove URLs from the list of activated sites.
  - All changes will be saved to `chrome.storage.sync`.

## 4. Development Phases

### Phase 1: Core Logic (MVP)

1.  Set up the basic `manifest.json` file.
2.  Create the `content.js` script.
3.  Hardcode a target website (e.g., `https://gemini.google.com/`) in the `manifest.json` for initial testing.
4.  Implement the `Esc` key to switch from Insert to Normal mode, and `i` to switch back.
5.  Implement the `h`, `j`, `k`, `l` navigation logic within `content.js`.

### Phase 2: Configuration and UI

1.  Develop the `options.html` and `options.js` to manage a list of websites.
2.  Modify `content.js` to activate only on pages matching the stored list.
3.  Develop the `popup.html` and `popup.js` with a global toggle and a link to the options page.

### Phase 3: Advanced Features & Refinements

1.  Add more Vim commands (e.g., `w` to jump forward a word, `b` to jump back, `0` to go to the start of the line, `$` to go to the end).
2.  Implement a visual indicator for the current mode (e.g., changing the cursor style from a bar to a block).
3.  Improve `j` and `k` navigation to better remember the column position when moving between lines of different lengths.

## 5. Initial File Structure

```
/
├── manifest.json
├── content.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── options/
    ├── options.html
    ├── options.css
    └── options.js
```
