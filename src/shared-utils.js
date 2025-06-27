// shared-utils.js - Shared utilities between background and content scripts

(function() {
  'use strict';

  // Default sites that will be pre-added on first install
  const DEFAULT_SITES = [
    "https://github.com/*",
    "https://chatgpt.com/*",
    "https://gemini.google.com/*",
    "https://www.notion.so/*"
  ];

  // Helper function to escape regex special characters
  const escapeRegex = (str) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  // Convert site pattern to regex for URL matching
  const siteToRegex = (site) => {
    const escapedSite = escapeRegex(site);
    return new RegExp("^" + escapedSite.replace(/\\\*/g, ".*") + "$");
  };

  // Check if a URL matches any site in the provided sites array
  const urlMatchesSites = (url, sites) => {
    return sites.some(site => url.match(siteToRegex(site)));
  };

  // Export to global scope for use in both background and content scripts
  // Check if we're in a service worker (no window object) or content script
  const exportTarget = typeof window !== 'undefined' ? window : globalThis;
  
  exportTarget.VimSharedUtils = {
    DEFAULT_SITES,
    escapeRegex,
    siteToRegex,
    urlMatchesSites
  };

  console.log('[Vim-Extension] Shared utilities loaded');
})(); 