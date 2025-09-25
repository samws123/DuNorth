/**
 * Course Query Handler
 * Handles course-related chat queries
 */

import { query } from '../../_lib/pg.js';
import { formatCourseList } from '../utils/text-formatting.js';

/**
 * Handle course listing queries
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Response object
 */
export async function handleCourseQuery(userId) {
  const { rows } = await query(
    `SELECT id, name, course_code FROM courses WHERE user_id = $1 ORDER BY name ASC LIMIT 100`,
    [userId]
  );

  return {
    role: 'assistant',
    text: formatCourseList(rows)
  };
}
