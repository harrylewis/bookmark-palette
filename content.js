// content.js — injected on demand via activeTab + scripting
// Renders the palette as an in-page overlay (iframe) for snappier UX

(function () {
  if (window.__bookmarkPaletteLoaded) return;
  window.__bookmarkPaletteLoaded = true;
  let overlay = null;
  let iframe = null;
  let isOpen = false;

  function injectStyles() {
    if (document.getElementById("bookmark-palette-styles")) return;
    const style = document.createElement("style");
    style.id = "bookmark-palette-styles";
    style.textContent = `
      #bookmark-palette-overlay {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: flex-start !important;
        justify-content: center !important;
        padding-top: 80px !important;
        background: rgba(0, 0, 0, 0.55) !important;
        backdrop-filter: blur(4px) !important;
        -webkit-backdrop-filter: blur(4px) !important;
        box-sizing: border-box !important;
        animation: bkm-overlay-in 100ms ease !important;
      }
      @keyframes bkm-overlay-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  function openPalette() {
    if (isOpen) return;
    isOpen = true;

    injectStyles();

    // Overlay backdrop
    overlay = document.createElement("div");
    overlay.id = "bookmark-palette-overlay";

    // Iframe hosts the palette HTML to get isolated CSS + chrome APIs
    iframe = document.createElement("iframe");
    iframe.src = chrome.runtime.getURL("palette.html");
    iframe.style.cssText = `
      width: 640px;
      height: 480px;
      border: none;
      border-radius: 12px;
      box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04);
      display: block;
    `;

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    // Focus input inside iframe once loaded
    iframe.addEventListener("load", () => {
      iframe.contentWindow?.focus();
      iframe.contentDocument?.getElementById("search-input")?.focus();
    });

    // Close on backdrop click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closePalette();
    });

    // Close on Escape (catch from iframe)
    window.addEventListener("message", handleMessage);

    // Prevent page scroll while open
    document.documentElement.style.overflow = "hidden";
  }

  function closePalette() {
    if (!isOpen) return;
    isOpen = false;

    overlay?.remove();
    overlay = null;
    iframe = null;
    window.removeEventListener("message", handleMessage);
    document.documentElement.style.overflow = "";
  }

  function handleMessage(e) {
    if (e.data?.type === "PALETTE_CLOSE") closePalette();
    if (e.data?.type === "PALETTE_ESC") closePalette();
  }

  function togglePalette() {
    if (isOpen) {
      closePalette();
    } else {
      openPalette();
    }
  }

  // Listen for toggle from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "TOGGLE_PALETTE") {
      togglePalette();
    }
  });

  // Also allow Escape from the page level
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      closePalette();
    }
  });
})();
