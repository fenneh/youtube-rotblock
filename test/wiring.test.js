const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

require('../youtube-rotblock-config.js');

const CONTENT_PATH = require.resolve('../youtube-rotblock-content.js');

function makeClassList() {
  const classes = new Set();
  return {
    classes,
    add: (c) => classes.add(c),
    remove: (c) => classes.delete(c)
  };
}

function makeVideo({ views = null } = {}) {
  const item = {
    classList: makeClassList(),
    closest: () => null,
    querySelector: () => null
  };
  if (views !== null) {
    item.__data = { data: { viewCountText: { simpleText: `${views} views` } } };
  }
  return item;
}

function setupEnvironment({ hostname = 'www.youtube.com' } = {}) {
  const documentListeners = {};
  const windowListeners = {};
  const appended = [];
  const items = [];
  let messageHandler = null;
  let feedQueries = 0;

  const doc = {
    readyState: 'loading',
    body: {},
    head: { appendChild: (el) => appended.push(el) },
    getElementById: () => null,
    createElement: (tag) => ({ tag, id: '', textContent: '' }),
    addEventListener: (event, handler) => { documentListeners[event] = handler; },
    querySelectorAll: (selector) => {
      if (selector === '.rotblock-hidden') {
        return items.filter((item) => item.classList.classes.has('rotblock-hidden'));
      }
      if (selector === 'ytd-rich-item-renderer') {
        feedQueries += 1;
        return items;
      }
      return [];
    }
  };

  const window = {
    location: { hostname, pathname: '/' },
    addEventListener: (event, handler) => { windowListeners[event] = handler; }
  };

  const browser = {
    storage: { local: { get: async (defaults) => ({ ...defaults }) } },
    runtime: { onMessage: { addListener: (handler) => { messageHandler = handler; } } }
  };

  const observer = { callback: null, target: null };
  globalThis.MutationObserver = class {
    constructor(callback) {
      observer.callback = callback;
    }
    observe(target) {
      observer.target = target;
    }
  };

  globalThis.document = doc;
  globalThis.window = window;
  globalThis.location = window.location;
  globalThis.browser = browser;

  return {
    doc,
    browser,
    items,
    appended,
    observer,
    documentListeners,
    windowListeners,
    getMessageHandler: () => messageHandler,
    getFeedQueries: () => feedQueries,
    resetFeedQueries: () => { feedQueries = 0; }
  };
}

function loadContentScript() {
  delete require.cache[CONTENT_PATH];
  require(CONTENT_PATH);
}

describe('init', () => {
  test('does nothing outside www.youtube.com', async () => {
    const env = setupEnvironment({ hostname: 'm.youtube.com' });
    let storageReads = 0;
    env.browser.storage.local.get = async () => {
      storageReads += 1;
      return {};
    };
    loadContentScript();

    await env.documentListeners.DOMContentLoaded();

    assert.equal(storageReads, 0);
    assert.equal(env.appended.length, 0);
    assert.equal(env.observer.callback, null);
  });

  test('injects styles, loads settings, filters the feed and starts observing', async () => {
    const env = setupEnvironment();
    const video = makeVideo({ views: 500 });
    env.items.push(video);
    loadContentScript();

    await env.documentListeners.DOMContentLoaded();

    assert.equal(env.appended.length, 1);
    assert.equal(env.appended[0].id, 'rotblock-styles');
    assert.equal(video.classList.classes.has('rotblock-hidden'), true);
    assert.equal(env.observer.target, env.doc.body);
  });
});

describe('mutation observer', () => {
  test('reprocesses the feed once per burst of DOM changes', async () => {
    const env = setupEnvironment();
    loadContentScript();
    await env.documentListeners.DOMContentLoaded();

    const video = makeVideo({ views: 500 });
    env.items.push(video);
    env.resetFeedQueries();

    env.observer.callback();
    env.observer.callback();
    await new Promise((resolve) => setTimeout(resolve, 150));

    assert.equal(env.getFeedQueries(), 1);
    assert.equal(video.classList.classes.has('rotblock-hidden'), true);
  });
});

describe('settingsUpdated message', () => {
  test('applies the new settings, unfilters videos and responds', async () => {
    const env = setupEnvironment();
    const video = makeVideo({ views: 500 });
    env.items.push(video);
    loadContentScript();
    await env.documentListeners.DOMContentLoaded();
    assert.equal(video.classList.classes.has('rotblock-hidden'), true);

    let response;
    env.getMessageHandler()(
      { type: 'settingsUpdated', settings: { ...DEFAULT_SETTINGS, minViews: 0 } },
      {},
      (result) => { response = result; }
    );

    assert.equal(video.classList.classes.has('rotblock-hidden'), false);
    assert.deepEqual(response, { success: true });
  });
});

describe('yt-navigate-finish', () => {
  test('reprocesses the feed after in-page navigation', async () => {
    const env = setupEnvironment();
    loadContentScript();
    await env.documentListeners.DOMContentLoaded();

    const video = makeVideo({ views: 500 });
    env.items.push(video);

    env.windowListeners['yt-navigate-finish']();

    assert.equal(video.classList.classes.has('rotblock-hidden'), true);
  });
});
