import { query } from '../../_lib/pg.js';
import { ensureSchema } from '../../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function isUuid(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); }

async function callCanvasJson(baseUrl, cookieValue) {
  const tryNames = ['_legacy_normandy_session', 'canvas_session'];
  for (const name of tryNames) {
    const r = await fetch(`${baseUrl}/api/v1/users/self`, {
      headers: {
        'Accept': 'application/json',
        'Cookie': `${name}=${cookieValue}`,
        'User-Agent': 'DuNorth-Server/1.0'
      },
      redirect: 'follow'
    });
    if (r.ok) {
      return await r.json();
    }
    // try next name on 401/403
    if (r.status !== 401 && r.status !== 403) {
      const text = await r.text();
      throw new Error(`Canvas error ${r.status}: ${text.slice(0, 300)}`);
    }
  }
  throw new Error('Unauthorized with stored cookie');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();

    // Extract userId from JWT
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    let userId;
    try {
      const token = auth.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Resolve non-UUID identifiers (e.g., 'demo-user') to the real users.id
    if (!isUuid(userId)) {
      const email = `${String(userId).replace(/[^a-zA-Z0-9._-]/g,'_')}@local.test`;
      const { rows: urows } = await query(`SELECT id FROM users WHERE email = $1`, [email]);
      if (!urows[0]?.id) return res.status(404).json({ error: 'No user record for token id' });
      userId = urows[0].id;
    }

    // Get latest stored session
    const { rows } = await query(
      `SELECT base_url, session_cookie, updated_at, created_at
       FROM user_canvas_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No stored session' });

    const { base_url: baseUrl, session_cookie: cookieValue } = rows[0];
    if (!baseUrl || !cookieValue) return res.status(400).json({ error: 'Invalid stored session' });

    const me = await callCanvasJson(baseUrl, cookieValue);
    // Best-effort: sync back the name to users
    if (me?.name) {
      try { await query(`UPDATE users SET name = $1 WHERE id = $2`, [me.name, userId]); } catch {}
    }
    return res.status(200).json({ ok: true, baseUrl, me: { id: me.id, name: me.name, login_id: me.login_id } });
  } catch (e) {
    console.error('debug/canvas/self error', e);
    return res.status(500).json({ error: 'internal_error', detail: String(e.message || e) });
  }
}
