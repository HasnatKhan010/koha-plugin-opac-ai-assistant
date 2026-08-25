<div align="center">

# Koha OPAC AI Assistant

### *Conversational AI Search, Multi-Modal Discovery & Real-Time Intelligence for Koha ILS*

[![Release](https://img.shields.io/github/v/release/HasnatKhan010/koha-plugin-opac-ai-assistant?style=flat-square&color=6366f1&logo=github)](../../releases/latest)
[![Koha Compatibility](https://img.shields.io/badge/Koha-22.11%2B-059669?style=flat-square&logo=koha)](https://koha-community.org)
[![Architecture](https://img.shields.io/badge/Architecture-Standalone--Plugin-7c3aed?style=flat-square)](#-architecture--system-flow)
[![Multi-LLM Engine](https://img.shields.io/badge/LLM-Groq%20%7C%20Gemini%20%7C%20OpenAI-ec4899?style=flat-square)](#-multi-llm-engine)
[![License](https://img.shields.io/badge/License-GPL--v3-d97706?style=flat-square)](LICENSE)

<br/>

[🚀 **Quick Start: How to Run**](#-how-to-run--install-in-3-steps) • [📖 **Administrator Setup Manual**](SETUP.md) • [✨ **Features**](#-core-capabilities) • [🏗️ **Architecture**](#-architecture--system-flow)

</div>

---

## ⚡ Quick Start: How to Run & Install

> **No Python backend. No external server. No Docker containers.**
> The plugin runs 100% inside Koha's native Plack environment. Upload one `.kpz` file, add an API key, and you're ready to run!

```
┌────────────────────────────────┐     ┌────────────────────────────────┐     ┌────────────────────────────────┐
│ STEP 1: Enable Plugins         │ ──► │ STEP 2: Upload .kpz Plugin     │ ──► │ STEP 3: Configure API Key      │
│ Edit koha-conf.xml & restart   │     │ Download & Upload via Admin    │     │ Enter Groq/Gemini key & save   │
└────────────────────────────────┘     └────────────────────────────────┘     └────────────────────────────────┘
```

---

### 🛠️ Step 1 — Enable Koha Plugin System *(One-Time Server Setup)*

Open your Koha instance's `koha-conf.xml` file on your server:
```bash
sudo nano /etc/koha/sites/YOUR_INSTANCE/koha-conf.xml
```

Locate `<enable_plugins>` and change `0` to `1`:
```xml
<enable_plugins>1</enable_plugins>
```

Restart Koha's Plack service to reload configuration:
```bash
sudo koha-plack --restart YOUR_INSTANCE
```

---

### 📦 Step 2 — Download & Upload the Plugin Package

1. **Download Archive:** Download **[`koha-plugin-opac-ai-assistant-1.2.4.kpz`](../../releases/download/v1.2.4/koha-plugin-opac-ai-assistant-1.2.4.kpz)**.
2. **Access Koha Staff Panel:** Go to **Koha Administration ➔ Plugins ➔ Upload Plugin**.
3. **Upload & Enable:** Choose `koha-plugin-opac-ai-assistant-1.2.4.kpz`, click **Upload**, then click **Enable**.

---

### 🔑 Step 3 — Add API Key & Launch

1. Go to **Koha Administration ➔ Plugins ➔ OPAC AI Assistant ➔ Actions ➔ Configure**.
2. Select your provider (Default: `groq` — *Ultra-fast & 100% Free*).
3. Paste your free API key ([Get Free Groq Key](https://console.groq.com/keys) | [Get Free Gemini Key](https://aistudio.google.com/app/apikey)).
4. Click **Save Configuration**.

> **🎉 Success!** Open your Koha OPAC website. The floating glassmorphism AI chat widget will appear automatically in the bottom-right corner.

---

## 🔍 Verification & Run Check

After completing installation, verify functionality in this order:

- [x] **Staff Admin:** Navigate to *Koha Administration ➔ Plugins* — plugin status shows **Enabled**.
- [x] **OPAC Launch:** Open your library OPAC interface — floating chat button appears in the bottom-right.
- [x] **Catalog Search:** Send a message like *"Find Python programming books"* — real catalog book cards are rendered.
- [x] **Voice Search:** Click the microphone button — browser prompts for microphone speech input.
- [x] **Cover Scanner:** Click the camera icon — upload or capture a book cover or barcode photo.

---

## 💡 Overview & Features

**Koha OPAC AI Assistant** replaces traditional keyword catalog search forms with a responsive, conversational AI companion embedded directly into your library's OPAC.

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <h3>🧠 Conversational Search</h3>
      <p>Understands natural language queries like <i>"Introductory machine learning books after 2020"</i> or <i>"Novels by Cormac McCarthy"</i>, matching MARC21 title, author, subject, and call numbers.</p>
    </td>
    <td width="50%" valign="top">
      <h3>🎤 Hands-Free Speech Input</h3>
      <p>Native Web Speech STT lets patrons dictate search queries. Multi-lingual voice recognition supported across Chrome, Edge, and Safari.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>📷 AI Vision Cover & Barcode Scan</h3>
      <p>Patrons can capture or upload book covers/barcodes. Multi-modal LLM Vision parses book titles or ISBNs and initiates automatic catalog queries.</p>
    </td>
    <td width="50%" valign="top">
      <h3>⚡ Instant Local FAQ Engine</h3>
      <p>Answers static library inquiries (opening hours, membership, contacts) locally on the client side without hitting remote API endpoints.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🤖 Hot-Swappable Multi-LLM Engine</h3>
      <p>Switch seamlessly between <b>Groq</b> (Llama 3.3 — fast & free), <b>Google Gemini</b> (Free tier), or <b>OpenAI</b> (GPT-4o) via the Koha admin panel.</p>
    </td>
    <td width="50%" valign="top">
      <h3>🎨 Modern Responsive Interface</h3>
      <p>Translucent glassmorphism styling, animated skeleton loaders, WCAG accessibility support, and touch-optimized mobile response.</p>
    </td>
  </tr>
</table>

---

## 📊 Feature Matrix

| Feature | Standard Koha OPAC Search | ⚡ Koha OPAC AI Assistant |
| :--- | :--- | :--- |
| **Search Syntax** | Exact keyword & Boolean rules | Conversational natural phrasing & intent resolution |
| **Input Methods** | Text keyboard only | Text, Speech (STT), & Camera Vision Cover Scanning |
| **Result Presentation**| Standard paginated table lists | Interactive HTML book cards with status & cover image |
| **Library FAQ** | Static manual pages | Instant automated client-side intent resolution |
| **Infrastructure** | Standard Koha ILS | Self-contained `.kpz` plugin — 0 external servers |
| **LLM Flexibility** | None | Hot-swappable Groq, Gemini & OpenAI |

---

## 🏗️ Architecture & System Flow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PATRON BROWSER (OPAC)                                │
│   • Floating Glassmorphism Widget Shell                                                │
│   • Web Speech API (STT Voice Input) & Camera FileReader (Vision Upload)               │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Patron Message / Speech / Image
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT-SIDE INTENT ROUTER (JS)                            │
│   • Instant FAQ Pattern Match (Hours, Rules, Contacts) ──► [Client Side Answer]        │
│   • Regex Extractor (ISBN-10/13, Barcode, Publication Years 19xx/20xx)                 │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Catalog Query Fallthrough
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              KOHA PERL PLUGIN BACKEND                                  │
│   • REST Namespace: /api/v1/contrib/opacchatbot/                                       │
│   • Direct SQL Queries on biblio, biblioitems, items & biblio_metadata                │
│   • Encrypted Key Storage via Koha <encryption_key> Configuration                      │
└─────────────────────────────────────┬───────────────────┬──────────────────────────────┘
                                      │                   │
                     HTTP REST Call   │                   │ Direct SQL Query
                                      ▼                   ▼
                     ┌──────────────────────────┐   ┌──────────────────────────┐
                     │    REMOTE LLM SERVICE    │   │   KOHA MARIADB ENGINE    │
                     │ (Groq / Gemini / OpenAI) │   │ (Patron & Catalog Items) │
                     └──────────────────────────┘   └──────────────────────────┘
```

---

## 📂 Repository Directory Tree

```
koha-plugin-opac-ai-assistant/
├── 📁 dist/                                    # Distribution Package Artifacts
│   └── 📦 koha-plugin-opac-ai-assistant-1.2.4.kpz  <-- Installable Koha Plugin Archive
│
├── 📁 src/                                     # Modular Plugin Source Code
│   ├── 📁 Koha/Plugin/
│   │   └── OPACChatBot.pm                     # Core Perl Plugin Logic & REST Routes
│   ├── 📁 frontend/
│   │   ├── 📁 js/                             # ES6 Client Javascript Modules
│   │   │   ├── app.js                         # Bootstrap, Observers & Event Observers
│   │   │   ├── intentEngine.js                # NLP Intent Router & Keyword Extractor
│   │   │   ├── chatController.js              # Streaming & Message Pipeline
│   │   │   ├── api.js                         # REST Fetch Wrappers & Error Handlers
│   │   │   ├── ui.js                          # DOM Renderers & Skeleton Loaders
│   │   │   └── knowledgeBase.js               # Static Library Metadata & FAQ Answers
│   │   ├── 📁 css/                            # Custom CSS Token & Theme Modules
│   │   ├── 📁 templates/                      # Koha Admin Configuration UI (.tt)
│   │   └── 📁 assets/                         # SVG Vector Icons & Branding Graphics
│   ├── 📁 scripts/                            # Build & Packaging Automation Scripts
│   └── 📄 metadata.json                       # Plugin Version Manifest
│
├── 📄 SETUP.md                                # Comprehensive Administrator Guide
├── 📄 CHANGELOG.md                            # Version Audit & Release Notes
├── 📄 LICENSE                                 # GNU General Public License v3.0
└── 📄 README.md                               # Project Presentation Landing Page
```

---

## 🔒 Security & Enterprise Infrastructure

- **Encrypted Credentials:** API keys are stored in Koha's database with optional encryption at rest using Koha's `<encryption_key>` mechanism.
- **Asynchronous Execution:** Scripts load non-blockingly via Koha's `opac_js` and `opac_head` hooks for zero OPAC page render slowdown.
- **Strict Input Sanitization:** All user text and LLM outputs pass through strict HTML escaping (`escapeHTML`) to prevent XSS injection.
- **WCAG Accessibility Compliance:** Features full keyboard focus trap (Tab / Shift+Tab / Escape), touch targets, and high contrast mode.

---

## 🛠️ Building from Source

To package your own `.kpz` archive after modifying source files in `src/`:

```bash
# Clone repository
git clone https://github.com/HasnatKhan010/koha-plugin-opac-ai-assistant.git
cd koha-plugin-opac-ai-assistant

# Run build script
bash src/scripts/build.sh
```

The compiled archive will be created at `dist/koha-plugin-opac-ai-assistant-1.2.4.kpz`.

---

## 🤝 Contributing & Support

Contributions from Koha library IT teams and open-source developers are welcome!
- **Bug Reports & Feature Ideas:** Submit an issue on [GitHub Issues](https://github.com/HasnatKhan010/koha-plugin-opac-ai-assistant/issues).
- **Pull Requests:** Fork the repository, create your branch (`git checkout -b feature/NewFeature`), and open a PR.

---

## 📜 License

Distributed under the **GNU General Public License v3.0**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

*Developed with dedication by **Hasnat Khan** during internship research at **COMSATS University Library, Islamabad**.*

[⭐ Star Repository](https://github.com/HasnatKhan010/koha-plugin-opac-ai-assistant) • [🐛 Report Bug](https://github.com/HasnatKhan010/koha-plugin-opac-ai-assistant/issues) • [📖 Setup Manual](SETUP.md)

</div>
