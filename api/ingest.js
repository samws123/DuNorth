import { getDb } from './_lib/mongo.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { userId, baseUrl, cursors = {}, items = {} } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const db = await getDb();
    const now = new Date();

    // Upsert per collection
    const collections = [
      ['courses', items.courses],
      ['assignments', items.assignments],
      ['pages', items.pages],
      ['files', items.files],
      ['modules', items.modules],
      ['discussions', items.discussions]
    ];
    let counts = {};
    for (const [name, docs] of collections) {
      if (!Array.isArray(docs) || docs.length === 0) { counts[name] = 0; continue; }
      const col = db.collection(name);
      const ops = docs.map(d => ({
        updateOne: {
          filter: { userId, id: d.id },
          update: { $set: { ...d, userId, baseUrl, updatedAt: now }, $setOnInsert: { createdAt: now } },
          upsert: true
        }
      }));
      const r = await col.bulkWrite(ops, { ordered: false });
      counts[name] = r.upsertedCount + r.modifiedCount;
    }

    await db.collection('users').updateOne(
      { id: userId },
      { $set: { id: userId, baseUrl, cursors, touchedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );

    return res.status(200).json({ ok: true, counts });
  } catch (err) {
    console.error('ingest error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}


