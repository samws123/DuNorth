# DuNorth

Canvas assistant: Chrome extension + web app + serverless API + Supabase.

## What it does
- Login (email/password or Google)
- Pick your school (Canvas base URL)
- Extension hands off Canvas session (cookies stay in browser)
- Backend imports courses/assignments/pages/files/announcements
- Text extraction for PDFs/DOCX/etc with robust fallbacks
- Chat answers: SQL for due dates; RAG‑lite for open questions

## Quickstart
1) Set env vars (see `docs/env.md`).
2) Deploy on Vercel (Node runtime). Supabase Postgres as DB.
3) Install Chrome extension, open Chat, click “Refresh Canvas”.

Happy path: Signup → School picker → Trial → Chat → Refresh → import courses → import assignments → sync course → extract texts.

## Architecture
- Web: static HTML/CSS/JS in this repo
- API: Vercel functions under `api/`
- DB: Supabase Postgres (see `docs/schema.md`)
- Extension: `studyhackz-extension-clean/` (MV3)

## Docs
- `docs/api.md` — endpoints and payloads
- `docs/schema.md` — tables/keys and cursors
- `docs/extension.md` — extension message contracts
- `docs/extraction.md` — pdfjs + fallbacks
- `docs/env.md` — required env variables

## Security
- Cookies never displayed; extension → backend over HTTPS
- Files fetched via Canvas `public_url` (signed URL)

## Dev notes
- `api/_lib/ensureSchema.js` auto‑adds missing columns
- Debug endpoints under `api/debug/*`
