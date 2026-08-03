# 🚀 Koha OPAC AI Assistant — Setup Guide

**Version 1.2.4** · Self-contained Koha plugin · No external server required

---

## 📋 What You Need

| Requirement | Notes |
|-------------|-------|
| **Koha** 22.11 or newer | Older versions not tested |
| **Shell access** to the Koha server | Needed once to edit `koha-conf.xml` |
| **Staff "plugins" permission** | For whoever uploads the file |
| **One free AI API key** | Groq is recommended — free, no credit card |

### Get a Free API Key (pick one)

| Provider | Free? | Get Key At |
|----------|-------|------------|
| **Groq** ⭐ Recommended | ✅ Free tier | https://console.groq.com/keys |
| **Google Gemini** | ✅ Free tier | https://aistudio.google.com/app/apikey |
| **OpenAI** | ❌ Paid | https://platform.openai.com/api-keys |

> ⚠️ **Important:** Without an API key the widget will install and appear correctly, but **every question will return** *"The library assistant is not fully configured yet. Please ask an administrator to add an API key in the plugin settings."* Get the key first.

---

## ⚡ Overview

There are **3 steps**:

```
Step 1 → Enable the plugin system in koha-conf.xml  (shell, once only)
Step 2 → Upload the .kpz file in Koha Staff Interface
Step 3 → Configure the plugin with your LLM API key
```

The `.kpz` file is **completely self-contained** — 41 files including all Perl modules, CSS/JS bundles, icons, templates, and metadata. There is no Python backend to install, no `.env` file, and no separate server to run.

---

## STEP 1 — Enable the Koha Plugin System

> **This requires shell/SSH access to your Koha server.**
> The `UseKohaPlugins` system preference was removed in Koha 19.12.
> The only way to enable plugins is by editing `koha-conf.xml`.

### 1a. Edit koha-conf.xml

Find the correct config file for your instance (replace `library` with your site name):

```bash
sudo nano /etc/koha/sites/library/koha-conf.xml
```

Search for `<enable_plugins>` inside the file. It will look like this:

```xml
<enable_plugins>0</enable_plugins>
```

Change `0` to `1`:

```xml
<enable_plugins>1</enable_plugins>
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`).

### 1b. Restart Plack

```bash
sudo koha-plack --restart library
```

Or if using systemd directly:

```bash
sudo systemctl restart koha-plack-library
```

> ✅ **How to confirm it worked:** Log in to Koha Staff Interface → **Administration**. You should now see a **"Plugins"** menu item. If it's not there, Plack did not pick up the change — restart again.

### 1c. (Optional but Recommended) Add an Encryption Key

This encrypts the API key you store in the plugin settings, so it is not saved as plaintext in the database:

```xml
<encryption_key>any-long-random-string-here</encryption_key>
```

Add this line anywhere inside the `<config>` block of `koha-conf.xml`, then restart Plack again.

---

## STEP 2 — Upload the Plugin

### 2a. Give Your Staff Account the Plugins Permission

In Koha Staff Interface:
1. Go to **Administration → Manage staff patrons**
2. Find your account → click **More → Set permissions**
3. Enable the **"plugins"** permission → Save

### 2b. Upload the .kpz File

1. Go to **Administration → Plugins → Upload Plugin**
2. Select the file: **`koha-plugin-opac-ai-assistant-1.2.4.kpz`**
3. Click **Upload**

> The filename has no functional meaning — Koha reads the version from inside the `.pm` file. `1.2.4` is the real version.

### 2c. Enable the Plugin

1. Go to **Administration → Plugins**
2. Find **OPAC AI Assistant** in the list
3. Click **Enable**

---

## STEP 3 — Configure the Plugin

1. Click **Actions → Configure** next to the plugin
2. Fill in the **LLM Provider** field — choose one: `groq`, `gemini`, or `openai`
3. Paste your **API Key**
4. Click **Save**

> 💡 For Groq, the default model `llama-3.1-8b-instant` works well and is free. You do not need to change the model field unless you want to use a different one.

---

## ✅ Verification Checklist

Test these **in order**. Each step confirms the previous one worked.

| # | Check | Expected Result |
|---|-------|-----------------|
| 1 | `Administration → Plugins` | Plugin listed as **Enabled** |
| 2 | Open any OPAC page | **Floating chat button** appears in bottom-right corner |
| 3 | `curl https://your-koha-opac/api/v1/contrib/opacchatbot/asset/css/bundle.css` | HTTP **200** response with CSS content |
| 4 | Type a question in the chat widget | Real books returned from the catalog |
| 5 | Click the 🎤 mic button | Browser requests microphone access |
| 6 | Click the 📷 camera button | File picker opens |

> ⚠️ **If the widget appears but Step 3 returns 404:** Koha rejected the API spec at startup and silently skipped the plugin. Check the Plack error log:
> ```bash
> sudo tail -f /var/log/koha/library/plack-error.log
> ```
> Look for `route injection failed` — if found, that is a bug to report, not a configuration problem.

---

## ❌ Troubleshooting

| Symptom | Most Likely Cause | Fix |
|---------|-------------------|-----|
| No "Plugins" menu in Admin | `enable_plugins` still `0`, or Plack not restarted | Edit `koha-conf.xml` → restart Plack |
| Plugin not listed after upload | Uploaded while plugins were disabled | Re-upload after enabling plugins |
| Chat widget not on OPAC | Plugin not enabled | Admin → Plugins → Enable |
| *"not fully configured"* on every question | No API key set | Admin → Plugins → Configure → add API key |
| `/asset/css/bundle.css` returns 404 | API route injection failed | Check Plack error log for `route injection failed` |
| Voice mic button does nothing | Browser blocked microphone | Allow microphone in browser settings |
| Camera scan returns no result | Low-quality or blurry image | Retry with a clear, well-lit photo |
| Plugin version shows wrong | Old `.kpz` still cached | Re-upload the new file; Koha reads version from inside the `.pm` |

---

## 📋 Honest Caveats

This plugin has been tested on one development Koha instance. The following have been implemented from reading Koha's source code but **not verified on a second install**:

- Zebra vs Elasticsearch search paths
- `OpacHiddenItems` filtering
- Asset routes under Apache's `api/v1/app.pl` mount
- MySQL 8 strict mode compatibility
- UNIMARC sites (MARC21 only tested)

Treat this installation as the **first real portability test**. If anything fails, please report it with the Plack error log attached.

---

## 📁 What's Inside the .kpz

```
koha-plugin-opac-ai-assistant-1.2.4.kpz  (41 files total)
├── Koha/Plugin/OPACChatBot.pm          ← Main plugin module
├── Koha/Plugin/OPACChatBot/
│   ├── Controller.pm                   ← API route handlers (/chat, /asset, etc.)
│   └── DB.pm                           ← Koha catalog search logic
├── templates/
│   └── configure.tt                    ← Admin configuration page
├── assets/
│   ├── css/bundle.css                  ← Compiled stylesheet
│   ├── js/bundle.js                    ← Compiled JavaScript (chat + voice + vision)
│   └── icons/                          ← SVG icons
├── metadata.json                       ← Version 1.2.4, plugin metadata
├── LICENSE
└── README.md
```

No `backend/`, no `.env`, no `localhost:8000`, no hardcoded API key.

---

## 🔑 API Key Quick Links

- **Groq (Free):** https://console.groq.com/keys
- **Gemini (Free):** https://aistudio.google.com/app/apikey
- **OpenAI (Paid):** https://platform.openai.com/api-keys
