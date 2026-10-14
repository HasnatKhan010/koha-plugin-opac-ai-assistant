document.addEventListener("DOMContentLoaded", () => {
  window.KohaChatPlugin.createChatUI();
  if (window.KohaChatPlugin.Compare) window.KohaChatPlugin.Compare.mount();

  const toggle = document.getElementById("koha-chat-toggle");
  const chat = document.getElementById("koha-chat-window");
  const input = document.getElementById("koha-chat-message-input");

  toggle.onclick = () => {
    const isFlex = chat.style.display === "flex";
    chat.style.display = isFlex ? "none" : "flex";
    toggle.setAttribute("aria-expanded", !isFlex);
    chat.setAttribute("aria-hidden", isFlex.toString());
    if (!isFlex) {
      input.focus();
    } else {
      toggle.focus();
    }
  };

  document.addEventListener("keydown", (e) => {
    if (chat.style.display === "flex") {
      if (e.key === "Escape") {
        chat.style.display = "none";
        toggle.setAttribute("aria-expanded", "false");
        chat.setAttribute("aria-hidden", "true");
        toggle.focus();
      } else if (e.key === "Tab") {
        const focusableElements = chat.querySelectorAll(
          'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }
  });

  window.KohaChatPlugin.addMessage("bot", window.KohaChatPlugin.CONFIG.WELCOME_MESSAGE);

  const conversationHistory = [];

  async function send(textValue) {
    const text = textValue !== undefined ? textValue : input.value.trim();
    if (text === "") return;
    if (text.length > 512) {
      window.KohaChatPlugin.addMessage("bot", "Please shorten your search to 512 characters or fewer.");
      return;
    }

    window.KohaChatPlugin.addMessage("user", window.KohaChatPlugin.escapeHTML(text));
    input.value = "";
    input.placeholder = "Search books, authors, ISBN...";

    // Snapshot history BEFORE the current question — correct context for backend
    const historyToSend = conversationHistory.map(turn => ({
      role: turn.role,
      content: String(turn.content || "").slice(0, 1000),
    }));

    document.getElementById("koha-chat-messages").insertAdjacentHTML("beforeend", window.KohaChatPlugin.createSkeleton());
    window.KohaChatPlugin.scrollToBottom();

    // Capture element AFTER it is in the DOM
    const statusPhrases = [
        "Mining diamonds...",
        "Dusting off ancient tomes...",
        "Consulting the library archives...",
        "Decoding the scrolls...",
        "Searching the catalog...",
        "Connecting to knowledge base...",
        "Analyzing your request...",
        "Sifting through shelves...",
        "Brewing the answer...",
        "Unlocking the vault..."
    ];

    // Show first phrase immediately
    const statusTextEl = document.getElementById("koha-chat-status-text");
    if (statusTextEl) statusTextEl.innerText = statusPhrases[Math.floor(Math.random() * statusPhrases.length)];

    // Rotate phrases every 1.8s — re-query element each tick so it always finds it
    const statusInterval = setInterval(() => {
        const el = document.getElementById("koha-chat-status-text");
        if (el) el.innerText = statusPhrases[Math.floor(Math.random() * statusPhrases.length)];
    }, 1800);

    // Local FAQ shortcut, in its own try: it never contacts the server, so a
    // failure here must NOT be reported as a network error. Fall through to the
    // server instead — it can answer these questions too.
    let local = { type: "SERVER" };
    try {
      local = window.KohaChatPlugin.localIntent(text) || { type: "SERVER" };
    } catch (e) {
      if (window.KohaChatPlugin.CONFIG.DEBUG) {
        console.error("KohaChatPlugin: localIntent failed, asking server", e);
      }
    }

    if (local.type === "FAQ" && local.answer) {
      clearInterval(statusInterval);
      window.KohaChatPlugin.removeSkeleton();
      window.KohaChatPlugin.addMessage("bot", local.answer);
      conversationHistory.push({ role: "user", content: text });
      conversationHistory.push({ role: "bot", content: local.answer });
      while (conversationHistory.length > 8) conversationHistory.shift();
      return;
    }

    try {
      const result = await window.KohaChatPlugin.API.chat(text, historyToSend);
      clearInterval(statusInterval);
      window.KohaChatPlugin.removeSkeleton();
      window.KohaChatPlugin.addMessage("bot", result.response);

      // Push user + bot AFTER we have the response — history is always in sync
      conversationHistory.push({ role: "user", content: text });
      if (result.raw_text) {
          let cleanText = result.raw_text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
          conversationHistory.push({ role: "bot", content: cleanText });
      }
      while (conversationHistory.length > 8) conversationHistory.shift();
    } catch (e) {
      clearInterval(statusInterval);
      window.KohaChatPlugin.removeSkeleton();
      if (window.KohaChatPlugin.CONFIG.DEBUG) {
        console.error("KohaChatPlugin: chat request failed", e);
      }
      // Distinguish the two failures the patron can act on differently:
      // a timeout means the service is up but slow (retrying may well work,
      // and the answer may just be a long one), whereas anything else means
      // the request to the plugin's own REST route did not complete at all.
      const timedOut = e && (e.name === "TimeoutError" || e.name === "AbortError");
      window.KohaChatPlugin.addMessage(
        "bot",
        timedOut
          ? "That took too long to answer, so I stopped waiting. Please try again — a shorter question usually comes back faster."
          : "Sorry — I could not reach the library service just now. Please try again in a moment."
      );
    }
  }

  document.getElementById("koha-chat-send-btn").onclick = () => send();
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  });

  // --- VOICE AND PHOTO SEARCH ---
  const micBtn = document.getElementById("koha-chat-mic-btn");
  const cameraBtn = document.getElementById("koha-chat-camera-btn");
  const fileInput = document.getElementById("koha-chat-file-input");
  const ocrBase = window.KohaChatPlugin.CONFIG.OCR_ASSET_URL;

  // Browser recognition is free to this plugin, but is not available in every
  // browser and may use the browser vendor's speech service.
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;
  if (SpeechRecognitionClass && window.isSecureContext) {
    recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = document.documentElement.lang || navigator.language || "en-US";

    recognition.onstart = function() {
      listening = true;
      micBtn.classList.add("recording");
      micBtn.setAttribute("aria-label", "Stop voice input");
      input.placeholder = "Listening...";
    };

    recognition.onresult = function(event) {
      const result = event.results && event.results[0] && event.results[0][0];
      const text = result && result.transcript ? result.transcript.trim() : "";
      if (text) {
        input.value = text;
        input.focus();
        input.placeholder = "Review what I heard, then press Send";
      }
    };

    recognition.onerror = function(event) {
      const denied = event.error === "not-allowed" || event.error === "service-not-allowed";
      window.KohaChatPlugin.addMessage("bot", denied
        ? "Microphone access was blocked. Allow it in your browser, or type your search."
        : "I couldn't hear that clearly. Please try again or type your search.");
    };

    recognition.onend = function() {
      listening = false;
      micBtn.classList.remove("recording");
      micBtn.setAttribute("aria-label", "Use voice input");
      if (!input.value) input.placeholder = "Search books, authors, ISBN...";
    };
  } else {
    micBtn.disabled = true;
    micBtn.title = window.isSecureContext
      ? "Voice input is unavailable in this browser"
      : "Voice input requires HTTPS";
  }

  micBtn.onclick = () => {
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      return;
    }
    try {
      recognition.start();
    } catch (error) {
      window.KohaChatPlugin.addMessage("bot", "Voice input could not start. Please try again or type your search.");
    }
  };

  // Download packaged OCR assets only when a patron chooses a photo. Nothing
  // about the image is sent to Koha's server or a third-party AI service.
  const scriptLoads = {};
  function loadLocalScript(name, globalName) {
    if (window[globalName]) return Promise.resolve();
    if (scriptLoads[name]) return scriptLoads[name];
    scriptLoads[name] = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = ocrBase + "/" + name;
      const timeout = setTimeout(() => reject(new Error("Timed out loading " + name)), 20000);
      script.onload = () => {
        clearTimeout(timeout);
        window[globalName] ? resolve() : reject(new Error(name + " did not initialize"));
      };
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Could not load " + name));
      };
      document.head.appendChild(script);
    }).catch(error => {
      delete scriptLoads[name];
      throw error;
    });
    return scriptLoads[name];
  }

  async function imageCanvas(file) {
    let image;
    let objectUrl;
    if (window.createImageBitmap) {
      try { image = await createImageBitmap(file); } catch (error) { /* use img fallback */ }
    }
    if (!image) {
      objectUrl = URL.createObjectURL(file);
      image = new Image();
      try {
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = objectUrl;
        });
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        throw error;
      }
    }
    try {
      const width = image.width || image.naturalWidth;
      const height = image.height || image.naturalHeight;
      const scale = Math.min(1, 2048 / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      if (image.close) image.close();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  async function readBarcode(canvas) {
    if (window.BarcodeDetector) {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        const formats = ["ean_13", "ean_8", "upc_a", "code_128", "code_39"]
          .filter(format => supported.includes(format));
        if (formats.length) {
          const found = await new window.BarcodeDetector({ formats }).detect(canvas);
          if (found.length && found[0].rawValue) return found[0].rawValue.trim();
        }
      } catch (error) {
        // Some browsers expose BarcodeDetector but cannot decode this image.
      }
    }
    try {
      await loadLocalScript("zxing.min.js", "ZXing");
      const zxing = window.ZXing;
      const hints = new Map();
      hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, [
        zxing.BarcodeFormat.EAN_13,
        zxing.BarcodeFormat.EAN_8,
        zxing.BarcodeFormat.UPC_A,
        zxing.BarcodeFormat.CODE_128,
        zxing.BarcodeFormat.CODE_39,
      ]);
      hints.set(zxing.DecodeHintType.TRY_HARDER, true);
      const reader = new zxing.BrowserMultiFormatReader(hints);
      try {
        const result = await reader.decodeFromCanvas(canvas);
        return result.getText().trim();
      } finally {
        reader.reset();
      }
    } catch (error) {
      return "";
    }
  }

  function isIsbn13(value) {
    if (!/^97[89]\d{10}$/.test(value)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(value[i]) * (i % 2 ? 3 : 1);
    return (10 - sum % 10) % 10 === Number(value[12]);
  }

  function searchTextFromOcr(text) {
    const lines = String(text || "").split(/\r?\n/)
      .map(line => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    for (const line of lines) {
      const possible = line.match(/(?:97[89][\d\s-]{10,24})/g) || [];
      for (const match of possible) {
        const digits = match.replace(/\D/g, "");
        if (isIsbn13(digits)) return digits;
      }
    }
    const useful = lines.filter(line => /[a-zA-Z]{3}/.test(line) && line.length >= 5);
    return useful.slice(0, 2).join(" ").slice(0, 120);
  }

  async function readCoverText(canvas) {
    await loadLocalScript("tesseract.min.js", "Tesseract");
    const worker = await window.Tesseract.createWorker("eng", 1, {
      workerPath: ocrBase + "/worker.min.js",
      corePath: ocrBase,
      langPath: ocrBase,
      workerBlobURL: false,
    });
    try {
      const result = await worker.recognize(canvas);
      return searchTextFromOcr(result.data.text);
    } finally {
      await worker.terminate();
    }
  }

  if (!window.KohaChatPlugin.CONFIG.ENABLE_IMAGE_SCAN) {
    if (cameraBtn) cameraBtn.remove();
  } else {
    cameraBtn.onclick = () => {
      fileInput.click();
    };
  }

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) {
      window.KohaChatPlugin.addMessage("bot", "Choose a photo smaller than 12 MB.");
      fileInput.value = "";
      return;
    }

    const previous = input.value;
    input.placeholder = "Reading photo...";
    input.disabled = true;
    if (cameraBtn) cameraBtn.classList.add("scanning");

    try {
      const canvas = await imageCanvas(file);
      const barcode = await readBarcode(canvas);
      const text = barcode || await readCoverText(canvas);
      if (text) {
        input.value = text.slice(0, 120);
        window.KohaChatPlugin.addMessage("bot", "I placed the detected code or cover text in the search box. Check it, then press Send.");
      } else {
        input.value = previous;
        window.KohaChatPlugin.addMessage("bot", "I couldn't read that photo. Try a sharper, well-lit picture or type the title or ISBN.");
      }
    } catch (err) {
      if (window.KohaChatPlugin.CONFIG.DEBUG) console.error("Photo search error", err);
      input.value = previous;
      window.KohaChatPlugin.addMessage("bot", "Photo search is unavailable in this browser right now. Please type the title or ISBN.");
    } finally {
      input.disabled = false;
      if (cameraBtn) cameraBtn.classList.remove("scanning");
      input.placeholder = "Search books, authors, ISBN...";
      input.focus();
      fileInput.value = "";
    }
  };

  // Text-to-Speech Output
  window.KohaChatPlugin.speak = function(text) {
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = document.documentElement.lang || navigator.language || "en-US";
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      if (window.KohaChatPlugin.CONFIG.DEBUG) console.error("Speech error", e);
    }
  };
  // ------------------------------

  const suggestionsBox = document.getElementById("koha-chat-suggestions-box");

  const handleInput = window.KohaChatPlugin.debounce(async (e) => {
    const query = e.target.value.trim();
    if (query.length < 3) {
      suggestionsBox.style.display = "none";
      return;
    }

    try {
      const data = await window.KohaChatPlugin.API.suggest(query);
      if (data.suggestions && data.suggestions.length > 0) {
        suggestionsBox.innerHTML = data.suggestions.map(s => `<div class="suggestion-item" tabindex="0" role="option">${window.KohaChatPlugin.escapeHTML(s)}</div>`).join('');
        suggestionsBox.style.display = "block";

        document.querySelectorAll('.suggestion-item').forEach(item => {
          item.onclick = () => {
            input.value = item.textContent;
            suggestionsBox.style.display = "none";
            input.focus();
          };
          item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              input.value = item.textContent;
              suggestionsBox.style.display = "none";
              input.focus();
            }
          });
        });
      } else {
        suggestionsBox.style.display = "none";
      }
    } catch (err) {
      if (window.KohaChatPlugin.CONFIG.DEBUG) {
        console.error(err);
      }
    }
  }, 300);

  input.addEventListener("input", handleInput);

  document.addEventListener("click", (e) => {
    if (e.target !== input && e.target !== suggestionsBox) {
      suggestionsBox.style.display = "none";
    }
  });

  // Event Delegation for quick action buttons and backend results
  const chatMessages = document.getElementById('koha-chat-messages');
  chatMessages.addEventListener('click', (e) => {
    // Quick search buttons
    const btn = e.target.closest('[data-action="quick-search"]');
    if (btn) {
      const query = btn.getAttribute('data-query');
      if (query) {
        input.value = query;
        send(query);
      }
      return;
    }

    // Backend result buttons (View Details / Reserve)
    const actionEl = e.target.closest('button, a, .result-btn, [class*="btn"]');
    if (!actionEl) {
      return;
    }

    let id = actionEl.getAttribute('data-id') || actionEl.getAttribute('data-biblionumber');
    
    // Fallback: search the parent card's HTML for a biblionumber if it's missing on the button
    const card = actionEl.closest('.book-card, .book-result, .bubble');
    if (!id && card) {
      const match = card.innerHTML.match(/biblionumber=(\d+)/i) || card.innerHTML.match(/id=(\d+)/i);
      if (match) id = match[1];
    }

    const text = (actionEl.textContent || '').toLowerCase();
    const isView = text.includes('view') || text.includes('detail') || text.includes('detil') || actionEl.getAttribute('data-action') === 'view';
    const isReserve = text.includes('reserve') || text.includes('reserce') || text.includes('place hold') || actionEl.getAttribute('data-action') === 'reserve';

      if (id) {
        if (isView) {
          e.preventDefault(); e.stopPropagation();
          window.location.href = `/cgi-bin/koha/opac-detail.pl?biblionumber=${id}`;
        } else if (isReserve) {
          e.preventDefault(); e.stopPropagation();
          window.location.href = `/cgi-bin/koha/opac-reserve.pl?biblionumber=${id}`;
        }
      } else if (card && (isView || isReserve)) {
        // THE BACKEND PROVIDED NO ID! Do an AJAX search to find the biblionumber instantly!
        const titleEl = card.querySelector('.book-title, h3, h2, h4, strong, .title');
        if (titleEl) {
           e.preventDefault(); e.stopPropagation();
           const originalText = actionEl.innerHTML;
           actionEl.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
           actionEl.style.pointerEvents = 'none';
           actionEl.style.opacity = '0.7';
           
           const title = encodeURIComponent(titleEl.textContent.trim());
           const searchUrl = `/cgi-bin/koha/opac-search.pl?q=${title}`;
           
           const fetchPromise = fetch(searchUrl).then(res => res.text());
           const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
           
           Promise.race([fetchPromise, timeoutPromise])
             .then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const idInput = doc.querySelector('input[name="biblionumber"], a.title[href*="biblionumber="]');
                let foundId = null;
                if (idInput) {
                   if (idInput.tagName === 'INPUT') foundId = idInput.value;
                   else {
                      const m = idInput.href.match(/biblionumber=(\d+)/);
                      if (m) foundId = m[1];
                   }
                }
                if (foundId) {
                   window.location.href = isView ? `/cgi-bin/koha/opac-detail.pl?biblionumber=${foundId}` : `/cgi-bin/koha/opac-reserve.pl?biblionumber=${foundId}`;
                } else {
                   window.location.href = searchUrl;
                }
             })
             .catch(() => {
                window.location.href = searchUrl;
             });
        }
      }
  }, true); // Use capturing phase for clicks to ensure we intercept before any backend inline scripts!

  // Image load event delegation (capturing phase)
  chatMessages.addEventListener('load', (e) => {
    if (e.target.tagName === 'IMG' && e.target.closest('.book-cover')) {
      if (e.target.naturalWidth <= 1) {
        // OpenLibrary returns 1x1 blank pixel for missing images!
        e.target.style.display = 'none';
      } else {
        e.target.classList.add('loaded');
      }
      e.target.parentElement.classList.add('has-loaded-img');
    }
  }, true);

  // Image error event delegation for broken covers
  chatMessages.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG' && e.target.closest('.book-cover')) {
      e.target.style.display = 'none'; // Hide broken image to show the generic SVG background
      e.target.parentElement.classList.add('has-loaded-img'); // Stop shimmering
    }
  }, true);

  // MutationObserver for newly added book covers
  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1) {
          
          // 0. Aggressively strip "disabled" attributes so demo buttons always work
          const disabledBtns = n.querySelectorAll ? n.querySelectorAll('button[disabled], .disabled, [disabled]') : [];
          disabledBtns.forEach(btn => {
            btn.removeAttribute('disabled');
            btn.classList.remove('disabled');
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.style.pointerEvents = 'auto';
          });
          if (n.hasAttribute && n.hasAttribute('disabled')) {
            n.removeAttribute('disabled');
            n.style.pointerEvents = 'auto';
          }

          // 0.5 Strip inline onerror handlers injected by backend that rely on external placeholders
          const badImgs = n.querySelectorAll ? n.querySelectorAll('img[onerror]') : [];
          badImgs.forEach(img => {
             img.removeAttribute('onerror');
             img.onerror = null;
          });
          if (n.hasAttribute && n.hasAttribute('onerror')) {
             n.removeAttribute('onerror');
             n.onerror = null;
          }

          // 1. Fix missing image tags completely (shimmer never stops otherwise)
          const covers = n.querySelectorAll ? n.querySelectorAll('.book-cover') : [];
          covers.forEach(cover => {
            if (!cover.querySelector('img')) {
              cover.classList.add('has-loaded-img');
            }
          });
          if (n.classList && n.classList.contains('book-cover') && !n.querySelector('img')) {
            n.classList.add('has-loaded-img');
          }

          // 2. Handle image tags that are present
          const imgs = n.querySelectorAll ? n.querySelectorAll('.book-cover img:not(.processed)') : [];
          imgs.forEach(img => {
            img.classList.add('processed');
            if (img.complete) {
              if (img.naturalWidth <= 1) { // Catch 1x1 pixels
                 img.style.display = 'none';
              } else {
                 img.classList.add('loaded');
              }
              img.parentElement.classList.add('has-loaded-img');
            }
          });
          
          if (n.tagName === 'IMG' && n.closest('.book-cover') && !n.classList.contains('processed')) {
            n.classList.add('processed');
            if (n.complete) {
              if (n.naturalWidth <= 1) {
                 n.style.display = 'none';
              } else {
                 n.classList.add('loaded');
              }
              n.parentElement.classList.add('has-loaded-img');
            }
          }
        }
      });
    });
  });
  observer.observe(chatMessages, { childList: true, subtree: true });

});
