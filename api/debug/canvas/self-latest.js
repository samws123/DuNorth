import { query } from '../../_lib/pg.js';
import { ensureSchema } from '../../_lib/ensureSchema.js';

async function callCanvasSelf(baseUrl, cookieValue) {
  const tryNames = ['_legacy_normandy_session', 'canvas_session'];
  for (const name of tryNames) {
    const r = await fetch(`${baseUrl}/api/v1/users/self`, {
      headers: {
        'Accept': 'application/json',
        'Cookie': `${name}=${cookieValue}`,
        'User-Agent': 'DuNorth-Debug/1.0'
      },
      redirect: 'follow'
    });
    const ct = r.headers.get('content-type') || '';
    if (r.ok && ct.includes('application/json')) return await r.json();
    if (![401,403].includes(r.status)) {
      const t = await r.text().catch(()=>'');
      throw new Error(`Canvas error ${r.status}: ${t.slice(0,200)}`);
    }
  }
  throw new Error('Unauthorized');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();
    const { rows } = await query(
      `SELECT user_id, base_url, session_cookie
       FROM user_canvas_sessions
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT 1`
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: 'no_session' });
    const { user_id: userId, base_url: baseUrl, session_cookie: cookieValue } = rows[0];
    const me = await callCanvasSelf(baseUrl, cookieValue);
    return res.status(200).json({ ok: true, userId, baseUrl, me: { id: me.id, name: me.name, login_id: me.login_id } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}


