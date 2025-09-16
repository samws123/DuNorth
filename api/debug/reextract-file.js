import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';

async function getCanvasSelfSession(userId) {
  const { rows } = await query(
    `SELECT base_url, session_cookie
     FROM user_canvas_sessions
     WHERE user_id = $1
     ORDER BY updated_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [userId]
  );
  if (!rows[0]) return null;
  return { baseUrl: rows[0].base_url, cookie: rows[0].session_cookie };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();
    const fileId = Number(req.query.fileId || req.body?.fileId);
    if (!fileId) return res.status(400).json({ error: 'fileId required' });

    const fr = await query(`SELECT user_id, filename, content_type FROM files WHERE id = $1 LIMIT 1`, [fileId]);
    if (!fr.rows[0]) return res.status(404).json({ error: 'file_not_found' });
    const { user_id: userId, filename, content_type } = fr.rows[0];

    const sess = await getCanvasSelfSession(userId);
    if (!sess) return res.status(400).json({ error: 'no_canvas_session' });

    // Get a fresh signed public URL from Canvas
    const pubR = await fetch(`${sess.baseUrl}/api/v1/files/${fileId}/public_url`, {
      headers: {
        'Accept': 'application/json',
        'Cookie': `canvas_session=${sess.cookie}`,
        'User-Agent': 'DuNorth-Debug/1.0'
      },
      redirect: 'follow'
    });
    if (!pubR.ok) {
      const t = await pubR.text().catch(()=>'');
      return res.status(502).json({ error: `public_url_failed ${pubR.status}`, detail: t.slice(0,200) });
    }
    const pub = await pubR.json();
    const publicUrl = pub?.public_url;
    if (!publicUrl) return res.status(502).json({ error: 'no_public_url' });

    // Lazy import pdf-parse
    let pdfParseFn = null;
    try { const mod = await import('pdf-parse'); pdfParseFn = (mod && (mod.default || mod)); } catch {}
    const isPdf = (content_type || '').toLowerCase().includes('pdf') || String(filename || '').toLowerCase().endsWith('.pdf');
    if (!isPdf || !pdfParseFn) return res.status(200).json({ ok: true, fileId, parsed: false, reason: !isPdf ? 'not_pdf' : 'parser_unavailable' });

    const MAX = 25 * 1024 * 1024;
    const fR = await fetch(publicUrl, { headers: { 'User-Agent': 'DuNorth-Debug/1.0' } });
    if (!fR.ok) return res.status(502).json({ error: `download_failed ${fR.status}` });
    const buf = Buffer.from(await fR.arrayBuffer());
    if (buf.length > MAX) return res.status(200).json({ ok: true, fileId, parsed: false, reason: 'too_large', size: buf.length });
    const parsed = await pdfParseFn(buf).catch(() => null);
    const text = parsed?.text ? String(parsed.text).trim() : null;
    if (!text) return res.status(200).json({ ok: true, fileId, parsed: false, reason: 'no_text' });

    await query(`UPDATE files SET extracted_text = $1 WHERE id = $2`, [text.slice(0, 5_000_000), fileId]);
    return res.status(200).json({ ok: true, fileId, parsed: true, text_len: text.length });
  } catch (e) {
    return res.status(500).json({ error: 'internal_error', detail: String(e.message || e) });
  }
}


