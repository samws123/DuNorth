export default async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const base = process.env.NEXTAUTH_URL || (req.headers.origin ? req.headers.origin : '');
  if (!clientId || !base) return res.status(500).json({ error: 'missing_oauth_env' });
  const callbackUrl = (req.query.callbackUrl && String(req.query.callbackUrl).startsWith('/')) ? String(req.query.callbackUrl) : '/schools/school.html';
  const redirectUri = `${base.replace(/\/$/, '')}/api/auth/google-callback`;
  const scope = encodeURIComponent('openid email profile');
  const state = encodeURIComponent(JSON.stringify({ callbackUrl }));
  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&include_granted_scopes=true&prompt=consent&access_type=online&state=${state}`;
  res.writeHead(302, { Location: url });
  res.end();
}
