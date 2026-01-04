const browser = globalThis.browser || globalThis.chrome;

console.log('YouTube RotBlock: Background script loaded');

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com')) {
    console.log('YouTube RotBlock: YouTube page loaded, injecting content script');
    browser.scripting.executeScript({
      target: { tabId: tabId },
      files: ['youtube-rotblock-content.js']
    }).catch(err => {
      console.error('YouTube RotBlock: Failed to inject content script:', err);
      browser.tabs.reload(tabId).catch(console.error);
    });
  }
});

browser.runtime.onInstalled.addListener((details) => {
  console.log('YouTube RotBlock: Extension installed/updated', details);
});
