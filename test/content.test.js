const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseViewCount, parseDurationText, hasBlockedKeyword, getVideoSelectorByPath, getSectionTitle, shouldHideSection, isShort } = require('../youtube-rotblock-content.js');

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
