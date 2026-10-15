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
