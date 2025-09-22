import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    await ensureSchema();

    // Auth
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    let userId;
    try { 
      userId = jwt.verify(auth.slice(7), JWT_SECRET).userId; 
    } catch { 
      return res.status(401).json({ error: 'Invalid token' }); 
    }

    const { courseId, limit = 50 } = req.query;

    let sql = `
      SELECT 
        a.id,
        a.course_id,
        a.title,
        a.message,
        a.posted_at,
        a.created_at,
        a.last_reply_at,
        a.html_url,
        a.author_name,
        a.author_id,
        a.read_state,
        a.locked,
        a.published,
        c.name as course_name
      FROM announcements a
      LEFT JOIN courses c ON a.course_id = c.id AND a.user_id = c.user_id
      WHERE a.user_id = $1
    `;
    
    const params = [userId];
    
    if (courseId) {
      sql += ` AND a.course_id = $2`;
      params.push(courseId);
    }
    
    sql += ` ORDER BY a.posted_at DESC NULLS LAST, a.created_at DESC NULLS LAST LIMIT $${params.length + 1}`;
    params.push(Math.max(1, Number(limit) || 50));

    const result = await query(sql, params);
    
    // Get counts by course
    const countSql = `
      SELECT 
        a.course_id,
        c.name as course_name,
        COUNT(*) as announcement_count
      FROM announcements a
      LEFT JOIN courses c ON a.course_id = c.id AND a.user_id = c.user_id
      WHERE a.user_id = $1
      GROUP BY a.course_id, c.name
      ORDER BY announcement_count DESC
    `;
    
    const countResult = await query(countSql, [userId]);

    return res.status(200).json({
      ok: true,
      announcements: result.rows,
      counts: countResult.rows,
      total: result.rows.length,
      filters: { courseId: courseId || null, limit: Number(limit) }
    });
    
  } catch (e) {
    console.error('Debug announcements error:', e);
    return res.status(500).json({ error: 'internal_error', detail: String(e.message || e) });
  }
}
