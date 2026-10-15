// config.js
// Reads settings injected by OPACChatBot.pm (opac_head) into
// window.KohaChatPlugin.SETTINGS. All values are non-secret. The API key
// lives server-side only and is never present here.
//
// Falls back to sensible generic defaults for standalone/local development.

(function () {
  "use strict";

  window.KohaChatPlugin = window.KohaChatPlugin || {};
  var S = window.KohaChatPlugin.SETTINGS || {};

  // API base: the plugin's own REST route, same origin as the OPAC.
  // Default is relative so it works on any host, http or https (no mixed content).
  var _base = (S.API_BASE || "/api/v1/contrib/opacchatbot").replace(/\/$/, "");
  var _debug = S.DEBUG_MODE === true || S.DEBUG_MODE === 1;
  var _appName = S.APP_NAME || "Sadi";

  // The branded SVG is served by Koha from this KPZ. A versioned URL picks
  // up upgrades immediately while allowing long cache lifetimes in between.
  var _defaultLogo = _base + "/asset/images/logo.svg?v=1.4.6";
  var _logoUrl = (S.LOGO_URL && S.LOGO_URL.length) ? S.LOGO_URL : _defaultLogo;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  window.KohaChatPlugin.CONFIG = {
    APP_NAME: _appName,
    VERSION:  "1.4.6",

    // API endpoints — the plugin route (same origin).
    API_URL:     _base + "/chat",
    SUGGEST_URL: _base + "/suggestions",
    COMPARE_URL: _base + "/compare",

    DEBUG:            _debug,
    SEARCH_LIMIT:     20,
    SUGGESTION_LIMIT: 7,
    REQUEST_TIMEOUT:  30000,
    MAX_HISTORY:      50,

    ENABLE_RECOMMENDATIONS: true,
    ENABLE_SUGGESTIONS:     true,
    ENABLE_ANALYTICS:       false,

    // OCR and barcode assets are served by the plugin and loaded on demand.
    ENABLE_IMAGE_SCAN: S.ENABLE_IMAGE_SCAN !== false && S.ENABLE_IMAGE_SCAN !== 0,
    OCR_ASSET_URL: _base + "/asset/ocr",
    IMPORT_ASSET_URL: _base + "/asset/import",

    TYPING_DELAY: 500,
    THEME:        "light",

    LOGO_URL: _logoUrl,

    WELCOME_MESSAGE: [
      '<div class="welcome-card">',
      '  <div class="welcome-icon"><img src="' + esc(_logoUrl) + '" alt=""></div>',
      '  <h2>Welcome to<br><span class="gradient-text">' + esc(_appName) + '</span></h2>',
      '  <p>Search the catalogue by title, author, ISBN, subject, or ask a question about library policies.</p>',
      '  <div class="welcome-section-label">Quick actions</div>',
      '  <div class="quick-actions">',
      '    <button class="quick-btn" data-action="quick-search" data-query="Library hours" tabindex="0">Library Hours</button>',
      '    <button class="quick-btn" data-action="quick-search" data-query="Borrowing rules" tabindex="0">Borrowing</button>',
      '    <button class="quick-btn" data-action="quick-search" data-query="Library rules" tabindex="0">Rules</button>',
      '    <button class="quick-btn" data-action="quick-search" data-query="Renew a book" tabindex="0">Renewals</button>',
      '    <button class="quick-btn" data-action="quick-search" data-query="Computer Science books" tabindex="0">CS Books</button>',
      '  </div>',
      '  <div class="welcome-tips"><strong>Tip:</strong> Try asking "What are the rules?" or search for "books by author".</div>',
      '</div>',
    ].join("\n"),
  };
}());
