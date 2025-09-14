import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const r = await query('SELECT NOW() as now', []);
    res.status(200).json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
}


