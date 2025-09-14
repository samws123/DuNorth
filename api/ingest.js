import { query } from './_lib/pg.js';
import { ensureSchema } from './_lib/ensureSchema.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();
    const { userId, baseUrl, items = {} } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    let counts = {};

    // courses
    if (Array.isArray(items.courses)) {
      for (const c of items.courses) {
        await query(
          'INSERT INTO courses(user_id, id, name, course_code, term, raw_json) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id,id) DO UPDATE SET name=EXCLUDED.name, course_code=EXCLUDED.course_code, term=EXCLUDED.term, raw_json=EXCLUDED.raw_json',
          [userId, c.id, c.name || null, c.course_code || null, c.term || null, c]
        );
      }
      counts.courses = items.courses.length;
    }

    if (Array.isArray(items.assignments)) {
      for (const a of items.assignments) {
        await query(
          'INSERT INTO assignments(user_id, id, course_id, name, due_at, workflow_state, raw_json) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id,id) DO UPDATE SET course_id=EXCLUDED.course_id, name=EXCLUDED.name, due_at=EXCLUDED.due_at, workflow_state=EXCLUDED.workflow_state, raw_json=EXCLUDED.raw_json',
          [userId, a.id, a.course_id, a.name || null, a.due_at ? new Date(a.due_at) : null, a.workflow_state || null, a]
        );
      }
      counts.assignments = items.assignments.length;
    }

    // user profile baseUrl save
    if (baseUrl) {
      await query(
        'INSERT INTO user_profile(user_id, base_url) VALUES($1,$2) ON CONFLICT (user_id) DO UPDATE SET base_url=EXCLUDED.base_url, last_sync=now()',
        [userId, baseUrl]
      );
    }

    return res.status(200).json({ ok: true, counts });
  } catch (err) {
    console.error('ingest error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}


