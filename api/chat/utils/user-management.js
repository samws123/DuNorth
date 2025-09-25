/**
 * User Management Utilities
 * Handles user identification and Canvas session management
 */

import { query } from '../../_lib/pg.js';

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
  
  // Do not overwrite an existing name; only insert if missing
  const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing.rows[0]?.id) return existing.rows[0].id;
  
  const inserted = await query(
    `INSERT INTO users(email, name) VALUES($1,$2) RETURNING id`,
    [email, 'Chat User']
  );
  
  return inserted.rows[0].id;
}

/**
 * Get the latest Canvas session for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Canvas session data or null
 */
export async function getLatestCanvasSession(userId) {
  const { rows } = await query(
    `SELECT base_url, session_cookie
     FROM user_canvas_sessions
     WHERE user_id = $1
     ORDER BY updated_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [userId]
  );
  
  return rows[0] || null;
}

/**
 * Fetch Canvas user self information
 * @param {string} baseUrl - Canvas base URL
 * @param {string} cookieValue - Session cookie value
 * @returns {Promise<Object>} Canvas user data
 */
export async function fetchCanvasSelf(baseUrl, cookieValue) {
  const tryNames = ['_legacy_normandy_session', 'canvas_session'];
  
  for (const name of tryNames) {
    const r = await fetch(`${baseUrl}/api/v1/users/self`, {
      headers: {
        'Accept': 'application/json',
        'Cookie': `${name}=${cookieValue}`,
        'User-Agent': 'DuNorth-Server/1.0'
      },
      redirect: 'follow'
    });
    
    const ct = r.headers.get('content-type') || '';
    if (r.ok && ct.includes('application/json')) return await r.json();
    
    if (![401,403].includes(r.status)) {
      const t = await r.text().catch(()=> '');
      throw new Error(`Canvas error ${r.status}: ${t.slice(0,200)}`);
    }
  }
  
  throw new Error('Unauthorized');
}
