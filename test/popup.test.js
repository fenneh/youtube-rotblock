const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

require('../youtube-rotblock-config.js');

function createElement() {
  return { value: '', checked: false, textContent: '', className: '' };
}

const elements = {
  minViews: createElement(),
  minDuration: createElement(),
  videosPerRow: createElement(),
  blockedKeywords: createElement(),
  hideShorts: createElement(),
  hideBreakingNews: createElement(),
  hideLatestPosts: createElement(),
  hideLatestVideos: createElement(),
  hidePeopleSearch: createElement(),
  hideExploreTopics: createElement(),
  hideAllShelves: createElement(),
  saveSettings: createElement(),
  statusMessage: createElement()
};

let domLoadHandler;
let saveClickHandler;

global.document = {
  getElementById: (id) => elements[id],
  addEventListener: (event, handler) => {
    if (event === 'DOMContentLoaded') domLoadHandler = handler;
  }
};

elements.saveSettings.addEventListener = (event, handler) => {
  if (event === 'click') saveClickHandler = handler;
};

global.browser = {
  storage: {
    local: {
      get: async (defaults) => ({ ...defaults }),
      set: async () => {}
    }
  },
  tabs: {
    query: async () => [],
    sendMessage: async () => {}
  }
};

require('../youtube-rotblock-popup.js');

beforeEach(() => {
  for (const el of Object.values(elements)) {
    el.value = '';
    el.checked = false;
    el.textContent = '';
    el.className = '';
  }
  global.browser.storage.local.get = async (defaults) => ({ ...defaults });
  global.browser.storage.local.set = async () => {};
  global.browser.tabs.query = async () => [];
  global.browser.tabs.sendMessage = async () => {};
});

describe('popup DOMContentLoaded handler', () => {
  test('populates form fields from stored settings', async () => {
    global.browser.storage.local.get = async () => ({
      minViews: 5000,
      minDuration: 60,
      videosPerRow: 4,
      blockedKeywords: 'clickbait',
      hideShorts: false,
      hideBreakingNews: true,
      hideLatestPosts: true,
      hideLatestVideos: true,
      hidePeopleSearch: true,
      hideExploreTopics: true,
      hideAllShelves: true
    });

    await domLoadHandler();

    assert.equal(elements.minViews.value, 5000);
    assert.equal(elements.minDuration.value, 60);
    assert.equal(elements.videosPerRow.value, 4);
    assert.equal(elements.blockedKeywords.value, 'clickbait');
    assert.equal(elements.hideShorts.checked, false);
    assert.equal(elements.hideBreakingNews.checked, true);
    assert.equal(elements.hideLatestPosts.checked, true);
    assert.equal(elements.hideLatestVideos.checked, true);
    assert.equal(elements.hidePeopleSearch.checked, true);
    assert.equal(elements.hideExploreTopics.checked, true);
    assert.equal(elements.hideAllShelves.checked, true);
  });
});

describe('popup save handler', () => {
  test('saves parsed form values and shows a success message', async () => {
    elements.minViews.value = '2000';
    elements.minDuration.value = '30';
    elements.videosPerRow.value = '3';
    elements.blockedKeywords.value = '  reaction  ';
    elements.hideShorts.checked = true;

    let savedSettings;
    global.browser.storage.local.set = async (settings) => { savedSettings = settings; };

    await saveClickHandler();

    assert.deepEqual(savedSettings, {
      minViews: 2000,
      minDuration: 30,
      videosPerRow: 3,
      blockedKeywords: 'reaction',
      hideShorts: true,
      hideBreakingNews: false,
      hideLatestPosts: false,
      hideLatestVideos: false,
      hidePeopleSearch: false,
      hideExploreTopics: false,
      hideAllShelves: false
    });
    assert.equal(elements.statusMessage.textContent, 'Settings saved!');
    assert.equal(elements.statusMessage.className, 'success');
  });

  test('falls back to 0 for non-numeric fields', async () => {
    elements.minViews.value = 'not a number';
    elements.minDuration.value = '';
    elements.videosPerRow.value = '';

    let savedSettings;
    global.browser.storage.local.set = async (settings) => { savedSettings = settings; };

    await saveClickHandler();

    assert.equal(savedSettings.minViews, 0);
    assert.equal(savedSettings.minDuration, 0);
    assert.equal(savedSettings.videosPerRow, 0);
  });

  test('notifies every matching youtube tab of the settings update', async () => {
    const sent = [];
    global.browser.tabs.query = async () => [{ id: 1 }, { id: 2 }];
    global.browser.tabs.sendMessage = async (tabId, message) => { sent.push({ tabId, message }); };

    await saveClickHandler();

    assert.equal(sent.length, 2);
    assert.equal(sent[0].tabId, 1);
    assert.equal(sent[0].message.type, 'settingsUpdated');
    assert.equal(sent[1].tabId, 2);
  });

  test('ignores tabs that fail to receive the message', async () => {
    global.browser.tabs.query = async () => [{ id: 1 }, { id: 2 }];
    global.browser.tabs.sendMessage = async (tabId) => {
      if (tabId === 1) throw new Error('no content script');
    };

    await assert.doesNotReject(saveClickHandler());
    assert.equal(elements.statusMessage.textContent, 'Settings saved!');
  });

  test('shows an error message when saving fails', async () => {
    global.browser.storage.local.set = async () => { throw new Error('quota exceeded'); };

    await saveClickHandler();

    assert.equal(elements.statusMessage.textContent, 'Error saving settings!');
    assert.equal(elements.statusMessage.className, 'error');
  });
});
