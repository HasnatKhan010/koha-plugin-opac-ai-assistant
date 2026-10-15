# OPAC AI Assistant: client installation

Send `client-delivery/Sadi-Koha-Plugin-1.4.6-no-key.kpz` and this guide to the client; upload only the KPZ into Koha. This release includes browser voice/photo search, catalog list comparison, and links to online resources cataloged in Koha. No Gemini, Groq, or OpenAI API key is embedded. The older `.kpz` in `koha-plugin-opac-ai-assistant/dist/` is a different build that expects a local Python service.

## Requirements

- A Koha installation with plugins enabled (`<enable_plugins>1</enable_plugins>`), a writable plugins directory, and permission to upload KPZ files. To allow upload through Koha's staff interface, `<plugins_restricted>0</plugins_restricted>` is also needed.
- Koha's plugin REST routes under `/api/v1/contrib/` must be accessible from the OPAC. The plugin declares a minimum Koha version of 22.11. The 25.05, 25.11, and 26.05 code paths were checked against their published Koha packages, but only Koha 26.05.02 with Zebra has been exercised end to end. Elasticsearch remains unverified end to end.
- HTTPS outbound access from the Koha server to the selected provider (Groq, Google Gemini, or OpenAI), with working TLS certificates and a valid provider API key. The plugin does not include a key or a Python backend. AI responses depend on the provider's service, available models, and quota.
- The standard Koha URL layout at the site's web root (`/cgi-bin/koha/` and `/api/v1/`). A reverse proxy that publishes Koha under a subpath may require changes.
- Set a Koha `<encryption_key>` in `koha-conf.xml` before entering the provider key if encrypted storage is required. Without it, this plugin's current code stores the key as marked plaintext in Koha's plugin data. Keep the configuration and database secure.
- The public OPAC should use HTTPS for microphone and camera/file features. Speech recognition is provided by the visitor's browser where available; some browsers send audio to their own speech service. Photo reading uses locally packaged ZXing and English Tesseract OCR and does not upload photos to an AI service. Clear book cover photos work best; non-English cover text needs additional language data, though ISBN barcodes are language independent.
- The 1.4.6 KPZ is about 9.5 MB. The staff interface and reverse proxy must allow an upload of that size.

## Install and configure

1. Ask the client's Koha administrator for their Koha version, search engine (Zebra or Elasticsearch), public OPAC URL, plugin settings, and which AI provider they intend to use. Do not ask them to send their API key to you.
2. In the staff interface, open **Administration → Manage plugins → Upload plugin** and upload the KPZ. In the OPAC AI Assistant row, choose **Actions → Configure**.
3. Choose the provider, confirm an active model name supported by that provider, and enter the client's API key in the configuration page. The built-in defaults are `openai/gpt-oss-20b` for Groq, `gemini-3.5-flash-lite` for Gemini, and `gpt-4o-mini` for OpenAI. Gemini was exercised locally on 2026-10-11; provider availability can change. Set the library's hours, contact details, and policies. Leave the optional OPAC base URL blank for same-origin links.
   Library information fields accept basic formatting (`p`, `br`, `strong`, `em`, headings, lists, and safe links); the widget removes scripts, event handlers, and other markup.
4. Open the OPAC as a logged-out patron. Check that the widget appears. In the browser's network panel, confirm `/api/v1/contrib/opacchatbot/asset/js/bundle.js` and `/asset/css/bundle.css` return 200.
5. Check `/api/v1/contrib/opacchatbot/suggestions?q=<catalog-title>` for suggestions, then ask the widget to find a known title. Confirm that it returns a real catalog card and a correct OPAC link. Also ask for opening hours and verify the library-specific answer.
6. If the widget is absent or a request fails, inspect Koha's OPAC/Plack error log, plugin status, reverse proxy rules, outbound provider access, model name, and provider quota. A successful KPZ upload alone does not verify the chat flow.
7. For photo search, choose a clear book cover or ISBN barcode photo. The detected text is placed in the search field for the patron to review before pressing Send. For voice, check that the microphone appears in a supported HTTPS browser, that the browser grants permission, and that recognized text appears in the search field. The read-aloud button uses the browser's installed speech voices.
8. Select **Check book list** beside the OPAC assistant button, or **Compare list** in the open assistant. Drop a list or choose a file containing a book already in the catalog, a similar title with a different ISBN, and an absent title. Confirm the three categories and their OPAC links. Download the CSV results and review any **Possible match** rows before making cataloging decisions.

## Catalog list comparison

The same OPAC comparison window is available to staff and patrons. It is read-only: it cannot add, change, or delete Koha records. Files are parsed in the browser; only extracted titles, authors, and ISBNs are sent to the plugin's `/compare` route. No AI key or LLM call is needed for comparison.

Supported inputs: text PDFs (with English OCR attempted for at most five image-only pages), DOCX, XLSX, XLS, ODS, CSV, TSV, JSON book lists, TXT, Markdown, MARC mnemonic `.mrk`, binary MARC `.mrc`/`.mar`, and MARCXML `.xml`. Legacy Word `.doc`, password-protected files, and arbitrary JSON/XML schemas need conversion. PDF extraction stops at 50 pages; each file is limited to 15 MB, each run to 10 files and 500 extracted entries. The window reports skipped or unreadable files and limits reached.

**Already in catalog** means a validated ISBN matches a visible Koha record, or the normalized title and author both match when the source supplied no ISBN. **Possible match** means the title is similar or the title and author match but the supplied ISBN differs; review the edition. **No match found** means no match was found in the bounded OPAC-visible search; it is not proof that a record is absent from an unindexed or suppressed part of Koha. Check Koha indexing and the source entry before importing anything.

## Compatibility statement

This archive contains no local server address, local API credentials, Python backend dependency, or Puter runtime dependency. Its OCR and document parsers are packaged in the KPZ. The local Koha 26.05.02 instance with Zebra and Gemini was used for the checks recorded in `QA_1.4.6.md`. Browser drag/drop, camera/photo, and microphone interaction still need a device check. The 25.05 and 25.11 API surfaces and Perl syntax were checked from their published packages, but runtime installation on those branches has not been tested. Groq and OpenAI were checked against official API documentation but not with working keys. Run the checks above on the client's Koha instance before acceptance.

For a public rollout, complete [the production acceptance gates](PRODUCTION_READINESS_1.4.6.md) on a staging copy of the client's environment. Patron chat requests and relevant catalog results go to the configured LLM provider; obtain the client's approval for that data flow and apply a server-side provider budget and edge rate limit.

## Cloud-hosted Koha and external e-book platforms

Sadi runs inside the Koha installation that accepted the KPZ. It searches that Koha instance's configured Zebra or Elasticsearch index, hydrates results through Koha bibliographic/item APIs, and uses Koha's database only as a search fallback. The plugin and browser routes do not contain a fixed localhost address. A Koha server hosted in a cloud VM or managed service can use the same package if that provider permits plugins, enables the plugin REST routes, and publishes Koha at the supported URL layout. Test it on that instance; local success is not proof that a vendor-managed deployment allows plugins.

For books stored in a separate e-book platform, add searchable bibliographic records to Koha and put authorized resource URLs in MARC `856$u` or the visible item URI (`952$u` on MARC21 sites). Sadi shows up to three safe HTTP(S) links from those fields. “Online link” means the catalog contains a link; access may require authentication or a license, and the link may lead to related material rather than the full book. Check the actual link and patron entitlement on the client site.

Books that exist only in an external provider and have no Koha record are outside this package's current search and comparison scope. Direct federated search would require that provider's API specification, authentication and licensing rules, and a server-side connector. Do not put provider API credentials in OPAC JavaScript.
