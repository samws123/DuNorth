import { ensureSchema } from '../_lib/ensureSchema.js';
import { query } from '../_lib/pg.js';

function parseCookies(header) { const out = {}; if (!header) return out; header.split(';').forEach(p=>{const i=p.indexOf('='); if(i>0) out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim());}); return out; }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    await ensureSchema();
    const cookies = parseCookies(req.headers.cookie || '');
    const userId = req.query.userId || cookies.dunorth_user;
    if (!userId) return res.status(400).json({ error: 'missing_user' });
    const r = await query(`SELECT base_url, lms FROM user_profile WHERE user_id = $1`, [userId]);
    return res.status(200).json({ baseUrl: r.rows[0]?.base_url || null, lms: r.rows[0]?.lms || null });
  } catch (e) {
    return res.status(500).json({ error: 'internal_error', detail: String(e.message || e) });
  }
}
