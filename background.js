// background.js — service worker

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-palette") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PALETTE" }).catch(() => {
        // Content script not available on this page (e.g. chrome:// URLs) — nothing to do
      });
    }
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PALETTE" }).catch(() => {});
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_BOOKMARK_FOLDERS") {
    getBookmarkFolders().then(sendResponse);
    return true; // async
  }

  if (message.type === "OPEN_FOLDER_AS_TAB_GROUP") {
    openFolderAsTabGroup(message.folderId, message.folderName).then(sendResponse);
    return true;
  }
});

// ── Bookmark helpers ──────────────────────────────────────────────

async function getBookmarkFolders() {
  const tree = await chrome.bookmarks.getTree();
  const folders = [];
  traverseTree(tree[0], [], folders);
  return folders;
}

function traverseTree(node, pathParts, folders) {
  // Skip the synthetic roots ("Bookmarks Bar", "Other Bookmarks", etc.)
  const isRoot = !node.parentId;
  const isSyntheticRoot = node.parentId === "0";

  if (!isRoot && !isSyntheticRoot && !node.url) {
    // It's a real folder
    const path = [...pathParts, node.title];
    folders.push({
      id: node.id,
      title: node.title,
      path: path,
      pathStr: path.join(" / "),
      childCount: (node.children || []).filter(c => c.url).length,
    });

    if (node.children) {
      for (const child of node.children) {
        traverseTree(child, path, folders);
      }
    }
  } else if (node.children) {
    const nextPath = isRoot || isSyntheticRoot ? [] : [...pathParts, node.title];
    for (const child of node.children) {
      traverseTree(child, nextPath, folders);
    }
  }
}

// ── Tab group creation ────────────────────────────────────────────

const GROUP_COLORS = [
  "blue", "cyan", "green", "grey", "orange", "pink", "purple", "red", "yellow"
];

let colorIndex = 0;

async function openFolderAsTabGroup(folderId, folderName) {
  try {
    const children = await chrome.bookmarks.getChildren(folderId);
    const urls = children.filter(c => c.url).map(c => c.url);

    if (urls.length === 0) {
      return { success: false, error: "Folder has no bookmarks." };
    }

    const currentWindow = await chrome.windows.getCurrent();

    // Create all tabs
    const tabIds = [];
    for (const url of urls) {
      const tab = await chrome.tabs.create({
        url,
        windowId: currentWindow.id,
        active: false,
      });
      tabIds.push(tab.id);
    }

    // Group them
    const groupId = await chrome.tabs.group({
      tabIds,
      createProperties: { windowId: currentWindow.id },
    });

    const color = GROUP_COLORS[colorIndex % GROUP_COLORS.length];
    colorIndex++;

    await chrome.tabGroups.update(groupId, {
      title: folderName,
      color,
      collapsed: false,
    });

    // Focus the first tab
    await chrome.tabs.update(tabIds[0], { active: true });

    return { success: true, tabCount: tabIds.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
