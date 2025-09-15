import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();
    const userId = req.query.userId;
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


