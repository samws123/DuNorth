import { query } from '../_lib/pg.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
      const userId = req.query.userId || cookies.dunorth_user;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Query user information from database
    // Note: Using only existing columns (created_at instead of updated_at)
    const result = await query(`
      SELECT 
        id,
        name,
        email,
        created_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Return user data with consistent field names
    res.status(200).json({
      id: user.id,
      canvasUserId: user.canvas_user_id,
      name: user.name,
      email: user.email,
      displayName: user.name || user.email,
      username: user.email?.split('@')[0] || user.name,
      createdAt: user.created_at
    });

  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
