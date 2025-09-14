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
    
    // Check user's last sync timestamp
    const { rows } = await query(
      'SELECT last_sync FROM user_profile WHERE user_id = $1',
      [userId]
    );
    
    const lastSync = rows[0]?.last_sync || null;
    
    return res.status(200).json({ 
      lastSync: lastSync ? lastSync.toISOString() : null,
      userId 
    });
    
  } catch (error) {
    console.error('Sync status error:', error);
    return res.status(500).json({ error: 'internal_error' });
  }
}
