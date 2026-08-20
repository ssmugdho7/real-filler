// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "fillForm",
    title: "Fill this page (Real Filler)",
    contexts: ["all"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "fillForm") {
    chrome.tabs.sendMessage(tab.id, { action: "manualFill" });
  }
});
