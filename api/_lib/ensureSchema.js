import fs from 'fs';
import path from 'path';
import { query } from './pg.js';

let ensured = false;

export async function ensureSchema() {
  if (ensured) return;
  try {
    const r = await query(
      "SELECT to_regclass('public.users') AS users_exists, to_regclass('public.user_canvas_sessions') AS sess_exists",
      []
    );
    const usersOk = r.rows[0]?.users_exists;
    const sessOk = r.rows[0]?.sess_exists;
    if (usersOk && sessOk) {
      ensured = true;
      return;
    }
  } catch (_) {
    // fall through to attempt apply
  }
  const sqlPath = path.join(process.cwd(), 'api', '_lib', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await query(sql, []);
  ensured = true;
}


