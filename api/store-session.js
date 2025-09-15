import { query } from './_lib/pg.js';
import { ensureSchema } from './_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function isUuid(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); }

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

async function callCanvasJson(baseUrl, cookieValue, path) {
  const tryNames = ['_legacy_normandy_session', 'canvas_session'];
  for (const name of tryNames) {
    const r = await fetch(`${baseUrl}${path}`, {
      headers: {
        'Accept': 'application/json',
        'Cookie': `${name}=${cookieValue}`,
        'User-Agent': 'DuNorth-Server/1.0'
      },
      redirect: 'follow'
    });
    const ct = r.headers.get('content-type') || '';
    if (r.ok && ct.includes('application/json')) return await r.json();
    if (![401,403].includes(r.status)) {
      const t = await r.text().catch(()=> '');
      throw new Error(`Canvas error ${r.status}: ${t.slice(0,300)}`);
    }
  }
  throw new Error('Unauthorized');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    await ensureSchema();
    
    // Extract userId from JWT token
    let tokenUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        tokenUserId = decoded.userId;
      } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
    if (!tokenUserId) return res.status(400).json({ error: 'userId required' });

    // Ensure we have a real users.id UUID to reference
    let userId = tokenUserId;
    if (!isUuid(userId)) {
      const email = `${String(tokenUserId).replace(/[^a-zA-Z0-9._-]/g,'_')}@local.test`;
      const up = await query(
        `INSERT INTO users(email, name) VALUES($1,$2)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [email, 'Cookie Test User']
      );
      userId = up.rows[0].id;
    }
    
    const { baseUrl, sessionCookie } = req.body || {};
    if (!baseUrl || !sessionCookie) {
      return res.status(400).json({ error: 'baseUrl and sessionCookie required' });
    }
    
    // Fetch Canvas user profile (server-side) to confirm auth and capture name/email
    let canvasSelf = null;
    try {
      canvasSelf = await callCanvasJson(baseUrl, sessionCookie, '/api/v1/users/self');
    } catch (e) {
      // continue; we still store the session (but mark name as null so UI can't confuse sources)
      canvasSelf = null;
    }

    // Store/update session and canvas identity fields
    await query(`
      INSERT INTO user_canvas_sessions(user_id, base_url, session_cookie, canvas_user_id, canvas_name, canvas_email, expires_at, created_at) 
      VALUES($1, $2, $3, $4, $5, $6, $7, NOW()) 
      ON CONFLICT (user_id, base_url) 
      DO UPDATE SET 
        session_cookie = EXCLUDED.session_cookie,
        canvas_user_id = EXCLUDED.canvas_user_id,
        canvas_name = EXCLUDED.canvas_name,
        canvas_email = EXCLUDED.canvas_email,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
    `, [
      userId, 
      baseUrl, 
      sessionCookie,
      canvasSelf?.id || null,
      canvasSelf?.name || null,
      canvasSelf?.login_id || null,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    ]);

    // Also persist the user's name in users table for chat lookup
    if (canvasSelf?.name) {
      await query(`UPDATE users SET name = $1 WHERE id = $2`, [canvasSelf.name, userId]);
    }

    // Immediately import courses (server-side)
    let imported = 0;
    try {
      const courses = await callCanvasPaged(baseUrl, sessionCookie, '/api/v1/courses?enrollment_state=active&per_page=100');
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
    } catch (e) {
      return res.status(200).json({ ok: true, baseUrl, name: canvasSelf?.name || null, imported: 0, importError: String(e.message || e) });
    }
    
    return res.status(200).json({ ok: true, baseUrl, name: canvasSelf?.name || null, imported });
    
  } catch (error) {
    console.error('[Store Session] Error:', error);
    return res.status(500).json({ error: 'Failed to store session', detail: String(error.message || error) });
  }
}
