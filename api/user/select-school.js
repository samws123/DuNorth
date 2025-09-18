import { ensureSchema } from '../_lib/ensureSchema.js';
import { query } from '../_lib/pg.js';

function parseCookies(header) {
  const out = {}; if (!header) return out;
  header.split(';').forEach(p => { const i = p.indexOf('='); if (i>0) out[p.slice(0,i).trim()] = decodeURIComponent(p.slice(i+1).trim()); });
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    await ensureSchema();
    const body = req.body || {};
    const cookies = parseCookies(req.headers.cookie || '');
    const userId = body.userId || cookies.dunorth_user;
    const { baseUrl, lms, schoolName } = body;
    if (!userId || !baseUrl) return res.status(400).json({ error: 'missing_user_or_baseUrl' });

    await query(
      `INSERT INTO user_profile(user_id, base_url, lms)
       VALUES($1,$2,$3)
       ON CONFLICT (user_id) DO UPDATE SET base_url = EXCLUDED.base_url, lms = COALESCE(EXCLUDED.lms, user_profile.lms)`,
      [userId, baseUrl, lms || null]
    );

    // Optionally link to schools table by name if provided
    if (schoolName) {
      try {
        const r = await query(`SELECT id FROM schools WHERE name = $1 LIMIT 1`, [schoolName]);
        if (r.rows[0]?.id) await query(`UPDATE user_profile SET school_id = $1 WHERE user_id = $2`, [r.rows[0].id, userId]);
      } catch {}
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'internal_error', detail: String(e.message || e) });
  }
}
