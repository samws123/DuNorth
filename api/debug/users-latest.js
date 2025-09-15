import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();

    const { rows } = await query(
      `SELECT u.id, u.email, u.name, u.created_at,
              s.canvas_name, s.base_url, s.updated_at AS session_updated_at
       FROM users u
       LEFT JOIN LATERAL (
         SELECT canvas_name, base_url, updated_at
         FROM user_canvas_sessions s
         WHERE s.user_id = u.id
         ORDER BY updated_at DESC NULLS LAST, created_at DESC
         LIMIT 1
       ) s ON TRUE
       ORDER BY u.created_at DESC
       LIMIT 5`
    );

    return res.status(200).json({ ok: true, users: rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}


