const browser = globalThis.browser || globalThis.chrome;

const defaultSettings = {
  minViews: 10000,
  minDuration: 120,
  videosPerRow: 0,
  blockedKeywords: '',
  hideShorts: true,
  hideBreakingNews: false,
  hideLatestPosts: false,
  hideLatestVideos: false,
  hidePeopleSearch: false,
  hideExploreTopics: false,
  hideAllShelves: false
};

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await browser.storage.local.get(defaultSettings);

  document.getElementById('minViews').value = settings.minViews;
  document.getElementById('minDuration').value = settings.minDuration;
  document.getElementById('videosPerRow').value = settings.videosPerRow;
  document.getElementById('blockedKeywords').value = settings.blockedKeywords;
  document.getElementById('hideShorts').checked = settings.hideShorts;
  document.getElementById('hideBreakingNews').checked = settings.hideBreakingNews;
  document.getElementById('hideLatestPosts').checked = settings.hideLatestPosts;
  document.getElementById('hideLatestVideos').checked = settings.hideLatestVideos;
  document.getElementById('hidePeopleSearch').checked = settings.hidePeopleSearch;
  document.getElementById('hideExploreTopics').checked = settings.hideExploreTopics;
  document.getElementById('hideAllShelves').checked = settings.hideAllShelves;
});

document.getElementById('saveSettings').addEventListener('click', async () => {
  const settings = {
    minViews: parseInt(document.getElementById('minViews').value) || 0,
    minDuration: parseInt(document.getElementById('minDuration').value) || 0,
    videosPerRow: parseInt(document.getElementById('videosPerRow').value) || 0,
    blockedKeywords: document.getElementById('blockedKeywords').value.trim(),
    hideShorts: document.getElementById('hideShorts').checked,
    hideBreakingNews: document.getElementById('hideBreakingNews').checked,
    hideLatestPosts: document.getElementById('hideLatestPosts').checked,
    hideLatestVideos: document.getElementById('hideLatestVideos').checked,
    hidePeopleSearch: document.getElementById('hidePeopleSearch').checked,
    hideExploreTopics: document.getElementById('hideExploreTopics').checked,
    hideAllShelves: document.getElementById('hideAllShelves').checked
  };

  try {
    await browser.storage.local.set(settings);

    const status = document.getElementById('statusMessage');
    status.textContent = 'Settings saved!';
    status.className = 'success';

    setTimeout(() => {
      status.className = '';
    }, 2000);

    const tabs = await browser.tabs.query({ url: '*://*.youtube.com/*' });
    for (const tab of tabs) {
      try {
        await browser.tabs.sendMessage(tab.id, { type: 'settingsUpdated', settings });
      } catch (err) {
        // Tab might not have content script loaded
      }
    }
  } catch (err) {
    console.error('YouTube RotBlock: Failed to save settings:', err);
    const status = document.getElementById('statusMessage');
    status.textContent = 'Error saving settings!';
    status.className = 'error';
  }
});
