// config.js
// Reads API base URL injected by OPACChatBot.pm via opac_head()
// Falls back to localhost for local development.

(function () {
  "use strict";

  window.KohaChatPlugin = window.KohaChatPlugin || {};

  var _base = (window.KohaChatPlugin.API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  var _debug = window.KohaChatPlugin.DEBUG_MODE === true || window.KohaChatPlugin.DEBUG_MODE === 1;

  window.KohaChatPlugin.CONFIG = {
    APP_NAME: "COMSATS AI Assistant",
    VERSION:  "1.0.3",

    // API endpoints — derived from the base URL injected by the Koha plugin
    API_URL:          _base + "/api/chat",
    SUGGEST_URL:      _base + "/api/suggestions",
    SEARCH_URL:       _base + "/api/search",
    HEALTH_URL:       _base + "/health",
    VISION_URL:       _base + "/api/vision",

    DEBUG:            _debug,
    SEARCH_LIMIT:     20,
    SUGGESTION_LIMIT: 7,
    REQUEST_TIMEOUT:  10000,
    MAX_HISTORY:      50,

    ENABLE_RECOMMENDATIONS: true,
    ENABLE_SUGGESTIONS:     true,
    ENABLE_ANALYTICS:       false,

    TYPING_DELAY: 500,
    THEME:        "light",

    LOGO_URL: window.KohaChatPlugin.LOGO_URL || (function () {
      return "data:image/svg+xml;utf8,<svg width='44' height='44' viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M18 14C18 12.9 18.9 12 20 12H46C47.1 12 48 12.9 48 14V46C48 47.1 47.1 48 46 48H20C18.9 48 18 47.1 18 46V14Z' fill='%234F46E5'/><path d='M24 18H42' stroke='white' stroke-width='2.5' stroke-linecap='round'/><path d='M24 25H42' stroke='white' stroke-width='2.5' stroke-linecap='round'/><path d='M24 32H38' stroke='white' stroke-width='2.5' stroke-linecap='round'/><path d='M18 16C14 16 12 18 12 22V46C12 50 14 52 18 52H46' stroke='%233730A3' stroke-width='2.5' stroke-linecap='round'/></svg>";
    }()),

    WELCOME_MESSAGE: [
      '<div class="welcome-card">',
      '  <div class="welcome-icon">' + (window.KohaChatPlugin.ICONS ? window.KohaChatPlugin.ICONS.book : "") + '</div>',
      '  <h2>Welcome to<br><span class="gradient-text">COMSATS Library</span></h2>',
      '  <p>Search the catalogue by title, author, ISBN, subject, or ask a question about library policies.</p>',
      '  <div class="welcome-section-label">Quick actions</div>',
      '  <div class="quick-actions">',
      '    <button class="quick-btn" data-action="quick-search" data-query="Library Timings" tabindex="0">Library Timings</button>',
      '    <button class="quick-btn" data-action="quick-search" data-query="Borrowing Limits" tabindex="0">Borrowing Limits</button>',
      '    <button class="quick-btn" data-action="quick-search" data-query="Library Rules" tabindex="0">Library Rules</button>',
      '    <button class="quick-btn" data-action="quick-search" data-query="Book Renewals" tabindex="0">Book Renewals</button>',
      '    <button class="quick-btn" data-action="quick-search" data-query="Computer Science Books" tabindex="0">CS Books</button>',
      '  </div>',
      '  <div class="welcome-tips"><strong>Tips:</strong> Try asking "What are the rules?" or search for "books by author".</div>',
      '</div>',
    ].join("\n"),
  };
}());
