const toggleButton = document.getElementById("toggle-enabled");
const optionsLink = document.getElementById("options-link");

let enabled = false;

const render = () => {
  toggleButton.textContent = enabled ? "Disable" : "Enable";
};

toggleButton.addEventListener("click", () => {
  enabled = !enabled;
  // Set the value in storage. The content script will pick up the change.
  chrome.storage.sync.set({ enabled });
  render();
});

optionsLink.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// Get the initial state from storage and render the button.
chrome.storage.sync.get("enabled", (data) => {
  enabled = data.enabled || false;
  render();
});
