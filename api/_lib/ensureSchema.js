import fs from 'fs';
import path from 'path';
import { query } from './pg.js';

let ensured = false;

export async function ensureSchema() {
  if (ensured) return;
  let needApplySchema = false;
  try {
    const r = await query(
      "SELECT to_regclass('public.users') AS users_exists, to_regclass('public.user_canvas_sessions') AS sess_exists",
      []
    );
    const usersOk = r.rows[0]?.users_exists;
    const sessOk = r.rows[0]?.sess_exists;
    if (!usersOk || !sessOk) {
      needApplySchema = true;
    }
  } catch (_) {
    needApplySchema = true;
  }

  if (needApplySchema) {
    const sqlPath = path.join(process.cwd(), 'api', '_lib', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await query(sql, []);
  }

  // Safety/idempotent migrations: add newer columns if they don't exist
  const safetySql = `
    ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS html_url TEXT;
    ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS workflow_state TEXT;
    ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS points_possible NUMERIC;
    ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS submission_types TEXT[];
    ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
    ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS google_sub TEXT;
    CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
    -- Add additional columns to announcements table
    ALTER TABLE IF EXISTS announcements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
    ALTER TABLE IF EXISTS announcements ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMPTZ;
    ALTER TABLE IF EXISTS announcements ADD COLUMN IF NOT EXISTS html_url TEXT;
    ALTER TABLE IF EXISTS announcements ADD COLUMN IF NOT EXISTS author_name TEXT;
    ALTER TABLE IF EXISTS announcements ADD COLUMN IF NOT EXISTS author_id BIGINT;
    ALTER TABLE IF EXISTS announcements ADD COLUMN IF NOT EXISTS read_state TEXT;
    ALTER TABLE IF EXISTS announcements ADD COLUMN IF NOT EXISTS locked BOOLEAN;
    ALTER TABLE IF EXISTS announcements ADD COLUMN IF NOT EXISTS published BOOLEAN;
    CREATE TABLE IF NOT EXISTS chat_context (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      last_course_id BIGINT,
      last_assignment_ids BIGINT[],
      last_answer_text TEXT,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  try { await query(safetySql, []); } catch (_) {}

  ensured = true;
}


