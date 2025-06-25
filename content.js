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

const updateState = () => {
  chrome.storage.sync.get(["sites", "enabled"], (data) => {
    sites = data.sites || [];
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
  if (element.isContentEditable) return element.textContent;
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
    updateIndicator();

    if (!enabled || !currentSiteMatch) {
      console.log("[Vim-Extension] Not active on this site or disabled.");
      return;
    }

    const activeElement = document.activeElement;
    console.log("[Vim-Extension] Active element:", activeElement);
    if (!isEditable(activeElement)) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setMode("normal");
      return;
    }

    if (mode === "normal") {
      event.preventDefault();
      event.stopPropagation();
      console.log(`[Vim-Extension] Normal mode command: ${event.key}`);
      const cursor = getCursorPosition(activeElement);
      const text = getText(activeElement);
      switch (event.key) {
        case "i":
          setMode("insert");
          break;
        case "h":
          if (cursor > 0) setCursorPosition(activeElement, cursor - 1);
          break;
        case "l":
          if (cursor < text.length)
            setCursorPosition(activeElement, cursor + 1);
          break;
        case "k": {
          const { lines, lineIndex, lineStart } = getLineInfo(text, cursor);
          if (lineIndex > 0) {
            const cursorInLine = cursor - lineStart;
            const prevLineStart = text.lastIndexOf("\n", lineStart - 2) + 1;
            const newCursor =
              prevLineStart +
              Math.min(cursorInLine, lines[lineIndex - 1].length);
            setCursorPosition(activeElement, newCursor);
          }
          break;
        }
        case "j": {
          const { lines, lineIndex, lineStart } = getLineInfo(text, cursor);
          if (lineIndex < lines.length - 1) {
            const cursorInLine = cursor - lineStart;
            const nextLineStart = lineStart + lines[lineIndex].length + 1;
            const newCursor =
              nextLineStart +
              Math.min(cursorInLine, lines[lineIndex + 1].length);
            setCursorPosition(activeElement, newCursor);
          }
          break;
        }
      }
    }
  },
  true,
);

