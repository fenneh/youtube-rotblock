const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const browserMock = {
  storage: { local: { get: async (defaults) => ({ ...defaults }) } }
};
globalThis.browser = browserMock;

const { parseViewCount, parseDurationText, hasBlockedKeyword, getVideoSelectorByPath, getSectionTitle, shouldHideSection, isShort, getVideoTitle, getViewCount, getDuration, processVideo, processAllVideos, hideSections, refreshYouTubeGrid, loadSettings, findAllVideos, injectStyles } = require('../youtube-rotblock-content.js');

describe('parseViewCount', () => {
  test('returns null for falsy input', () => {
    assert.equal(parseViewCount(null), null);
    assert.equal(parseViewCount(''), null);
    assert.equal(parseViewCount(undefined), null);
  });

  test('returns null when no digits found', () => {
    assert.equal(parseViewCount('LIVE'), null);
    assert.equal(parseViewCount('watching'), null);
  });

  test('plain numbers', () => {
    assert.equal(parseViewCount('500 views'), 500);
    assert.equal(parseViewCount('1,234 views'), 1234);
    assert.equal(parseViewCount('1,234,567 views'), 1234567);
  });

  test('numbers grouped with spaces', () => {
    assert.equal(parseViewCount('1 234 views'), 1234);
    assert.equal(parseViewCount('707 624 katselukertaa'), 707624);
    assert.equal(parseViewCount('1 234 567 vues'), 1234567);
  });

  test('K suffix', () => {
    assert.equal(parseViewCount('10K views'), 10000);
    assert.equal(parseViewCount('1.5K views'), 1500);
    assert.equal(parseViewCount('5k views'), 5000);
  });

  test('M suffix', () => {
    assert.equal(parseViewCount('2M views'), 2000000);
    assert.equal(parseViewCount('2.5M views'), 2500000);
    assert.equal(parseViewCount('1.5m watching'), 1500000);
  });

  test('B suffix', () => {
    assert.equal(parseViewCount('1B'), 1000000000);
    assert.equal(parseViewCount('1.23B views'), 1230000000);
  });
});

describe('parseDurationText', () => {
  test('returns null for falsy input', () => {
    assert.equal(parseDurationText(null), null);
    assert.equal(parseDurationText(''), null);
    assert.equal(parseDurationText(undefined), null);
  });

  test('returns null for LIVE', () => {
    assert.equal(parseDurationText('LIVE'), null);
  });

  test('mm:ss format', () => {
    assert.equal(parseDurationText('1:00'), 60);
    assert.equal(parseDurationText('10:30'), 630);
    assert.equal(parseDurationText('0:45'), 45);
  });

  test('hh:mm:ss format', () => {
    assert.equal(parseDurationText('1:00:00'), 3600);
    assert.equal(parseDurationText('1:30:00'), 5400);
    assert.equal(parseDurationText('2:15:30'), 8130);
  });
});

describe('getVideoSelectorByPath', () => {
  test('home page', () => {
    assert.equal(getVideoSelectorByPath('/'), 'ytd-rich-item-renderer');
  });

  test('search results', () => {
    assert.equal(getVideoSelectorByPath('/results'), 'ytd-video-renderer');
    assert.equal(getVideoSelectorByPath('/results?search_query=test'), 'ytd-video-renderer');
  });

  test('subscriptions feed', () => {
    assert.equal(getVideoSelectorByPath('/feed/subscriptions'), 'ytd-rich-item-renderer');
  });

  test('channel pages', () => {
    assert.equal(getVideoSelectorByPath('/@channelname'), 'ytd-rich-item-renderer');
    assert.equal(getVideoSelectorByPath('/channel/UCxxx'), 'ytd-rich-item-renderer');
  });

  test('watch page', () => {
    assert.equal(getVideoSelectorByPath('/watch'), 'ytd-compact-video-renderer, yt-lockup-view-model');
    assert.equal(getVideoSelectorByPath('/watch?v=abc123'), 'ytd-compact-video-renderer, yt-lockup-view-model');
  });

  test('unknown path falls back to ytd-rich-item-renderer', () => {
    assert.equal(getVideoSelectorByPath('/playlist'), 'ytd-rich-item-renderer');
    assert.equal(getVideoSelectorByPath('/trending'), 'ytd-rich-item-renderer');
  });
});

describe('hasBlockedKeyword', () => {
  test('returns false when no keywords provided', () => {
    assert.equal(hasBlockedKeyword('some video title', ''), false);
    assert.equal(hasBlockedKeyword('some video title', null), false);
    assert.equal(hasBlockedKeyword('some video title', undefined), false);
  });

  test('matches a blocked keyword', () => {
    assert.equal(hasBlockedKeyword('my reaction video', 'reaction'), true);
  });

  test('matching is case-insensitive', () => {
    assert.equal(hasBlockedKeyword('My REACTION Video', 'reaction'), true);
    assert.equal(hasBlockedKeyword('my reaction video', 'REACTION'), true);
  });

  test('returns false when title does not match any keyword', () => {
    assert.equal(hasBlockedKeyword('cool documentary', 'reaction\nprank'), false);
  });

  test('matches any keyword from a newline-separated list', () => {
    assert.equal(hasBlockedKeyword('epic prank gone wrong', 'reaction\nprank'), true);
  });

  test('ignores blank lines in keyword list', () => {
    assert.equal(hasBlockedKeyword('cool video', '\n\n\n'), false);
    assert.equal(hasBlockedKeyword('cool video', '  \n  \n'), false);
  });
});

function makeItem({ inShortsShelf = false, hasShortsOverlay = false, hasShortsLink = false } = {}) {
  return {
    closest(sel) {
      return sel === 'ytd-rich-shelf-renderer[is-shorts]' && inShortsShelf ? {} : null;
    },
    querySelector(sel) {
      if (sel === 'ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]') return hasShortsOverlay ? {} : null;
      if (sel === '[href*="/shorts/"]') return hasShortsLink ? {} : null;
      return null;
    }
  };
}

describe('isShort', () => {
  test('returns false for a regular video', () => {
    assert.equal(isShort(makeItem()), false);
  });

  test('returns true when item is inside a shorts shelf', () => {
    assert.equal(isShort(makeItem({ inShortsShelf: true })), true);
  });

  test('returns true when item has a shorts overlay badge', () => {
    assert.equal(isShort(makeItem({ hasShortsOverlay: true })), true);
  });

  test('returns true when item contains a /shorts/ link', () => {
    assert.equal(isShort(makeItem({ hasShortsLink: true })), true);
  });
});

function makeSection({ offsetHeight = 100, isShorts = false, hasShortLink = false, title = '' } = {}) {
  return {
    offsetHeight,
    querySelector(sel) {
      if (sel === '[is-shorts]') return isShorts ? {} : null;
      if (sel === 'a[href*="/shorts/"]') return hasShortLink ? {} : null;
      if (title && ['#title-text', '.ytd-rich-shelf-renderer #title', '[id="title"]'].includes(sel)) {
        return { textContent: title };
      }
      return null;
    }
  };
}

const baseConfig = {
  hideShorts: false,
  hideAllShelves: false,
  hideBreakingNews: false,
  hideLatestPosts: false,
  hideLatestVideos: false,
  hidePeopleSearch: false,
  hideExploreTopics: false,
};

describe('getSectionTitle', () => {
  test('returns empty string when no title element found', () => {
    assert.equal(getSectionTitle({ querySelector: () => null }), '');
  });

  test('returns lowercase trimmed title', () => {
    const section = { querySelector: (sel) => sel === '#title-text' ? { textContent: '  Breaking News  ' } : null };
    assert.equal(getSectionTitle(section), 'breaking news');
  });

  test('falls back through alternative selectors', () => {
    const section = { querySelector: (sel) => sel === '[id="title"]' ? { textContent: 'Explore' } : null };
    assert.equal(getSectionTitle(section), 'explore');
  });
});

describe('shouldHideSection', () => {
  test('hides sections with no visible content', () => {
    assert.equal(shouldHideSection(makeSection({ offsetHeight: 0 }), baseConfig), true);
    assert.equal(shouldHideSection(makeSection({ offsetHeight: 50 }), baseConfig), true);
  });

  test('shows visible section with no matching config', () => {
    assert.equal(shouldHideSection(makeSection(), baseConfig), false);
  });

  test('hides shorts shelf when hideShorts is true', () => {
    const cfg = { ...baseConfig, hideShorts: true };
    assert.equal(shouldHideSection(makeSection({ isShorts: true }), cfg), true);
    assert.equal(shouldHideSection(makeSection({ hasShortLink: true }), cfg), true);
  });

  test('does not hide shorts when hideShorts is false', () => {
    assert.equal(shouldHideSection(makeSection({ isShorts: true }), baseConfig), false);
  });

  test('hides all shelves when hideAllShelves is true', () => {
    assert.equal(shouldHideSection(makeSection(), { ...baseConfig, hideAllShelves: true }), true);
  });

  test('hides breaking news section', () => {
    const cfg = { ...baseConfig, hideBreakingNews: true };
    assert.equal(shouldHideSection(makeSection({ title: 'Breaking News' }), cfg), true);
    assert.equal(shouldHideSection(makeSection({ title: 'Latest Videos' }), cfg), false);
  });

  test('hides latest posts section', () => {
    assert.equal(shouldHideSection(makeSection({ title: 'Latest Posts' }), { ...baseConfig, hideLatestPosts: true }), true);
  });

  test('hides latest videos from section', () => {
    assert.equal(shouldHideSection(makeSection({ title: 'Latest Videos from your subscriptions' }), { ...baseConfig, hideLatestVideos: true }), true);
  });

  test('hides people also search section', () => {
    assert.equal(shouldHideSection(makeSection({ title: 'People also search for' }), { ...baseConfig, hidePeopleSearch: true }), true);
  });

  test('hides explore section', () => {
    assert.equal(shouldHideSection(makeSection({ title: 'Explore' }), { ...baseConfig, hideExploreTopics: true }), true);
  });
});

function makeViewCountItem({ __data = undefined, data = undefined, elements = [] } = {}) {
  const item = { querySelectorAll: (_sel) => elements };
  if (__data !== undefined) item.__data = __data;
  if (data !== undefined) item.data = data;
  return item;
}

describe('getViewCount', () => {
  test('returns null when no data and no matching elements', () => {
    assert.equal(getViewCount(makeViewCountItem()), null);
  });

  test('reads from __data.data.viewCountText.simpleText', () => {
    const item = makeViewCountItem({ __data: { data: { viewCountText: { simpleText: '1.5M views' } } } });
    assert.equal(getViewCount(item), 1500000);
  });

  test('reads from data.shortViewCountText.simpleText', () => {
    const item = makeViewCountItem({ data: { shortViewCountText: { simpleText: '10K views' } } });
    assert.equal(getViewCount(item), 10000);
  });

  test('reads from a DOM element containing "views"', () => {
    const item = makeViewCountItem({ elements: [{ textContent: '250K views' }] });
    assert.equal(getViewCount(item), 250000);
  });

  test('reads from a DOM element containing "watching"', () => {
    const item = makeViewCountItem({ elements: [{ textContent: '1.2M watching' }] });
    assert.equal(getViewCount(item), 1200000);
  });

  test('skips elements without "views" or "watching" in text', () => {
    const item = makeViewCountItem({ elements: [{ textContent: '2 days ago' }, { textContent: '99K views' }] });
    assert.equal(getViewCount(item), 99000);
  });

  test('returns null when element text has no view/watching match', () => {
    const item = makeViewCountItem({ elements: [{ textContent: '2 days ago' }] });
    assert.equal(getViewCount(item), null);
  });
});

function makeDurationItem({ badgeText = null, overlayText = null } = {}) {
  return {
    querySelector(sel) {
      if (sel === '.yt-badge-shape__text') return badgeText !== null ? { textContent: badgeText } : null;
      if (sel === 'ytd-thumbnail-overlay-time-status-renderer span') return overlayText !== null ? { textContent: overlayText } : null;
      return null;
    }
  };
}

describe('getDuration', () => {
  test('returns null when no duration element found', () => {
    assert.equal(getDuration(makeDurationItem()), null);
  });

  test('returns duration from .yt-badge-shape__text', () => {
    assert.equal(getDuration(makeDurationItem({ badgeText: '10:30' })), 630);
  });

  test('falls back to ytd-thumbnail-overlay-time-status-renderer span', () => {
    assert.equal(getDuration(makeDurationItem({ overlayText: ' 2:00 ' })), 120);
  });

  test('returns null for LIVE content', () => {
    assert.equal(getDuration(makeDurationItem({ badgeText: 'LIVE' })), null);
  });

  test('handles hh:mm:ss format', () => {
    assert.equal(getDuration(makeDurationItem({ badgeText: '1:30:00' })), 5400);
  });
});

function makeVideoItem(matchSel, textContent = '', titleAttr = null) {
  return {
    querySelector(sel) {
      if (sel === matchSel) {
        return {
          textContent,
          getAttribute(attr) { return attr === 'title' ? titleAttr : null; }
        };
      }
      return null;
    }
  };
}

describe('getVideoTitle', () => {
  test('returns empty string when no title element found', () => {
    assert.equal(getVideoTitle({ querySelector: () => null }), '');
  });

  test('returns lowercased textContent from #video-title', () => {
    assert.equal(getVideoTitle(makeVideoItem('#video-title', 'My VIDEO')), 'my video');
  });

  test('falls back to a#video-title-link', () => {
    assert.equal(getVideoTitle(makeVideoItem('a#video-title-link', 'Linked Title')), 'linked title');
  });

  test('uses title attribute when textContent is empty', () => {
    assert.equal(getVideoTitle(makeVideoItem('[title]', '', 'Attr Title')), 'attr title');
  });

  test('falls back to h3 a', () => {
    assert.equal(getVideoTitle(makeVideoItem('h3 a', 'H3 Title')), 'h3 title');
  });
});

function makeClassList() {
  const classes = new Set();
  return {
    classes,
    add: (c) => classes.add(c),
    remove: (c) => classes.delete(c)
  };
}

function makeProcessItem({
  inShortsShelf = false,
  shortsShelf = null,
  hasShortsOverlay = false,
  titleText = '',
  __data = undefined,
  durationText = null,
  startHidden = false
} = {}) {
  const classList = makeClassList();
  if (startHidden) classList.add('rotblock-hidden');
  const item = {
    classList,
    closest(sel) {
      return sel === 'ytd-rich-shelf-renderer[is-shorts]' && inShortsShelf ? shortsShelf : null;
    },
    querySelector(sel) {
      if (sel === 'ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]') return hasShortsOverlay ? {} : null;
      if (sel === '#video-title') return titleText ? { textContent: titleText, getAttribute: () => null } : null;
      if (sel === '.yt-badge-shape__text') return durationText !== null ? { textContent: durationText } : null;
      return null;
    },
    querySelectorAll: () => []
  };
  if (__data !== undefined) item.__data = __data;
  return item;
}

const processConfig = { hideShorts: false, minViews: 0, minDuration: 0, blockedKeywords: '' };

describe('processVideo', () => {
  test('hides the item when it is a short and hideShorts is on', () => {
    const item = makeProcessItem({ hasShortsOverlay: true });
    processVideo(item, { ...processConfig, hideShorts: true });
    assert.equal(item.classList.classes.has('rotblock-hidden'), true);
  });

  test('hides the shorts shelf instead of the item when nested in one', () => {
    const shelf = { classList: makeClassList() };
    const item = makeProcessItem({ inShortsShelf: true, shortsShelf: shelf, hasShortsOverlay: true });
    processVideo(item, { ...processConfig, hideShorts: true });
    assert.equal(shelf.classList.classes.has('rotblock-hidden'), true);
    assert.equal(item.classList.classes.has('rotblock-hidden'), false);
  });

  test('does not treat shorts specially when hideShorts is off', () => {
    const item = makeProcessItem({ hasShortsOverlay: true });
    processVideo(item, processConfig);
    assert.equal(item.classList.classes.has('rotblock-hidden'), false);
  });

  test('hides the item when the title matches a blocked keyword', () => {
    const item = makeProcessItem({ titleText: 'my reaction video' });
    processVideo(item, { ...processConfig, blockedKeywords: 'reaction' });
    assert.equal(item.classList.classes.has('rotblock-hidden'), true);
  });

  test('hides the item when view count is below the threshold', () => {
    const item = makeProcessItem({ __data: { data: { viewCountText: { simpleText: '500 views' } } } });
    processVideo(item, { ...processConfig, minViews: 1000 });
    assert.equal(item.classList.classes.has('rotblock-hidden'), true);
  });

  test('hides the item when duration is below the threshold', () => {
    const item = makeProcessItem({ durationText: '0:10' });
    processVideo(item, { ...processConfig, minDuration: 120 });
    assert.equal(item.classList.classes.has('rotblock-hidden'), true);
  });

  test('shows a previously hidden item once it passes every check', () => {
    const item = makeProcessItem({
      titleText: 'cool video',
      __data: { data: { viewCountText: { simpleText: '5000 views' } } },
      startHidden: true
    });
    processVideo(item, { ...processConfig, minViews: 1000 });
    assert.equal(item.classList.classes.has('rotblock-hidden'), false);
  });
});

describe('processAllVideos', () => {
  let originalDocument;
  let originalWindow;

  beforeEach(() => {
    originalDocument = globalThis.document;
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  });

  test('applies the configured filters to every video in the feed', () => {
    const lowViews = makeProcessItem({ __data: { data: { viewCountText: { simpleText: '500 views' } } } });
    const enoughViews = makeProcessItem({ __data: { data: { viewCountText: { simpleText: '50K views' } } } });

    globalThis.window = { location: { pathname: '/' } };
    globalThis.document = {
      querySelectorAll: (sel) => sel === 'ytd-rich-item-renderer' ? [lowViews, enoughViews] : []
    };

    processAllVideos();

    assert.equal(lowViews.classList.classes.has('rotblock-hidden'), true);
    assert.equal(enoughViews.classList.classes.has('rotblock-hidden'), false);
  });
});

function makeShelf({ isShorts = false, hasShortsLink = false, startHidden = false } = {}) {
  const classList = makeClassList();
  if (startHidden) classList.add('rotblock-hidden');
  return {
    classList,
    hasAttribute: (attr) => attr === 'is-shorts' && isShorts,
    querySelector: (sel) => (sel === 'a[href*="/shorts/"]' && hasShortsLink ? {} : null)
  };
}

function makeChipShelf(text) {
  return { classList: makeClassList(), textContent: text };
}

function makeFakeDocument({ sections = [], shelves = [], chipShelves = [] } = {}) {
  return {
    querySelectorAll(sel) {
      if (sel === 'ytd-rich-grid-renderer #contents > ytd-rich-section-renderer') return sections;
      if (sel === 'ytd-rich-shelf-renderer') return shelves;
      if (sel === 'ytd-chips-shelf-with-video-shelf-renderer') return chipShelves;
      return [];
    }
  };
}

describe('hideSections', () => {
  let originalDocument;

  beforeEach(() => {
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  test('hides sections that shouldHideSection flags and shows the rest', () => {
    const hidden = { ...makeSection({ offsetHeight: 0 }), classList: makeClassList() };
    const visible = { ...makeSection({ offsetHeight: 100 }), classList: makeClassList() };
    visible.classList.add('rotblock-hidden');
    globalThis.document = makeFakeDocument({ sections: [hidden, visible] });

    hideSections(baseConfig);

    assert.equal(hidden.classList.classes.has('rotblock-hidden'), true);
    assert.equal(visible.classList.classes.has('rotblock-hidden'), false);
  });

  test('hides shorts shelves when hideShorts is on', () => {
    const shelf = makeShelf({ isShorts: true });
    globalThis.document = makeFakeDocument({ shelves: [shelf] });

    hideSections({ ...baseConfig, hideShorts: true });

    assert.equal(shelf.classList.classes.has('rotblock-hidden'), true);
  });

  test('leaves shorts shelves alone when hideShorts is off', () => {
    const shelf = makeShelf({ isShorts: true });
    globalThis.document = makeFakeDocument({ shelves: [shelf] });

    hideSections(baseConfig);

    assert.equal(shelf.classList.classes.has('rotblock-hidden'), false);
  });

  test('hides explore chip shelves when hideExploreTopics is on', () => {
    const chipShelf = makeChipShelf('Explore Gaming');
    globalThis.document = makeFakeDocument({ chipShelves: [chipShelf] });

    hideSections({ ...baseConfig, hideExploreTopics: true });

    assert.equal(chipShelf.classList.classes.has('rotblock-hidden'), true);
  });

  test('does not query chip shelves when hideExploreTopics is off', () => {
    const chipShelf = makeChipShelf('Explore Gaming');
    globalThis.document = makeFakeDocument({ chipShelves: [chipShelf] });

    hideSections(baseConfig);

    assert.equal(chipShelf.classList.classes.has('rotblock-hidden'), false);
  });
});

function makeGrid() {
  const properties = new Map();
  return {
    properties,
    style: {
      setProperty: (name, value) => properties.set(name, value),
      removeProperty: (name) => properties.delete(name)
    }
  };
}

describe('refreshYouTubeGrid', () => {
  let originalDocument;

  beforeEach(() => {
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  test('sets per-row custom properties on every grid when videosPerRow is positive', () => {
    const grid = makeGrid();
    globalThis.document = { querySelectorAll: (sel) => sel === 'ytd-rich-grid-renderer' ? [grid] : [] };

    refreshYouTubeGrid({ videosPerRow: 4 });

    assert.equal(grid.properties.get('--ytd-rich-grid-items-per-row'), 4);
    assert.equal(grid.properties.get('--ytd-rich-grid-posts-per-row'), 4);
    assert.equal(grid.properties.get('--ytd-rich-grid-slim-items-per-row'), 5);
    assert.equal(grid.properties.get('--ytd-rich-grid-game-cards-per-row'), 5);
    assert.equal(grid.properties.get('--ytd-rich-grid-mini-game-cards-per-row'), 4);
  });

  test('removes custom properties when videosPerRow is 0', () => {
    const grid = makeGrid();
    grid.properties.set('--ytd-rich-grid-items-per-row', 4);
    globalThis.document = { querySelectorAll: (sel) => sel === 'ytd-rich-grid-renderer' ? [grid] : [] };

    refreshYouTubeGrid({ videosPerRow: 0 });

    assert.equal(grid.properties.has('--ytd-rich-grid-items-per-row'), false);
  });
});

describe('loadSettings', () => {
  beforeEach(async () => {
    browserMock.storage.local.get = async () => ({ ...DEFAULT_SETTINGS });
    await loadSettings();
  });

  test('reads stored settings using the defaults as a fallback', async () => {
    let requestedDefaults;
    browserMock.storage.local.get = async (defaults) => {
      requestedDefaults = defaults;
      return { ...defaults, minViews: 5000 };
    };

    assert.equal(await loadSettings(), true);
    assert.deepEqual(requestedDefaults, DEFAULT_SETTINGS);
  });

  test('applies the loaded settings to filtering', async () => {
    browserMock.storage.local.get = async (defaults) => ({ ...defaults, minViews: 5000 });

    await loadSettings();

    const item = makeProcessItem({ __data: { data: { viewCountText: { simpleText: '1000 views' } } } });
    processVideo(item);
    assert.equal(item.classList.classes.has('rotblock-hidden'), true);
  });

  test('returns false and keeps the previous settings when storage read fails', async () => {
    browserMock.storage.local.get = async () => { throw new Error('storage unavailable'); };

    assert.equal(await loadSettings(), false);

    const item = makeProcessItem({ __data: { data: { viewCountText: { simpleText: '5000 views' } } } });
    processVideo(item);
    assert.equal(item.classList.classes.has('rotblock-hidden'), true);
  });
});

describe('findAllVideos', () => {
  let originalDocument;
  let originalWindow;

  beforeEach(() => {
    originalDocument = globalThis.document;
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  });

  test('queries the selector for the current path and returns every match', () => {
    const items = [{}, {}];
    let requestedSelector;
    globalThis.window = { location: { pathname: '/results' } };
    globalThis.document = {
      querySelectorAll: (sel) => { requestedSelector = sel; return items; }
    };

    assert.deepEqual(findAllVideos(), items);
    assert.equal(requestedSelector, 'ytd-video-renderer');
  });

  test('uses the feed selector on the homepage', () => {
    let requestedSelector;
    globalThis.window = { location: { pathname: '/' } };
    globalThis.document = {
      querySelectorAll: (sel) => { requestedSelector = sel; return []; }
    };

    findAllVideos();
    assert.equal(requestedSelector, 'ytd-rich-item-renderer');
  });
});

describe('injectStyles', () => {
  let originalDocument;

  function makeStyleDocument(existing) {
    const appended = [];
    return {
      appended,
      getElementById: (id) => (id === 'rotblock-styles' ? existing : null),
      createElement: (tag) => ({ tag, id: '', textContent: '' }),
      head: { appendChild: (el) => appended.push(el) }
    };
  }

  beforeEach(() => {
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  test('appends the hidden-class stylesheet to the head', () => {
    const doc = makeStyleDocument(null);
    globalThis.document = doc;

    injectStyles();

    assert.equal(doc.appended.length, 1);
    assert.equal(doc.appended[0].id, 'rotblock-styles');
    assert.match(doc.appended[0].textContent, /\.rotblock-hidden/);
  });

  test('does not inject a second stylesheet', () => {
    const doc = makeStyleDocument({ id: 'rotblock-styles' });
    globalThis.document = doc;

    injectStyles();

    assert.equal(doc.appended.length, 0);
  });
});
