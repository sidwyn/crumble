// Track rejected cookie banners per tab
const tabCounts = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COOKIE_REJECTED' && sender.tab) {
    const tabId = sender.tab.id;
    const count = (tabCounts.get(tabId) || 0) + 1;
    tabCounts.set(tabId, count);

    // Update badge
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId });
    chrome.action.setBadgeText({ text: count.toString(), tabId });
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabCounts.delete(tabId);
});

// Reset count when navigating to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabCounts.delete(tabId);
    chrome.action.setBadgeText({ text: '', tabId });
  }
});
