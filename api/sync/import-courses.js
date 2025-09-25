/**
 * Import Courses Handler
 * Refactored to use shared utilities
 */

import { ensureSchema } from '../_lib/ensureSchema.js';
import { authenticateSync, resolveUserId } from './utils/auth.js';
import { callCanvasPaged } from './utils/canvas-api.js';
import { upsertCourse } from './utils/database.js';

/**
 * Main courses import handler with shared utilities
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Response
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await ensureSchema();

    // Authenticate and get session (with user ID resolution for backward compatibility)
    const { userId: rawUserId, baseUrl, cookieValue } = await authenticateSync(req);
    const userId = await resolveUserId(rawUserId);

    // Fetch courses from Canvas
    const courses = await callCanvasPaged(baseUrl, cookieValue, '/api/v1/courses?enrollment_state=active&per_page=100');

    // Import courses using shared database utility
    let imported = 0;
    for (const course of courses) {
      await upsertCourse(userId, course);
      imported++;
    }

    return res.status(200).json({ 
      ok: true, 
      baseUrl, 
      imported, 
      total: courses.length 
    });

  } catch (error) {
    console.error('sync/import-courses error', error);
    
    // Handle specific error types
    if (error.message === 'Missing token' || error.message === 'Invalid token') {
      return res.status(401).json({ error: error.message });
    }
    
    if (error.message === 'No stored Canvas session') {
      return res.status(404).json({ error: 'No stored session' });
    }
    
    return res.status(500).json({ 
      error: 'internal_error', 
      detail: String(error.message || error) 
    });
  }
}
