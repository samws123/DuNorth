# DuNorth Chrome Extension (MV3)

Purpose: enable the DuNorth web app to verify a logged‑in Canvas session and securely hand off a session token to the DuNorth backend. All Canvas API calls run on the server; the extension never scrapes DOM.

Message flow
- Site → extension: `PING`, `TEST_FINGERPRINT`, `SYNC_CANVAS { userToken, apiEndpoint, baseUrl }`
- Extension → backend: POST `/api/store-session` with `{ baseUrl, cookieName, cookieDomain, sessionCookie }`

Permissions (rationale)
- `cookies`: read Canvas session cookies for the user’s Canvas host
- `host_permissions`: `https://*.instructure.com/*`, `https://*.canvas.edu/*`, `https://files.instructure.com/*` to detect host and future file flows
- `notifications`, `action`: minimal user feedback during operations
- `externally_connectable`: allows the DuNorth site to message the extension

Privacy
- The extension only reads `canvas_session` / `_legacy_normandy_session` for the active Canvas host and sends it over HTTPS to the user’s account on DuNorth.
- No third‑party sharing; no analytics; no DOM scraping.

Testing
1. Load unpacked in `chrome://extensions`
2. Open DuNorth → Chat → click “Refresh Canvas”
3. Ensure you’re logged into your Canvas site; the site provides `baseUrl` or the extension auto‑detects from cookies

Version: 0.0.1
