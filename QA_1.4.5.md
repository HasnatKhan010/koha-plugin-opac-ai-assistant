# Sadi plugin 1.4.5: catalog and online resource verification

Checked on 2026-10-11 against local Koha 26.05.02 with Zebra and Gemini.

## What the catalog route reads

- `Search.pm` first calls Koha's configured `Koha::SearchEngine::Search` for bibliographic IDs, then hydrates title, author, ISBN, item visibility, and availability from `Koha::Biblios` and related Koha objects. If the search engine fails, a bounded SQL query uses `C4::Context->dbh` on that same Koha installation.
- The list comparison route uses the same OPAC-visible catalog records. The browser's API base is same-origin `/api/v1/contrib/opacchatbot`; the KPZ does not need a local Python server or a fixed client machine address.
- Live `/compare` returned biblionumber 6, title `Computer Networks`, author `Andrew S. Tanenbaum`, ISBN `9780136764052`. A read-only query against Koha `biblio` and `biblioitems` returned the identical values. Live `/suggestions` returned that title. Live `/chat` returned its card and `/cgi-bin/koha/opac-detail.pl?biblionumber=6`.

## Online resource change

- A Koha record's MARC 856$u fields and OPAC-visible item URI fields are read during hydration. Up to three unique HTTP(S) links appear on the card. URL output is HTML escaped and external links use `rel="noopener noreferrer"`.
- A record with an online link and no visible physical items shows **Online link**. This means a catalog link exists, not that the complete book is freely accessible. Authentication, license, and the destination's content remain the library/provider's responsibility.
- `perl -Isrc tests/online_links.t` passed 10 focused checks for 856 and item links, duplicate removal, unsafe URLs, the status label, link escaping, and the compact model view. Perl syntax checks passed for Controller, Search, and Match in the installed Koha environment. Source hashes for Controller and Search matched installed files.

## Package and live smoke check

- `python3 build.py` and KPZ ZIP integrity passed. The exact installed package is `dist/Koha-OPAC-AI-Assistant-1.4.5-portable.kpz`, SHA256 `6ba13cb475dc87a9c96cc65c894ce204815b4298ed7446d6927bada482d344cd`.
- The OPAC and versioned JavaScript asset returned HTTP 200 after installation. JavaScript parser and intent checks passed. The local Gemini chat returned a real catalog card.

## Client acceptance still required

- A patron-browser test against a real e-book record with an 856 or item URI link, including any vendor sign-in and entitlement behavior.
- Installation and route checks on the client's cloud Koha host; managed services can restrict plugins or route layout.
- A provider-specific integration if the requested books exist only in an external platform and are absent from Koha's searchable catalog.
- The other browser/device and production gates in `PRODUCTION_READINESS_1.4.5.md`.
