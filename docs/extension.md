# Extension contracts

Messages
- `PING` → `{ ok: true }`
- `TEST_FINGERPRINT` → `{ ok: true, name, length, sha256_12 }` (uses cookie presence, no raw cookie value)
- `SYNC_CANVAS` `{ userToken, apiEndpoint, baseUrl }` → `{ ok: true }` after sending cookie to `/api/store-session`

Flow
1) Web asks for `PING`; if direct fails, falls back to bridge content script
2) Web calls `TEST_FINGERPRINT` for user‑visible proof
3) Web generates JWT via `/api/auth/token`
4) Web calls `SYNC_CANVAS` with `baseUrl` (from `user_profile.base_url`)
5) Extension reads Canvas cookies, verifies `/api/v1/users/self`, POSTs to `/api/store-session`
6) Backend imports courses; web then calls imports/extractions

Rate limiting
- Token bucket 2–3 concurrent; exponential backoff on 429 with jitter

Error mapping
- Network/lastError → show “Extension not responding”
- 401/403 from Canvas → prompt to open a Canvas tab and retry
- 404 with "disabled for this course" → skip tab gracefully
