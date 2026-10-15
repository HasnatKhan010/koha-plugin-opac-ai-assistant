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
