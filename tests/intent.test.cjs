const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const folder = path.resolve(__dirname, "../src/Koha/Plugin/OPACChatBot/js");
global.window = { KohaChatPlugin: { SETTINGS: { APP_NAME: "Sadi", INFO: {} } } };
for (const file of ["knowledgeBase.js", "faq.js", "intentEngine.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(folder, file), "utf8"), { filename: file });
}

const intent = window.KohaChatPlugin.localIntent;
assert.equal(intent("Library hours").type, "FAQ");
assert.equal(intent("How many books can I borrow?").type, "FAQ");
assert.equal(intent("open source books").type, "SERVER");
assert.equal(intent("Find books about library rules").type, "SERVER");
assert.equal(intent("Search for Open Access journals").type, "SERVER");
console.log("intent routing checks passed");
