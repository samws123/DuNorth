import { getPool } from '../_lib/pg.js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.MIGRATION_TOKEN || req.headers['x-migration-token'] !== process.env.MIGRATION_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const sqlPath = path.join(process.cwd(), 'api', '_lib', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const pool = getPool();
    await pool.query(sql);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'migration_failed' });
  }
}


