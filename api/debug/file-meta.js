import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();
    // Resolve user via token or latest session
    let userId = null;
    const authHeader = req.headers.authorization || '';
    const tokenParam = req.query.token;
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (typeof tokenParam === 'string' ? tokenParam : null);
    if (token) {
      try { userId = jwt.verify(token, JWT_SECRET).userId; } catch {}
    }
    if (!userId) {
      const { rows } = await query(`SELECT user_id FROM user_canvas_sessions ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1`);
      userId = rows[0]?.user_id || null;
    }

    const fileId = Number(req.query.fileId);
    if (!userId || !fileId) return res.status(400).json({ error: 'userId or fileId missing' });

    const { rows } = await query(
      `SELECT id, course_id, filename, content_type, size, download_url, public_download_url,
              COALESCE(length(extracted_text),0) AS text_len
       FROM files WHERE user_id = $1 AND id = $2 LIMIT 1`,
      [userId, fileId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'file_not_found' });
    return res.status(200).json({ ok: true, file: rows[0] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}


