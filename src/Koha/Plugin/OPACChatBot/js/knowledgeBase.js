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
