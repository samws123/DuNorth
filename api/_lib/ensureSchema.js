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
    ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS html_url TEXT;
    ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS workflow_state TEXT;
    ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS points_possible NUMERIC;
    ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS submission_types TEXT[];
    ALTER TABLE IF EXISTS assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
  `;
  try { await query(safetySql, []); } catch (_) {}

  ensured = true;
}


