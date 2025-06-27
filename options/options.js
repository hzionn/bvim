const sitesList = document.getElementById("sites-list");
const addSiteForm = document.getElementById("add-site-form");
const newSiteInput = document.getElementById("new-site");
const toggleButton = document.getElementById("toggle-enabled");

let sites = [];
let enabled = true;

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

// Get the initial state from storage and render
chrome.storage.sync.get(["sites", "enabled"], (data) => {
  sites = data.sites || [];
  enabled = data.enabled !== undefined ? data.enabled : true;
  renderSites();
  renderToggle();
});
