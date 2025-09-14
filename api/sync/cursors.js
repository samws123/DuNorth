import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
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
    
    const { baseUrl } = req.body || {};
    
    // Get sync cursors for this user
    const { rows } = await query(`
      SELECT endpoint, etag, last_updated_at, last_sync
      FROM sync_cursors 
      WHERE user_id = $1 AND base_url = $2
    `, [userId, baseUrl]);
    
    // Convert to nested object structure
    const cursors = {};
    for (const row of rows) {
      cursors[row.endpoint] = {
        etag: row.etag,
        updated_since: row.last_updated_at?.toISOString(),
        lastSync: row.last_sync?.toISOString()
      };
    }
    
    return res.status(200).json(cursors);
    
  } catch (error) {
    console.error('Sync cursors error:', error);
    return res.status(500).json({ error: 'internal_error' });
  }
}
