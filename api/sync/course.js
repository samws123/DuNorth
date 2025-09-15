import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';
import pdfParse from 'pdf-parse';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

async function callCanvasPaged(baseUrl, cookieValue, path) {
  const tryNames = ['canvas_session', '_legacy_normandy_session'];
  const out = [];
  let url = `${baseUrl}${path}`;
  for (let page = 0; page < 50 && url; page++) {
    let resp;
    for (const name of tryNames) {
      resp = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Cookie': `${name}=${cookieValue}`,
          'User-Agent': 'DuNorth-Server/1.0'
        },
        redirect: 'follow'
      });
      if (resp.ok) break;
      if (![401,403].includes(resp.status)) break;
    }
    if (!resp?.ok) {
      const txt = await resp.text().catch(()=> '');
      throw new Error(`Canvas error ${resp?.status}: ${txt.slice(0,300)}`);
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
    try {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
      userId = decoded.userId;
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { courseId } = req.body || {};
    if (!courseId) return res.status(400).json({ error: 'courseId required' });

    // Session
    const { rows } = await query(
      `SELECT base_url, session_cookie
       FROM user_canvas_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No stored session' });
    const { base_url: baseUrl, session_cookie: cookieValue } = rows[0];

    // Pull pages (with bodies)
    const pages = await callCanvasPaged(baseUrl, cookieValue, `/api/v1/courses/${courseId}/pages?per_page=100`);
    let fullPages = [];
    for (const p of pages) {
      try {
        const r = await fetch(`${baseUrl}/api/v1/courses/${courseId}/pages/${p.url}`, {
          headers: { 'Accept': 'application/json', 'Cookie': `canvas_session=${cookieValue}`, 'User-Agent': 'DuNorth-Server/1.0' },
          redirect: 'follow'
        });
        if (r.ok) fullPages.push(await r.json());
      } catch {}
    }
    for (const page of fullPages) {
      await query(
        `INSERT INTO pages(user_id, id, course_id, title, url, body, raw_json)
         VALUES($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (user_id, id) DO UPDATE SET title=EXCLUDED.title, url=EXCLUDED.url, body=EXCLUDED.body, raw_json=EXCLUDED.raw_json`,
        [userId, page.page_id || page.id, courseId, page.title || null, page.url || null, page.body || null, page]
      );
    }

    // Files with public URLs
    const files = await callCanvasPaged(baseUrl, cookieValue, `/api/v1/courses/${courseId}/files?per_page=100`);
    let savedFiles = 0;
    for (const f of files) {
      let publicUrl = null;
      try {
        const r = await fetch(`${baseUrl}/api/v1/files/${f.id}/public_url`, {
          headers: { 'Accept': 'application/json', 'Cookie': `canvas_session=${cookieValue}`, 'User-Agent': 'DuNorth-Server/1.0' },
          redirect: 'follow'
        });
        if (r.ok) { const j = await r.json(); publicUrl = j.public_url || null; }
      } catch {}
      let extractedText = null;
      try {
        const isPdf = (f.content_type || '').includes('pdf') || String(f.display_name || f.filename || '').toLowerCase().endsWith('.pdf');
        if (publicUrl && isPdf) {
          const MAX_PDF_BYTES = 15 * 1024 * 1024;
          const fr = await fetch(publicUrl, { headers: { 'User-Agent': 'DuNorth-Server/1.0' } });
          if (fr.ok) {
            const len = Number(fr.headers.get('content-length') || '0');
            if (!len || len <= MAX_PDF_BYTES) {
              const buf = Buffer.from(await fr.arrayBuffer());
              if (buf.length <= MAX_PDF_BYTES) {
                const parsed = await pdfParse(buf).catch(() => null);
                extractedText = parsed?.text ? String(parsed.text).trim().slice(0, 2_000_000) : null;
              }
            }
          }
        }
      } catch {}
      await query(
        `INSERT INTO files(user_id, id, course_id, filename, content_type, size, download_url, public_download_url, raw_json)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (user_id, id) DO UPDATE SET filename=EXCLUDED.filename, content_type=EXCLUDED.content_type, size=EXCLUDED.size, download_url=EXCLUDED.download_url, public_download_url=EXCLUDED.public_download_url, raw_json=EXCLUDED.raw_json`,
        [userId, f.id, courseId, f.display_name || f.filename || null, f.content_type || null, f.size || null, f.url || null, publicUrl, f]
      );
      if (extractedText) {
        await query(`UPDATE files SET extracted_text = $1 WHERE user_id = $2 AND id = $3`, [extractedText, userId, f.id]);
      }
      savedFiles++;
    }

    // Announcements
    const anns = await callCanvasPaged(baseUrl, cookieValue, `/api/v1/courses/${courseId}/discussion_topics?only_announcements=true&per_page=100`);
    for (const a of anns) {
      await query(
        `INSERT INTO announcements(user_id, id, course_id, title, message, posted_at, raw_json)
         VALUES($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (user_id, id) DO UPDATE SET title=EXCLUDED.title, message=EXCLUDED.message, posted_at=EXCLUDED.posted_at, raw_json=EXCLUDED.raw_json`,
        [userId, a.id, courseId, a.title || null, a.message || null, a.posted_at ? new Date(a.posted_at) : null, a]
      );
    }

    return res.status(200).json({ ok: true, courseId, counts: { pages: fullPages.length, files: savedFiles, announcements: anns.length } });
  } catch (e) {
    console.error('sync/course error', e);
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}


