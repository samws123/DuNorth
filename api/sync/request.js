import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  await ensureSchema();
  await query('INSERT INTO sync_requests(user_id) VALUES($1)', [userId]);
  return res.status(200).json({ ok: true });
}


