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
