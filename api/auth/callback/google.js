import { ensureSchema } from '../../_lib/ensureSchema.js';
import { query } from '../../_lib/pg.js';

async function exchangeCodeForTokens(code, redirectUri) {
  const params = new URLSearchParams();
  params.set('code', code);
  params.set('client_id', process.env.GOOGLE_CLIENT_ID);
  params.set('client_secret', process.env.GOOGLE_CLIENT_SECRET);
  params.set('redirect_uri', redirectUri);
  params.set('grant_type', 'authorization_code');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString()
  });
  if (!r.ok) throw new Error(`token_exchange_failed ${r.status}`);
  return await r.json();
}

async function fetchUserInfo(accessToken) {
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new Error(`userinfo_failed ${r.status}`);
  return await r.json();
}

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const base = (process.env.NEXTAUTH_URL || (req.headers.origin ? req.headers.origin : '')).replace(/\/$/, '');
    if (!base) throw new Error('missing_base');
    const redirectUri = `${base}/api/auth/callback/google`;

    const { code, state } = req.query || {};
    if (!code) return res.status(400).send('Missing code');
    let callbackUrl = '/schools/school.html';
    if (state) { try { const o = JSON.parse(String(state)); if (o?.callbackUrl && String(o.callbackUrl).startsWith('/')) callbackUrl = o.callbackUrl; } catch {} }

    const tok = await exchangeCodeForTokens(String(code), redirectUri);
    const info = await fetchUserInfo(tok.access_token);

    const googleSub = info.sub || null;
    const email = info.email || null;
    const name = info.name || info.given_name || null;
    if (!email || !googleSub) throw new Error('missing_email_or_sub');

    // Upsert user
    const r = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    let userId = r.rows[0]?.id || null;
    if (!userId) {
      const ins = await query(`INSERT INTO users(email, name, sso_provider, created_at) VALUES($1,$2,$3,NOW()) RETURNING id`, [email, name, 'google']);
      userId = ins.rows[0].id;
    } else {
      await query(`UPDATE users SET name = COALESCE(name,$1), sso_provider = COALESCE(sso_provider,'google') WHERE id = $2`, [name, userId]);
    }
    await query(`UPDATE users SET google_sub = $1 WHERE id = $2`, [googleSub, userId]);

    // Set cookie and redirect
    const expires = new Date(Date.now() + 365*24*60*60*1000).toUTCString();
    res.setHeader('Set-Cookie', [`dunorth_user=${userId}; Path=/; Expires=${expires}; SameSite=Lax; Secure`]);
    res.writeHead(302, { Location: `${base}${callbackUrl}` });
    res.end();
  } catch (e) {
    res.status(500).send(`OAuth error: ${e.message || e}`);
  }
}
