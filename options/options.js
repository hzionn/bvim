const sitesList = document.getElementById("sites-list");
const addSiteForm = document.getElementById("add-site-form");
const newSiteInput = document.getElementById("new-site");
const toggleButton = document.getElementById("toggle-enabled");
const coloredIndicatorCheckbox = document.getElementById("colored-indicator");

let sites = [];
let enabled = true;
let coloredIndicator = true;

const renderSites = () => {
  sitesList.innerHTML = "";
  sites.forEach((site, index) => {
    const li = document.createElement("li");
    li.textContent = site;
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      sites.splice(index, 1);
      chrome.storage.sync.set({ sites });
      renderSites();
    });
    li.appendChild(removeButton);
    sitesList.appendChild(li);
  });
};

const renderToggle = () => {
  toggleButton.textContent = enabled ? "Disable" : "Enable";
};

const renderColoredIndicator = () => {
  coloredIndicatorCheckbox.checked = coloredIndicator;
};

addSiteForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const newSite = newSiteInput.value;
  if (newSite) {
    sites.push(newSite);
    chrome.storage.sync.set({ sites });
    newSiteInput.value = "";
    renderSites();
  }
});

toggleButton.addEventListener("click", () => {
  enabled = !enabled;
  chrome.storage.sync.set({ enabled });
  renderToggle();
});

coloredIndicatorCheckbox.addEventListener("change", () => {
  coloredIndicator = coloredIndicatorCheckbox.checked;
  chrome.storage.sync.set({ coloredIndicator });
});

// Get the initial state from storage and render
chrome.storage.sync.get(["sites", "enabled", "coloredIndicator"], (data) => {
  sites = data.sites || [];
  enabled = data.enabled !== undefined ? data.enabled : true;
  coloredIndicator = data.coloredIndicator !== undefined ? data.coloredIndicator : true;
  renderSites();
  renderToggle();
  renderColoredIndicator();
});
