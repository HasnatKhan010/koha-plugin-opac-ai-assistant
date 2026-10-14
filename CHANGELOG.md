# Changelog

## 1.4.6 — 2026-10-11

### Fixed

- Prevent common document/list headings from being parsed as book entries when structured book rows follow.

### Verified

- Parsed PDF, DOCX, XLSX, CSV, JSON, TXT, and MARC mnemonic samples in the browser and compared all 21 entries against the local Koha catalog.
- Confirmed the browser result categories and downloaded CSV each contained 7 confirmed matches, 7 possible matches, and 7 not found.
- Installed and checked the package on Koha 26.05.02 with Zebra. See [QA_1.4.6.md](QA_1.4.6.md) for details and limitations.

### Packaging

- Distributed as a self-contained KPZ with no local Python service dependency and no embedded Gemini, Groq, or OpenAI key.

## 1.2.4

- Previous public release. See Git history for its release details.
