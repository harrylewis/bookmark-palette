# Bookmark Palette

A keyboard-driven command palette for Chrome bookmarks. Fuzzy-search your bookmark folders and open them as named tab groups — instantly.

![Bookmark Palette](icons/icon128.png)

---

## Features

- **Fuzzy search** — fzf-style scoring across folder names and full paths. Consecutive matches, word boundary hits, and exact substrings all score higher. Matched characters are highlighted inline.
- **Full path display** — results show the complete folder hierarchy (e.g. `Work / Dev / Tools`) so you always know where a folder lives, even if two folders share the same name.
- **Tab groups** — selecting a folder opens all its bookmarks as a named, coloured Chrome tab group in the current window. Colours cycle automatically through Chrome's built-in palette.
- **Keyboard-first** — `↑ ↓` or `Tab` to navigate, `↵` to open, `Esc` to close. No mouse required.
- **In-page overlay** — the palette appears on top of the current tab as an iframe overlay, with a blurred backdrop. No popup lag.
- **Zero network requests** — all fonts and assets are bundled locally. The extension never phones home.
- **Minimal permissions** — only `bookmarks`, `tabs`, and `tabGroups`. Nothing else.

---

## Installation

### From the Chrome Web Store

Search for **Bookmark Palette** in the [Chrome Web Store](https://chrome.google.com/webstore) and click **Add to Chrome**.

### Manual installation (developer mode)

1. Download the latest release zip from the [Releases](../../releases) page and unzip it, or clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select the `bookmark-palette` folder.

---

## Usage

Press **`Cmd+Shift+K`** (Mac) or **`Ctrl+Shift+K`** (Windows / Linux) on any webpage to open the palette.

Type to search your bookmark folders. The search matches against the full folder path, so typing `dev tools` will surface a folder at `Work / Dev / Tools`. Results are ranked by match quality — consecutive character matches and word boundary hits score higher.

Select a result with the arrow keys and press **Enter** to open all bookmarks in that folder as a Chrome tab group. The group is named after the folder and assigned a colour automatically.

Press **Escape** or click the backdrop to close the palette without doing anything.

### Changing the keyboard shortcut

Go to `chrome://extensions/shortcuts`, find **Bookmark Palette**, and reassign **"Open Bookmark Palette"** to any shortcut you like.

---

## How it works

The extension has three main parts:

- **`background.js`** — a service worker with privileged access to the Chrome bookmarks and tab group APIs. Reads the bookmark tree on demand and handles tab group creation.
- **`content.js`** — injected into every webpage. Listens for the keyboard shortcut and injects the palette as an iframe overlay when triggered.
- **`palette.js` / `fuzzy.js`** — the palette UI and fuzzy search engine, running inside the iframe. Communicates with the background worker via message passing.

Bookmarks are read fresh each time you open the palette — there is no cache or index to maintain. This keeps the implementation simple and ensures results are always current.

---

## Limitations

- The palette cannot be opened on Chrome's built-in pages (`chrome://`, `chrome-extension://`, the new tab page, etc.) because Chrome does not allow content scripts to inject into these pages. On these pages, clicking the toolbar icon will silently do nothing. As a workaround, navigate to any regular webpage first.
- Only bookmark **folders** are shown — not individual bookmarks. The palette is designed for opening collections, not single URLs.
- Empty folders are shown in results but will display a warning if you attempt to open them.

---

## Privacy

Bookmark Palette collects no data and makes no network requests. See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

---

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request for anything beyond small bug fixes, so we can discuss the approach first.

---

## License

MIT — see [LICENSE](LICENSE).
