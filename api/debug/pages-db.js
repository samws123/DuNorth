import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    let userId;
    try { userId = jwt.verify(auth.slice(7), JWT_SECRET).userId; } catch { return res.status(401).json({ error: 'Invalid token' }); }
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


