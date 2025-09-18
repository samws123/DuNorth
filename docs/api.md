# API

Base: current web origin (Vercel). JSON responses unless noted.

## Auth
- POST `/api/auth/register` → `{ userId }`
- POST `/api/auth/token` `{ userId }` → `{ token }`
- GET `/api/auth/google-start?callbackUrl=/schools/school.html` → 302 to Google
- GET `/api/auth/callback/google` → sets `dunorth_user` cookie; 302 to callbackUrl

## User profile
- POST `/api/user/select-school` `{ userId?, baseUrl, lms?, schoolName? }` → `{ ok }`
- GET `/api/user/base-url?userId=...` → `{ baseUrl, lms }`

## Canvas session + sync
- POST `/api/store-session` (extension → backend) — store cookie, verify `/api/v1/users/self`, start import
- POST `/api/sync/import-courses` (Bearer) → `{ ok, imported, baseUrl }`
- POST `/api/sync/import-assignments` (Bearer) → `{ ok, imported, details[] }`
- POST `/api/sync/course` (Bearer) `{ courseId }` → pulls pages/files/announcements
- POST `/api/sync/extract-all` (Bearer) `{ courseId, limit?, force? }`

## Chat
- POST `/api/chat/answer` `{ userId, message }` → `{ role, text }`

## Debug
- GET `/api/debug/courses-db?userId=...`
- GET `/api/debug/pages-db?courseId=...`
- GET `/api/debug/files-db?courseId=...`
- GET `/api/debug/file-text-raw?fileId=...`
- GET `/api/debug/reextract-file?fileId=...`

Errors: `{ "error": "message" }` with HTTP status.
