/**
 * Authentication Utilities
 * Shared authentication and session management for sync endpoints
 */

import { query } from '../../_lib/pg.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Check if a string is a valid UUID
 * @param {string} v - String to check
 * @returns {boolean} True if valid UUID
 */
function isUuid(v) { 
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); 
}

/**
 * Resolve user ID from raw input (UUID or username)
 * @param {string} raw - Raw user identifier
 * @returns {Promise<string>} User ID
 */
export async function resolveUserId(raw) {
  if (isUuid(raw)) return raw;
  
  const email = `${String(raw).replace(/[^a-zA-Z0-9._-]/g,'_')}@local.test`;
  
  const result = await query(
    `INSERT INTO users(email, name) VALUES($1,$2)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [email, 'Cookie Test User']
  );
  
  return result.rows[0].id;
}

/**
 * Authenticate request and extract user ID
 * @param {Object} req - Request object
 * @returns {Promise<string>} User ID
 * @throws {Error} If authentication fails
 */
export async function authenticateRequest(req) {
  const auth = req.headers.authorization || '';
  
  if (!auth.startsWith('Bearer ')) {
    throw new Error('Missing token');
  }
  
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Get the latest Canvas session for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Canvas session data
 * @throws {Error} If no session found
 */
export async function getCanvasSession(userId) {
  const { rows } = await query(
    `SELECT base_url, session_cookie
     FROM user_canvas_sessions
     WHERE user_id = $1
     ORDER BY updated_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [userId]
  );
  
  if (!rows.length) {
    throw new Error('No stored Canvas session');
  }
  
  return {
    baseUrl: rows[0].base_url,
    cookieValue: rows[0].session_cookie
  };
}

/**
 * Complete authentication flow for sync endpoints
 * @param {Object} req - Request object
 * @returns {Promise<Object>} Authentication result with userId, baseUrl, cookieValue
 */
export async function authenticateSync(req) {
  const userId = await authenticateRequest(req);
  const { baseUrl, cookieValue } = await getCanvasSession(userId);
  
  return { userId, baseUrl, cookieValue };
}
