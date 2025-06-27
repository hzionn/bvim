(function () {
  'use strict';

  // Guard against multiple script injections
  if (window.VimExtensionLoaded) {
    console.log("[Vim-Extension] Content script already loaded, skipping");
    return;
  }
  window.VimExtensionLoaded = true;

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
  let currentSiteMatch = false;

  // Initialize the FSM
  let vimFSM = null;

  // Initialize FSM when available
  const initializeFSM = () => {
    if (window.VimStateMachine && !vimFSM) {
      vimFSM = new window.VimStateMachine();

      // Add listener for state changes
      vimFSM.addListener((stateInfo) => {
        console.log(`[Vim-Extension] FSM state changed: ${stateInfo.oldState} → ${stateInfo.newState}`);
        updateIndicator();

        // Update cursor color for current element
        const activeElement = document.activeElement;
        if (activeElement) {
          updateCursorColor(activeElement);
        }
      });

      console.log("[Vim-Extension] FSM initialized successfully");
      return true;
    }
    return false;
  };

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
    if (enabled && currentSiteMatch && vimFSM) {
      modeIndicator.textContent = vimFSM.getDisplayName();

      // Apply colors based on user preference and mode
      if (coloredIndicator) {
        if (vimFSM.isNormalMode()) {
          modeIndicator.style.background = "rgba(220, 53, 69, 0.8)"; // Red for normal mode
          modeIndicator.style.color = "#fff";
        } else if (vimFSM.isInsertMode()) {
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

  // Import shared utilities (injected before this script)
  const { DEFAULT_SITES, siteToRegex, urlMatchesSites } = window.VimSharedUtils;

  const updateState = () => {
    chrome.storage.sync.get(["sites", "enabled", "coloredIndicator", "coloredCursor"], (data) => {
      // If no sites exist, initialize with defaults
      if (!data.sites || data.sites.length === 0) {
        sites = [...DEFAULT_SITES];
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
      if (changes.enabled && !changes.enabled.newValue && vimFSM) {
        vimFSM.setState("INSERT");
      }
      updateIndicator();
    }
  });

  updateState();

  // Initialize FSM
  initializeFSM();

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
    if (!element || !isEditable(element) || !vimFSM) return;

    // Remove all vim mode classes
    element.classList.remove('vim-normal-mode', 'vim-insert-mode');

    // Only apply cursor colors if the feature is enabled
    if (coloredCursor) {
      // Add appropriate class based on current FSM state
      const cursorClass = vimFSM.getCursorClass();
      if (cursorClass) {
        element.classList.add(cursorClass);
        console.log(`[Vim-Extension] Applied cursor class '${cursorClass}' for state '${vimFSM.getDisplayName()}'`);
      }
    } else {
      console.log("[Vim-Extension] Cursor coloring disabled, not applying colors");
    }
  };

  // FSM-based mode management (setMode is now handled by the FSM)
  // This is a compatibility function for any remaining legacy code
  const setMode = (newMode) => {
    if (!vimFSM) {
      console.warn("[Vim-Extension] setMode called but FSM not initialized");
      return;
    }

    // Map old mode names to FSM states
    const stateMap = {
      'insert': 'INSERT',
      'normal': 'NORMAL'
    };

    const fsmState = stateMap[newMode];
    if (fsmState) {
      vimFSM.setState(fsmState);
    } else {
      console.warn(`[Vim-Extension] Unknown mode: ${newMode}`);
    }
  };



  // Add focus event listener to update cursor color when clicking into text fields
  document.addEventListener("focusin", (event) => {
    if (isEditable(event.target) && enabled) {
      // Check if current site is in the enabled sites list
      const currentUrl = window.location.href;
      const siteMatch = urlMatchesSites(currentUrl, sites);

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
      currentSiteMatch = urlMatchesSites(currentUrl, sites);
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

      // FSM-based input handling
      if (!vimFSM) {
        console.warn("[Vim-Extension] FSM not initialized, skipping vim processing");
        return;
      }

      // Process the input through the FSM
      const key = event.key === "Escape" ? "Escape" : event.key.toLowerCase();
      const result = vimFSM.processInput(key, activeElement);

      const shouldPrevent = vimFSM.isNormalMode() || vimFSM.isPendingCommand() || result.stateChanged || result.action;
      if (shouldPrevent) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }

      // If FSM handled the input, prevent default behavior
      if (result.stateChanged || result.action) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }

      // Execute any action returned by the FSM
      if (result.action && result.actionData) {
        const { element } = result.actionData;
        console.log(`[Vim-Extension] Executing action: ${result.action}`);

        // Map FSM action names to actual functions
        const actionMap = {
          'moveLeft': () => moveLeft(element),
          'moveRight': () => moveRight(element),
          'moveUp': () => moveUp(element),
          'moveDown': () => moveDown(element),
          'moveWordForward': () => moveWordForward(element),
          'moveWordBackward': () => moveWordBackward(element),
          'deleteWord': () => deleteWord(element),
          'changeWord': () => changeWord(element)
        };

        const actionFn = actionMap[result.action];
        if (actionFn) {
          actionFn();
        } else {
          console.warn(`[Vim-Extension] Unknown action: ${result.action}`);
        }
      }
    },
    true,
  );

})(); // End of IIFE

