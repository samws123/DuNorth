import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
function isUuid(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();
    let userId = req.query.userId;
    // If no userId provided, extract from JWT
    if (!userId) {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token or userId' });
      try {
        const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
        userId = decoded.userId;
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
      if (!isUuid(userId)) {
        const email = `${String(userId).replace(/[^a-zA-Z0-9._-]/g,'_')}@local.test`;
        const { rows } = await query(`SELECT id FROM users WHERE email = $1`, [email]);
        if (!rows[0]?.id) return res.status(404).json({ error: 'No user record for token id' });
        userId = rows[0].id;
      }
    }
    const courseId = req.query.courseId;
    if (!userId || !courseId) return res.status(400).json({ error: 'userId and courseId required' });
    const { rows } = await query(
      `SELECT id, filename, content_type, size, (extracted_text IS NOT NULL) AS has_text, COALESCE(length(extracted_text),0) AS text_len
       FROM files
       WHERE user_id = $1 AND course_id = $2
       ORDER BY filename ASC
       LIMIT 200`,
      [userId, courseId]
    );
    return res.status(200).json({ ok: true, count: rows.length, files: rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}


