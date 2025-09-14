import fs from 'fs';
import path from 'path';
import { query } from './pg.js';

let ensured = false;

export async function ensureSchema() {
  if (ensured) return;
  try {
    // Check for a core table
    const r = await query(
      "SELECT to_regclass('public.users') AS exists",
      []
    );
    if (r.rows[0] && r.rows[0].exists) {
      ensured = true;
      return;
    }
  } catch (_) {
    // fall through to attempt apply
  }
  // Apply the schema file idempotently
  const sqlPath = path.join(process.cwd(), 'api', '_lib', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await query(sql, []);
  ensured = true;
}


