import { query } from './_lib/pg.js';
import { ensureSchema } from './_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();
    
    // Extract userId from JWT token if provided
    let userId = req.body?.userId;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      } catch (e) {
        console.warn('Invalid JWT token:', e.message);
      }
    }
    
    const { baseUrl, items = {} } = req.body || {};
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

    // pages
    if (Array.isArray(items.pages)) {
      for (const p of items.pages) {
        await query(
          'INSERT INTO pages(user_id, id, course_id, title, url, body, raw_json) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id,id) DO UPDATE SET course_id=EXCLUDED.course_id, title=EXCLUDED.title, url=EXCLUDED.url, body=EXCLUDED.body, raw_json=EXCLUDED.raw_json',
          [userId, p.id || p.page_id, p.course_id, p.title || null, p.url || null, p.body || null, p]
        );
      }
      counts.pages = items.pages.length;
    }

    // files with download URLs
    if (Array.isArray(items.files)) {
      for (const f of items.files) {
        await query(
          'INSERT INTO files(user_id, id, course_id, filename, content_type, size, download_url, public_download_url, raw_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (user_id,id) DO UPDATE SET course_id=EXCLUDED.course_id, filename=EXCLUDED.filename, content_type=EXCLUDED.content_type, size=EXCLUDED.size, download_url=EXCLUDED.download_url, public_download_url=EXCLUDED.public_download_url, raw_json=EXCLUDED.raw_json',
          [userId, f.id, f.course_id, f.filename || f.display_name || null, f['content-type'] || null, f.size || null, f.url || null, f.public_download_url || null, f]
        );
      }
      counts.files = items.files.length;
    }

    // announcements
    if (Array.isArray(items.announcements)) {
      for (const ann of items.announcements) {
        await query(
          'INSERT INTO announcements(user_id, id, course_id, title, message, posted_at, raw_json) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (user_id,id) DO UPDATE SET course_id=EXCLUDED.course_id, title=EXCLUDED.title, message=EXCLUDED.message, posted_at=EXCLUDED.posted_at, raw_json=EXCLUDED.raw_json',
          [userId, ann.id, ann.course_id, ann.title || null, ann.message || null, ann.posted_at ? new Date(ann.posted_at) : null, ann]
        );
      }
      counts.announcements = items.announcements.length;
    }

    // user profile baseUrl save
    if (baseUrl) {
      await query(
        'INSERT INTO user_profile(user_id, base_url) VALUES($1,$2) ON CONFLICT (user_id) DO UPDATE SET base_url=EXCLUDED.base_url, last_sync=now()',
        [userId, baseUrl]
      );
    }

    // Update sync cursors
    const { cursors = {} } = req.body;
    for (const [endpoint, cursorData] of Object.entries(cursors)) {
      if (cursorData.etag) {
        await query(`
          INSERT INTO sync_cursors(user_id, base_url, endpoint, etag, last_sync) 
          VALUES($1, $2, $3, $4, now()) 
          ON CONFLICT (user_id, base_url, endpoint) 
          DO UPDATE SET etag = EXCLUDED.etag, last_sync = EXCLUDED.last_sync
        `, [userId, baseUrl, endpoint, cursorData.etag]);
      }
    }

    return res.status(200).json({ ok: true, counts });
  } catch (err) {
    console.error('ingest error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}


