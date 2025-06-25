const sitesList = document.getElementById("sites-list");
const addSiteForm = document.getElementById("add-site-form");
const newSiteInput = document.getElementById("new-site");

let sites = [];

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

chrome.storage.sync.get("sites", (data) => {
  sites = data.sites || [];
  renderSites();
});
