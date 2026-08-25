# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-07-27

### Changed
- **Major Production Refactor:** The entire repository has been reorganized to support a production-ready Koha 26.05 plugin architecture.
- **Koha Plugin Module:** Rewrote `OPACChatBot.pm` to correctly implement Koha plugin lifecycle hooks (`install`, `upgrade`, `uninstall`, `configure`, `tool`).
- **Asset Injection:** CSS and JS are now injected into the OPAC dynamically in a strict dependency order, avoiding global scope conflicts.
- **Backend Architecture:** Refactored the FastAPI backend from a single `main.py` file into a modular structure with dedicated routers (`chat.py`, `search.py`, `health.py`).
- **Plugin Configuration:** The plugin now injects the `API_BASE_URL` directly into the OPAC frontend via `opac_head()`, allowing the frontend to dynamically connect to the backend without hardcoding URLs.
- **Rate Limiting:** Extracted the rate limiter into `core/rate_limiter.py` and updated it to return standard HTTP 429 JSON responses.
- **Error Handling:** Backend exception handlers now return clean JSON error payloads instead of hardcoded HTML error cards.
- **Build System:** Created a robust `build.sh` script to automate `.kpz` package generation, metadata validation, and Perl syntax checking.
- **CI/CD:** Upgraded GitHub Actions workflow to run Python tests, validate metadata, check Perl syntax, and automatically build/upload the `.kpz` artifact on commits.
- **Installation Process:** Rewrote `install.sh` to perform a comprehensive preflight check of the host system (Koha, MariaDB, Python, Perl modules).

### Fixed
- Fixed an issue where the `.kpz` archive was built with Windows backslash path separators (`Koha\Plugin\...`), which caused the plugin to fail to load on Linux.
- Added the missing `canonicalname` field to `metadata.json`, which prevented Koha from recognizing the plugin.
- Fixed a version mismatch between `metadata.json` and `OPACChatBot.pm`.

## [1.0.0] - 2026-07-05

### Added
- Initial release of the Koha OPAC AI Assistant.
- Basic OPAC chat widget frontend.
- Intent detection service (title, author, ISBN).
- Abstracted search service layer supporting SQL/MariaDB.
