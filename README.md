# Koha OPAC AI Assistant

[![Version](https://img.shields.io/badge/version-1.2.4-0f172a?style=flat-square)](dist/koha-plugin-opac-ai-assistant-1.2.4.kpz)
[![Koha](https://img.shields.io/badge/Koha-22.11%2B-2563eb?style=flat-square)](https://koha-community.org)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-16a34a?style=flat-square)](LICENSE)
[![Standalone](https://img.shields.io/badge/standalone-no%20backend%20needed-7c3aed?style=flat-square)](#installation)

A conversational AI plugin for Koha that replaces the traditional catalog search with a natural language interface — directly embedded in your OPAC. Patrons type (or speak) a question and get real book results from your library's own database.

No Python. No separate server. One `.kpz` file, one API key.

---

## How it works

The plugin injects a floating chat widget into every OPAC page via Koha's `opac_js` hook. When a patron sends a message, a client-side intent engine first checks for local matches — FAQs, ISBN patterns, author keywords — before routing to the backend. The backend queries Koha's `biblio`, `items`, and `biblioitems` tables directly, formats results as HTML book cards, and returns them into the chat window.

Voice input uses the browser's native Web Speech API. Book cover scanning sends a base64 image to the configured LLM's vision endpoint, extracts the title or barcode, and auto-searches the catalog.

```
Patron types  →  Intent engine (client-side, instant)
                      │
                      ├── FAQ / library info  →  answered locally
                      │
                      └── Catalog query  →  Koha DB  →  book cards
```

---

## Installation

**Prerequisites:** Koha 22.11+, SSH/shell access to the server, a free [Groq API key](https://console.groq.com/keys).

### 1 — Enable the plugin system

The `UseKohaPlugins` system preference was removed in Koha 19.12. The only supported method is editing `koha-conf.xml`:

```bash
sudo nano /etc/koha/sites/library/koha-conf.xml
```

Change:

```xml
<enable_plugins>0</enable_plugins>
```

to:

```xml
<enable_plugins>1</enable_plugins>
```

Restart Plack:

```bash
sudo koha-plack --restart library
```

Verify: **Plugins** should now appear under **Administration** in the Koha staff interface.

### 2 — Upload the plugin

Download [`koha-plugin-opac-ai-assistant-1.2.4.kpz`](dist/koha-plugin-opac-ai-assistant-1.2.4.kpz) from `dist/` or from [Releases](../../releases/latest).

In Koha Staff: **Administration → Plugins → Upload Plugin** → select the file → **Upload** → **Enable**.

> The staff account doing this needs the **plugins** permission enabled under *Manage staff patrons → Set permissions*.

### 3 — Configure

**Administration → Plugins → Actions → Configure**

| Field | Description |
|---|---|
| LLM Provider | `groq` (recommended), `gemini`, or `openai` |
| API Key | Your key from the provider |
| Model | Leave blank to use the provider default |

Save. Open your OPAC — the chat widget appears in the bottom-right corner.

Optional: add `<encryption_key>any-random-string</encryption_key>` to `koha-conf.xml` (inside `<config>`) so the API key is stored encrypted rather than plaintext in the database.

---

## Capabilities

**Natural language catalog search** — resolves queries like *"Python books published after 2020"* or *"novels by Cormac McCarthy"* to the correct filter combination across title, author, ISBN, subject, publisher, branch, language, publication year, barcode, and call number.

**Voice input** — the browser's Web Speech API, native in Chrome, Edge, and Safari. No setup required.

**Book cover / barcode scanning** — open the camera input, photograph a book cover or barcode. The image is sent to the LLM's vision endpoint; the extracted title or ISBN is searched automatically.

**Conversation context** — the last 8 turns of dialogue are sent with each request so follow-up questions (*"show me more by the same author"*) resolve correctly.

**Local FAQ answers** — library hours, membership, and contact questions are answered instantly from a client-side knowledge base, with no backend call.

**LLM portability** — swap between Groq, Gemini, and OpenAI by changing two fields in the Configure page.

---

## Repository layout

```
├── dist/
│   └── koha-plugin-opac-ai-assistant-1.2.4.kpz   # ready to upload
│
└── src/
    ├── Koha/Plugin/OPACChatBot.pm                  # Perl plugin entry point
    ├── frontend/
    │   ├── js/                                     # 10 ES6 modules
    │   │   ├── config.js        runtime config (API URLs, debug flag)
    │   │   ├── intentEngine.js  client-side NLP intent routing
    │   │   ├── knowledgeBase.js local FAQ answer store
    │   │   ├── api.js           fetch wrappers for backend endpoints
    │   │   ├── ui.js            DOM builder for chat widget shell
    │   │   └── app.js           bootstrap, events, MutationObserver
    │   ├── css/                                    # 6 stylesheets
    │   │   ├── variables.css    CSS custom property design tokens
    │   │   ├── theme.css        color palette and glass surfaces
    │   │   ├── chatbot.css      floating widget shell layout
    │   │   ├── components.css   book cards, badges, skeleton loader
    │   │   ├── animations.css   keyframes (shimmer, fadeIn, typing)
    │   │   └── responsive.css   mobile breakpoints
    │   ├── templates/configure.tt                  # admin settings page
    │   └── assets/icons/                           # SVG icon set
    ├── scripts/build.sh                            # packages the .kpz
    └── metadata.json
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| No **Plugins** menu in Admin | `enable_plugins` still `0` or Plack not restarted | Edit `koha-conf.xml` → restart Plack |
| Widget not visible on OPAC | Plugin not enabled | Admin → Plugins → Enable |
| *"not fully configured"* on every message | No API key saved | Admin → Plugins → Configure → add key |
| Asset URL returns 404 | Plack rejected the plugin API spec at startup | Check Plack error log (see below) |
| Mic button does nothing | Browser blocked microphone access | Allow microphone in browser site settings |
| Camera scan returns no result | Blurry or low-light image | Retry with a clear, well-lit photo |

For the asset 404 case, run:

```bash
sudo tail -100 /var/log/koha/library/plack-error.log | grep -i "route\|plugin\|chatbot"
```

If the output contains `route injection failed`, open an issue with the log and your Koha version. This is a plugin bug, not a configuration problem.

---

## Verification checklist

Test in this order after installation:

1. Admin → Plugins — plugin listed as **Enabled**
2. Open any OPAC page — chat button visible in bottom-right corner
3. `curl -I https://<opac>/api/v1/contrib/opacchatbot/asset/css/bundle.css` — `200 OK`
4. Send a question — real books from your catalog returned
5. Click the mic button — browser requests microphone permission
6. Click the camera button — file picker opens

Step 3 must pass before the others are meaningful. If assets 404, the widget will appear but every request will fail silently.

---

## Building from source

Requires `zip`. From the repo root:

```bash
bash src/scripts/build.sh
```

Output: `dist/koha-plugin-opac-ai-assistant-<version>.kpz`

Upload via Koha Staff → Plugins → Upload Plugin.

---

## Compatibility notes

Tested on one Koha 26.05 instance (Debian 12, MariaDB 10.11, Apache + Plack). The following are implemented by reading Koha's source code but not verified on a second machine:

- Zebra vs Elasticsearch search code paths
- `OpacHiddenItems` filtering in result sets
- UNIMARC sites (only MARC21 tested)
- MySQL 8 strict mode

Any new installation is effectively a portability test. If something breaks, open an issue with your environment details.

---

## Contributing

Open an issue before starting significant work. For bug reports, include Koha version, Perl version, and the relevant lines from `plack-error.log`. PRs welcome — source is in `src/`.

---

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).

---

*Developed during an internship at COMSATS University Library, Islamabad.*
