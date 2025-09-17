import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

async function callPaged(baseUrl, cookie, path) {
  const names = ['canvas_session', '_legacy_normandy_session'];
  const out = [];
  let url = `${baseUrl}${path}`;
  for (let page = 0; page < 50 && url; page++) {
    let resp;
    for (const n of names) {
      resp = await fetch(url, { headers: { 'Accept': 'application/json', 'Cookie': `${n}=${cookie}`, 'User-Agent': 'DuNorth-Server/1.0' }, redirect: 'follow' });
      if (resp.ok) break;
      if (![401,403].includes(resp.status)) break;
    }
    if (!resp?.ok) {
      const txt = await resp.text().catch(()=> '');
      if (resp.status === 404 && /disabled for this course/i.test(txt)) return out;
      if (resp.status === 401 || resp.status === 403) return out;
      throw new Error(`Canvas ${resp.status}: ${txt.slice(0,200)}`);
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
    const s = await query(
      `SELECT base_url, session_cookie FROM user_canvas_sessions
       WHERE user_id = $1 ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1`,
      [userId]
    );
    if (!s.rows[0]) return res.status(404).json({ error: 'No stored session' });
    const baseUrl = s.rows[0].base_url; const cookie = s.rows[0].session_cookie;

    // Courses
    const c = await query(`SELECT id FROM courses WHERE user_id = $1 LIMIT 1000`, [userId]);
    let imported = 0; const details = [];

    for (const row of c.rows) {
      const cid = row.id;
      try {
        const path = `/api/v1/courses/${cid}/assignments?per_page=100&include[]=all_dates&include[]=submission_types&include[]=rubric`;
        const items = await callPaged(baseUrl, cookie, path);
        for (const a of items) {
          await query(
            `INSERT INTO assignments(user_id, id, course_id, name, due_at, description, updated_at, points_possible, submission_types, html_url, workflow_state, raw_json)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (user_id, id) DO UPDATE SET
               name = EXCLUDED.name,
               due_at = EXCLUDED.due_at,
               description = EXCLUDED.description,
               updated_at = EXCLUDED.updated_at,
               points_possible = EXCLUDED.points_possible,
               submission_types = EXCLUDED.submission_types,
               html_url = EXCLUDED.html_url,
               workflow_state = EXCLUDED.workflow_state,
               raw_json = EXCLUDED.raw_json`,
            [
              userId,
              a.id,
              cid,
              a.name || null,
              a.due_at ? new Date(a.due_at) : null,
              a.description || null,
              a.updated_at ? new Date(a.updated_at) : null,
              a.points_possible || null,
              Array.isArray(a.submission_types) ? a.submission_types : (a.submission_types ? [a.submission_types] : []),
              a.html_url || null,
              a.published === true ? 'published' : 'unpublished',
              a
            ]
          );
          imported++;
        }
        details.push({ courseId: cid, count: items.length });
      } catch (e) {
        details.push({ courseId: cid, error: String(e.message || e) });
      }
    }

    return res.status(200).json({ ok: true, imported, details });
  } catch (e) {
    return res.status(500).json({ error: 'internal_error', detail: String(e.message || e) });
  }
}


