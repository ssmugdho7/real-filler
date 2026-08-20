// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "fillForm",
    title: "Fill this form (Real Filler)",
    contexts: ["all"],
    documentUrlPatterns: ["https://docs.google.com/forms/*"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "fillForm") {
    chrome.tabs.sendMessage(tab.id, { action: "manualFill" });
  }
});

// The chrome.action.onClicked listener is removed because a popup is defined.
// The popup now handles the manual trigger button.
