console.log("[Vim-Extension] Content script loaded.");

let sites = [];
let enabled = true;
let coloredIndicator = true;
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
    
    // Apply colors based on user preference and mode
    if (coloredIndicator) {
      if (mode === "normal") {
        modeIndicator.style.background = "rgba(220, 53, 69, 0.8)"; // Red for normal mode
        modeIndicator.style.color = "#fff";
      } else if (mode === "insert") {
        modeIndicator.style.background = "rgba(40, 167, 69, 0.8)"; // Green for insert mode
        modeIndicator.style.color = "#fff";
      }
    } else {
      // Default color when colored indicator is disabled
      modeIndicator.style.background = "rgba(0, 0, 0, 0.7)";
      modeIndicator.style.color = "#fff";
    }
    
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
  chrome.storage.sync.get(["sites", "enabled", "coloredIndicator"], (data) => {
    // If no sites exist, initialize with defaults
    if (!data.sites || data.sites.length === 0) {
      sites = [...defaultSites];
      chrome.storage.sync.set({ sites }); // Save defaults to storage
      console.log("[Vim-Extension] Initialized with default sites");
    } else {
      sites = data.sites;
    }

    enabled = data.enabled !== undefined ? data.enabled : true;
    coloredIndicator = data.coloredIndicator !== undefined ? data.coloredIndicator : true;
    console.log(
      `[Vim-Extension] State updated: Enabled=${enabled}, ColoredIndicator=${coloredIndicator}, Sites=${JSON.stringify(sites)}`,
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

// Import vim motion functions from vim-motions.js
// Since vim-motions.js is loaded first, window.VimMotions is available
const { 
  isEditable, 
  getText, 
  getCursorPosition, 
  setCursorPosition, 
  getLineInfo,
  moveLeft,
  moveRight,
  moveUp,
  moveDown,
  moveWordForward,
  moveWordBackward
} = window.VimMotions;

// --- Core Logic ---

const setMode = (newMode) => {
  mode = newMode;
  console.log(`[Vim-Extension] Mode changed to: ${newMode}`);
  updateIndicator();
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

