import { query } from '../_lib/pg.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, name, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const r = await query('INSERT INTO users(email, name, password_hash) VALUES($1,$2,$3) ON CONFLICT (email) DO NOTHING RETURNING id', [email, name || null, hash]);
    if (!r.rowCount) return res.status(409).json({ error: 'email_exists' });
    return res.status(200).json({ ok: true, userId: r.rows[0].id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'internal_error' });
  }
}


