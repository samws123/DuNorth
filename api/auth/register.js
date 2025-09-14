export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, name, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  // MVP: no DB, just return success
  const userId = 'user_' + Date.now();
  return res.status(200).json({ ok: true, userId });
}


