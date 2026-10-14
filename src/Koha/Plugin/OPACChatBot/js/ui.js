window.KohaChatPlugin = window.KohaChatPlugin || {};
window.KohaChatPlugin.createChatUI = function() {
  const safeName = window.KohaChatPlugin.escapeHTML(window.KohaChatPlugin.CONFIG.APP_NAME);
  const safeLogo = String(window.KohaChatPlugin.CONFIG.LOGO_URL).replace(/[&"'<>]/g, c => ({ "&": "&amp;", '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;" })[c]);

  document.body.insertAdjacentHTML("beforeend", `
    <button id="koha-compare-launcher" type="button" aria-label="Check a book list against the catalog" title="Upload or drop a book list to check this catalog">Check book list</button>
    <button id="koha-chat-toggle" aria-label="Open Library Assistant" aria-expanded="false" aria-controls="koha-chat-window" tabindex="0">
      <span class="toggle-icon">${window.KohaChatPlugin.ICONS.chat}</span>
    </button>
    <div id="koha-chat-window" role="dialog" aria-modal="true" aria-labelledby="koha-chat-title" aria-hidden="true">
      <div id="koha-chat-header">
        <div class="header-left">
          <img src="${safeLogo}" class="header-logo" alt="Library Logo">
          <div class="header-info">
            <h2 class="title" id="koha-chat-title">${safeName}</h2>
            <div class="subtitle">Digital Library Assistant</div>
            <div class="status" aria-live="polite">
              <span class="status-dot"></span>
              <span class="status-text">Online</span>
            </div>
          </div>
        </div>
        <button id="koha-chat-compare-btn" type="button" title="Compare a book list with this catalog" aria-label="Compare a book list with this catalog">Compare list</button>
        <button id="koha-chat-close-btn" aria-label="Close Assistant" tabindex="0">
          ${window.KohaChatPlugin.ICONS.close}
        </button>
      </div>
      <div id="koha-chat-messages" aria-live="polite" role="log" tabindex="0"></div>
      <div id="koha-chat-input-area">
        <div id="koha-chat-suggestions-box" class="suggestions-dropdown" style="display:none;" role="listbox"></div>
        <button id="koha-chat-camera-btn" aria-label="Read book cover or ISBN barcode from a photo" tabindex="0" title="Read a photo in this browser">
          ${window.KohaChatPlugin.ICONS.camera}
        </button>
        <button id="koha-chat-mic-btn" aria-label="Use voice input" tabindex="0" title="Use browser voice input; your browser may process audio online">
          ${window.KohaChatPlugin.ICONS.mic}
        </button>
        <input id="koha-chat-message-input" placeholder="Search catalog, authors, ISBN..." autocomplete="off" aria-label="Search query" maxlength="512" tabindex="0">
        <input type="file" id="koha-chat-file-input" accept="image/*" capture="environment" style="display:none;">
        <button id="koha-chat-send-btn" aria-label="Send message" tabindex="0">
          ${window.KohaChatPlugin.ICONS.send}
        </button>
      </div>
    </div>
  `);

  document.getElementById("koha-chat-close-btn").onclick = () => {
    const windowEl = document.getElementById("koha-chat-window");
    const toggleEl = document.getElementById("koha-chat-toggle");
    windowEl.style.display = "none";
    windowEl.setAttribute("aria-hidden", "true");
    toggleEl.setAttribute("aria-expanded", "false");
    toggleEl.focus();
  };
}
