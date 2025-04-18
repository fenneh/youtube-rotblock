console.log('YouTube Smart Filter: Background script loaded');

// Listen for tab updates
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com')) {
    console.log('YouTube Smart Filter: YouTube page loaded, injecting content script');
    browser.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => {
      console.error('YouTube Smart Filter: Failed to inject content script:', err);
      // Try to reload the tab as a fallback
      browser.tabs.reload(tabId).catch(console.error);
    });
  }
});

// Log when the extension is installed or updated
browser.runtime.onInstalled.addListener((details) => {
  console.log('YouTube Smart Filter: Extension installed/updated', details);
}); 