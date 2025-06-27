// background.js - Service Worker for dynamic script injection
console.log('[Vim-Extension] Background service worker loaded');

// Import shared utilities
importScripts('shared-utils.js');

const { DEFAULT_SITES, siteToRegex, urlMatchesSites } = globalThis.VimSharedUtils;

// Check if URL matches any enabled site
const isUrlEnabled = async (url) => {
  try {
    const { sites = [], enabled = true } = await chrome.storage.sync.get(['sites', 'enabled']);
    
    // If extension is globally disabled, return false
    if (!enabled) {
      console.log('[Vim-Extension] Extension globally disabled');
      return false;
    }
    
    // If no sites configured, initialize with defaults
    if (sites.length === 0) {
      await chrome.storage.sync.set({ sites: DEFAULT_SITES });
      console.log('[Vim-Extension] Initialized with default sites');
      return urlMatchesSites(url, DEFAULT_SITES);
    }
    
    // Check if URL matches any enabled site
    const matches = urlMatchesSites(url, sites);
    console.log(`[Vim-Extension] URL ${url} enabled: ${matches}`);
    return matches;
    
  } catch (error) {
    console.error('[Vim-Extension] Error checking URL enabled status:', error);
    return false;
  }
};

// Inject vim extension scripts
const injectVimScripts = async (tabId, url) => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/shared-utils.js', 'src/vim-motions.js', 'src/vim-state-machine.js', 'src/content.js']
    });
    console.log(`[Vim-Extension] Scripts injected successfully on: ${url}`);
  } catch (error) {
    // Silently fail on pages where injection isn't allowed (like chrome:// pages)
    console.log(`[Vim-Extension] Failed to inject scripts on: ${url}`, error.message);
  }
};

// Listen for tab updates (page loads/navigations)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only act when page is completely loaded and has a valid URL
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    const enabled = await isUrlEnabled(tab.url);
    
    if (enabled) {
      await injectVimScripts(tabId, tab.url);
    } else {
      console.log(`[Vim-Extension] Skipping injection on: ${tab.url}`);
    }
  }
});

// Listen for tab activation (switching between tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && !tab.url.startsWith('chrome://')) {
      const enabled = await isUrlEnabled(tab.url);
      
      if (enabled) {
        // Check if scripts are already injected by trying to access a known global
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: activeInfo.tabId },
            func: () => typeof window.VimStateMachine !== 'undefined'
          });
          
          // If scripts not already injected, inject them
          if (results && results[0] && !results[0].result) {
            await injectVimScripts(activeInfo.tabId, tab.url);
          }
        } catch (error) {
          // If we can't check, try to inject (will fail silently if already there)
          await injectVimScripts(activeInfo.tabId, tab.url);
        }
      }
    }
  } catch (error) {
    console.log('[Vim-Extension] Error handling tab activation:', error.message);
  }
});

// Listen for storage changes to re-evaluate enabled sites
chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace === 'sync' && (changes.sites || changes.enabled)) {
    console.log('[Vim-Extension] Sites or enabled status changed, re-evaluating active tabs');
    
    // Get all active tabs and re-evaluate them
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && !tab.url.startsWith('chrome://')) {
          const enabled = await isUrlEnabled(tab.url);
          
          if (enabled) {
            // Try to inject if not already present
            try {
              const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => typeof window.VimStateMachine !== 'undefined'
              });
              
              if (results && results[0] && !results[0].result) {
                await injectVimScripts(tab.id, tab.url);
              }
            } catch (error) {
              // Silently ignore injection failures
            }
          }
        }
      }
    } catch (error) {
      console.error('[Vim-Extension] Error re-evaluating tabs after storage change:', error);
    }
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('[Vim-Extension] Extension startup');
});

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Vim-Extension] Extension installed/updated:', details.reason);
  
  // Initialize default settings on first install
  if (details.reason === 'install') {
    await chrome.storage.sync.set({
      sites: DEFAULT_SITES,
      enabled: true,
      coloredIndicator: true,
      coloredCursor: true
    });
    console.log('[Vim-Extension] Default settings initialized');
  }
}); 