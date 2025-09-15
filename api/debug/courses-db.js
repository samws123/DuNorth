import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';

function isUuid(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); }
async function resolveUserId(raw) {
  if (isUuid(raw)) return raw;
  const email = `${String(raw).replace(/[^a-zA-Z0-9._-]/g,'_')}@local.test`;
  const up = await query(
    `INSERT INTO users(email, name) VALUES($1,$2)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [email, 'Debug User']
  );
  return up.rows[0].id;
}

export default async function handler(req, res) {
  try {
    await ensureSchema();
    const rawUserId = req.query.userId || 'cookie-test';
    const userId = await resolveUserId(rawUserId);

    const { rows } = await query(
      `SELECT id, name, course_code FROM courses WHERE user_id = $1 ORDER BY name ASC LIMIT 100`,
      [userId]
    );
    return res.status(200).json({ ok: true, count: rows.length, courses: rows });
  } catch (e) {
    console.error('debug/courses-db error', e);
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
