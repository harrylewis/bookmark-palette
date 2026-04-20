// palette.js — command palette UI controller

(function () {
  let folders = [];
  let filtered = [];
  let selectedIndex = 0;
  let isLoading = true;

  const input = document.getElementById("search-input");
  const listEl = document.getElementById("results-list");
  const statusEl = document.getElementById("status");
  const countEl = document.getElementById("result-count");

  // ── Init ──────────────────────────────────────────────────────

  async function init() {
    setStatus("Loading bookmarks…");
    try {
      folders = await chrome.runtime.sendMessage({ type: "GET_BOOKMARK_FOLDERS" });
      isLoading = false;
      renderResults("");
      input.focus();
    } catch (err) {
      setStatus("Error loading bookmarks.");
    }
  }

  // ── Search ────────────────────────────────────────────────────

  input.addEventListener("input", () => {
    selectedIndex = 0;
    renderResults(input.value);
  });

  function renderResults(query) {
    const results = window.fuzzySearch(folders, query);
    filtered = results;

    listEl.innerHTML = "";

    if (results.length === 0) {
      setStatus(query ? "No matching folders." : "No bookmark folders found.");
      countEl.textContent = "";
      return;
    }

    setStatus("");
    countEl.textContent = `${results.length} folder${results.length !== 1 ? "s" : ""}`;

    const max = Math.min(results.length, 50); // cap render
    for (let i = 0; i < max; i++) {
      const { folder, indices } = results[i];
      listEl.appendChild(makeItem(folder, indices, i));
    }

    updateSelection();
  }

  function makeItem(folder, indices, idx) {
    const li = document.createElement("li");
    li.className = "result-item";
    li.dataset.index = idx;

    // Build path with highlighted chars
    const pathParts = folder.path;
    let charOffset = 0;
    const pathHtml = pathParts.map((part, pi) => {
      const partIndices = indices
        .filter(i => i >= charOffset && i < charOffset + part.length)
        .map(i => i - charOffset);

      const highlighted = window.highlightMatch(part, partIndices);
      charOffset += part.length + 3; // " / " separator
      const isLast = pi === pathParts.length - 1;
      return isLast
        ? `<span class="path-segment path-leaf">${highlighted}</span>`
        : `<span class="path-segment path-ancestor">${highlighted}</span>`;
    }).join('<span class="path-sep"> / </span>');

    const bookmarkLabel = folder.childCount === 1 ? "1 bookmark" : `${folder.childCount} bookmarks`;

    li.innerHTML = `
      <div class="item-path">${pathHtml}</div>
      <div class="item-meta">
        <span class="item-count">${bookmarkLabel}</span>
        <span class="item-action">Open as tab group ↵</span>
      </div>
    `;

    li.addEventListener("click", () => openFolder(folder));
    li.addEventListener("mouseenter", () => {
      selectedIndex = idx;
      updateSelection();
    });

    return li;
  }

  // ── Keyboard navigation ───────────────────────────────────────

  input.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
        updateSelection();
        break;
      case "ArrowUp":
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection();
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[selectedIndex]) {
          openFolder(filtered[selectedIndex].folder);
        }
        break;
      case "Escape":
        // Try to close the overlay (when running in iframe inside content script)
        if (window.parent !== window) {
          window.parent.postMessage({ type: "PALETTE_ESC" }, "*");
        } else {
          window.close();
        }
        break;
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) {
          selectedIndex = Math.max(selectedIndex - 1, 0);
        } else {
          selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
        }
        updateSelection();
        break;
    }
  });

  function updateSelection() {
    const items = listEl.querySelectorAll(".result-item");
    items.forEach((item, i) => {
      item.classList.toggle("selected", i === selectedIndex);
    });
    const selectedEl = items[selectedIndex];
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }

  // ── Open action ───────────────────────────────────────────────

  async function openFolder(folder) {
    if (folder.childCount === 0) {
      setStatus("This folder has no bookmarks.");
      return;
    }

    setStatus(`Opening "${folder.title}"…`);
    input.disabled = true;

    const result = await chrome.runtime.sendMessage({
      type: "OPEN_FOLDER_AS_TAB_GROUP",
      folderId: folder.id,
      folderName: folder.title,
    });

    if (result.success) {
      window.close();
    } else {
      setStatus(`Error: ${result.error}`);
      input.disabled = false;
      input.focus();
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  function setStatus(msg) {
    statusEl.textContent = msg;
    statusEl.style.display = msg ? "block" : "none";
  }

  init();
})();
