# Sadi plugin 1.4.6: multi-format comparison check

Checked on 2026-10-11 against local Koha 26.05.02 with Zebra.

- Created seven dummy book lists in PDF, DOCX, XLSX, CSV, JSON, TXT, and MRK. Each contains an exact ISBN match, a matching title and author with a different ISBN, and an absent fictional title.
- `qa-samples/check_samples.cjs` ran each file through the packaged browser parser and sent the extracted rows to the live Koha `/compare` route. Every file produced exactly three rows and statuses `confirmed`, `possible`, `not_found`, in that order, with no parser warnings.
- The initial TXT sample revealed that a document heading was incorrectly treated as a book. Version 1.4.6 filters common list headings when structured book rows follow. A focused regression assertion was added to `tests/compare.test.cjs`.
- PDF, DOCX, and XLSX samples were rendered and visually checked. Each is legible; the Excel print view holds all three columns on one page.
- The installed Koha plugin reports version 1.4.6. OPAC and versioned JavaScript returned HTTP 200. The served bundle contains the heading fix and matches the source bundle hash. The live route returned the expected three statuses after installation.
- Opened **Check book list** in the local Koha OPAC browser, refreshed the page to load the newly installed 1.4.6 JavaScript, and used **Choose files** to upload all seven sample formats together. The browser displayed 21 entries: 7 already in catalog, 7 possible matches, 7 not found, and 0 needing attention. The result table showed three rows for each source, with Koha record 6 linked for the exact and possible matches.
- Used the browser's **Download CSV results** button. The exported CSV has 21 data rows, 3 per format, with exactly 7 `confirmed`, 7 `possible`, and 7 `not_found` statuses. Evidence is in `qa-samples/browser-check-1.4.6.png` and `qa-samples/browser-results-1.4.6.csv`.
- Existing parser, intent, and online-link checks passed. `python3 build.py` and KPZ integrity checks passed. The package SHA256 is `0fdaa977168fa81f54ce7b8082eae908a5b6e48ee50439230f74d1e406930b44`.

The OS-level drag gesture was not exercised; the tested file-picker path uses the same parsing and comparison workflow. The separate client's Koha and external ebook platform remain outside this local verification.
