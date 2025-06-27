console.log("[Vim-Extension] Content script loaded.");

let sites = [];
let enabled = true;
let mode = "insert"; // 'insert' or 'normal'

let currentSiteMatch = false;

const modeIndicator = document.createElement("div");
modeIndicator.style.position = "fixed";
modeIndicator.style.bottom = "10px";
modeIndicator.style.right = "10px";
modeIndicator.style.background = "rgba(0, 0, 0, 0.7)";
modeIndicator.style.color = "#fff";
modeIndicator.style.padding = "2px 6px";
modeIndicator.style.borderRadius = "4px";
modeIndicator.style.fontSize = "12px";
modeIndicator.style.fontFamily = "monospace";
modeIndicator.style.zIndex = "2147483647";
modeIndicator.style.pointerEvents = "none";
modeIndicator.style.display = "none";
document.documentElement.appendChild(modeIndicator);

const updateIndicator = () => {
  if (enabled && currentSiteMatch) {
    modeIndicator.textContent = mode.toUpperCase();
    modeIndicator.style.display = "block";
  } else {
    modeIndicator.style.display = "none";
  }
};

// --- State Management ---

// Default sites that will be pre-added on first install
const defaultSites = [
  "https://github.com/*",
  "https://chatgpt.com/*",
  "https://gemini.google.com/*",
  "https://www.notion.so/*"
];

const updateState = () => {
  chrome.storage.sync.get(["sites", "enabled"], (data) => {
    // If no sites exist, initialize with defaults
    if (!data.sites || data.sites.length === 0) {
      sites = [...defaultSites];
      chrome.storage.sync.set({ sites }); // Save defaults to storage
      console.log("[Vim-Extension] Initialized with default sites");
    } else {
      sites = data.sites;
    }

    enabled = data.enabled !== undefined ? data.enabled : true;
    console.log(
      `[Vim-Extension] State updated: Enabled=${enabled}, Sites=${JSON.stringify(sites)}`,
    );
    updateIndicator();
  });
};

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "sync") {
    console.log("[Vim-Extension] Storage changed, updating state.");
    updateState();
    if (changes.enabled && !changes.enabled.newValue) {
      mode = "insert";
    }
    updateIndicator();
  }
});

updateState();

// --- Element & Cursor Abstraction ---

const isEditable = (element) => {
  if (!element) return false;
  const tagName = element.tagName;
  const isEditable =
    tagName === "TEXTAREA" || tagName === "INPUT" || element.isContentEditable;
  console.log(
    `[Vim-Extension] Checking if element is editable: <${element.tagName}>, result: ${isEditable}`,
  );
  return isEditable;
};

const getText = (element) => {
  if (element.tagName === "TEXTAREA" || element.tagName === "INPUT")
    return element.value;
  if (element.isContentEditable) {
    // For contentEditable, we need to preserve line breaks
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);
    // Replace <br> tags with newlines
    clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    // Replace block elements (div, p) with newlines  
    clone.querySelectorAll('div, p').forEach(block => {
      if (block.nextSibling) {
        block.after('\n');
      }
    });
    return clone.textContent || clone.innerText || '';
  }
  return "";
};

const getCursorPosition = (element) => {
  if (element.tagName === "TEXTAREA" || element.tagName === "INPUT")
    return element.selectionStart;
  if (element.isContentEditable) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  }
  return 0;
};

const setCursorPosition = (element, position) => {
  if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
    element.focus();
    element.setSelectionRange(position, position);
  } else if (element.isContentEditable) {
    element.focus();
    let charIndex = 0;
    const range = document.createRange();
    range.setStart(element, 0);
    range.collapse(true);
    const nodeStack = [element];
    let node,
      foundStart = false;
    while (!foundStart && (node = nodeStack.pop())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const nextCharIndex = charIndex + node.length;
        if (position >= charIndex && position <= nextCharIndex) {
          range.setStart(node, position - charIndex);
          foundStart = true;
        }
        charIndex = nextCharIndex;
      } else {
        let i = node.childNodes.length;
        while (i--) nodeStack.push(node.childNodes[i]);
      }
    }
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

// --- Core Logic ---

const setMode = (newMode) => {
  mode = newMode;
  console.log(`[Vim-Extension] Mode changed to: ${newMode}`);
  updateIndicator();
};

const getLineInfo = (text, cursor) => {
  const lines = text.split("\n");

  let lineIndex = 0,
    lineStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (cursor <= lineStart + line.length) {
      lineIndex = i;
      break;
    }
    lineStart += line.length + 1;
  }

  return { lines, lineIndex, lineStart };
};

// --- Universal Movement Functions ---

const moveLeft = (element) => {
  const cursor = getCursorPosition(element);
  if (cursor > 0) {
    setCursorPosition(element, cursor - 1);
    return true;
  }
  return false;
};

const moveRight = (element) => {
  const cursor = getCursorPosition(element);
  const text = getText(element);
  if (cursor < text.length) {
    setCursorPosition(element, cursor + 1);
    return true;
  }
  return false;
};

const moveUp = (element) => {
  const cursor = getCursorPosition(element);
  const text = getText(element);
  const { lines, lineIndex, lineStart } = getLineInfo(text, cursor);

  if (lineIndex > 0) {
    const cursorInLine = cursor - lineStart;
    let prevLineStart = 0;
    for (let i = 0; i < lineIndex - 1; i++) {
      prevLineStart += lines[i].length + 1;
    }
    const newCursor = prevLineStart + Math.min(cursorInLine, lines[lineIndex - 1].length);
    setCursorPosition(element, newCursor);
    return true;
  }
  return false;
};

const moveDown = (element) => {
  const cursor = getCursorPosition(element);
  const text = getText(element);
  const { lines, lineIndex, lineStart } = getLineInfo(text, cursor);

  if (lineIndex < lines.length - 1) {
    const cursorInLine = cursor - lineStart;
    const nextLineStart = lineStart + lines[lineIndex].length + 1;
    const newCursor = nextLineStart + Math.min(cursorInLine, lines[lineIndex + 1].length);
    setCursorPosition(element, newCursor);
    return true;
  }
  return false;
};

const moveWordForward = (element) => {
  const cursor = getCursorPosition(element);
  const text = getText(element);
  let pos = cursor;
  while (pos < text.length && /\w/.test(text[pos])) pos++;
  while (pos < text.length && /\s/.test(text[pos])) pos++;
  setCursorPosition(element, pos);
  return true;
};

const moveWordBackward = (element) => {
  const cursor = getCursorPosition(element);
  const text = getText(element);
  let pos = cursor;
  if (pos > 0) pos--;
  while (pos > 0 && /\s/.test(text[pos])) pos--;
  while (pos > 0 && /\w/.test(text[pos - 1])) pos--;
  setCursorPosition(element, pos);
  return true;
};

const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const siteToRegex = (site) =>
  new RegExp("^" + escapeRegex(site).replace(/\\\*/g, ".*") + "$");

document.addEventListener(
  "keydown",
  (event) => {
    console.log(`[Vim-Extension] Keydown event: ${event.key}`);
    const currentUrl = window.location.href;
    currentSiteMatch = sites.some((site) => currentUrl.match(siteToRegex(site)));
    console.log(`[Vim-Extension] Current URL: ${currentUrl}`);
    console.log(`[Vim-Extension] Sites list: ${JSON.stringify(sites)}`);
    console.log(`[Vim-Extension] Site match: ${currentSiteMatch}, Enabled: ${enabled}`);
    updateIndicator();

    const activeElement = document.activeElement;

    // --- UNIVERSAL ARROW KEYS (work regardless of site/enabled state) ---
    if (isEditable(activeElement)) {
      const key = event.key.toLowerCase();
      let handled = false;

      switch (key) {
        case "arrowleft":
          console.log("[Vim-Extension] Universal arrow left");
          event.preventDefault();
          handled = moveLeft(activeElement);
          break;
        case "arrowright":
          console.log("[Vim-Extension] Universal arrow right");
          event.preventDefault();
          handled = moveRight(activeElement);
          break;
        case "arrowup":
          console.log("[Vim-Extension] Universal arrow up");
          event.preventDefault();
          handled = moveUp(activeElement);
          break;
        case "arrowdown":
          console.log("[Vim-Extension] Universal arrow down");
          event.preventDefault();
          handled = moveDown(activeElement);
          break;
      }

      if (handled) {
        event.stopPropagation();
        event.stopImmediatePropagation();
        return; // Exit early, arrow key was handled
      }
    }

    // --- SITE-SPECIFIC VIM FUNCTIONALITY ---
    if (!enabled || !currentSiteMatch) {
      console.log("[Vim-Extension] Not active on this site or disabled.");
      return;
    }

    console.log("[Vim-Extension] Active element:", activeElement);
    if (!isEditable(activeElement)) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setMode("normal");
      return;
    }

    if (mode === "normal") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const key = event.key.toLowerCase();
      console.log(`[Vim-Extension] Normal mode command: ${key}`);
      const cursor = getCursorPosition(activeElement);
      const text = getText(activeElement);
      switch (key) {
        case "i":
          setMode("insert");
          break;
        case "h":
        case "arrowleft":
          moveLeft(activeElement);
          break;
        case "l":
        case "arrowright":
          moveRight(activeElement);
          break;
        case "k":
        case "arrowup":
          moveUp(activeElement);
          break;
        case "j":
        case "arrowdown":
          moveDown(activeElement);
          break;
        case "w":
          moveWordForward(activeElement);
          break;
        case "b":
          moveWordBackward(activeElement);
          break;
      }
    }
  },
  true,
);

