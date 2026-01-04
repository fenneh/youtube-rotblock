const browser = globalThis.browser || globalThis.chrome;

let config = {
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

function getVideoSelectorByPath() {
  const path = window.location.pathname;
  if (path === '/') {
    return 'ytd-rich-item-renderer';
  } else if (path.startsWith('/results')) {
    return 'ytd-video-renderer';
  } else if (path.startsWith('/feed/subscriptions')) {
    return 'ytd-rich-item-renderer';
  } else if (path.startsWith('/@') || path.startsWith('/channel/')) {
    return 'ytd-rich-item-renderer';
  } else if (path.startsWith('/watch')) {
    return 'ytd-compact-video-renderer, yt-lockup-view-model';
  } else {
    return 'ytd-rich-item-renderer';
  }
}

function findAllVideos() {
  const selector = getVideoSelectorByPath();
  return Array.from(document.querySelectorAll(selector));
}

async function loadSettings() {
  try {
    const settings = await browser.storage.local.get({
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
    });
    config = settings;
    return true;
  } catch (err) {
    console.error('YouTube RotBlock: Failed to load settings:', err);
    return false;
  }
}

function injectStyles() {
  if (document.getElementById('rotblock-styles')) return;
  const style = document.createElement('style');
  style.id = 'rotblock-styles';
  style.textContent = `
    .rotblock-hidden {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function hideElement(el) {
  if (el) {
    el.classList.add('rotblock-hidden');
  }
}

function showElement(el) {
  if (el) {
    el.classList.remove('rotblock-hidden');
  }
}

function parseViewCount(text) {
  if (!text) return null;
  const match = text.match(/([\d,.]+)\s*([KMB]?)/i);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/,/g, ''));
  const suffix = match[2].toUpperCase();
  const multiplier = suffix === 'K' ? 1000 : suffix === 'M' ? 1000000 : suffix === 'B' ? 1000000000 : 1;
  return Math.floor(num * multiplier);
}

function getViewCount(item) {
  try {
    const data = item.__data?.data || item.data;
    if (data?.viewCountText?.simpleText) {
      return parseViewCount(data.viewCountText.simpleText);
    }
    if (data?.shortViewCountText?.simpleText) {
      return parseViewCount(data.shortViewCountText.simpleText);
    }
  } catch (e) {}

  const selectors = [
    '.yt-content-metadata-view-model__metadata-text',
    'span.inline-metadata-item',
    '#metadata-line span',
    '.shortsLockupViewModelHostMetadataSubhead span'
  ];

  for (const selector of selectors) {
    const elements = item.querySelectorAll(selector);
    for (const el of elements) {
      const text = el.textContent;
      if (/views|watching/i.test(text)) {
        return parseViewCount(text);
      }
    }
  }
  return null;
}

function getDuration(item) {
  const durationEl = item.querySelector('.yt-badge-shape__text') ||
                     item.querySelector('ytd-thumbnail-overlay-time-status-renderer span');
  if (!durationEl) return null;

  const text = durationEl.textContent.trim();
  if (text === 'LIVE') return null;

  const parts = text.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

function getVideoTitle(item) {
  const titleEl = item.querySelector('#video-title') ||
                  item.querySelector('a#video-title-link') ||
                  item.querySelector('[title]') ||
                  item.querySelector('h3 a');

  if (titleEl) {
    return (titleEl.textContent || titleEl.getAttribute('title') || '').toLowerCase();
  }
  return '';
}

function isShort(item) {
  const shortsShelf = item.closest('ytd-rich-shelf-renderer[is-shorts]');
  if (shortsShelf) return true;
  if (item.querySelector('ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]')) return true;
  if (item.querySelector('[href*="/shorts/"]')) return true;
  return false;
}

function hasBlockedKeyword(title) {
  if (!config.blockedKeywords) return false;

  const keywords = config.blockedKeywords
    .split('\n')
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);

  return keywords.some(keyword => title.includes(keyword));
}

function processVideo(item) {
  const selector = getVideoSelectorByPath();
  const container = item.closest(selector);
  if (!container) return;

  const viewCount = getViewCount(container);
  const duration = getDuration(container);
  const title = getVideoTitle(container);

  if (config.hideShorts && isShort(container)) {
    const shortsShelf = container.closest('ytd-rich-shelf-renderer[is-shorts]');
    if (shortsShelf) {
      hideElement(shortsShelf);
    } else {
      hideElement(container);
    }
    return;
  }

  if (hasBlockedKeyword(title)) {
    hideElement(container);
    return;
  }

  if (viewCount !== null && viewCount < config.minViews) {
    hideElement(container);
    return;
  }

  if (duration !== null && duration < config.minDuration) {
    hideElement(container);
    return;
  }

  showElement(container);
}

function processAllVideos() {
  findAllVideos().forEach(processVideo);
  hideSections();
  refreshYouTubeGrid();
}

function refreshYouTubeGrid() {
  const videosPerRow = config.videosPerRow;

  document.querySelectorAll('ytd-rich-grid-renderer').forEach(grid => {
    if (videosPerRow > 0) {
      grid.style.setProperty('--ytd-rich-grid-items-per-row', videosPerRow);
      grid.style.setProperty('--ytd-rich-grid-posts-per-row', videosPerRow);
      grid.style.setProperty('--ytd-rich-grid-slim-items-per-row', videosPerRow + 1);
      grid.style.setProperty('--ytd-rich-grid-game-cards-per-row', videosPerRow + 1);
      grid.style.setProperty('--ytd-rich-grid-mini-game-cards-per-row', videosPerRow);
    } else {
      grid.style.removeProperty('--ytd-rich-grid-items-per-row');
      grid.style.removeProperty('--ytd-rich-grid-posts-per-row');
      grid.style.removeProperty('--ytd-rich-grid-slim-items-per-row');
      grid.style.removeProperty('--ytd-rich-grid-game-cards-per-row');
      grid.style.removeProperty('--ytd-rich-grid-mini-game-cards-per-row');
    }
  });
}

function getSectionTitle(section) {
  const titleEl = section.querySelector('#title-text') ||
                  section.querySelector('.ytd-rich-shelf-renderer #title') ||
                  section.querySelector('[id="title"]');
  return (titleEl?.textContent || '').toLowerCase().trim();
}

function shouldHideSection(section) {
  const hasVisibleContent = section.offsetHeight > 50;
  if (!hasVisibleContent) return true;

  const isShorts = section.querySelector('[is-shorts]') ||
                   section.querySelector('a[href*="/shorts/"]');
  if (config.hideShorts && isShorts) return true;

  if (config.hideAllShelves) return true;

  const title = getSectionTitle(section);

  if (config.hideBreakingNews && title.includes('breaking news')) return true;
  if (config.hideLatestPosts && title.includes('latest posts')) return true;
  if (config.hideLatestVideos && title.includes('latest videos from')) return true;
  if (config.hidePeopleSearch && title.includes('people also search')) return true;
  if (config.hideExploreTopics && title.includes('explore')) return true;

  return false;
}

function hideSections() {
  document.querySelectorAll('ytd-rich-grid-renderer #contents > ytd-rich-section-renderer').forEach(section => {
    if (shouldHideSection(section)) {
      hideElement(section);
    } else {
      showElement(section);
    }
  });

  document.querySelectorAll('ytd-rich-shelf-renderer').forEach(shelf => {
    const isShorts = shelf.hasAttribute('is-shorts') || shelf.querySelector('a[href*="/shorts/"]');
    if (config.hideShorts && isShorts) {
      hideElement(shelf);
    }
  });

  if (config.hideExploreTopics) {
    document.querySelectorAll('ytd-chips-shelf-with-video-shelf-renderer').forEach(shelf => {
      const text = shelf.textContent?.toLowerCase() || '';
      if (text.includes('explore')) {
        hideElement(shelf);
      }
    });
  }
}

let domObserver = null;
let debounceTimer = null;

function startObserving() {
  if (domObserver) return;

  domObserver = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processAllVideos();
    }, 100);
  });

  domObserver.observe(document.body, { childList: true, subtree: true });
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'settingsUpdated') {
    config = message.settings;
    document.querySelectorAll('.rotblock-hidden').forEach(el => {
      el.classList.remove('rotblock-hidden');
    });
    processAllVideos();
    sendResponse({ success: true });
  }
  return true;
});

async function init() {
  if (location.hostname !== 'www.youtube.com') return;

  injectStyles();
  await loadSettings();
  processAllVideos();
  startObserving();
}

window.addEventListener('yt-navigate-finish', () => {
  processAllVideos();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
