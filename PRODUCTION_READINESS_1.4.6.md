# Sadi 1.4.6 production readiness

**Decision: ready for a controlled client staging trial; final client production sign-off is pending.**

The KPZ is self-contained and works on the local Koha 26.05.02 instance with Zebra and Gemini. It has not been proven on the client's exact Koha, search engine, browser set, reverse proxy, or provider account. Koha does not vet third-party plugins for operators; the plugin provider and deploying library must perform acceptance testing.

## Evidence from the local instance

- Koha loaded version 1.4.6, displayed Sadi, and served the versioned JS, CSS, and SVG logo. The served SVG matched the packaged file byte for byte.
- Anonymous API requests returned a real catalog card and suggestions. Seven dummy file formats produced the expected confirmed, possible, and not-found comparison statuses. A read-only database query independently confirmed the ISBN-matched bibliographic row. Earlier malformed-request checks are recorded in QA_1.4.4.md.
- The local plugin is enabled, the provider key is present and encrypted, and the selected provider/search engine are Gemini/Zebra.
- JavaScript syntax, Perl module syntax, online-link checks, seven-format parser checks, and KPZ integrity checks passed. See `QA_1.4.6.md` for this release and `QA_1.4.5.md` for online-resource details.

## Acceptance gates before a client's public launch

1. **Install on staging that matches the client.** Confirm their exact Koha release, search engine, plugin settings, `/api/v1/contrib/` routing, upload-size limit, and the staff-interface KPZ upload flow. Check the OPAC as both a logged-out and logged-in patron. A local command-line install does not verify their upload path.
2. **Exercise the browser features on their devices.** Open Sadi and the list comparison window, drag and choose representative PDF, DOCX, XLSX, CSV, JSON, and MARC files, verify results and CSV export, and try the camera/microphone where these features are required. Check desktop and mobile browsers over HTTPS. Speech recognition is unavailable in some browsers.
3. **Validate privacy and secrets.** Set Koha's encryption key before saving the provider key. Confirm the client accepts that patron questions, relevant conversation history, and compact catalog results are sent to the selected LLM provider. File contents stay in the browser, while extracted title/author/ISBN data is sent to Koha for comparison. Approve the browser voice provider's behavior separately.
4. **Protect the public endpoints.** Configure reverse-proxy or edge rate limiting, provider quota/budget alerts, and log monitoring. The plugin's in-process limiter is per Koha worker and can be evaded by forged forwarded-IP headers; it is a basic guard, not a production cost boundary. Run a representative load test and verify Koha and provider response times.
5. **Check e-book access.** Use a real Koha record with MARC 856$u or a visible item URI. Confirm Sadi shows the link, the URL reaches the intended provider, and a patron with and without entitlement sees the expected result. If the collection lives only in a separate vendor system, first catalog it in Koha or commission a provider-specific connector.
6. **Check catalog privacy and rollback.** Test a suppressed bibliographic record and an OPAC-hidden item on the client's search engine. Keep a Koha database/config backup and a known-good KPZ. Confirm disabling or reverting the plugin removes its OPAC hooks if needed.

If any gate fails, keep the plugin on staging and fix that result before public launch. The currently untested combinations include Koha 25.05/25.11, Elasticsearch, live Groq/OpenAI accounts, and device-level drag/drop, camera, and microphone behavior.

Primary references: [Koha plugin manual](https://koha-community.org/manual/latest/en/html/plugins.html), [MDN secure context for media devices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [MDN SpeechRecognition support](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).
