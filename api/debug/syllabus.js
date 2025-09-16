import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  try {
    await ensureSchema();

    // Resolve user from Authorization, token param, or latest session
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

    const courseIdRaw = req.query.courseId;
    if (!userId || !courseIdRaw) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send('<h3>Missing courseId</h3>');
    }
    const courseId = Number(courseIdRaw);

    const { rows } = await query(
      `SELECT body FROM pages
       WHERE user_id = $1 AND course_id = $2
         AND (title = 'Syllabus' OR id = $3)
       ORDER BY (title = 'Syllabus') DESC
       LIMIT 1`,
      [userId, courseId, -1 * courseId]
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!rows[0]?.body) {
      return res.status(200).send('<h3>No stored syllabus for this course.</h3>');
    }

    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <title>Syllabus ${courseId}</title>
      <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;line-height:1.55} img{max-width:100%;height:auto}</style>
    </head><body>${rows[0].body}</body></html>`;
    return res.status(200).send(html);
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(500).send('internal_error');
  }
}


