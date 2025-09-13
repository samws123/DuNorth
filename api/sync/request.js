import { getDb } from '../_lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const db = await getDb();
  await db.collection('sync_requests').insertOne({ userId, requestedAt: new Date() });
  return res.status(200).json({ ok: true });
}


