import { query } from './_lib/pg.js';
import { ensureSchema } from './_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    await ensureSchema();
    
    // Extract userId from JWT token
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
    
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    const { baseUrl, sessionCookie, userInfo } = req.body || {};
    
    if (!baseUrl || !sessionCookie) {
      return res.status(400).json({ error: 'baseUrl and sessionCookie required' });
    }
    
    console.log(`[Store Session] Storing Canvas session for user ${userId}`);
    console.log(`[Store Session] Base URL: ${baseUrl}`);
    console.log(`[Store Session] Cookie length: ${sessionCookie.length}`);
    console.log(`[Store Session] Canvas user: ${userInfo?.name || 'unknown'}`);
    
    // Store session cookie and Canvas user info
    await query(`
      INSERT INTO user_canvas_sessions(user_id, base_url, session_cookie, canvas_user_id, canvas_name, canvas_email, expires_at, created_at) 
      VALUES($1, $2, $3, $4, $5, $6, $7, NOW()) 
      ON CONFLICT (user_id, base_url) 
      DO UPDATE SET 
        session_cookie = EXCLUDED.session_cookie,
        canvas_user_id = EXCLUDED.canvas_user_id,
        canvas_name = EXCLUDED.canvas_name,
        canvas_email = EXCLUDED.canvas_email,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
    `, [
      userId, 
      baseUrl, 
      sessionCookie,
      userInfo?.id || null,
      userInfo?.name || null,
      userInfo?.email || null,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expires in 30 days
    ]);
    
    console.log(`[Store Session] Successfully stored session for ${userId}`);
    
    return res.status(200).json({ 
      ok: true, 
      message: 'Canvas session stored successfully',
      canvasUser: userInfo?.name || 'Unknown',
      expiresIn: '30 days'
    });
    
  } catch (error) {
    console.error('[Store Session] Error:', error);
    return res.status(500).json({ error: 'Failed to store session' });
  }
}
