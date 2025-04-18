let config = {
  minViews: 10000,
  minDuration: 120,
  hideShorts: true
};

// Load settings from storage
async function loadSettings() {
  try {
    const settings = await browser.storage.local.get({
      minViews: 10000,
      minDuration: 120,
      hideShorts: true
    });
    // Keep this log for initial setup verification if needed, but commented out by default
    // console.log('Content script loaded settings:', settings); 
    config = settings;
    return true;
  } catch (err) {
    // Keep critical error logs
    console.error('RotBlock: Failed to load settings:', err);
    return false;
  }
}

// Function to process a single video item for filtering
function processVideoItem(item) {
  // Check if the item is valid and hasn't been processed already
  if (!item || !item.matches || !item.matches('ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer') || item.dataset.ysfProcessed) {
    return;
  }

  // Mark as processed to avoid redundant checks
  item.dataset.ysfProcessed = 'true';

  // Check if already hidden (e.g., by YouTube itself or another extension)
  if (item.offsetParent === null && item.style.display !== 'none') {
      // console.debug('Item is not visible, skipping:', item); // Optional debug
      return; // Skip items that are already hidden but not by us
  }
  
  // --- Filtering logic (views, shorts, duration) --- 
  // (This part remains largely the same as before)
  const titleLink = item.querySelector('#video-title-link');
  const label = titleLink?.getAttribute('aria-label') || "";

  const viewCountElement = item.querySelector('span.inline-metadata-item') ||
                         item.querySelector('#metadata-line span') ||
                         item.querySelector('.ytd-video-meta-block span');
  const viewCountText = viewCountElement?.textContent || "";

  const viewMatch = viewCountText.match(/(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:K|M|B)?\s*(?:views|watching)/i);
  if (viewMatch) {
    const viewCount = parseFloat(viewMatch[1].replace(/,/g, ''));
    const multiplier = viewCountText.toLowerCase().includes('k') ? 1000 :
                      viewCountText.toLowerCase().includes('m') ? 1000000 :
                      viewCountText.toLowerCase().includes('b') ? 1000000000 : 1;
    const totalViews = Math.floor(viewCount * multiplier);

    if (totalViews <= config.minViews) {
      item.style.display = 'none';
      return; 
    }
  } else if (viewCountText) {
    const labelViewMatch = label.match(/(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:K|M|B)?\s*views/i);
    if (labelViewMatch) {
      const viewCount = parseFloat(labelViewMatch[1].replace(/,/g, ''));
      const multiplier = label.toLowerCase().includes('k') ? 1000 :
                        label.toLowerCase().includes('m') ? 1000000 :
                        label.toLowerCase().includes('b') ? 1000000000 : 1;
      const totalViews = Math.floor(viewCount * multiplier);

      if (totalViews <= config.minViews) {
        item.style.display = 'none';
        return; 
      }
    } 
  }

  if (config.hideShorts && (item.querySelector('ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]') ||
                           label.toLowerCase().includes('shorts'))) {
    item.style.display = 'none';
    return; 
  }

  const durationSpan = item.querySelector('ytd-thumbnail-overlay-time-status-renderer span');
  if (durationSpan) {
    const timeParts = durationSpan.textContent.trim().split(':').map(Number);
    let seconds = 0;
    if (timeParts.length === 2) { 
      seconds = timeParts[0] * 60 + timeParts[1];
    } else if (timeParts.length === 3) { 
      seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
    }
    
    if (seconds > 0 && seconds < config.minDuration) {
      item.style.display = 'none';
      return;
    }
  }
  // --- End of filtering logic ---
}

// --- Performance Enhancements: IntersectionObserver for Lazy Processing ---
let intersectionObserver;

function handleIntersection(entries, observer) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Process the video item when it becomes visible
      processVideoItem(entry.target);
      // Once processed (or hidden), we can stop observing it
      observer.unobserve(entry.target);
    }
  });
}

function createIntersectionObserver() {
  if (intersectionObserver) {
    intersectionObserver.disconnect();
  }
  intersectionObserver = new IntersectionObserver(handleIntersection, {
    // Start loading/processing items slightly before they enter the viewport
    rootMargin: '200px 0px', 
    threshold: 0.01 // Trigger even if only 1% is visible
  });
}

// Function to observe a specific video item
function observeVideoItem(item) {
  if (intersectionObserver && item && !item.dataset.ysfProcessed) {
    intersectionObserver.observe(item);
  }
}

// --- MutationObserver to detect newly added videos ---
let mutationObserver;
let debounceTimer;
const DEBOUNCE_DELAY_MS = 300; 

function processMutations(mutations) {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // If the added node is a video item itself
        if (node.matches('ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer')) {
          observeVideoItem(node); // Add to IntersectionObserver
        }
        // If the added node *contains* video items
        else if (node.querySelector) {
          const newItems = node.querySelectorAll('ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer');
          newItems.forEach(observeVideoItem); // Add to IntersectionObserver
        }
      }
    });
  });
}

function createMutationObserver() {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }
  mutationObserver = new MutationObserver((mutations) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processMutations(mutations);
    }, DEBOUNCE_DELAY_MS);
  });
}

// --- Initialization ---
async function startFiltering() {
  if (location.hostname !== 'www.youtube.com') return;

  const settingsLoaded = await loadSettings();
  if (!settingsLoaded) { /* Error logged in loadSettings */ }

  // Create observers
  createIntersectionObserver();
  createMutationObserver();

  // Observe existing video items lazily
  const existingItems = document.querySelectorAll('ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer');
  existingItems.forEach(item => {
    // Reset processed flag in case of navigation/reload
    delete item.dataset.ysfProcessed; 
    observeVideoItem(item);
  });

  // Start MutationObserver to watch for new videos
  const pageManager = document.querySelector('ytd-page-manager');
  if (pageManager && mutationObserver) {
    mutationObserver.observe(pageManager, { childList: true, subtree: true });
  } else {
    console.error('RotBlock: Could not find ytd-page-manager to observe.');
  }
}

// --- Event Listeners ---
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'settingsUpdated') {
    config = message.settings;
    // Re-process all *currently visible* and *newly observed* videos when settings change
    // Disconnect IntersectionObserver to clear state and re-observe existing items
    if (intersectionObserver) intersectionObserver.disconnect();
    createIntersectionObserver(); // Recreate it
    
    // Find all video items again and re-observe them
    const allItems = document.querySelectorAll('ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer');
    allItems.forEach(item => {
      // Reset processed state and visibility
      delete item.dataset.ysfProcessed;
      item.style.display = ''; // Make visible again before re-processing
      observeVideoItem(item); // Observe with new settings
    });
    sendResponse({ success: true });
  }
  return true; 
});

function initialLoad() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    startFiltering();
  } else {
    document.addEventListener('DOMContentLoaded', startFiltering);
  }
}

initialLoad();
window.addEventListener('yt-navigate-finish', () => {
  // Disconnect observers before restarting
  if (intersectionObserver) intersectionObserver.disconnect();
  if (mutationObserver) mutationObserver.disconnect();
  startFiltering();
});
