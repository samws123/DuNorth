import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();
    // Resolve user from Authorization, token param, or latest session as fallback
    let userId = null;
    const authHeader = req.headers.authorization || '';
    const tokenParam = req.query.token;
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (typeof tokenParam === 'string' ? tokenParam : null);
    if (token) {
      try { userId = jwt.verify(token, JWT_SECRET).userId; } catch { /* ignore */ }
    }
    if (!userId) {
      const { rows } = await query(`SELECT user_id FROM user_canvas_sessions ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1`);
      userId = rows[0]?.user_id || null;
    }
    const courseId = req.query.courseId;
    if (!courseId) return res.status(400).json({ error: 'courseId required' });
    const { rows } = await query(
      `SELECT id, title, (body IS NOT NULL) AS has_body, LEAST(2000, COALESCE(length(body),0)) AS body_len
       FROM pages
       WHERE user_id = $1 AND course_id = $2
       ORDER BY (title = 'Syllabus') DESC, title ASC
       LIMIT 200`,
      [userId, courseId]
    );
    return res.status(200).json({ ok: true, count: rows.length, pages: rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}


