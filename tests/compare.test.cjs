// Run with Node.js 22.13+ from the release directory:
// node tests/compare.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../src/Koha/Plugin/OPACChatBot");
global.window = { KohaChatPlugin: { CONFIG: { IMPORT_ASSET_URL: "file://" + path.join(root, "import") } } };
global.self = global.window;
vm.runInThisContext(fs.readFileSync(path.join(root, "import/xlsx.full.min.js"), "utf8"));
vm.runInThisContext(fs.readFileSync(path.join(root, "import/mammoth.browser.min.js"), "utf8"));
require(path.join(root, "js/compare.js"));

const compare = window.KohaChatPlugin.Compare;
function fixture(name) {
  const data = fs.readFileSync(path.join(__dirname, "fixtures", name));
  return {
    name,
    size: data.length,
    text: async () => data.toString("utf8"),
    arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  };
}

(async () => {
  for (const ext of ["pdf", "docx", "xlsx", "xls", "ods", "csv", "tsv", "txt", "json", "mrk", "mrc"]) {
    const warnings = [];
    const rows = await compare._extract(fixture("books." + ext), warnings);
    assert.equal(rows.length, 1, ext + " row count");
    assert.equal(rows[0].title, "Computer Networks", ext + " title");
    assert.equal(rows[0].isbn, "9780132126953", ext + " ISBN");
  }
  assert.equal(compare._isbn13("0132126958"), "9780132126953");
  assert.equal(compare._isbn13("9780132126954"), "");
  const titled = "Sadi Book List Test\nComputer Networks | Andrew S. Tanenbaum | 9780132126953";
  const titledRows = await compare._extract({ name: "titled.txt", size: Buffer.byteLength(titled), text: async () => titled }, []);
  assert.equal(titledRows.length, 1, "document headings are not book entries");
  assert.equal(titledRows[0].title, "Computer Networks");
  await assert.rejects(() => compare._extract({ name: "broken.docx", size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }, []), /Invalid or encrypted/);
  await assert.rejects(() => compare._extract({ name: "old.doc", size: 0 }, []), /Unsupported file type/);
  await assert.rejects(() => compare._extract({ name: "huge.txt", size: 16 * 1024 * 1024 }, []), /15 MB/);
  const long = Array.from({ length: 501 }, (_, i) => "Computer Networks " + i + " | Andrew S. Tanenbaum | 9780132126953").join("\n");
  const notes = [];
  const rows = await compare._extract({ name: "long.txt", size: Buffer.byteLength(long), text: async () => long }, notes);
  assert.equal(rows.length, 500);
  assert(notes.some(x => x.includes("stopped after 500")));
  console.log("comparison parser checks passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
