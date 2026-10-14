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
