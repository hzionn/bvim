console.log("[Vim-Extension] Content script loaded.");

// Add CSS for cursor color changes
const addCursorStyles = () => {
  if (document.getElementById('vim-cursor-styles')) return; // Already added
  
  const style = document.createElement('style');
  style.id = 'vim-cursor-styles';
  style.textContent = `
    .vim-normal-mode {
      caret-color: #dc3545 !important; /* Red cursor for normal mode */
    }
    .vim-insert-mode {
      caret-color: #28a745 !important; /* Green cursor for insert mode */
    }
    /* Fallback for older browsers */
    .vim-normal-mode:focus {
      caret-color: #dc3545 !important;
    }
    .vim-insert-mode:focus {
      caret-color: #28a745 !important;
    }
  `;
  document.head.appendChild(style);
  console.log("[Vim-Extension] Cursor color styles added");
};

// Apply cursor color styles immediately
addCursorStyles();

let sites = [];
let enabled = true;
let coloredIndicator = true;
let coloredCursor = true;
let mode = "insert"; // 'insert' or 'normal'
let pendingCommand = null; // For multi-key sequences like 'dw', 'cw'

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
  chrome.storage.sync.get(["sites", "enabled", "coloredIndicator", "coloredCursor"], (data) => {
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
    coloredCursor = data.coloredCursor !== undefined ? data.coloredCursor : true;
    console.log(
      `[Vim-Extension] State updated: Enabled=${enabled}, ColoredIndicator=${coloredIndicator}, ColoredCursor=${coloredCursor}, Sites=${JSON.stringify(sites)}`,
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
  moveWordBackward,
  deleteText,
  deleteWord,
  changeWord
} = window.VimMotions;

// --- Core Logic ---

// Cursor color management
const updateCursorColor = (element) => {
  if (!element || !isEditable(element)) return;
  
  // Remove all vim mode classes
  element.classList.remove('vim-normal-mode', 'vim-insert-mode');
  
  // Only apply cursor colors if the feature is enabled
  if (coloredCursor) {
    // Add appropriate class based on current mode
    if (mode === "normal") {
      element.classList.add('vim-normal-mode');
      console.log("[Vim-Extension] Applied red cursor for normal mode");
    } else if (mode === "insert") {
      element.classList.add('vim-insert-mode');
      console.log("[Vim-Extension] Applied green cursor for insert mode");
    }
  } else {
    console.log("[Vim-Extension] Cursor coloring disabled, not applying colors");
  }
};

const setMode = (newMode) => {
  mode = newMode;
  console.log(`[Vim-Extension] Mode changed to: ${newMode}`);
  updateIndicator();
  
  // Update cursor color for the currently active element
  const activeElement = document.activeElement;
  updateCursorColor(activeElement);
};



const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const siteToRegex = (site) =>
  new RegExp("^" + escapeRegex(site).replace(/\\\*/g, ".*") + "$");

// Add focus event listener to update cursor color when clicking into text fields
document.addEventListener("focusin", (event) => {
  if (isEditable(event.target) && enabled) {
    // Check if current site is in the enabled sites list
    const currentUrl = window.location.href;
    const siteMatch = sites.some((site) => currentUrl.match(siteToRegex(site)));
    
    if (siteMatch) {
      updateCursorColor(event.target);
      console.log("[Vim-Extension] Focus event - updated cursor color");
    }
  }
});

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

    // Update cursor color for the current element
    updateCursorColor(activeElement);

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      pendingCommand = null; // Clear any pending command
      setMode("normal");
      return;
    }

    if (mode === "normal") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const key = event.key.toLowerCase();
      console.log(`[Vim-Extension] Normal mode command: ${key}, pending: ${pendingCommand}`);
      
      // Handle multi-key sequences
      if (pendingCommand) {
        if (key === "w") {
          switch (pendingCommand) {
            case "d":
              console.log("[Vim-Extension] Executing dw (delete word)");
              deleteWord(activeElement);
              break;
            case "c":
              console.log("[Vim-Extension] Executing cw (change word)");
              if (changeWord(activeElement)) {
                setMode("insert");
              }
              break;
          }
        } else {
          console.log(`[Vim-Extension] Invalid motion '${key}' after '${pendingCommand}', canceling command`);
        }
        // Clear pending command after processing (success or failure)
        pendingCommand = null;
        return;
      }
      
      // Handle single key commands and command initiators
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
        case "d":
          pendingCommand = "d";
          console.log("[Vim-Extension] Waiting for motion after 'd'");
          break;
        case "c":
          pendingCommand = "c";
          console.log("[Vim-Extension] Waiting for motion after 'c'");
          break;
        default:
          // Clear any pending command on unrecognized key
          if (pendingCommand) {
            console.log(`[Vim-Extension] Clearing pending command '${pendingCommand}' due to unrecognized key '${key}'`);
            pendingCommand = null;
          }
          break;
      }
    }
  },
  true,
);

