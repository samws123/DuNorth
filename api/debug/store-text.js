import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();
    const { fileId, text } = req.body || {};
    const id = Number(fileId);
    if (!id || typeof text !== 'string') return res.status(400).json({ error: 'fileId and text required' });
    const { rowCount } = await query(`UPDATE files SET extracted_text = $1 WHERE id = $2`, [text.slice(0, 5_000_000), id]);
    if (!rowCount) return res.status(404).json({ error: 'file_not_found' });
    return res.status(200).json({ ok: true, fileId: id, text_len: text.length });
  } catch (e) {
    return res.status(500).json({ error: 'internal_error', detail: String(e.message || e) });
  }
}


