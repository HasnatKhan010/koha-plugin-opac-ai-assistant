# Koha OPAC AI Assistant (Sadi)

Sadi is a self-contained Koha plugin that adds an AI assistant and a read-only catalog list checker to the OPAC. Its API and packaged browser assets run inside Koha; it does not require a separate Python service. An administrator supplies the library's own AI provider key if chat is enabled. No provider key is included in this repository or KPZ.

## Current release: 1.4.6

- [Download the Koha plugin package](dist/Koha-OPAC-AI-Assistant-1.4.6-portable.kpz)
- [Installation and configuration](CLIENT_SETUP.md)
- [Compatibility notes](COMPATIBILITY.md)
- [Production acceptance gates](PRODUCTION_READINESS_1.4.6.md)
- [Release QA report](QA_1.4.6.md)

The package was installed and checked on Koha 26.05.02 with Zebra. The OPAC assistant, Koha catalog suggestions, comparison API, seven sample file formats, and CSV export were verified locally. Review the compatibility and production notes before deploying to another Koha instance.

## Catalog list checker

Patrons or staff can submit book lists for comparison with the OPAC-visible catalog. The checker reports confirmed matches, possible matches that need review, and entries for which it found no match. It does not add or change Koha records.

Supported input formats include PDF, DOCX, XLSX, XLS, ODS, CSV, TSV, JSON, TXT, Markdown, MARC mnemonic (`.mrk`), binary MARC (`.mrc`/`.mar`), and MARCXML (`.xml`). Files are parsed in the browser; only extracted title, author, and ISBN data is sent to Koha. PDF OCR, file size, page, and batch limits are described in the setup guide.

## Build from source

Requirements: Python 3 and the Koha plugin source in `src/`.

```sh
python3 build.py
```

The script rebuilds the packaged CSS and JavaScript bundles and writes the KPZ under `dist/`. The source contains bundled third-party parsers and OCR runtime; see the accompanying notices and licenses under `src/Koha/Plugin/OPACChatBot/`.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE) and the notices bundled with third-party components.
