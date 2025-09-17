import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Content-Type', 'text/plain; charset=utf-8').send('Method not allowed');
    return;
  }
  try {
    await ensureSchema();

    // Resolve user from Authorization header, token query param, or latest session fallback
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

    const fileIdRaw = req.query.fileId;
    if (!userId || !fileIdRaw) {
      res.status(400).setHeader('Content-Type', 'text/plain; charset=utf-8').send('Missing userId or fileId');
      return;
    }
    const fileId = Number(fileIdRaw);

    const { rows } = await query(
      `SELECT extracted_text FROM files WHERE user_id = $1 AND id = $2 LIMIT 1`,
      [userId, fileId]
    );
    if (!rows[0]) {
      res.status(404).setHeader('Content-Type', 'text/plain; charset=utf-8').send('file_not_found');
      return;
    }
    const text = rows[0].extracted_text;
    if (!text) {
      res.status(204).end();
      return;
    }
    res.status(200).setHeader('Content-Type', 'text/plain; charset=utf-8').send(text);
  } catch (e) {
    res.status(500).setHeader('Content-Type', 'text/plain; charset=utf-8').send('internal_error');
  }
}


