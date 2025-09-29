import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';
import { saveToPinecone } from './saveToPinecone.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

async function callPaged(baseUrl, cookie, path) {
  const names = ['canvas_session', '_legacy_normandy_session'];
  const out = [];
  let url = `${baseUrl}${path}`;
  for (let page = 0; page < 50 && url; page++) {
    let resp;
    for (const n of names) {
      resp = await fetch(url, { headers: { 'Accept': 'application/json', 'Cookie': `${n}=${cookie}`, 'User-Agent': 'DuNorth-Server/1.0' }, redirect: 'follow' });
      if (resp.ok) break;
      if (![401,403].includes(resp.status)) break;
    }
    if (!resp?.ok) {
      const txt = await resp.text().catch(()=> '');
      if (resp.status === 404 && /disabled for this course/i.test(txt)) return out;
      if (resp.status === 401 || resp.status === 403) return out;
      throw new Error(`Canvas ${resp.status}: ${txt.slice(0,200)}`);
    }
    const data = await resp.json();
    if (Array.isArray(data)) out.push(...data);
    const link = resp.headers.get('Link') || '';
    const m = /<([^>]+)>;\s*rel="next"/.exec(link);
    url = m ? m[1] : null;
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();

    // Auth
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    let userId;
    try { userId = jwt.verify(auth.slice(7), JWT_SECRET).userId; } catch { return res.status(401).json({ error: 'Invalid token' }); }

    // Session
    const s = await query(
      `SELECT base_url, session_cookie FROM user_canvas_sessions
       WHERE user_id = $1 ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1`,
      [userId]
    );
    if (!s.rows[0]) return res.status(404).json({ error: 'No stored session' });
    const baseUrl = s.rows[0].base_url; const cookie = s.rows[0].session_cookie;

    // Courses
    const c = await query(`SELECT id FROM courses WHERE user_id = $1 LIMIT 1000`, [userId]);

    let processed = 0; let insertedNew = 0; let updatedExisting = 0; const details = [];
    // Preload existing ids to distinguish new vs update
    const existing = await query(`SELECT id FROM announcements WHERE user_id = $1`, [userId]);
    const existingIds = new Set(existing.rows.map(r => Number(r.id)));
    // Track IDs seen in this run to avoid double-counting
    const seenThisRun = new Set();

    // Import announcements per course
    for (const row of c.rows) {
      const cid = row.id;
      try {
        const path = `/api/v1/courses/${cid}/discussion_topics?only_announcements=true&per_page=100&include[]=all_dates&include[]=submission_types&include[]=rubric`;
        const items = await callPaged(baseUrl, cookie, path);
        let perCourseProcessed = 0;
        
        for (const announcement of items) {
          // Only process items that are actually announcements
          if (!announcement.is_announcement) continue;
          
          await query(
            `INSERT INTO announcements(user_id, id, course_id, title, message, posted_at, created_at, last_reply_at, html_url, author_name, author_id, read_state, locked, published, raw_json)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             ON CONFLICT (user_id, id) DO UPDATE SET
               title = EXCLUDED.title,
               message = EXCLUDED.message,
               posted_at = EXCLUDED.posted_at,
               created_at = EXCLUDED.created_at,
               last_reply_at = EXCLUDED.last_reply_at,
               html_url = EXCLUDED.html_url,
               author_name = EXCLUDED.author_name,
               author_id = EXCLUDED.author_id,
               read_state = EXCLUDED.read_state,
               locked = EXCLUDED.locked,
               published = EXCLUDED.published,
               raw_json = EXCLUDED.raw_json`,
            [
              userId,
              announcement.id,
              cid,
              announcement.title || null,
              announcement.message || null,
              announcement.posted_at ? new Date(announcement.posted_at) : null,
              announcement.created_at ? new Date(announcement.created_at) : null,
              announcement.last_reply_at ? new Date(announcement.last_reply_at) : null,
              announcement.html_url || null,
              announcement.author?.display_name || announcement.user_name || null,
              announcement.author?.id || null,
              announcement.read_state || null,
              announcement.locked || false,
              announcement.published || false,
              announcement
            ]
          );
          if (announcement.message) {
            
            await saveToPinecone(userId, cid, announcement.id, announcement.message, {
              type: 'announcement',
              announcement_id: announcement.id,
              courseId: cid || 0,
              title: announcement.title,
              posted_at: announcement.posted_at,
              url: announcement.html_url,
              author: announcement.author?.display_name || announcement.user_name,
            });
          }
          
          
          const aid = Number(announcement.id);
          if (!seenThisRun.has(aid)) {
            processed++;
            perCourseProcessed++;
            if (!existingIds.has(aid)) insertedNew++; else updatedExisting++;
            seenThisRun.add(aid);
            existingIds.add(aid);
          }
        }
        details.push({ courseId: cid, count: perCourseProcessed });
      } catch (e) {
        details.push({ courseId: cid, error: String(e.message || e) });
      }
    }

    return res.status(200).json({ 
      ok: true, 
      processed, 
      insertedNew, 
      updatedExisting, 
      uniqueAnnouncementsThisRun: seenThisRun.size, 
      imported: seenThisRun.size, 
      details 
    });
  } catch (e) {
    return res.status(500).json({ error: 'internal_error', detail: String(e.message || e) });
  }
}
