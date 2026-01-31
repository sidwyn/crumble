# Crumble

A minimal Chrome extension that automatically rejects non-essential cookies by detecting and clicking "Reject All" or "Accept Necessary Only" buttons on cookie consent banners.

## Features

- **Zero configuration** - Works silently in the background
- **Privacy-focused** - No data collection, no network requests
- **Lightweight** - Pure vanilla JS, no dependencies
- **Comprehensive coverage** - Supports 15+ major consent frameworks plus text-based detection

## Supported Consent Frameworks

- OneTrust
- CookieBot
- TrustArc
- Quantcast (CMP2)
- Didomi
- Complianz
- CookieYes
- Klaro
- Osano
- Termly
- Iubenda
- Usercentrics
- And many more via text-pattern matching

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `crumble` folder

## How It Works

1. When a page loads, Crumble scans for known cookie consent framework selectors
2. If found, it clicks the reject/decline button automatically
3. For unknown frameworks, it falls back to text-based detection (looking for "Reject All", "Decline", "Necessary Only", etc.)
4. A MutationObserver catches late-loading banners on single-page apps
5. The extension badge shows a count of rejected banners per tab

## Permissions

- `activeTab` - Minimal permission needed to interact with page content

## License

MIT
