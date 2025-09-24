import jwt from 'jsonwebtoken';
import { query } from '../_lib/pg.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT token
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' });
    }

    let userId;
    try {
      const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
      userId = decoded.userId;
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user subscription status
    const result = await query(
      `SELECT 
        subscription_status,
        stripe_customer_id,
        stripe_subscription_id,
        subscription_current_period_start,
        subscription_current_period_end
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      ok: true,
      subscription: {
        status: user.subscription_status || 'inactive',
        customerId: user.stripe_customer_id,
        subscriptionId: user.stripe_subscription_id,
        currentPeriodStart: user.subscription_current_period_start,
        currentPeriodEnd: user.subscription_current_period_end,
        isActive: user.subscription_status === 'active'
      }
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    return res.status(500).json({
      error: 'Failed to get subscription status',
      detail: error.message
    });
  }
}
