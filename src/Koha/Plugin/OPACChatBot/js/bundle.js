/* === icons.js === */
/**
 * Icon Registry
 * Single source of truth for all SVG icons.
 * Usage: window.KohaChatPlugin.ICONS.search, window.KohaChatPlugin.ICONS.close, window.KohaChatPlugin.ICONS.send, etc.
 * Each returns a complete SVG string styled with currentColor.
 */
window.KohaChatPlugin = window.KohaChatPlugin || {};
window.KohaChatPlugin.ICONS = {

  /**
   * toggle — open book with an AI-sparkle dot.
   * Library theme + assistant signal, high contrast on white Koha pages.
   */
  chat: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5C2 5.12 3.12 4 4.5 4H11v14H4.5A2.5 2.5 0 0 1 2 15.5V6.5Z" fill="currentColor" opacity="0.85"/><path d="M22 6.5C22 5.12 20.88 4 19.5 4H13v14h6.5A2.5 2.5 0 0 0 22 15.5V6.5Z" fill="currentColor" opacity="0.6"/><path d="M11 4v14M13 4v14" stroke="white" stroke-width="0.75" opacity="0.4"/><circle cx="19" cy="5" r="3" fill="white"/><path d="M19 3.5v3M17.5 5h3" stroke="currentColor" stroke-width="1.1"/></svg>',

  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',

  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',

  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',

  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',

  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',

  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',

  empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>',

  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',

  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',

  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>'

};

;
/* === config.js === */
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

;
/* === utils.js === */
window.KohaChatPlugin = window.KohaChatPlugin || {};
window.KohaChatPlugin.escapeHTML = function(text){

const div=document.createElement("div");

div.textContent=text;

return div.innerHTML;

}

window.KohaChatPlugin.scrollToBottom = function(){

const box=document.getElementById("koha-chat-messages");

if(!box) return;

box.scrollTop=box.scrollHeight;

}

window.KohaChatPlugin.currentTime = function(){

return new Date().toLocaleTimeString([],{

hour:"2-digit",

minute:"2-digit"

});

}

window.KohaChatPlugin.createSkeleton = function() {

  return `
    <div class="message bot skeleton-message">
      <div class="loading-card" style="width: 260px;">
        <div class="loading-line"></div>
        <div class="loading-line"></div>
        <div class="loading-line"></div>
        <div style="font-size: 11px; color: var(--koha-chat-primary); margin-top: 12px; font-weight: 500; font-style: italic; text-align: center; animation: pulse 1.5s infinite;" id="koha-chat-status-text">Processing...</div>
      </div>
    </div>
  `;
}

window.KohaChatPlugin.removeSkeleton = function() {

  const skeleton = document.querySelector(".skeleton-message");
  if (skeleton) {
    skeleton.remove();
  }
}

window.KohaChatPlugin.sleep = function(ms){

return new Promise(resolve=>setTimeout(resolve,ms));
}

window.KohaChatPlugin.debounce = function(func, wait) {

    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

;
/* === knowledgeBase.js === */
// knowledgeBase.js
// Library FAQ text. Values come from the plugin configuration
// (window.KohaChatPlugin.SETTINGS.INFO, set by the admin in Koha). Each field
// falls back to neutral, universal wording when the admin leaves it blank —
// so the widget is generic out of the box and customizable per library.

(function () {
  "use strict";
  window.KohaChatPlugin = window.KohaChatPlugin || {};

  var S = window.KohaChatPlugin.SETTINGS || {};
  var INFO = S.INFO || {};
  var name = S.APP_NAME || "the Library";

  // The configuration fields may contain basic formatting, but they are
  // eventually rendered through innerHTML. Keep only harmless markup and
  // safe links, even if a staff account pastes unsafe HTML by mistake.
  function safeMarkup(value) {
    var template = document.createElement("template");
    template.innerHTML = String(value);
    var allowed = { P: 1, BR: 1, STRONG: 1, B: 1, EM: 1, I: 1, H3: 1, UL: 1, OL: 1, LI: 1, A: 1 };
    function copy(node, into) {
      if (node.nodeType === 3) { into.appendChild(document.createTextNode(node.textContent)); return; }
      if (node.nodeType !== 1 || /^(?:SCRIPT|STYLE|IFRAME|OBJECT|SVG|MATH)$/i.test(node.tagName)) return;
      var target = allowed[node.tagName] ? document.createElement(node.tagName.toLowerCase()) : into;
      if (node.tagName === "A") {
        var href = node.getAttribute("href") || "";
        if (/^(?:https?:\/\/|\/(?!\/))/i.test(href)) {
          target.setAttribute("href", href);
          target.setAttribute("rel", "noopener noreferrer");
        }
      }
      Array.prototype.forEach.call(node.childNodes, function (child) { copy(child, target); });
      if (target !== into) into.appendChild(target);
    }
    var result = document.createElement("div");
    Array.prototype.forEach.call(template.content.childNodes, function (node) { copy(node, result); });
    return result.innerHTML;
  }

  function pick(value, fallback) {
    return (value && String(value).trim().length) ? safeMarkup(value) : fallback;
  }

  window.KohaChatPlugin.KNOWLEDGE = {
    library: {
      name: name,

      hours: pick(
        INFO.hours,
        "<h3>Opening Hours</h3><p>Library hours vary by institution. Please check your library's official website or ask at the front desk for the current schedule.</p>"
      ),

      membership: pick(
        INFO.membership,
        "<h3>Library Membership</h3><p>Ask library staff how to register, which ID is required, and whether any fees apply.</p>"
      ),

      contact: pick(
        INFO.contact,
        "<h3>Contact</h3><p>For contact details, please visit your library's official website or speak with the desk staff.</p>"
      ),

      borrowLimit: pick(
        INFO.borrowing,
        "<h3>Borrowing</h3><p>Borrowing limits and loan periods vary by library and item type. Ask the library desk for your institution's specific policy.</p>"
      ),

      loanPeriod: pick(
        INFO.borrowing,
        "Loan periods vary by library. Please check with the library desk."
      ),

      renewal: pick(
        INFO.borrowing,
        "<h3>Renewals</h3><p>Renewal eligibility varies by library and item type. Check your library account or ask staff before the due date.</p>"
      ),

      rules: pick(
        INFO.rules,
        "<h3>General Rules</h3><p>Library rules vary by institution. Please check the posted rules or ask library staff.</p>"
      )
    },

    quickSuggestions: [
      "Library Hours",
      "Borrowing",
      "Rules",
      "Renewals"
    ]
  };
}());

;
/* === faq.js === */
// faq.js
// Keyword -> answer pairs, scanned by intentEngine.js after its own keyword
// rules. Entries whose knowledge field is empty are dropped rather than pushed
// as undefined, so a partially-configured library never shows a blank reply.
//
// IIFE + trailing semicolon: see the note in intentEngine.js — this file is
// concatenated into a single bundle with the others.

(function () {
  "use strict";
  window.KohaChatPlugin = window.KohaChatPlugin || {};

  var K = window.KohaChatPlugin.KNOWLEDGE || {};
  var L = K.library || {};

  var PAIRS = [
    ["timings",        "hours"],
    ["hours",          "hours"],
    ["membership",     "membership"],
    ["borrow limit",   "borrowLimit"],
    ["how many books", "borrowLimit"],
    ["loan period",    "loanPeriod"],
    ["renew",          "renewal"],
    ["contact",        "contact"],
    ["rules",          "rules"],
  ];

  var out = [];
  for (var i = 0; i < PAIRS.length; i++) {
    var answer = L[PAIRS[i][1]];
    if (answer && String(answer).trim().length) {
      out.push({ question: PAIRS[i][0], answer: answer });
    }
  }

  window.KohaChatPlugin.FAQ = out;
}());

;
/* === intentEngine.js === */
// intentEngine.js
// Answers a handful of common questions in the browser, so a patron asking
// "what are the rules?" gets an instant reply instead of a round trip to the
// LLM. Anything it does not recognise is delegated to the server.
//
// Wrapped in an IIFE and terminated with a semicolon on purpose: the assets are
// concatenated into one bundle, and an unterminated assignment at the end of
// this file would fuse with the next file's leading "(" and be parsed as a
// function CALL — which silently turned localIntent into a plain object.

(function () {
  "use strict";
  window.KohaChatPlugin = window.KohaChatPlugin || {};

  // Never dereference KNOWLEDGE blindly. If the admin's configuration or an
  // asset load partially failed, a thrown TypeError here would surface to the
  // patron as a bogus "cannot contact the library" error; returning undefined
  // instead just falls through to the server, which can answer anyway.
  function fact(field) {
    var k = window.KohaChatPlugin.KNOWLEDGE;
    var v = k && k.library ? k.library[field] : null;
    return v && String(v).trim().length ? v : null;
  }

  function faqList() {
    var list = window.KohaChatPlugin.FAQ;
    return Array.isArray(list) ? list : [];
  }

  // Keyword -> knowledge field. Checked in order, so put the more specific
  // phrases first ("how many books" before the generic "book" never matches
  // here, but the ordering matters for rules vs. borrowing).
  var RULES = [
    { field: "hours",       words: ["hour", "time", "open", "close"] },
    { field: "membership",  words: ["membership", "member"] },
    { field: "rules",       words: ["rule", "allowed", "dress"] },
    { field: "borrowLimit", words: ["borrow", "how many books", "limit"] },
  ];

  window.KohaChatPlugin.localIntent = function (message) {
    var text = String(message == null ? "" : message).toLowerCase().trim();
    if (text === "") return { type: "SERVER" };

    // A catalog request takes priority over broad service words such as
    // "open" in "open source books" or "rules" in a book title.
    if (/\b(?:find|search|show|recommend|catalog|isbn|journals?|books?|materials?|theses)\b/.test(text)
        && !/\bhow many books can i borrow\b/.test(text)) {
      return { type: "SERVER" };
    }

    for (var i = 0; i < RULES.length; i++) {
      for (var w = 0; w < RULES[i].words.length; w++) {
        if (text.indexOf(RULES[i].words[w]) !== -1) {
          var answer = fact(RULES[i].field);
          // No usable text for this topic — let the server try.
          if (answer) return { type: "FAQ", answer: answer };
        }
      }
    }

    var faq = faqList();
    for (var j = 0; j < faq.length; j++) {
      var item = faq[j];
      if (item && item.question && item.answer && text.indexOf(item.question) !== -1) {
        return { type: "FAQ", answer: item.answer };
      }
    }

    return { type: "SERVER" };
  };
}());

;
/* === api.js === */
// api.js
// Thin client for the plugin's own REST routes (same origin as the OPAC).
// Endpoint URLs come from CONFIG, which derives them from the injected
// SETTINGS.API_BASE (default: /api/v1/contrib/opacchatbot).

(function () {
  "use strict";
  window.KohaChatPlugin = window.KohaChatPlugin || {};

  // Wrap fetch with a real timeout.
  //
  // CONFIG.REQUEST_TIMEOUT existed but nothing enforced it: fetch has no
  // timeout of its own, so a backend that accepted the connection and then
  // stalled left the widget showing the typing indicator until the patron gave
  // up and reloaded the page. That is a realistic failure, not a hypothetical --
  // Controller.pm allows the upstream LLM 25s, and a reverse proxy in front of
  // Koha can hold a request open far longer than that.
  //
  // AbortController is present in every browser that has fetch (both shipped
  // together in Chrome 66 / Firefox 57 / Safari 12.1), but it is still probed:
  // a library on a locked-down old browser should degrade to "no timeout",
  // which is the previous behaviour, rather than a TypeError on every message.
  function fetchWithTimeout(url, options, timeoutMs) {
    var cfg = window.KohaChatPlugin.CONFIG || {};
    var ms = typeof timeoutMs === "number"
      ? timeoutMs
      : (typeof cfg.REQUEST_TIMEOUT === "number" ? cfg.REQUEST_TIMEOUT : 30000);

    if (ms <= 0 || typeof AbortController === "undefined") {
      return fetch(url, options);
    }

    var controller = new AbortController();
    var opts = Object.assign({}, options, { signal: controller.signal });
    var timer = setTimeout(function () {
      controller.abort();
    }, ms);

    return fetch(url, opts).then(
      function (response) {
        clearTimeout(timer);
        return response;
      },
      function (err) {
        clearTimeout(timer);
        // An abort surfaces as a DOMException named "AbortError", which reads
        // as a cryptic "signal is aborted without reason" if it reaches the
        // user. Translate it into something app.js can report plainly.
        if (err && err.name === "AbortError") {
          var e = new Error("Request timed out after " + Math.round(ms / 1000) + "s");
          e.name = "TimeoutError";
          throw e;
        }
        throw err;
      }
    );
  }

  window.KohaChatPlugin.API = {
    async chat(message, history = []) {
      const response = await fetchWithTimeout(window.KohaChatPlugin.CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Anonymous, read-only endpoint: omit cookies so no CGISESSID is sent.
        // Recent Koha wraps the OPAC's REST app in a CSRF check that rejects an
        // unsafe request carrying a CGISESSID cookie but no CSRF token — a
        // logged-in patron would otherwise get a 403. Omitting credentials
        // keeps the call truly anonymous and sidesteps that on every version.
        credentials: "omit",
        body: JSON.stringify({ message: message, history: history }),
      });
      if (!response.ok) {
        throw new Error("Server Error " + response.status);
      }
      return await response.json();
    },

    async suggest(query) {
      const url =
        window.KohaChatPlugin.CONFIG.SUGGEST_URL +
        "?q=" +
        encodeURIComponent(query);
      // Suggestions are a typeahead: a slow one is worse than none, and the
      // next keystroke supersedes it anyway. Capped well below the chat
      // timeout, and every failure is swallowed into an empty list so a
      // dropped request never surfaces as an error to the patron.
      try {
        const response = await fetchWithTimeout(url, { credentials: "omit" }, 6000);
        if (!response.ok) {
          return { suggestions: [] };
        }
        return await response.json();
      } catch (e) {
        return { suggestions: [] };
      }
    },
  };
}());

;
/* === ui.js === */
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

;
/* === chatController.js === */
window.KohaChatPlugin = window.KohaChatPlugin || {};
window.KohaChatPlugin.addMessage = function(type,message){

const messages=document.getElementById("koha-chat-messages");

const row=document.createElement("div");

row.className="message "+type;

const bubble=document.createElement("div");

bubble.className="bubble";

if (typeof message === 'string') {
    // Strip onerror completely so it doesn't try to load external fallbacks
    message = message.replace(/onerror\s*=\s*["'][^"']*["']/gi, "");
    // Strip placehold.co just in case
    message = message.replace(/src\s*=\s*["']https:\/\/placehold\.co[^"']*["']/gi, "src=\"\"");
}

bubble.innerHTML=message;

const time=document.createElement("div");

time.className="message-time";

time.innerText=window.KohaChatPlugin.currentTime();

if (type === "bot" && window.speechSynthesis && window.SpeechSynthesisUtterance) {
    const speaker = document.createElement("button");
    speaker.className = "speaker-btn";
    speaker.innerHTML = window.KohaChatPlugin.ICONS.speaker;
    speaker.setAttribute("aria-label", "Read aloud");
    speaker.onclick = function() {
        if(window.KohaChatPlugin.speak) {
            // Find the plain text message to read (strip HTML)
            const textDiv = bubble.querySelector('.chat-message-text');
            const textToSpeak = textDiv ? textDiv.innerText : bubble.innerText;
            window.KohaChatPlugin.speak(textToSpeak);
        }
    };
    time.appendChild(speaker);
}

bubble.appendChild(time);

row.appendChild(bubble);

messages.appendChild(row);

window.KohaChatPlugin.scrollToBottom();

}

;
/* === compare.js === */
// Browser-side catalog list comparison. Source files never leave the browser.
(function () {
  "use strict";
  const P = window.KohaChatPlugin = window.KohaChatPlugin || {};
  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  const MAX_FILES = 10;
  const MAX_ROWS = 500;
  const MAX_PDF_PAGES = 50;
  const MAX_OCR_PAGES = 5;
  const MAX_UNCOMPRESSED_BYTES = 80 * 1024 * 1024;
  const BATCH = 25;
  const accepted = new Set(["pdf", "docx", "xlsx", "xls", "ods", "csv", "tsv", "json", "txt", "md", "markdown", "mrk", "mrc", "mar", "xml"]);
  const loaded = {};

  function extension(name) { return String(name || "").split(".").pop().toLowerCase(); }
  function checkZipBudget(buffer) {
    const view = new DataView(buffer);
    let end = -1;
    for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) throw new Error("Invalid or encrypted Office/ODS file");
    const count = view.getUint16(end + 10, true);
    const size = view.getUint32(end + 12, true);
    let offset = view.getUint32(end + 16, true);
    if (count > 3000 || count === 0xffff || size === 0xffffffff || offset === 0xffffffff || offset + size > buffer.byteLength) throw new Error("Archive is too large or uses unsupported ZIP64");
    let total = 0;
    for (let i = 0; i < count; i++) {
      if (offset + 46 > buffer.byteLength || view.getUint32(offset, true) !== 0x02014b50) throw new Error("Invalid Office/ODS archive");
      if (view.getUint16(offset + 8, true) & 1) throw new Error("Encrypted Office/ODS files are not supported");
      const compressed = view.getUint32(offset + 20, true);
      const unpacked = view.getUint32(offset + 24, true);
      if (compressed === 0xffffffff || unpacked === 0xffffffff) throw new Error("Unsupported ZIP64 Office/ODS file");
      total += unpacked;
      if (total > MAX_UNCOMPRESSED_BYTES || (compressed > 0 && unpacked / compressed > 1000)) throw new Error("Document expands beyond the safe size limit");
      offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    }
  }
  function clean(value, limit) {
    return String(value == null ? "" : value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit || 250);
  }
  function isbn13(raw) {
    let x = String(raw || "").toUpperCase().replace(/[^0-9X]/g, "");
    if (/^\d{9}[\dX]$/.test(x)) {
      let sum = 0;
      for (let i = 0; i < 9; i++) sum += Number(x[i]) * (10 - i);
      if ((sum + (x[9] === "X" ? 10 : Number(x[9]))) % 11) return "";
      x = "978" + x.slice(0, 9);
      let s = 0;
      for (let i = 0; i < 12; i++) s += Number(x[i]) * (i % 2 ? 3 : 1);
      return x + ((10 - s % 10) % 10);
    }
    if (!/^97[89]\d{10}$/.test(x)) return "";
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(x[i]) * (i % 2 ? 3 : 1);
    return (sum + Number(x[12])) % 10 === 0 ? x : "";
  }
  function findIsbn(text) {
    const matches = String(text || "").match(/(?:97[89][\d\s-]{10,25}|\d[\d\s-]{8,18}[\dXx])/g) || [];
    for (const candidate of matches) {
      const number = isbn13(candidate);
      if (number) return number;
    }
    return "";
  }
  function entry(title, author, isbn, source) {
    const out = { title: clean(title), author: clean(author), isbn: findIsbn(isbn) || isbn13(isbn), source: clean(source, 150) };
    return (out.title || out.isbn) ? out : null;
  }
  function textEntries(text, source, warnings) {
    const out = [];
    const lines = String(text || "").split(/\r?\n/);
    for (let i = 0; i < lines.length && out.length < MAX_ROWS; i++) {
      let line = clean(lines[i], 1000);
      if (!line || /^\s*(?:page\s+)?\d+\s*$/i.test(line)) continue;
      const isbn = findIsbn(line);
      // Common document headings are not catalogue entries. Only discard a
      // heading when later lines contain structured book details, so a lone
      // title such as "Book List" can still be checked as a title-only row.
      if (!isbn && !/[\t|;]/.test(line)
          && /\b(?:book|reading|catalog(?:ue)?)\s+list\b/i.test(line)
          && lines.slice(i + 1).some(next => /[\t|;]/.test(next) || findIsbn(next))) continue;
      if (/^\s*title\s*[\t|;]\s*author\s*[\t|;]\s*isbn(?:-1[03])?\s*$/i.test(line)) continue;
      const parts = line.split(/\s*(?:\t|\||;|\s+[-–—]\s+)\s*/).map(x => clean(x));
      let title = "", author = "";
      if (parts.length >= 2) {
        const fields = parts.filter(x => !findIsbn(x) && !/^isbn(?:-1[03])?\s*:?\s*$/i.test(x));
        title = fields[0] || "";
        author = fields[1] || "";
      } else {
        title = line.replace(/(?:ISBN(?:-1[03])?\s*[:#]?\s*)?(?:97[89][\d\s-]{10,25}|\d[\d\s-]{8,18}[\dXx])/ig, "").trim();
      }
      if (title && (title.length < 4 || title.length > 160 || title.split(/\s+/).length > 18)) title = "";
      if (title && /^(?:abstract|contents|references|copyright|table of contents|introduction)\b/i.test(title)) title = "";
      const row = entry(title, author, isbn, source + " · line " + (i + 1));
      if (row) out.push(row);
    }
    if (out.length >= MAX_ROWS && lines.length > MAX_ROWS && warnings) warnings.push(source + ": stopped after " + MAX_ROWS + " entries");
    return out;
  }
  function marcSubfield(line, code) {
    const marker = new RegExp("(?:\\$|\\u001f)" + code + "([^$\\u001f]+)");
    const match = String(line || "").match(marker);
    return match ? clean(match[1]) : "";
  }
  function mrkEntries(text, source, warnings) {
    const blocks = String(text || "").split(/(?=^=LDR\s)/m).filter(Boolean);
    const out = [];
    blocks.forEach((block, i) => {
      if (out.length >= MAX_ROWS) return;
      const lines = block.split(/\r?\n/);
      const field = tag => lines.find(line => line.slice(0, 4) === "=" + tag) || "";
      const title = [marcSubfield(field("245"), "a"), marcSubfield(field("245"), "b")].filter(Boolean).join(" ").replace(/\s*[/:;,.]+$/, "");
      const author = marcSubfield(field("100") || field("110") || field("700"), "a");
      const isbn = marcSubfield(field("020"), "a");
      const row = entry(title, author, isbn, source + " · record " + (i + 1));
      if (row) out.push(row);
    });
    if (blocks.length > MAX_ROWS && warnings) warnings.push(source + ": stopped after " + MAX_ROWS + " MARC records");
    return out;
  }
  function marcBinaryEntries(bytes, source, warnings) {
    const decoder = new TextDecoder("utf-8");
    const out = [];
    let offset = 0, recordNo = 0;
    while (offset + 24 <= bytes.length && out.length < MAX_ROWS) {
      const leader = decoder.decode(bytes.subarray(offset, offset + 24));
      const length = Number(leader.slice(0, 5));
      const base = Number(leader.slice(12, 17));
      if (!Number.isInteger(length) || length < 25 || offset + length > bytes.length || !Number.isInteger(base) || base < 25 || base > length) throw new Error("Malformed MARC record near byte " + offset);
      recordNo++;
      const fields = {};
      for (let dir = offset + 24; dir + 12 <= offset + base && bytes[dir] !== 0x1e; dir += 12) {
        const descriptor = decoder.decode(bytes.subarray(dir, dir + 12));
        const tag = descriptor.slice(0, 3), size = Number(descriptor.slice(3, 7)), position = Number(descriptor.slice(7, 12));
        if (!Number.isInteger(size) || !Number.isInteger(position) || size < 1 || position + size > length - base) throw new Error("Malformed MARC directory in record " + recordNo);
        const start = offset + base + position;
        if (!fields[tag]) fields[tag] = decoder.decode(bytes.subarray(start, start + size - 1));
      }
      const title = [marcSubfield(fields["245"], "a"), marcSubfield(fields["245"], "b")].filter(Boolean).join(" ").replace(/\s*[/:;,.]+$/, "");
      const author = marcSubfield(fields["100"] || fields["110"] || fields["700"], "a");
      const isbn = marcSubfield(fields["020"], "a");
      const row = entry(title, author, isbn, source + " · record " + recordNo);
      if (row) out.push(row);
      offset += length;
    }
    if (offset < bytes.length && out.length >= MAX_ROWS && warnings) warnings.push(source + ": stopped after " + MAX_ROWS + " MARC records");
    return out;
  }
  function marcXmlEntries(text, source, warnings) {
    const xml = new DOMParser().parseFromString(text, "application/xml");
    if (xml.getElementsByTagName("parsererror").length) throw new Error("Invalid XML");
    const records = Array.from(xml.getElementsByTagName("record"));
    const namespaced = records.length ? records : Array.from(xml.getElementsByTagNameNS("*", "record"));
    if (namespaced.length > MAX_ROWS && warnings) warnings.push(source + ": stopped after " + MAX_ROWS + " MARC records");
    return namespaced.slice(0, MAX_ROWS).map((record, i) => {
      const field = tag => Array.from(record.getElementsByTagNameNS("*", "datafield")).find(x => x.getAttribute("tag") === tag);
      const sub = (tag, code) => {
        const el = field(tag);
        const sf = el && Array.from(el.getElementsByTagNameNS("*", "subfield")).find(x => x.getAttribute("code") === code);
        return sf ? sf.textContent : "";
      };
      return entry([sub("245", "a"), sub("245", "b")].filter(Boolean).join(" "), sub("100", "a") || sub("700", "a"), sub("020", "a"), source + " · record " + (i + 1));
    }).filter(Boolean);
  }
  function jsonEntries(value, source, warnings) {
    const records = Array.isArray(value) ? value : (value && (value.books || value.items || value.records || value.data || (value.title || value.name || value.fields ? [value] : null)));
    if (!Array.isArray(records)) throw new Error("JSON needs an array of books or a books/items/records/data array");
    if (records.length > MAX_ROWS && warnings) warnings.push(source + ": stopped after " + MAX_ROWS + " JSON entries");
    return records.slice(0, MAX_ROWS).map((item, i) => {
      if (typeof item === "string") return textEntries(item, source + " · item " + (i + 1))[0] || null;
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      if (Array.isArray(item.fields)) {
        const marc = (tag, code) => {
          const field = item.fields.find(f => f && f[tag]);
          const subfields = field && field[tag] && field[tag].subfields;
          const sub = Array.isArray(subfields) && subfields.find(s => s && s[code]);
          return sub ? sub[code] : "";
        };
        return entry([marc("245", "a"), marc("245", "b")].filter(Boolean).join(" "), marc("100", "a") || marc("700", "a"), marc("020", "a"), source + " · item " + (i + 1));
      }
      let author = item.author || item.creator || item.writer || "";
      if (Array.isArray(author)) author = author.map(a => typeof a === "object" ? a.name : a).filter(Boolean).join(", ");
      else if (author && typeof author === "object") author = author.name || "";
      return entry(item.title || item.book_title || item.bookName || item.name, author, item.isbn || item.isbn13 || item.ISBN || item.isbn10, source + " · item " + (i + 1));
    }).filter(Boolean);
  }
  function sheetEntries(rows, source) {
    const out = [];
    if (!rows.length) return out;
    const header = rows[0].map(x => clean(x).toLowerCase().replace(/[^a-z0-9]/g, ""));
    const col = patterns => header.findIndex(x => patterns.some(p => p.test(x)));
    const titleCol = col([/^(?:title|booktitle|bookname|name)$/]);
    const authorCol = col([/^(?:author|authors|creator|writer)$/]);
    const isbnCol = col([/^isbn(?:10|13)?$/]);
    const hasHeader = titleCol >= 0 || isbnCol >= 0;
    for (let i = hasHeader ? 1 : 0; i < rows.length && out.length < MAX_ROWS; i++) {
      const cells = rows[i].map(x => clean(x));
      let title = "", author = "", isbn = "";
      if (hasHeader) {
        title = cells[titleCol] || "";
        author = cells[authorCol] || "";
        isbn = cells[isbnCol] || "";
      } else {
        isbn = cells.map(findIsbn).find(Boolean) || "";
        const names = cells.filter(x => x && !findIsbn(x));
        title = names[0] || "";
        author = names[1] || "";
      }
      const row = entry(title, author, isbn, source + " · row " + (i + 1));
      if (row) out.push(row);
    }
    return out;
  }
  function loadScript(file, globalName) {
    if (window[globalName]) return Promise.resolve();
    if (loaded[file]) return loaded[file];
    loaded[file] = new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      const timer = setTimeout(() => reject(new Error("Parser load timed out")), 30000);
      tag.src = P.CONFIG.IMPORT_ASSET_URL + "/" + file;
      tag.onload = () => { clearTimeout(timer); window[globalName] ? resolve() : reject(new Error("Parser failed to initialize")); };
      tag.onerror = () => { clearTimeout(timer); reject(new Error("Could not load " + file)); };
      document.head.appendChild(tag);
    }).catch(error => { delete loaded[file]; throw error; });
    return loaded[file];
  }
  function loadOcrScript() {
    if (window.Tesseract) return Promise.resolve();
    if (loaded.tesseract) return loaded.tesseract;
    loaded.tesseract = new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      const timer = setTimeout(() => reject(new Error("OCR load timed out")), 30000);
      tag.src = P.CONFIG.OCR_ASSET_URL + "/tesseract.min.js";
      tag.onload = () => { clearTimeout(timer); window.Tesseract ? resolve() : reject(new Error("OCR unavailable")); };
      tag.onerror = () => { clearTimeout(timer); reject(new Error("Could not load OCR")); };
      document.head.appendChild(tag);
    }).catch(error => { delete loaded.tesseract; throw error; });
    return loaded.tesseract;
  }
  async function pdfEntries(file, warnings) {
    const pdfjs = await import(P.CONFIG.IMPORT_ASSET_URL + "/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = P.CONFIG.IMPORT_ASSET_URL + "/pdf.worker.mjs";
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, useSystemFonts: true });
    const doc = await task.promise;
    const pages = Math.min(doc.numPages, MAX_PDF_PAGES);
    if (doc.numPages > pages) warnings.push(file.name + ": read only first " + pages + " pages");
    let text = "", imageOnly = 0, ocrAttempts = 0, ocrWorker = null;
    try {
      for (let i = 1; i <= pages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        let line = content.items.map(item => item.str + (item.hasEOL ? "\n" : " ")).join("");
        if (line.trim().length < 10 && ocrAttempts < MAX_OCR_PAGES && typeof document !== "undefined") {
          ocrAttempts++;
          try {
            await loadOcrScript();
            if (!ocrWorker) ocrWorker = await window.Tesseract.createWorker("eng", 1, {
              workerPath: P.CONFIG.OCR_ASSET_URL + "/worker.min.js",
              corePath: P.CONFIG.OCR_ASSET_URL,
              langPath: P.CONFIG.OCR_ASSET_URL,
              workerBlobURL: false,
            });
            const bounds = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: Math.min(1.5, 2500 / Math.max(bounds.width, bounds.height)) });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
            await page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;
            line = (await ocrWorker.recognize(canvas)).data.text || "";
          } catch (error) { warnings.push(file.name + ": OCR failed on page " + i); }
        }
        text += "\n" + line;
        if (line.trim().length < 10) imageOnly++;
        page.cleanup();
        if (text.length > 2_000_000) { warnings.push(file.name + ": stopped after 2 MB of extracted text"); break; }
      }
      if (imageOnly) warnings.push(file.name + ": " + imageOnly + " pages had no readable text");
      if (ocrAttempts === MAX_OCR_PAGES && pages > MAX_OCR_PAGES) warnings.push(file.name + ": OCR is limited to " + MAX_OCR_PAGES + " image-only pages");
    } finally { if (ocrWorker) await ocrWorker.terminate(); await task.destroy(); }
    return textEntries(text, file.name, warnings);
  }
  async function extract(file, warnings) {
    const ext = extension(file.name);
    if (!accepted.has(ext)) throw new Error("Unsupported file type: ." + ext);
    if (file.size > MAX_FILE_BYTES) throw new Error("File exceeds 15 MB: " + file.name);
    if (ext === "pdf") return pdfEntries(file, warnings);
    if (ext === "docx") {
      await loadScript("mammoth.browser.min.js", "mammoth");
      const buffer = await file.arrayBuffer(); checkZipBudget(buffer);
      const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
      return textEntries(result.value, file.name, warnings);
    }
    if (["xlsx", "xls", "ods", "csv", "tsv"].includes(ext)) {
      await loadScript("xlsx.full.min.js", "XLSX");
      const buffer = await file.arrayBuffer();
      if (["xlsx", "ods"].includes(ext)) checkZipBudget(buffer);
      const book = window.XLSX.read(new Uint8Array(buffer), { type: "array", sheetRows: MAX_ROWS + 1, cellFormula: false });
      const out = [];
      for (const name of book.SheetNames) {
        const rows = window.XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, defval: "", raw: false });
        out.push(...sheetEntries(rows, file.name + " · " + name));
        if (out.length >= MAX_ROWS) { warnings.push(file.name + ": stopped after " + MAX_ROWS + " entries"); break; }
      }
      return out.slice(0, MAX_ROWS);
    }
    if (["mrc", "mar"].includes(ext)) return marcBinaryEntries(new Uint8Array(await file.arrayBuffer()), file.name, warnings);
    const text = await file.text();
    if (ext === "json") return jsonEntries(JSON.parse(text), file.name, warnings);
    if (ext === "mrk") return mrkEntries(text, file.name, warnings);
    if (ext === "xml") return marcXmlEntries(text, file.name, warnings);
    return textEntries(text, file.name, warnings);
  }

  function el(name, className, text) {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function csvCell(value) {
    let text = String(value == null ? "" : value);
    if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function exportCsv(rows, results) {
    const header = ["Source", "Supplied title", "Supplied author", "Supplied ISBN", "Status", "Evidence", "Koha title", "Koha author", "Koha URL"];
    const lines = [header.map(csvCell).join(",")];
    rows.forEach((row, i) => {
      const result = results[i] || { status: "error", matches: [] };
      const book = result.matches && result.matches[0] || {};
      lines.push([row.source, row.title, row.author, row.isbn, result.status, book.evidence || result.reason || "", book.title || "", book.author || "", book.url || ""].map(csvCell).join(","));
    });
    const url = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = el("a"); a.href = url; a.download = "koha-catalog-comparison.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function mount() {
    const open = document.getElementById("koha-chat-compare-btn");
    const launcher = document.getElementById("koha-compare-launcher");
    if (!open || !launcher) return;
    const overlay = el("div", "koha-compare-overlay");
    overlay.hidden = true;
    const panel = el("section", "koha-compare-panel");
    panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-labelledby", "koha-compare-title");
    const header = el("div", "koha-compare-header");
    header.appendChild(el("h2", "", "Compare a book list with this catalog"));
    header.querySelector("h2").id = "koha-compare-title";
    const close = el("button", "koha-compare-close", "Close"); close.type = "button";
    header.appendChild(close); panel.appendChild(header);
    panel.appendChild(el("p", "koha-compare-explain", "Drop files here or choose files. PDFs, DOCX, Excel, CSV, JSON, text and MARC are read in this browser. Only extracted book details are sent to Koha for matching."));
    const drop = el("div", "koha-compare-drop", "Drop book lists here, or choose files"); drop.tabIndex = 0; drop.setAttribute("role", "button");
    const picker = el("input"); picker.type = "file"; picker.multiple = true; picker.accept = ".pdf,.docx,.xlsx,.xls,.ods,.csv,.tsv,.json,.txt,.md,.markdown,.mrk,.mrc,.mar,.xml"; picker.hidden = true;
    const choose = el("button", "koha-compare-choose", "Choose files"); choose.type = "button";
    drop.appendChild(choose); drop.appendChild(picker); panel.appendChild(drop);
    const status = el("p", "koha-compare-status", "Up to 10 files, 15 MB each, 500 book entries per comparison."); status.setAttribute("role", "status"); panel.appendChild(status);
    const warnings = el("div", "koha-compare-warnings"); panel.appendChild(warnings);
    const actions = el("div", "koha-compare-actions");
    const download = el("button", "koha-compare-download", "Download CSV results"); download.type = "button"; download.disabled = true;
    actions.appendChild(download); panel.appendChild(actions);
    const tableWrap = el("div", "koha-compare-table-wrap");
    const table = el("table", "koha-compare-table");
    const thead = el("thead"); const tr = el("tr");
    ["Source", "Supplied book", "Result", "Catalog match"].forEach(label => tr.appendChild(el("th", "", label)));
    thead.appendChild(tr); table.appendChild(thead);
    const body = el("tbody"); table.appendChild(body); tableWrap.appendChild(table); panel.appendChild(tableWrap);
    overlay.appendChild(panel); document.body.appendChild(overlay);
    let currentRows = [], currentResults = [], active = false, lastFocus = null;
    function show() { lastFocus = document.activeElement; overlay.hidden = false; close.focus(); }
    function hide() { if (active) return; overlay.hidden = true; (lastFocus || open).focus(); }
    open.onclick = show; launcher.onclick = show; close.onclick = hide;
    overlay.addEventListener("click", e => { if (e.target === overlay) hide(); });
    overlay.addEventListener("keydown", e => {
      if (e.key === "Escape") { hide(); return; }
      if (e.key !== "Tab") return;
      const focusable = Array.from(panel.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter(node => node.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    drop.onclick = e => { if (e.target !== picker) picker.click(); };
    drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); picker.click(); } };
    drop.ondragover = e => { e.preventDefault(); drop.classList.add("dragging"); };
    drop.ondragleave = () => drop.classList.remove("dragging");
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove("dragging"); processFiles(e.dataTransfer.files); };
    picker.onchange = () => { processFiles(picker.files); picker.value = ""; };
    download.onclick = () => exportCsv(currentRows, currentResults);
    function renderRow(row, result) {
      const tr = el("tr");
      tr.appendChild(el("td", "", row.source));
      tr.appendChild(el("td", "", [row.title || "(no title)", row.author, row.isbn].filter(Boolean).join(" · ")));
      tr.appendChild(el("td", "koha-compare-status-" + result.status, ({ confirmed: "Already in catalog", possible: "Possible match — review", not_found: "No match found", invalid: "Needs better book details", error: "Could not check" })[result.status] || result.status));
      const matchCell = el("td");
      (result.matches || []).forEach(book => {
        if (!/^\d+$/.test(String(book.biblionumber))) return;
        const link = el("a", "", book.title + (book.author ? " — " + book.author : ""));
        link.href = "/cgi-bin/koha/opac-detail.pl?biblionumber=" + encodeURIComponent(book.biblionumber);
        link.target = "_blank"; link.rel = "noopener noreferrer";
        matchCell.appendChild(link); matchCell.appendChild(document.createElement("br"));
      });
      tr.appendChild(matchCell); body.appendChild(tr);
    }
    async function processFiles(fileList) {
      if (active) return;
      const files = Array.from(fileList || []);
      if (!files.length) return;
      if (files.length > MAX_FILES) { status.textContent = "Choose no more than " + MAX_FILES + " files."; return; }
      active = true; choose.disabled = true; drop.setAttribute("aria-busy", "true");
      body.replaceChildren(); warnings.replaceChildren(); download.disabled = true;
      currentRows = []; currentResults = [];
      const notes = [];
      try {
        for (const file of files) {
          status.textContent = "Reading " + file.name + "…";
          try {
            const rows = await extract(file, notes);
            if (!rows.length) notes.push(file.name + ": no book title or valid ISBN could be extracted");
            const room = MAX_ROWS - currentRows.length;
            if (rows.length > room) notes.push("Stopped at " + MAX_ROWS + " entries; remaining rows were not checked");
            currentRows.push(...rows.slice(0, room));
          } catch (error) { notes.push(file.name + ": " + (error.message || "could not read file")); }
          if (currentRows.length >= MAX_ROWS) break;
        }
        notes.forEach(note => warnings.appendChild(el("p", "", note)));
        if (!currentRows.length) { status.textContent = "No book entries were extracted. Check the file format or try a title and ISBN list."; return; }
        status.textContent = "Checking " + currentRows.length + " entries against Koha…";
        for (let i = 0; i < currentRows.length; i += BATCH) {
          const part = currentRows.slice(i, i + BATCH);
          let results;
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 60000);
            let response;
            try {
              response = await fetch(P.CONFIG.COMPARE_URL, { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries: part.map(({ title, author, isbn }) => ({ title, author, isbn })) }), signal: controller.signal });
            } finally { clearTimeout(timer); }
            if (!response.ok) throw new Error("Koha returned HTTP " + response.status);
            const data = await response.json();
            if (!Array.isArray(data.results) || data.results.length !== part.length || data.results.some(x => !x || typeof x.status !== "string" || !Array.isArray(x.matches))) throw new Error("Unexpected comparison response");
            results = data.results;
          } catch (error) {
            notes.push("Rows " + (i + 1) + "–" + Math.min(i + BATCH, currentRows.length) + ": " + error.message);
            results = part.map(() => ({ status: "error", reason: "Could not reach Koha", matches: [] }));
          }
          results.forEach((result, j) => { currentResults.push(result); renderRow(part[j], result); });
          status.textContent = "Checked " + currentResults.length + " of " + currentRows.length + " entries";
        }
        warnings.replaceChildren(); notes.forEach(note => warnings.appendChild(el("p", "", note)));
        const counts = currentResults.reduce((n, r) => { n[r.status] = (n[r.status] || 0) + 1; return n; }, {});
        status.textContent = currentRows.length + " entries checked: " + (counts.confirmed || 0) + " already in catalog, " + (counts.possible || 0) + " possible, " + (counts.not_found || 0) + " not found, " + ((counts.invalid || 0) + (counts.error || 0)) + " need attention.";
        download.disabled = false;
      } finally { active = false; choose.disabled = false; drop.removeAttribute("aria-busy"); }
    }
  }
  P.Compare = { mount: mount, _extract: extract, _isbn13: isbn13 };
}());

;
/* === app.js === */
document.addEventListener("DOMContentLoaded", () => {
  window.KohaChatPlugin.createChatUI();
  if (window.KohaChatPlugin.Compare) window.KohaChatPlugin.Compare.mount();

  const toggle = document.getElementById("koha-chat-toggle");
  const chat = document.getElementById("koha-chat-window");
  const input = document.getElementById("koha-chat-message-input");

  toggle.onclick = () => {
    const isFlex = chat.style.display === "flex";
    chat.style.display = isFlex ? "none" : "flex";
    toggle.setAttribute("aria-expanded", !isFlex);
    chat.setAttribute("aria-hidden", isFlex.toString());
    if (!isFlex) {
      input.focus();
    } else {
      toggle.focus();
    }
  };

  document.addEventListener("keydown", (e) => {
    if (chat.style.display === "flex") {
      if (e.key === "Escape") {
        chat.style.display = "none";
        toggle.setAttribute("aria-expanded", "false");
        chat.setAttribute("aria-hidden", "true");
        toggle.focus();
      } else if (e.key === "Tab") {
        const focusableElements = chat.querySelectorAll(
          'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }
  });

  window.KohaChatPlugin.addMessage("bot", window.KohaChatPlugin.CONFIG.WELCOME_MESSAGE);

  const conversationHistory = [];

  async function send(textValue) {
    const text = textValue !== undefined ? textValue : input.value.trim();
    if (text === "") return;
    if (text.length > 512) {
      window.KohaChatPlugin.addMessage("bot", "Please shorten your search to 512 characters or fewer.");
      return;
    }

    window.KohaChatPlugin.addMessage("user", window.KohaChatPlugin.escapeHTML(text));
    input.value = "";
    input.placeholder = "Search books, authors, ISBN...";

    // Snapshot history BEFORE the current question — correct context for backend
    const historyToSend = conversationHistory.map(turn => ({
      role: turn.role,
      content: String(turn.content || "").slice(0, 1000),
    }));

    document.getElementById("koha-chat-messages").insertAdjacentHTML("beforeend", window.KohaChatPlugin.createSkeleton());
    window.KohaChatPlugin.scrollToBottom();

    // Capture element AFTER it is in the DOM
    const statusPhrases = [
        "Mining diamonds...",
        "Dusting off ancient tomes...",
        "Consulting the library archives...",
        "Decoding the scrolls...",
        "Searching the catalog...",
        "Connecting to knowledge base...",
        "Analyzing your request...",
        "Sifting through shelves...",
        "Brewing the answer...",
        "Unlocking the vault..."
    ];

    // Show first phrase immediately
    const statusTextEl = document.getElementById("koha-chat-status-text");
    if (statusTextEl) statusTextEl.innerText = statusPhrases[Math.floor(Math.random() * statusPhrases.length)];

    // Rotate phrases every 1.8s — re-query element each tick so it always finds it
    const statusInterval = setInterval(() => {
        const el = document.getElementById("koha-chat-status-text");
        if (el) el.innerText = statusPhrases[Math.floor(Math.random() * statusPhrases.length)];
    }, 1800);

    // Local FAQ shortcut, in its own try: it never contacts the server, so a
    // failure here must NOT be reported as a network error. Fall through to the
    // server instead — it can answer these questions too.
    let local = { type: "SERVER" };
    try {
      local = window.KohaChatPlugin.localIntent(text) || { type: "SERVER" };
    } catch (e) {
      if (window.KohaChatPlugin.CONFIG.DEBUG) {
        console.error("KohaChatPlugin: localIntent failed, asking server", e);
      }
    }

    if (local.type === "FAQ" && local.answer) {
      clearInterval(statusInterval);
      window.KohaChatPlugin.removeSkeleton();
      window.KohaChatPlugin.addMessage("bot", local.answer);
      conversationHistory.push({ role: "user", content: text });
      conversationHistory.push({ role: "bot", content: local.answer });
      while (conversationHistory.length > 8) conversationHistory.shift();
      return;
    }

    try {
      const result = await window.KohaChatPlugin.API.chat(text, historyToSend);
      clearInterval(statusInterval);
      window.KohaChatPlugin.removeSkeleton();
      window.KohaChatPlugin.addMessage("bot", result.response);

      // Push user + bot AFTER we have the response — history is always in sync
      conversationHistory.push({ role: "user", content: text });
      if (result.raw_text) {
          let cleanText = result.raw_text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
          conversationHistory.push({ role: "bot", content: cleanText });
      }
      while (conversationHistory.length > 8) conversationHistory.shift();
    } catch (e) {
      clearInterval(statusInterval);
      window.KohaChatPlugin.removeSkeleton();
      if (window.KohaChatPlugin.CONFIG.DEBUG) {
        console.error("KohaChatPlugin: chat request failed", e);
      }
      // Distinguish the two failures the patron can act on differently:
      // a timeout means the service is up but slow (retrying may well work,
      // and the answer may just be a long one), whereas anything else means
      // the request to the plugin's own REST route did not complete at all.
      const timedOut = e && (e.name === "TimeoutError" || e.name === "AbortError");
      window.KohaChatPlugin.addMessage(
        "bot",
        timedOut
          ? "That took too long to answer, so I stopped waiting. Please try again — a shorter question usually comes back faster."
          : "Sorry — I could not reach the library service just now. Please try again in a moment."
      );
    }
  }

  document.getElementById("koha-chat-send-btn").onclick = () => send();
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  });

  // --- VOICE AND PHOTO SEARCH ---
  const micBtn = document.getElementById("koha-chat-mic-btn");
  const cameraBtn = document.getElementById("koha-chat-camera-btn");
  const fileInput = document.getElementById("koha-chat-file-input");
  const ocrBase = window.KohaChatPlugin.CONFIG.OCR_ASSET_URL;

  // Browser recognition is free to this plugin, but is not available in every
  // browser and may use the browser vendor's speech service.
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;
  if (SpeechRecognitionClass && window.isSecureContext) {
    recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = document.documentElement.lang || navigator.language || "en-US";

    recognition.onstart = function() {
      listening = true;
      micBtn.classList.add("recording");
      micBtn.setAttribute("aria-label", "Stop voice input");
      input.placeholder = "Listening...";
    };

    recognition.onresult = function(event) {
      const result = event.results && event.results[0] && event.results[0][0];
      const text = result && result.transcript ? result.transcript.trim() : "";
      if (text) {
        input.value = text;
        input.focus();
        input.placeholder = "Review what I heard, then press Send";
      }
    };

    recognition.onerror = function(event) {
      const denied = event.error === "not-allowed" || event.error === "service-not-allowed";
      window.KohaChatPlugin.addMessage("bot", denied
        ? "Microphone access was blocked. Allow it in your browser, or type your search."
        : "I couldn't hear that clearly. Please try again or type your search.");
    };

    recognition.onend = function() {
      listening = false;
      micBtn.classList.remove("recording");
      micBtn.setAttribute("aria-label", "Use voice input");
      if (!input.value) input.placeholder = "Search books, authors, ISBN...";
    };
  } else {
    micBtn.disabled = true;
    micBtn.title = window.isSecureContext
      ? "Voice input is unavailable in this browser"
      : "Voice input requires HTTPS";
  }

  micBtn.onclick = () => {
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      return;
    }
    try {
      recognition.start();
    } catch (error) {
      window.KohaChatPlugin.addMessage("bot", "Voice input could not start. Please try again or type your search.");
    }
  };

  // Download packaged OCR assets only when a patron chooses a photo. Nothing
  // about the image is sent to Koha's server or a third-party AI service.
  const scriptLoads = {};
  function loadLocalScript(name, globalName) {
    if (window[globalName]) return Promise.resolve();
    if (scriptLoads[name]) return scriptLoads[name];
    scriptLoads[name] = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = ocrBase + "/" + name;
      const timeout = setTimeout(() => reject(new Error("Timed out loading " + name)), 20000);
      script.onload = () => {
        clearTimeout(timeout);
        window[globalName] ? resolve() : reject(new Error(name + " did not initialize"));
      };
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Could not load " + name));
      };
      document.head.appendChild(script);
    }).catch(error => {
      delete scriptLoads[name];
      throw error;
    });
    return scriptLoads[name];
  }

  async function imageCanvas(file) {
    let image;
    let objectUrl;
    if (window.createImageBitmap) {
      try { image = await createImageBitmap(file); } catch (error) { /* use img fallback */ }
    }
    if (!image) {
      objectUrl = URL.createObjectURL(file);
      image = new Image();
      try {
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = objectUrl;
        });
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        throw error;
      }
    }
    try {
      const width = image.width || image.naturalWidth;
      const height = image.height || image.naturalHeight;
      const scale = Math.min(1, 2048 / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      if (image.close) image.close();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  async function readBarcode(canvas) {
    if (window.BarcodeDetector) {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        const formats = ["ean_13", "ean_8", "upc_a", "code_128", "code_39"]
          .filter(format => supported.includes(format));
        if (formats.length) {
          const found = await new window.BarcodeDetector({ formats }).detect(canvas);
          if (found.length && found[0].rawValue) return found[0].rawValue.trim();
        }
      } catch (error) {
        // Some browsers expose BarcodeDetector but cannot decode this image.
      }
    }
    try {
      await loadLocalScript("zxing.min.js", "ZXing");
      const zxing = window.ZXing;
      const hints = new Map();
      hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, [
        zxing.BarcodeFormat.EAN_13,
        zxing.BarcodeFormat.EAN_8,
        zxing.BarcodeFormat.UPC_A,
        zxing.BarcodeFormat.CODE_128,
        zxing.BarcodeFormat.CODE_39,
      ]);
      hints.set(zxing.DecodeHintType.TRY_HARDER, true);
      const reader = new zxing.BrowserMultiFormatReader(hints);
      try {
        const result = await reader.decodeFromCanvas(canvas);
        return result.getText().trim();
      } finally {
        reader.reset();
      }
    } catch (error) {
      return "";
    }
  }

  function isIsbn13(value) {
    if (!/^97[89]\d{10}$/.test(value)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(value[i]) * (i % 2 ? 3 : 1);
    return (10 - sum % 10) % 10 === Number(value[12]);
  }

  function searchTextFromOcr(text) {
    const lines = String(text || "").split(/\r?\n/)
      .map(line => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    for (const line of lines) {
      const possible = line.match(/(?:97[89][\d\s-]{10,24})/g) || [];
      for (const match of possible) {
        const digits = match.replace(/\D/g, "");
        if (isIsbn13(digits)) return digits;
      }
    }
    const useful = lines.filter(line => /[a-zA-Z]{3}/.test(line) && line.length >= 5);
    return useful.slice(0, 2).join(" ").slice(0, 120);
  }

  async function readCoverText(canvas) {
    await loadLocalScript("tesseract.min.js", "Tesseract");
    const worker = await window.Tesseract.createWorker("eng", 1, {
      workerPath: ocrBase + "/worker.min.js",
      corePath: ocrBase,
      langPath: ocrBase,
      workerBlobURL: false,
    });
    try {
      const result = await worker.recognize(canvas);
      return searchTextFromOcr(result.data.text);
    } finally {
      await worker.terminate();
    }
  }

  if (!window.KohaChatPlugin.CONFIG.ENABLE_IMAGE_SCAN) {
    if (cameraBtn) cameraBtn.remove();
  } else {
    cameraBtn.onclick = () => {
      fileInput.click();
    };
  }

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) {
      window.KohaChatPlugin.addMessage("bot", "Choose a photo smaller than 12 MB.");
      fileInput.value = "";
      return;
    }

    const previous = input.value;
    input.placeholder = "Reading photo...";
    input.disabled = true;
    if (cameraBtn) cameraBtn.classList.add("scanning");

    try {
      const canvas = await imageCanvas(file);
      const barcode = await readBarcode(canvas);
      const text = barcode || await readCoverText(canvas);
      if (text) {
        input.value = text.slice(0, 120);
        window.KohaChatPlugin.addMessage("bot", "I placed the detected code or cover text in the search box. Check it, then press Send.");
      } else {
        input.value = previous;
        window.KohaChatPlugin.addMessage("bot", "I couldn't read that photo. Try a sharper, well-lit picture or type the title or ISBN.");
      }
    } catch (err) {
      if (window.KohaChatPlugin.CONFIG.DEBUG) console.error("Photo search error", err);
      input.value = previous;
      window.KohaChatPlugin.addMessage("bot", "Photo search is unavailable in this browser right now. Please type the title or ISBN.");
    } finally {
      input.disabled = false;
      if (cameraBtn) cameraBtn.classList.remove("scanning");
      input.placeholder = "Search books, authors, ISBN...";
      input.focus();
      fileInput.value = "";
    }
  };

  // Text-to-Speech Output
  window.KohaChatPlugin.speak = function(text) {
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = document.documentElement.lang || navigator.language || "en-US";
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      if (window.KohaChatPlugin.CONFIG.DEBUG) console.error("Speech error", e);
    }
  };
  // ------------------------------

  const suggestionsBox = document.getElementById("koha-chat-suggestions-box");

  const handleInput = window.KohaChatPlugin.debounce(async (e) => {
    const query = e.target.value.trim();
    if (query.length < 3) {
      suggestionsBox.style.display = "none";
      return;
    }

    try {
      const data = await window.KohaChatPlugin.API.suggest(query);
      if (data.suggestions && data.suggestions.length > 0) {
        suggestionsBox.innerHTML = data.suggestions.map(s => `<div class="suggestion-item" tabindex="0" role="option">${window.KohaChatPlugin.escapeHTML(s)}</div>`).join('');
        suggestionsBox.style.display = "block";

        document.querySelectorAll('.suggestion-item').forEach(item => {
          item.onclick = () => {
            input.value = item.textContent;
            suggestionsBox.style.display = "none";
            input.focus();
          };
          item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              input.value = item.textContent;
              suggestionsBox.style.display = "none";
              input.focus();
            }
          });
        });
      } else {
        suggestionsBox.style.display = "none";
      }
    } catch (err) {
      if (window.KohaChatPlugin.CONFIG.DEBUG) {
        console.error(err);
      }
    }
  }, 300);

  input.addEventListener("input", handleInput);

  document.addEventListener("click", (e) => {
    if (e.target !== input && e.target !== suggestionsBox) {
      suggestionsBox.style.display = "none";
    }
  });

  // Event Delegation for quick action buttons and backend results
  const chatMessages = document.getElementById('koha-chat-messages');
  chatMessages.addEventListener('click', (e) => {
    // Quick search buttons
    const btn = e.target.closest('[data-action="quick-search"]');
    if (btn) {
      const query = btn.getAttribute('data-query');
      if (query) {
        input.value = query;
        send(query);
      }
      return;
    }

    // Backend result buttons (View Details / Reserve)
    const actionEl = e.target.closest('button, a, .result-btn, [class*="btn"]');
    if (!actionEl) {
      return;
    }

    let id = actionEl.getAttribute('data-id') || actionEl.getAttribute('data-biblionumber');
    
    // Fallback: search the parent card's HTML for a biblionumber if it's missing on the button
    const card = actionEl.closest('.book-card, .book-result, .bubble');
    if (!id && card) {
      const match = card.innerHTML.match(/biblionumber=(\d+)/i) || card.innerHTML.match(/id=(\d+)/i);
      if (match) id = match[1];
    }

    const text = (actionEl.textContent || '').toLowerCase();
    const isView = text.includes('view') || text.includes('detail') || text.includes('detil') || actionEl.getAttribute('data-action') === 'view';
    const isReserve = text.includes('reserve') || text.includes('reserce') || text.includes('place hold') || actionEl.getAttribute('data-action') === 'reserve';

      if (id) {
        if (isView) {
          e.preventDefault(); e.stopPropagation();
          window.location.href = `/cgi-bin/koha/opac-detail.pl?biblionumber=${id}`;
        } else if (isReserve) {
          e.preventDefault(); e.stopPropagation();
          window.location.href = `/cgi-bin/koha/opac-reserve.pl?biblionumber=${id}`;
        }
      } else if (card && (isView || isReserve)) {
        // THE BACKEND PROVIDED NO ID! Do an AJAX search to find the biblionumber instantly!
        const titleEl = card.querySelector('.book-title, h3, h2, h4, strong, .title');
        if (titleEl) {
           e.preventDefault(); e.stopPropagation();
           const originalText = actionEl.innerHTML;
           actionEl.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
           actionEl.style.pointerEvents = 'none';
           actionEl.style.opacity = '0.7';
           
           const title = encodeURIComponent(titleEl.textContent.trim());
           const searchUrl = `/cgi-bin/koha/opac-search.pl?q=${title}`;
           
           const fetchPromise = fetch(searchUrl).then(res => res.text());
           const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
           
           Promise.race([fetchPromise, timeoutPromise])
             .then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const idInput = doc.querySelector('input[name="biblionumber"], a.title[href*="biblionumber="]');
                let foundId = null;
                if (idInput) {
                   if (idInput.tagName === 'INPUT') foundId = idInput.value;
                   else {
                      const m = idInput.href.match(/biblionumber=(\d+)/);
                      if (m) foundId = m[1];
                   }
                }
                if (foundId) {
                   window.location.href = isView ? `/cgi-bin/koha/opac-detail.pl?biblionumber=${foundId}` : `/cgi-bin/koha/opac-reserve.pl?biblionumber=${foundId}`;
                } else {
                   window.location.href = searchUrl;
                }
             })
             .catch(() => {
                window.location.href = searchUrl;
             });
        }
      }
  }, true); // Use capturing phase for clicks to ensure we intercept before any backend inline scripts!

  // Image load event delegation (capturing phase)
  chatMessages.addEventListener('load', (e) => {
    if (e.target.tagName === 'IMG' && e.target.closest('.book-cover')) {
      if (e.target.naturalWidth <= 1) {
        // OpenLibrary returns 1x1 blank pixel for missing images!
        e.target.style.display = 'none';
      } else {
        e.target.classList.add('loaded');
      }
      e.target.parentElement.classList.add('has-loaded-img');
    }
  }, true);

  // Image error event delegation for broken covers
  chatMessages.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG' && e.target.closest('.book-cover')) {
      e.target.style.display = 'none'; // Hide broken image to show the generic SVG background
      e.target.parentElement.classList.add('has-loaded-img'); // Stop shimmering
    }
  }, true);

  // MutationObserver for newly added book covers
  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1) {
          
          // 0. Aggressively strip "disabled" attributes so demo buttons always work
          const disabledBtns = n.querySelectorAll ? n.querySelectorAll('button[disabled], .disabled, [disabled]') : [];
          disabledBtns.forEach(btn => {
            btn.removeAttribute('disabled');
            btn.classList.remove('disabled');
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.style.pointerEvents = 'auto';
          });
          if (n.hasAttribute && n.hasAttribute('disabled')) {
            n.removeAttribute('disabled');
            n.style.pointerEvents = 'auto';
          }

          // 0.5 Strip inline onerror handlers injected by backend that rely on external placeholders
          const badImgs = n.querySelectorAll ? n.querySelectorAll('img[onerror]') : [];
          badImgs.forEach(img => {
             img.removeAttribute('onerror');
             img.onerror = null;
          });
          if (n.hasAttribute && n.hasAttribute('onerror')) {
             n.removeAttribute('onerror');
             n.onerror = null;
          }

          // 1. Fix missing image tags completely (shimmer never stops otherwise)
          const covers = n.querySelectorAll ? n.querySelectorAll('.book-cover') : [];
          covers.forEach(cover => {
            if (!cover.querySelector('img')) {
              cover.classList.add('has-loaded-img');
            }
          });
          if (n.classList && n.classList.contains('book-cover') && !n.querySelector('img')) {
            n.classList.add('has-loaded-img');
          }

          // 2. Handle image tags that are present
          const imgs = n.querySelectorAll ? n.querySelectorAll('.book-cover img:not(.processed)') : [];
          imgs.forEach(img => {
            img.classList.add('processed');
            if (img.complete) {
              if (img.naturalWidth <= 1) { // Catch 1x1 pixels
                 img.style.display = 'none';
              } else {
                 img.classList.add('loaded');
              }
              img.parentElement.classList.add('has-loaded-img');
            }
          });
          
          if (n.tagName === 'IMG' && n.closest('.book-cover') && !n.classList.contains('processed')) {
            n.classList.add('processed');
            if (n.complete) {
              if (n.naturalWidth <= 1) {
                 n.style.display = 'none';
              } else {
                 n.classList.add('loaded');
              }
              n.parentElement.classList.add('has-loaded-img');
            }
          }
        }
      });
    });
  });
  observer.observe(chatMessages, { childList: true, subtree: true });

});

;
