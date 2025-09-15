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
    const { user_id: userId, base_url: storedBase, session_cookie: cookieValue } = rows[0];
    // Try stored base first, then known Princeton hosts as fallbacks (debug only)
    const candidates = [];
    if (storedBase) candidates.push(storedBase);
    const hostOnly = (storedBase || '').replace(/^https?:\/\//, '');
    if (hostOnly === 'instructure.com' || hostOnly.split('.').length < 3) {
      candidates.push('https://princeton.instructure.com');
    }
    // Always include Princeton as explicit debug fallback for this test
    if (!candidates.includes('https://princeton.instructure.com')) candidates.push('https://princeton.instructure.com');
    if (!candidates.includes('https://canvas.princeton.edu')) candidates.push('https://canvas.princeton.edu');

    let lastErr = null;
    for (const baseUrl of candidates) {
      try {
        const me = await callCanvasSelf(baseUrl, cookieValue);
        return res.status(200).json({ ok: true, userId, baseUrl, me: { id: me.id, name: me.name, login_id: me.login_id } });
      } catch (e) {
        lastErr = String(e.message || e);
      }
    }
    return res.status(500).json({ ok: false, error: lastErr || 'unknown_error' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}


