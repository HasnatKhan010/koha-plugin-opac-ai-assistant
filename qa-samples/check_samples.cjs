// Run with the bundled Node.js from the release directory.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../src/Koha/Plugin/OPACChatBot");
global.window = { KohaChatPlugin: { CONFIG: {
  IMPORT_ASSET_URL: "file://" + path.join(root, "import"),
  OCR_ASSET_URL: "file://" + path.join(root, "ocr"),
} } };
global.self = global.window;
vm.runInThisContext(fs.readFileSync(path.join(root, "import/xlsx.full.min.js"), "utf8"));
vm.runInThisContext(fs.readFileSync(path.join(root, "import/mammoth.browser.min.js"), "utf8"));
require(path.join(root, "js/compare.js"));

const expected = ["confirmed", "possible", "not_found"];
const compare = window.KohaChatPlugin.Compare;
const names = ["book-list.csv", "book-list.json", "book-list.txt", "book-list.xlsx", "book-list.docx", "book-list.pdf", "book-list.mrk"];

function asFile(name) {
  const data = fs.readFileSync(path.join(__dirname, name));
  return {
    name,
    size: data.length,
    text: async () => data.toString("utf8"),
    arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  };
}

(async () => {
  for (const name of names) {
    const warnings = [];
    const rows = await compare._extract(asFile(name), warnings);
    console.log(name, "rows", rows.length, JSON.stringify(rows.map(r => ({ title: r.title, author: r.author, isbn: r.isbn }))));
    assert.equal(rows.length, 3, name + " should yield exactly three book entries");
    assert.deepEqual(rows.map(r => r.title), ["Computer Networks", "Computer Networks", "The Paper Moon Atlas of 2099"]);
    assert.deepEqual(rows.map(r => r.isbn), ["9780136764052", "9780132126953", ""]);
    const response = await fetch("http://127.0.0.1:8081/api/v1/contrib/opacchatbot/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: rows }),
    });
    assert.equal(response.status, 200, name + " live route HTTP status");
    const body = await response.json();
    const statuses = body.results.map(r => r.status);
    console.log(name, "Koha statuses", statuses.join(", "));
    assert.deepEqual(statuses, expected, name + " live catalog comparison");
    assert.equal(warnings.length, 0, name + " parser warnings: " + warnings.join("; "));
  }
  console.log("All seven sample formats matched the live Koha catalog as expected.");
})().catch(error => { console.error(error); process.exitCode = 1; });
