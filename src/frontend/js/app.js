document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------------------------------------------------
  // 1. Load Puter.js — voice, vision, TTS
  // -----------------------------------------------------------------------
  const puterScript = document.createElement("script");
  puterScript.src = "https://js.puter.com/v2/";
  puterScript.async = true;
  document.head.appendChild(puterScript);

  // -----------------------------------------------------------------------
  // 2. Build the chat UI
  // -----------------------------------------------------------------------
  window.KohaChatPlugin.createChatUI();

  const toggle   = document.getElementById("koha-chat-toggle");
  const chat     = document.getElementById("koha-chat-window");
  const input    = document.getElementById("koha-chat-message-input");
  const micBtn   = document.getElementById("koha-chat-mic-btn");
  const camBtn   = document.getElementById("koha-chat-camera-btn");
  const fileInput= document.getElementById("koha-chat-file-input");

  // -----------------------------------------------------------------------
  // 3. Toggle open / close
  // -----------------------------------------------------------------------
  toggle.onclick = () => {
    const isOpen = chat.style.display === "flex";
    chat.style.display = isOpen ? "none" : "flex";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    chat.setAttribute("aria-hidden", String(isOpen));
    if (!isOpen) input.focus(); else toggle.focus();
  };

  // Keyboard trap inside open chat
  document.addEventListener("keydown", (e) => {
    if (chat.style.display !== "flex") return;
    if (e.key === "Escape") {
      chat.style.display = "none";
      toggle.setAttribute("aria-expanded", "false");
      chat.setAttribute("aria-hidden", "true");
      toggle.focus();
    } else if (e.key === "Tab") {
      const els = chat.querySelectorAll(
        'a[href], button, textarea, input[type="text"], select, [tabindex]:not([tabindex="-1"])'
      );
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // -----------------------------------------------------------------------
  // 4. Welcome message & conversation history
  // -----------------------------------------------------------------------
  window.KohaChatPlugin.addMessage("bot", window.KohaChatPlugin.CONFIG.WELCOME_MESSAGE);
  const conversationHistory = [];

  // -----------------------------------------------------------------------
  // 5. Core send() function
  // -----------------------------------------------------------------------
  const statusPhrases = [
    "Mining diamonds...", "Dusting off ancient tomes...",
    "Consulting the library archives...", "Decoding the scrolls...",
    "Searching the catalog...", "Connecting to knowledge base...",
    "Analyzing your request...", "Sifting through shelves...",
    "Brewing the answer...", "Unlocking the vault..."
  ];

  async function send(textValue) {
    const text = textValue !== undefined ? textValue : input.value.trim();
    if (!text) return;

    window.KohaChatPlugin.addMessage("user", window.KohaChatPlugin.escapeHTML(text));
    input.value = "";

    const historyToSend = [...conversationHistory];

    document.getElementById("koha-chat-messages")
      .insertAdjacentHTML("beforeend", window.KohaChatPlugin.createSkeleton());
    window.KohaChatPlugin.scrollToBottom();

    const statusTextEl = document.getElementById("koha-chat-status-text");
    if (statusTextEl) statusTextEl.innerText = statusPhrases[Math.floor(Math.random() * statusPhrases.length)];

    const statusInterval = setInterval(() => {
      const el = document.getElementById("koha-chat-status-text");
      if (el) el.innerText = statusPhrases[Math.floor(Math.random() * statusPhrases.length)];
    }, 1800);

    try {
      const local = window.KohaChatPlugin.localIntent(text);
      if (local.type === "FAQ") {
        clearInterval(statusInterval);
        window.KohaChatPlugin.removeSkeleton();
        window.KohaChatPlugin.addMessage("bot", local.answer);
        conversationHistory.push({ role: "user", content: text });
        conversationHistory.push({ role: "bot", content: local.answer });
        while (conversationHistory.length > 8) conversationHistory.shift();
        return;
      }

      const result = await window.KohaChatPlugin.API.chat(text, historyToSend);
      clearInterval(statusInterval);
      window.KohaChatPlugin.removeSkeleton();
      window.KohaChatPlugin.addMessage("bot", result.response);

      conversationHistory.push({ role: "user", content: text });
      if (result.raw_text) {
        const clean = result.raw_text.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim();
        conversationHistory.push({ role: "bot", content: clean });
      }
      while (conversationHistory.length > 8) conversationHistory.shift();

    } catch (err) {
      clearInterval(statusInterval);
      window.KohaChatPlugin.removeSkeleton();
      if (window.KohaChatPlugin.CONFIG.DEBUG) console.error("Chat error:", err);
      window.KohaChatPlugin.addMessage("bot", "Unable to contact the library service. Please try again.");
    }
  }

  document.getElementById("koha-chat-send-btn").onclick = () => send();
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); send(); } });

  // -----------------------------------------------------------------------
  // 6. VOICE INPUT — Web Speech API (works on Chrome, Edge, Safari)
  // -----------------------------------------------------------------------
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let recognition = null;

  if (SpeechRecognitionAPI) {
    recognition = new SpeechRecognitionAPI();
    recognition.continuous     = false;
    recognition.interimResults = false;
    recognition.lang           = "en-US";

    recognition.onstart = () => {
      micBtn.classList.add("recording");
      micBtn.setAttribute("aria-label", "Listening… click to stop");
      input.placeholder = "Listening…";
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        input.value = transcript;
        send();
      }
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      micBtn.classList.remove("recording");
      micBtn.setAttribute("aria-label", "Use voice input");
      input.placeholder = "Search catalog, authors, ISBN...";

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        window.KohaChatPlugin.addMessage("bot",
          "Microphone access was denied. Please allow microphone access in your browser settings and try again.");
      } else if (event.error === "no-speech") {
        window.KohaChatPlugin.addMessage("bot",
          "No speech detected. Please try again and speak clearly.");
      }
    };

    recognition.onend = () => {
      micBtn.classList.remove("recording");
      micBtn.setAttribute("aria-label", "Use voice input");
      input.placeholder = "Search catalog, authors, ISBN...";
    };
  }

  let isListening = false;
  micBtn.onclick = () => {
    if (!recognition) {
      window.KohaChatPlugin.addMessage("bot",
        "Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }
    if (isListening) {
      recognition.stop();
      isListening = false;
    } else {
      try {
        recognition.start();
        isListening = true;
      } catch (e) {
        // Already started — ignore
        console.warn("Recognition already started:", e);
      }
    }
  };

  // -----------------------------------------------------------------------
  // 7. VISION INPUT — Camera / image upload → Backend AI → catalog search
  // -----------------------------------------------------------------------

  // Helper: read a File object as a base64 data URL
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });
  }

  camBtn.onclick = () => fileInput.click();

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset so same file can be re-selected
    fileInput.value = "";

    input.value    = "Scanning image…";
    input.disabled = true;
    camBtn.classList.add("scanning");
    camBtn.setAttribute("aria-label", "Scanning…");

    try {
      const dataUrl = await fileToDataURL(file);

      // Call our own backend /api/vision — uses Groq / Gemini / OpenAI vision
      const res = await fetch(window.KohaChatPlugin.CONFIG.VISION_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ image: dataUrl }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Server error " + res.status);
      }

      const data      = await res.json();
      const extracted = (data.text || "").trim();

      input.value    = "";
      input.disabled = false;
      camBtn.classList.remove("scanning");
      camBtn.setAttribute("aria-label", "Scan book cover");

      if (!extracted || data.not_a_book || extracted.toUpperCase() === "NOT_A_BOOK") {
        window.KohaChatPlugin.addMessage("bot",
          "This image doesn't appear to be a book, barcode, or library item. " +
          "Please try again with a clear photo of a book cover or barcode.");
        return;
      }

      // Put extracted text in the box and auto-search
      input.value = extracted;
      send();

    } catch (err) {
      console.error("Vision error:", err);
      input.value    = "";
      input.disabled = false;
      camBtn.classList.remove("scanning");
      camBtn.setAttribute("aria-label", "Scan book cover");
      window.KohaChatPlugin.addMessage("bot",
        "Sorry, I couldn't read that image. " +
        "Please ensure the book cover is well-lit and in focus, then try again.");
    }
  };

  // -----------------------------------------------------------------------
  // 8. TEXT-TO-SPEECH — Puter.js with Web Speech API fallback
  // -----------------------------------------------------------------------
  window.KohaChatPlugin.speak = async function(text) {
    // Strip HTML tags before speaking
    const plainText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (!plainText) return;

    try {
      if (typeof puter !== "undefined" && puter.ai && typeof puter.ai.txt2speech === "function") {
        const audio = await puter.ai.txt2speech(plainText);
        if (audio && typeof audio.play === "function") {
          audio.play();
          return;
        }
      }
    } catch (puterErr) {
      console.warn("Puter TTS failed, falling back to Web Speech API:", puterErr);
    }

    // Fallback: Web Speech API (always available in modern browsers)
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // stop any ongoing speech first
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.lang  = "en-US";
      utterance.rate  = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  // -----------------------------------------------------------------------
  // 9. Autocomplete suggestions
  // -----------------------------------------------------------------------
  const suggestionsBox = document.getElementById("koha-chat-suggestions-box");

  const handleInput = window.KohaChatPlugin.debounce(async (e) => {
    const query = e.target.value.trim();
    if (query.length < 3) { suggestionsBox.style.display = "none"; return; }

    try {
      const data = await window.KohaChatPlugin.API.suggest(query);
      if (data.suggestions && data.suggestions.length > 0) {
        suggestionsBox.innerHTML = data.suggestions
          .map(s => `<div class="suggestion-item" tabindex="0" role="option">${window.KohaChatPlugin.escapeHTML(s)}</div>`)
          .join("");
        suggestionsBox.style.display = "block";

        suggestionsBox.querySelectorAll(".suggestion-item").forEach(item => {
          const pick = () => {
            input.value = item.textContent;
            suggestionsBox.style.display = "none";
            input.focus();
          };
          item.onclick = pick;
          item.addEventListener("keydown", (ev) => { if (ev.key === "Enter") pick(); });
        });
      } else {
        suggestionsBox.style.display = "none";
      }
    } catch (err) {
      if (window.KohaChatPlugin.CONFIG.DEBUG) console.error("Suggest error:", err);
    }
  }, 300);

  input.addEventListener("input", handleInput);
  document.addEventListener("click", (e) => {
    if (e.target !== input && !suggestionsBox.contains(e.target)) suggestionsBox.style.display = "none";
  });

  // -----------------------------------------------------------------------
  // 10. Click delegation — quick actions + View Details / Reserve buttons
  // -----------------------------------------------------------------------
  const chatMessages = document.getElementById("koha-chat-messages");

  chatMessages.addEventListener("click", (e) => {
    // Quick search pills
    const btn = e.target.closest('[data-action="quick-search"]');
    if (btn) {
      const query = btn.getAttribute("data-query");
      if (query) { input.value = query; send(query); }
      return;
    }

    // View Details / Reserve
    const actionEl = e.target.closest('button, a, .result-btn, [class*="btn"]');
    if (!actionEl) return;

    let id = actionEl.getAttribute("data-id") || actionEl.getAttribute("data-biblionumber");
    const card = actionEl.closest(".book-card, .book-result, .bubble");
    if (!id && card) {
      const match = card.innerHTML.match(/biblionumber=(\d+)/i) || card.innerHTML.match(/\bid=(\d+)/i);
      if (match) id = match[1];
    }

    const label    = actionEl.textContent.toLowerCase();
    const isView   = label.includes("view") || label.includes("detail") || actionEl.getAttribute("data-action") === "view";
    const isResv   = label.includes("reserve") || label.includes("hold") || actionEl.getAttribute("data-action") === "reserve";

    if (!isView && !isResv) return;
    e.preventDefault(); e.stopPropagation();

    if (id) {
      window.location.href = isView
        ? `/cgi-bin/koha/opac-detail.pl?biblionumber=${id}`
        : `/cgi-bin/koha/opac-reserve.pl?biblionumber=${id}`;
      return;
    }

    // No id — try to find it via AJAX search
    if (card) {
      const titleEl = card.querySelector(".book-title, h3, h2, h4, strong, .title");
      if (titleEl) {
        const origHTML = actionEl.innerHTML;
        actionEl.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
        actionEl.style.pointerEvents = "none";
        actionEl.style.opacity = "0.7";

        const q         = encodeURIComponent(titleEl.textContent.trim());
        const searchUrl = `/cgi-bin/koha/opac-search.pl?q=${q}`;

        Promise.race([
          fetch(searchUrl).then(r => r.text()),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 2000))
        ])
          .then(html => {
            const doc = new DOMParser().parseFromString(html, "text/html");
            const el  = doc.querySelector('input[name="biblionumber"], a.title[href*="biblionumber="]');
            let found = null;
            if (el) {
              if (el.tagName === "INPUT") found = el.value;
              else { const m = el.href.match(/biblionumber=(\d+)/); if (m) found = m[1]; }
            }
            window.location.href = found
              ? (isView ? `/cgi-bin/koha/opac-detail.pl?biblionumber=${found}` : `/cgi-bin/koha/opac-reserve.pl?biblionumber=${found}`)
              : searchUrl;
          })
          .catch(() => { window.location.href = searchUrl; });
      }
    }
  }, true);

  // -----------------------------------------------------------------------
  // 11. Book cover image handling (shimmer / error / 1×1 pixel)
  // -----------------------------------------------------------------------
  chatMessages.addEventListener("load", (e) => {
    if (e.target.tagName === "IMG" && e.target.closest(".book-cover")) {
      if (e.target.naturalWidth <= 1) e.target.style.display = "none";
      else e.target.classList.add("loaded");
      e.target.parentElement.classList.add("has-loaded-img");
    }
  }, true);

  chatMessages.addEventListener("error", (e) => {
    if (e.target.tagName === "IMG" && e.target.closest(".book-cover")) {
      e.target.style.display = "none";
      e.target.parentElement.classList.add("has-loaded-img");
    }
  }, true);

  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;

        // Strip disabled state from buttons
        (n.querySelectorAll ? n.querySelectorAll("button[disabled], .disabled, [disabled]") : []).forEach(b => {
          b.removeAttribute("disabled");
          b.classList.remove("disabled");
          b.style.opacity = "1";
          b.style.cursor  = "pointer";
          b.style.pointerEvents = "auto";
        });
        if (n.hasAttribute && n.hasAttribute("disabled")) {
          n.removeAttribute("disabled");
          n.style.pointerEvents = "auto";
        }

        // Strip backend onerror handlers that load external placeholders
        (n.querySelectorAll ? n.querySelectorAll("img[onerror]") : []).forEach(img => {
          img.removeAttribute("onerror");
          img.onerror = null;
        });
        if (n.hasAttribute && n.hasAttribute("onerror")) {
          n.removeAttribute("onerror");
          n.onerror = null;
        }

        // Covers with no <img> — stop shimmer immediately
        (n.querySelectorAll ? n.querySelectorAll(".book-cover") : []).forEach(cover => {
          if (!cover.querySelector("img")) cover.classList.add("has-loaded-img");
        });
        if (n.classList && n.classList.contains("book-cover") && !n.querySelector("img")) {
          n.classList.add("has-loaded-img");
        }

        // Covers that have a complete image already
        (n.querySelectorAll ? n.querySelectorAll(".book-cover img:not(.processed)") : []).forEach(img => {
          img.classList.add("processed");
          if (img.complete) {
            if (img.naturalWidth <= 1) img.style.display = "none";
            else img.classList.add("loaded");
            img.parentElement.classList.add("has-loaded-img");
          }
        });
        if (n.tagName === "IMG" && n.closest(".book-cover") && !n.classList.contains("processed")) {
          n.classList.add("processed");
          if (n.complete) {
            if (n.naturalWidth <= 1) n.style.display = "none";
            else n.classList.add("loaded");
            n.parentElement.classList.add("has-loaded-img");
          }
        }
      });
    });
  });
  observer.observe(chatMessages, { childList: true, subtree: true });
});
