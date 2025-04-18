# RotBlock

A Firefox extension for filtering YouTube content based on user-defined criteria.

## Features

RotBlock provides options to hide videos from your YouTube feed (primarily the homepage and search results) that don't meet certain thresholds:

*   **Minimum View Count:** Hides videos with view counts below the specified number.
*   **Minimum Duration:** Hides videos shorter than the specified duration (in seconds).
*   **Hide Shorts:** Removes YouTube Shorts from the feed.

Filtering is achieved by applying `display: none;` to the relevant video elements.

## Installation

As an unpacked extension:

1.  Download or clone this repository.
2.  Open Firefox and navigate to `about:debugging`.
3.  Click "This Firefox".
4.  Click "Load Temporary Add-on...".
5.  Select the `manifest.json` file from the repository folder.

Note: Temporary add-ons may need to be reloaded after restarting Firefox.

## Usage

1.  Click the RotBlock icon in the Firefox toolbar.
2.  Set the desired minimum view count and duration.
3.  Toggle the option to hide Shorts.
4.  Click "Save Settings".
5.  Refresh YouTube to apply the filters.

Settings are saved using browser local storage.

## Motivation

To provide users with more control over the content displayed in their YouTube feed, reducing the visibility of low-engagement or short-form videos.

## Limitations & Disclaimers

*   **Dependency on YouTube's Structure:** The extension relies on specific HTML element structures and CSS selectors present on YouTube. Changes made by YouTube to their site layout *will* inevitably break the extension's filtering capabilities until it is updated.
*   **Performance:** Uses `IntersectionObserver` and debouncing techniques to minimize performance impact, but complex pages can still be affected.
*   **Scope:** Filtering is most effective on the main homepage feed and search results. Behavior on other pages (channel pages, watch page sidebar, etc.) may be inconsistent.
*   **Potential Inaccuracies:** Occasionally, videos might not be filtered correctly due to timing issues during page load or variations in how metadata (like view counts) is displayed.

Use with the understanding that its effectiveness is tied to YouTube's current implementation.

## Contributing

Bug reports and pull requests are welcome, particularly those addressing breakages caused by YouTube updates. Please check existing issues before reporting. 