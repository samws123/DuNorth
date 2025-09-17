import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
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
    if (!userId || !fileIdRaw) return res.status(400).json({ error: 'userId or fileId missing' });
    const fileId = Number(fileIdRaw);

    const full = String(req.query.full || '').toLowerCase() === '1' || String(req.query.full || '').toLowerCase() === 'true';
    const MAX_FULL = 200_000; // hard cap to avoid huge payloads
    const PREVIEW = 8000;

    let { rows } = await query(
      `SELECT id, filename, content_type, size, public_download_url,
              COALESCE(length(extracted_text),0) AS text_len,
              CASE WHEN extracted_text IS NULL THEN NULL
                   WHEN $3 THEN SUBSTRING(extracted_text FROM 1 FOR $4)
                   ELSE SUBSTRING(extracted_text FROM 1 FOR $5)
              END AS text
       FROM files
       WHERE user_id = $1 AND id = $2
       LIMIT 1`,
      [userId, fileId, full, MAX_FULL, PREVIEW]
    );

    if (!rows[0]) return res.status(404).json({ error: 'file_not_found' });

    // If no text stored, try to auto-extract now (PDFs only)
    if (Number(rows[0].text_len) === 0) {
      const filename = String(rows[0].filename || '');
      const contentType = String(rows[0].content_type || '');
      const isPdf = filename.toLowerCase().endsWith('.pdf') || contentType.toLowerCase().includes('pdf');
      if (isPdf && rows[0].public_download_url) {
        try {
          const { extractPdfTextFromBuffer } = await import('../_lib/pdf.js');
          if (extractPdfTextFromBuffer) {
            const MAX = 20 * 1024 * 1024;
            const fr = await fetch(rows[0].public_download_url, { headers: { 'User-Agent': 'DuNorth-Debug/1.0' } });
            if (fr.ok) {
              const buf = Buffer.from(await fr.arrayBuffer());
              if (buf.length <= MAX) {
                const text = await extractPdfTextFromBuffer(buf).catch(() => null);
                if (text) {
                  await query(`UPDATE files SET extracted_text = $1 WHERE id = $2`, [text.slice(0, 5_000_000), fileId]);
                  rows = (await query(
                    `SELECT id, filename, content_type, size,
                            COALESCE(length(extracted_text),0) AS text_len,
                            CASE WHEN extracted_text IS NULL THEN NULL
                                 WHEN $3 THEN SUBSTRING(extracted_text FROM 1 FOR $4)
                                 ELSE SUBSTRING(extracted_text FROM 1 FOR $5)
                            END AS text
                     FROM files
                     WHERE user_id = $1 AND id = $2
                     LIMIT 1`,
                    [userId, fileId, full, MAX_FULL, PREVIEW]
                  )).rows;
                }
              }
            }
          }
        } catch {}
      }
    }

    return res.status(200).json({ ok: true, file: rows[0], truncated: rows[0].text ? rows[0].text.length < rows[0].text_len : true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}


