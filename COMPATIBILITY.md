# Compatibility audit — 2026-10-11

Targeted Koha release branches: **25.05, 25.11, and 26.05**. The source packages inspected were the official `koha-common` Debian packages `25.05.15-1`, `25.11.09-2`, and `26.05.04-1`; the local runtime is `26.05.02-1`.

| Check | 25.05.15 | 25.11.09 | 26.05.04 |
| --- | --- | --- | --- |
| Plugin `api_namespace` / `api_routes` injection | Present | Present | Present |
| Anonymous plugin REST route support | Present | Present | Present |
| OPAC `opac_head` / `opac_js` hooks | Present | Present | Present |
| Zebra and Elasticsearch `simple_search_compat` / `extract_biblionumber` | Present | Present | Present |
| Plugin `bundle_path`, `get_template`, `store_data`, `retrieve_data` | Present | Present | Present |
| `Koha::Encryption` with `encrypt_hex` / `decrypt_hex` | Present | Present | Present |
| Plugin Perl modules compile against branch libraries | Passed | Passed | Passed |
| KPZ extract/install, OPAC, assets, suggestions and AI catalog chat | Not run | Not run | v1.4.6 passed on local 26.05.02 |
| Catalog comparison route and representative file parsing | Static compile only | Static compile only | v1.4.6 route and seven sample formats passed on local 26.05.02 |

The v1.2.5 change replaces obsolete Gemini and Groq defaults with `gemini-3.5-flash-lite` and `openai/gpt-oss-20b`. Upgrades migrate those exact saved defaults; other chosen models are retained. The chat tool result no longer sends `messages[].name`, which Groq's OpenAI-compatible API does not support.

Version 1.3.0 removes Puter. It bundles ZXing 0.22.0 and Tesseract.js/Core 7.0.0 with English OCR data. The packaged OCR model recognized a synthetic book title and ISBN, and the packaged ZXing decoder read a synthetic EAN-13 barcode. Browser voice input uses `SpeechRecognition` where supported; browser voice output uses `SpeechSynthesis`.

Version 1.4.4 adds a read-only catalog list comparison route. PDF.js 6.4.299, Mammoth 1.13.0, and SheetJS Community Edition 0.20.3 are packaged in the KPZ. Sample text PDF, DOCX, XLSX, XLS, ODS, CSV, TSV, TXT, JSON, MRK and ISO 2709 MARC files produced the expected title, author and ISBN fields. The live Koha route distinguished verified ISBN, exact title and author, possible title-only, absent, and invalid cases. The OPAC and all checked parser assets returned HTTP 200 and matched packaged bytes. The browser drag/drop UI, MARCXML path, and scanned PDF OCR path have not been exercised in a patron browser.

**Interpretation:** the code has the required interfaces on these three branches, and it compiles against their library files. The exact v1.4.6 KPZ was installed on Koha 26.05.02 with Zebra and Gemini. The OPAC returned 200 and served v1.4.6 assets; suggestions returned a known title; chat returned a catalog card and OPAC link; and the comparison route returned the expected three statuses for synthetic book rows. This is not a guarantee of successful installation on every configured Koha site. The client still needs an upload and browser/API smoke check, an accessible LLM provider and valid API key for chat, and a catalog search engine or working SQL fallback. Browser drag/drop, photo scanning and speech recognition, Elasticsearch behavior, Groq/OpenAI live calls, and Koha installations published under a URL subpath are not validated end to end.

**1.4.5 update:** The exact 1.4.5 KPZ was installed on local Koha 26.05.02. The live comparison result for ISBN `9780136764052` matched row 6 in Koha's `biblio`/`biblioitems` tables; suggestions and a Gemini chat returned that same title and OPAC detail link. A focused synthetic MARC test checked 856 and item URLs, unsafe-scheme rejection, duplicate removal, HTML escaping, and the online-link badge. No local record with a real 856 link was used for a patron-browser end-to-end test. Cloud-hosted Koha remains a deployment condition to check on the client's instance; an external ebook platform is searchable only when its titles are cataloged in Koha, unless a provider-specific connector is built.

**1.4.6 update:** Seven realistic dummy files (PDF, DOCX, XLSX, CSV, JSON, TXT, MRK) each yielded exactly three expected rows through the browser parser, followed by `confirmed`, `possible`, and `not_found` from the local Koha comparison route. A heading-as-book error discovered by the sample TXT file was fixed before the 1.4.6 build. See `QA_1.4.6.md`.
