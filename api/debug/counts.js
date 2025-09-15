import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();
    const [{ rows: u }, { rows: s }] = await Promise.all([
      query('SELECT COUNT(*)::int AS c FROM users'),
      query('SELECT COUNT(*)::int AS c FROM user_canvas_sessions')
    ]);
    return res.status(200).json({ ok: true, users: u[0].c, sessions: s[0].c });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}


