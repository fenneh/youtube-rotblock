# YouTube RotBlock

[![CI](https://github.com/fenneh/youtube-rotblock/actions/workflows/ci.yml/badge.svg)](https://github.com/fenneh/youtube-rotblock/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Firefox](https://img.shields.io/badge/Firefox-supported-orange.svg)](https://www.mozilla.org/firefox/)
[![Chrome](https://img.shields.io/badge/Chrome-supported-green.svg)](https://www.google.com/chrome/)
[![Edge](https://img.shields.io/badge/Edge-supported-blue.svg)](https://www.microsoft.com/edge)

A browser extension for filtering YouTube content based on user-defined criteria.

## Features

RotBlock hides videos from your YouTube feed (homepage, search results, subscriptions) that don't meet certain thresholds:

- **Minimum View Count:** Hide videos with fewer views than specified
- **Minimum Duration:** Hide videos shorter than specified duration
- **Hide Shorts:** Remove YouTube Shorts from the feed
- **Blocked Keywords:** Hide videos containing specific words in the title
- **Videos Per Row:** Customize the grid layout
- **Hide Sections:** Remove Breaking News, Latest Posts, Explore Topics, and other shelf content

## Browser Support

- **Firefox:** Load as temporary add-on via `about:debugging`
- **Chrome/Edge:** Load as unpacked extension via `chrome://extensions` (enable Developer mode)

## Installation

1. Download or clone this repository
2. **Firefox:**
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Select `manifest.json`
3. **Chrome/Edge:**
   - Navigate to `chrome://extensions` or `edge://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension folder

## Usage

1. Click the RotBlock icon in the toolbar
2. Configure your filtering preferences
3. Click "Save Settings"
4. Refresh YouTube to apply filters

Settings are persisted in browser local storage.

## Limitations

- **YouTube Structure Dependency:** The extension relies on YouTube's HTML structure. Site updates may break filtering until the extension is updated.
- **Scope:** Most effective on homepage and search results. Behavior on channel pages and watch page sidebar may vary.
- **Timing:** Occasionally videos may not filter correctly due to page load timing.

## License

MIT
