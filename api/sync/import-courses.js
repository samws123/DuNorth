import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

async function callCanvasPaged(baseUrl, cookieValue, path) {
  const tryNames = ['_legacy_normandy_session', 'canvas_session'];
  const out = [];
  let url = `${baseUrl}${path}`;
  for (let page = 0; page < 50 && url; page++) {
    let resp;
    for (const name of tryNames) {
      resp = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Cookie': `${name}=${cookieValue}`,
          'User-Agent': 'DuNorth-Server/1.0'
        },
        redirect: 'follow'
      });
      if (resp.ok) break;
      if (![401,403].includes(resp.status)) break;
    }
    if (!resp?.ok) {
      const txt = await resp.text().catch(()=> '');
      throw new Error(`Canvas error ${resp?.status}: ${txt.slice(0,300)}`);
    }
    const data = await resp.json();
    if (Array.isArray(data)) out.push(...data);
    const link = resp.headers.get('Link') || '';
    const m = /<([^>]+)>;\s*rel="next"/.exec(link);
    url = m ? m[1] : null;
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();
    // Auth
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    let userId;
    try { userId = jwt.verify(auth.slice(7), JWT_SECRET).userId; } catch { return res.status(401).json({ error: 'Invalid token' }); }

    // Session
    const { rows } = await query(
      `SELECT base_url, session_cookie FROM user_canvas_sessions WHERE user_id = $1
       ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No stored session' });
    const { base_url: baseUrl, session_cookie: cookieValue } = rows[0];

    // Fetch courses
    const courses = await callCanvasPaged(baseUrl, cookieValue, '/api/v1/courses?enrollment_state=active&per_page=100');

    // Upsert
    let imported = 0;
    for (const c of courses) {
      await query(
        `INSERT INTO courses(user_id, id, name, course_code, term, raw_json)
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT (user_id, id) DO UPDATE
           SET name = EXCLUDED.name,
               course_code = EXCLUDED.course_code,
               term = EXCLUDED.term,
               raw_json = EXCLUDED.raw_json`,
        [userId, c.id, c.name || null, c.course_code || null, c.term || null, c]
      );
      imported++;
    }

    return res.status(200).json({ ok: true, baseUrl, imported, total: courses.length });
  } catch (e) {
    console.error('sync/import-courses error', e);
    return res.status(500).json({ error: 'internal_error', detail: String(e.message || e) });
  }
}
