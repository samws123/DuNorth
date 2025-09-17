import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();
    const fileId = Number(req.query.fileId);
    const store = String(req.query.store || '').toLowerCase() === '1' || String(req.query.store || '').toLowerCase() === 'true';
    if (!fileId) return res.status(400).json({ error: 'fileId required' });

    // Load file row
    const fr = await query(
      `SELECT f.user_id, f.id, f.filename, f.content_type, f.size, f.public_download_url
       FROM files f WHERE f.id = $1 LIMIT 1`,
      [fileId]
    );
    if (!fr.rows[0]) return res.status(404).json({ error: 'file_not_found' });
    const file = fr.rows[0];

    // Load latest session for user
    const sr = await query(
      `SELECT base_url, session_cookie FROM user_canvas_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [file.user_id]
    );
    if (!sr.rows[0]) return res.status(400).json({ error: 'no_session_for_user' });
    const { base_url: baseUrl, session_cookie: cookieValue } = sr.rows[0];

    // Fresh signed link (avoid stale tokens)
    let publicUrl = null;
    try {
      const r = await fetch(`${baseUrl}/api/v1/files/${fileId}/public_url`, {
        headers: {
          'Accept': 'application/json',
          'Cookie': `canvas_session=${cookieValue}`,
          'User-Agent': 'DuNorth-Debug/1.0'
        },
        redirect: 'follow'
      });
      if (r.ok) { const j = await r.json(); publicUrl = j.public_url || null; }
    } catch {}
    if (!publicUrl && file.public_download_url) publicUrl = file.public_download_url;
    if (!publicUrl) return res.status(502).json({ error: 'no_public_url' });

    // Download bytes
    const resp = await fetch(publicUrl, { headers: { 'User-Agent': 'DuNorth-Debug/1.0' } });
    if (!resp.ok) return res.status(502).json({ error: `download_failed ${resp.status}` });
    const buf = Buffer.from(await resp.arrayBuffer());

    // Extract text
    const { extractTextUniversal } = await import('../_lib/extractText.js');
    const text = await extractTextUniversal(buf, file.filename || '', file.content_type || '').catch(() => null);

    if (store && text) {
      await query(`UPDATE files SET extracted_text = $1, public_download_url = COALESCE(public_download_url, $2) WHERE id = $3`, [text.slice(0, 5_000_000), publicUrl, fileId]);
    }

    return res.status(200).json({
      ok: true,
      fileId,
      filename: file.filename,
      size: Number(file.size || 0),
      extracted: Boolean(text && text.length),
      preview: text ? text.slice(0, 1200) : null,
      reason: text ? undefined : 'no_text',
      used_url: publicUrl
    });
  } catch (e) {
    return res.status(500).json({ error: 'internal_error', detail: String(e.message || e) });
  }
}


