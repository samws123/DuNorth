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
  workflow_state TEXT,
  raw_json JSONB,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_user_due ON assignments(user_id, due_at);

CREATE TABLE IF NOT EXISTS sync_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


