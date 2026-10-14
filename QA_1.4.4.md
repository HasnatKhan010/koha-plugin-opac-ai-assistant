# Sadi plugin 1.4.4: local verification

Checked on 2026-10-11 against the local Koha 26.05.02 instance with Zebra.

## Changes reviewed

- Replaced the unused placeholder with a branded SVG that Koha serves from the KPZ; the header and welcome card use the same versioned logo.

- Renamed the assistant's default, saved local setting, and LLM persona from Athena to Sadi. Existing custom library names are preserved on upgrade.
- Fixed the catalog list request to omit patron cookies, so logged-in OPAC sessions do not trip Koha's CSRF check.
- Bounded and validated chat JSON and conversation history. Malformed requests now return HTTP 400 rather than reaching the model or crashing the route.
- Escaped the assistant name and logo URL when building the widget, and restricted configured library HTML to basic formatting and safe links.
- Hid items and records if Koha's visibility checks fail, instead of exposing unfiltered data.
- Separated the chat, suggestions, and list comparison rate-limit buckets.
- Prevented catalog queries such as “open source books” from being mistaken for a library-hours question.
- Removed unsupported assumptions about a client's membership fees, loan periods, renewals, and rules from default answers.

## Checks passed

- JavaScript syntax for each source file; Perl syntax for Controller, Search, and Match in the local Koha environment.
- Existing document parser fixtures for PDF, DOCX, XLSX, XLS, ODS, CSV, TSV, TXT, JSON, MRK, and binary MARC, plus new intent-routing checks.
- KPZ ZIP integrity, version metadata, self-contained asset manifest, and local installation. The SVG parsed successfully, was visually inspected at 40 px, returned HTTP 200 as `image/svg+xml`, and matched the packaged bytes.
- Anonymous OPAC page and versioned JS/CSS assets returned HTTP 200; Sadi appears in the page settings.
- Live comparison returned **confirmed**, **possible**, and **not_found** for the three sample rows.
- Live suggestions returned a catalog title; live chat returned a catalog card; “What is your name?” received “Sadi.” Invalid chat history returned HTTP 400.
- Packaged PDF, spreadsheet, Word, OCR, and barcode assets were reachable through Koha's asset route.
- Local Gemini chat and Zebra catalog comparison still passed after 1.4.4 installation; the saved key is encrypted, and the plugin is enabled.

## Still requires client or device verification

- Browser interaction with drag-and-drop, the file picker, camera, microphone, and speech output was not exercised by these HTTP and isolated parser checks.
- Runtime behavior on Koha 25.05/25.11 and Elasticsearch, and live Groq/OpenAI accounts, is not verified on this machine.
- Legacy `.doc`, encrypted documents, non-English OCR, and arbitrary spreadsheet/JSON layouts are outside the supported formats described in `CLIENT_SETUP.md`.

Use only `dist/Koha-OPAC-AI-Assistant-1.4.4-portable.kpz` for this release. Older KPZ files are retained in `dist/archive/`.
