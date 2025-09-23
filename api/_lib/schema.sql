CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- users and auth
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT, -- null if SSO only
  sso_provider TEXT,  -- 'google' | null
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ,
  plan TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lms TEXT NOT NULL,
  base_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id),
  lms TEXT,
  base_url TEXT,
  last_sync TIMESTAMPTZ
);

-- canvas data (minimal MVP)
CREATE TABLE IF NOT EXISTS courses (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  id BIGINT,
  name TEXT,
  course_code TEXT,
  term TEXT,
  raw_json JSONB,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS assignments (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  id BIGINT,
  course_id BIGINT,
  name TEXT,
  due_at TIMESTAMPTZ,
  description TEXT,
  updated_at TIMESTAMPTZ,
  workflow_state TEXT,
  raw_json JSONB,
  points_possible NUMERIC,
  submission_types TEXT[],
  html_url TEXT,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_user_due ON assignments(user_id, due_at);

-- Canvas pages
CREATE TABLE IF NOT EXISTS pages (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  id BIGINT,
  course_id BIGINT,
  title TEXT,
  url TEXT,
  body TEXT,
  raw_json JSONB,
  PRIMARY KEY (user_id, id)
);

-- Canvas files with download URLs
CREATE TABLE IF NOT EXISTS files (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  id BIGINT,
  course_id BIGINT,
  filename TEXT,
  content_type TEXT,
  size BIGINT,
  download_url TEXT,
  public_download_url TEXT,
  extracted_text TEXT,
  raw_json JSONB,
  PRIMARY KEY (user_id, id)
);

-- Canvas announcements
CREATE TABLE IF NOT EXISTS announcements (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  id BIGINT,
  course_id BIGINT,
  title TEXT,
  message TEXT,
  posted_at TIMESTAMPTZ,
  raw_json JSONB,
  PRIMARY KEY (user_id, id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_pages_user_course ON pages(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_files_user_course ON files(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_announcements_user_course ON announcements(user_id, course_id);

-- Lightweight chat context to keep recent state for the assistant
CREATE TABLE IF NOT EXISTS chat_context (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_course_id BIGINT,
  last_assignment_ids BIGINT[],
  last_answer_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync cursors for delta syncing
CREATE TABLE IF NOT EXISTS sync_cursors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_url TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  etag TEXT,
  last_updated_at TIMESTAMPTZ,
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, base_url, endpoint)
);

-- Index for fast cursor lookups
CREATE INDEX IF NOT EXISTS idx_sync_cursors_user_base 
ON sync_cursors(user_id, base_url);

-- Canvas session storage for cookie-based backend sync
CREATE TABLE IF NOT EXISTS user_canvas_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_url TEXT NOT NULL,
  session_cookie TEXT NOT NULL,
  canvas_user_id TEXT,
  canvas_name TEXT,
  canvas_email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, base_url)
);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_user_canvas_sessions_user 
ON user_canvas_sessions(user_id);

-- Canvas grades/submissions
CREATE TABLE IF NOT EXISTS grades (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  id BIGINT,
  assignment_id BIGINT,
  course_id BIGINT,
  student_id BIGINT,
  score NUMERIC,
  grade TEXT,
  excused BOOLEAN DEFAULT FALSE,
  late BOOLEAN DEFAULT FALSE,
  missing BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  workflow_state TEXT,
  submission_type TEXT,
  attempt INTEGER,
  raw_json JSONB,
  PRIMARY KEY (user_id, id)
);

-- Index for fast grade lookups
CREATE INDEX IF NOT EXISTS idx_grades_user_assignment ON grades(user_id, assignment_id);
CREATE INDEX IF NOT EXISTS idx_grades_user_course ON grades(user_id, course_id);


