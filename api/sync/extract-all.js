import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

async function fetchFreshPublicUrl(baseUrl, cookieValue, fileId) {
  try {
    const r = await fetch(`${baseUrl}/api/v1/files/${fileId}/public_url`, {
      headers: {
        'Accept': 'application/json',
        'Cookie': `canvas_session=${cookieValue}`,
        'User-Agent': 'DuNorth-Server/1.0'
      },
      redirect: 'follow'
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.public_url || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();

    // Auth
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    let userId;
    try {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
      userId = decoded.userId;
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { courseId, force, limit = 50 } = req.body || {};
    if (!courseId) return res.status(400).json({ error: 'courseId required' });

    // Session for fresh public_url if needed
    const sessR = await query(
      `SELECT base_url, session_cookie FROM user_canvas_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [userId]
    );
    const session = sessR.rows[0] || null;

    // Files to process
    const filesR = await query(
      `SELECT id, filename, content_type, size, public_download_url, extracted_text
       FROM files
       WHERE user_id = $1 AND course_id = $2
       ORDER BY id ASC
       LIMIT $3`,
      [userId, courseId, Math.max(1, Number(limit) || 50)]
    );

    const { extractTextUniversal } = await import('../_lib/extractText.js');

    let processed = 0;
    let stored = 0;
    const details = [];

    for (const f of filesR.rows) {
      processed++;
      if (f.extracted_text && !force) { details.push({ id: f.id, skipped: true }); continue; }

      let url = f.public_download_url;
      if (!url && session) {
        url = await fetchFreshPublicUrl(session.base_url, session.session_cookie, f.id);
        if (url) await query(`UPDATE files SET public_download_url = $1 WHERE id = $2`, [url, f.id]);
      }
      if (!url) { details.push({ id: f.id, error: 'no_public_url' }); continue; }

      try {
        const r = await fetch(url, { headers: { 'User-Agent': 'DuNorth-Server/1.0' } });
        if (!r.ok) { details.push({ id: f.id, error: `download_${r.status}` }); continue; }
        const buf = Buffer.from(await r.arrayBuffer());
        // Hard cap 20MB
        if (buf.length > 20 * 1024 * 1024) { details.push({ id: f.id, error: 'too_large' }); continue; }
        const text = await extractTextUniversal(buf, f.filename || '', f.content_type || '').catch(() => null);
        if (text && text.trim()) {
          await query(`UPDATE files SET extracted_text = $1 WHERE id = $2`, [text.slice(0, 5_000_000), f.id]);
          stored++;
          details.push({ id: f.id, ok: true, len: text.length });
        } else {
          details.push({ id: f.id, error: 'no_text' });
        }
      } catch (e) {
        details.push({ id: f.id, error: String(e.message || e) });
      }
    }

    return res.status(200).json({ ok: true, courseId, processed, stored, details });
  } catch (e) {
    return res.status(500).json({ error: 'internal_error', detail: String(e.message || e) });
  }
}


