# Quick Vim

A Chrome extension that brings essential Vim keybindings to text fields on your favorite websites. Navigate and edit text with familiar Vim motions without leaving your browser.

## Features

### Current Vim Motions

**Mode Management:**

- `Esc` - Enter Normal mode from any editable field
- `i` - Enter Insert mode to resume normal typing

**Basic Movement:**

- `h` / `←` - Move cursor left
- `l` / `→` - Move cursor right  
- `j` / `↓` - Move cursor down
- `k` / `↑` - Move cursor up

**Word Movement:**

- `w` - Jump forward to the start of the next word
- `b` - Jump backward to the start of the previous word

**Universal Features:**

- **Arrow key navigation** - Works on ALL websites (even when vim keybindings are disabled)
- **Smart element detection** - Automatically works with textareas, input fields, and contentEditable elements
- **Visual mode indicator** - Shows current mode (NORMAL/INSERT) with optional color coding
- **Site-specific control** - Enable/disable vim keybindings per website

**Language Support:**

- **Optimized for English text** - Works best with Latin characters and English content
- **Limited CJK support** - Cursor movement may not work correctly with Chinese, Japanese, or Korean characters

## Configuration

Access the options page to customize your experience:

- **Toggle Extension** - Quickly enable/disable the extension
- **Manage Websites** - Add/remove sites where vim keybindings should be active
- **Mode Indicator Colors** - Choose between colored indicators (red for Normal, green for Insert) or classic black

### Default Enabled Sites

- GitHub (`https://github.com/*`)
- ChatGPT (`https://chatgpt.com/*`)
- Google Gemini (`https://gemini.google.com/*`)
- Notion (`https://www.notion.so/*`)

## Planned Features

**Line Movement:**

- `0` - Jump to beginning of line
- `$` - Jump to end of line
- `^` - Jump to first non-whitespace character

**Advanced Word Movement:**

- `e` - Jump to end of current/next word
- `ge` - Jump to end of previous word
- `W`, `B`, `E` - WORD movement (space-separated)

**Text Objects & Selection:**

- Visual mode (`v`, `V`, `Ctrl+v`)
- Word text objects (`aw`, `iw`)
- Paragraph text objects (`ap`, `ip`)
- Quote text objects (`a"`, `i"`, `a'`, `i'`)

**Editing Commands:**

- `dd` - Delete line
- `dw` - Delete word
- `d$` - Delete to end of line
- `u` - Undo
- `Ctrl+r` - Redo

**Search & Navigation:**

- `/` - Search forward
- `?` - Search backward
- `n` - Next search result
- `N` - Previous search result
- `gg` - Go to first line
- `G` - Go to last line

**Copy & Paste:**

- `yy` - Yank (copy) line
- `yw` - Yank word
- `p` - Paste after cursor
- `P` - Paste before cursor

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension will appear in your browser toolbar

## Usage

1. Navigate to any supported website (or add new sites in options)
2. Click on any text field, textarea, or editable element
3. Press `Esc` to enter Normal mode
4. Use vim keybindings to navigate and edit
5. Press `i` to return to Insert mode for regular typing

The mode indicator in the bottom-right corner shows your current mode and will change colors if you have colored indicators enabled.

## Development

This extension uses:

- **Manifest V3** for modern Chrome extension standards
- **Content scripts** for seamless integration with web pages
- **Chrome Storage API** for synchronized settings across devices
- **Universal compatibility** with standard HTML form elements and contentEditable areas

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
