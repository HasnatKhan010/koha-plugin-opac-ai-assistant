<div align="center">

# 🤖 Koha OPAC AI Assistant

**A plug-and-play AI chat assistant for any Koha library**

[![Version](https://img.shields.io/badge/version-1.2.4-blue?style=flat-square)](dist/koha-plugin-opac-ai-assistant-1.2.4.kpz)
[![Koha](https://img.shields.io/badge/Koha-22.11%2B-green?style=flat-square)](https://koha-community.org)
[![License](https://img.shields.io/badge/license-GPL--3.0-orange?style=flat-square)](LICENSE)
[![Standalone](https://img.shields.io/badge/standalone-no%20server%20required-brightgreen?style=flat-square)](#)

*Voice search · Book cover scanning · Multi-LLM support · Zero external dependencies*

</div>

---

## ⚡ Install in 3 Steps

> **No Python. No external server. No extra dependencies.**
> Upload one file and configure your API key — that's it.

### 1. Enable the Koha Plugin System (once, needs shell access)

```bash
sudo nano /etc/koha/sites/library/koha-conf.xml
```

Find `<enable_plugins>0</enable_plugins>` → change to `<enable_plugins>1</enable_plugins>`

```bash
sudo koha-plack --restart library
```

### 2. Upload the Plugin

Go to **Koha Staff → Administration → Plugins → Upload Plugin**

Download and upload: **[`koha-plugin-opac-ai-assistant-1.2.4.kpz`](dist/koha-plugin-opac-ai-assistant-1.2.4.kpz)**

Then click **Enable**.

### 3. Add Your API Key

Go to **Administration → Plugins → Actions → Configure**

Paste a free [Groq API key](https://console.groq.com/keys) → Save.

> ✅ **Done.** Open your OPAC — the chat widget appears in the bottom-right corner.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Natural Language Search** | Ask for books by title, author, subject, ISBN, or plain English |
| 🎤 **Voice Input** | Speak your query — works in Chrome, Edge, Safari |
| 📷 **Book Cover Scanning** | Upload a photo of a cover or barcode to search |
| 🧠 **Multi-LLM Support** | Groq (free), Google Gemini (free), or OpenAI |
| 💬 **Conversation Memory** | Remembers context across multiple turns |
| 🌐 **Live Catalog** | Searches your Koha database in real time |
| 🔒 **No External Server** | Runs entirely inside Koha — no ports to open |

---

## 📦 What's in This Repo

```
koha-plugin-opac-ai-assistant/
├── dist/
│   └── koha-plugin-opac-ai-assistant-1.2.4.kpz  ← ⬅️ Download & install this
├── src/
│   ├── Koha/Plugin/OPACChatBot.pm
│   ├── frontend/js/   (10 source modules)
│   ├── frontend/css/  (6 stylesheets)
│   ├── frontend/templates/configure.tt
│   ├── frontend/assets/icons/
│   ├── scripts/build.sh
│   └── metadata.json
├── README.md
├── SETUP.md
├── CHANGELOG.md
└── LICENSE
```

---

## 📋 Requirements

| Requirement | Details |
|-------------|---------|
| **Koha** | 22.11 or newer |
| **Shell access** | Needed once to edit `koha-conf.xml` |
| **Staff "plugins" permission** | For the account uploading the plugin |
| **LLM API key** | Groq is free — [get one here](https://console.groq.com/keys) |

---

## 🔑 Get a Free API Key

| Provider | Cost | Link |
|----------|------|------|
| **Groq** ⭐ Recommended | Free, no credit card | https://console.groq.com/keys |
| **Google Gemini** | Free tier | https://aistudio.google.com/app/apikey |
| **OpenAI** | Paid | https://platform.openai.com/api-keys |

---

## 📖 Full Setup Guide

See **[SETUP.md](SETUP.md)** for complete step-by-step instructions.

---

## ✅ Verification Checklist

1. `Administration → Plugins` — plugin listed as **Enabled**
2. Open any OPAC page — **chat button** appears bottom-right
3. `curl https://your-opac/api/v1/contrib/opacchatbot/asset/css/bundle.css` — returns **200**
4. Type a question — **real books** from your catalog returned
5. Click 🎤 — microphone permission requested
6. Click 📷 — file picker opens

---

## 👤 Author

**Hasnat Khan** — developed during internship at COMSATS University Library

## 📄 License

GPL-3.0 — see [LICENSE](LICENSE)
