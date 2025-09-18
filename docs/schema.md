# Schema

Key tables:
- `users(id uuid, email text unique, name text, password_hash text, sso_provider text, google_sub text, created_at)`
- `user_profile(user_id uuid pk, school_id uuid, lms text, base_url text, last_sync timestamptz)`
- `user_canvas_sessions(id uuid, user_id uuid, base_url text, session_cookie text, canvas_user_id text, canvas_name text, canvas_email text, expires_at timestamptz, created_at, updated_at)`
- `courses(user_id uuid, id bigint, name text, course_code text, term text, raw_json jsonb, pk(user_id,id))`
- `assignments(user_id uuid, id bigint, course_id bigint, name text, due_at timestamptz, description text, updated_at timestamptz, workflow_state text, raw_json jsonb, points_possible numeric, submission_types text[], html_url text, pk(user_id,id))`
- `pages(user_id uuid, id bigint, course_id bigint, title text, url text, body text, raw_json jsonb)`
- `files(user_id uuid, id bigint, course_id bigint, filename text, content_type text, size bigint, download_url text, public_download_url text, extracted_text text, raw_json jsonb)`
- `announcements(user_id uuid, id bigint, course_id bigint, title text, message text, posted_at timestamptz, raw_json jsonb)`
- `sync_cursors(id uuid, user_id uuid, base_url text, endpoint text, etag text, last_updated_at timestamptz, last_sync timestamptz, created_at)`

Indexes
- See `api/_lib/schema.sql`.
- `ensureSchema` runs safety ALTERs to add missing columns like `assignments.html_url`, `workflow_state`, `updated_at`, `points_possible`, `submission_types`, and `users.google_sub`.

Notes
- Primary keys are `(user_id, id)` for Canvas resources (idempotent upserts).
- `user_profile.base_url` is the canonical Canvas base URL used by the extension sync.
- Cursors: use ETag + `last_updated_at` for incremental sync.
