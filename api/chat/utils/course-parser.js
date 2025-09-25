/**
 * Course Parsing Utilities
 * Handles parsing course filters from user messages
 */

import { query } from '../../_lib/pg.js';

/**
 * Parse optional course filter from user message
 * @param {string} text - User message text
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Course filter object with courseId if found
 */
export async function parseCourseFilter(text, userId) {
  // Try to match numeric course ID
  const idMatch = text.match(/course\s*(?:id\s*)?(\d{3,})/) || text.match(/\bid\s*(\d{3,})\b/);
  if (idMatch) {
    const cid = Number(idMatch[1]);
    if (Number.isFinite(cid)) return { courseId: cid };
  }
  
  // Try to match course name or code
  const nameMatch = text.match(/(?:for|in)\s+(?:course|class)?\s*([a-z0-9 .\-]{3,})$/);
  if (nameMatch && nameMatch[1]) {
    const term = `%${nameMatch[1].trim()}%`;
    const r = await query(
      `SELECT id FROM courses WHERE user_id = $1 AND (name ILIKE $2 OR course_code ILIKE $2) ORDER BY name ASC LIMIT 1`,
      [userId, term]
    );
    if (r.rows[0]?.id) return { courseId: r.rows[0].id };
  }
  
  return {};
}

/**
 * Parse date/time filters from user message
 * @param {string} message - User message
 * @returns {Object} Date filter object with start, end, and timeframe
 */
export function parseDateFilter(message) {
  const m = message.toLowerCase();
  const now = new Date();
  let start = null;
  let end = null;
  let timeframe = 'upcoming';

  if (m.includes('today')) {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start = s;
    end = new Date(s.getTime() + 86400000);
    timeframe = 'today';
  } else if (m.includes('tomorrow')) {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    start = s;
    end = new Date(s.getTime() + 86400000);
    timeframe = 'tomorrow';
  } else if (m.includes('week')) {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start = s;
    end = new Date(s.getTime() + 7 * 86400000);
    timeframe = 'this week';
  } else if (m.includes('overdue') || m.includes('late')) {
    start = null;
    end = now;
    timeframe = 'overdue';
  }

  // Check for specific weekday
  const weekdayMatch = m.match(/on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (weekdayMatch) {
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dowMap = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
    const target = dowMap[weekdayMatch[1]];
    const cur = base.getDay();
    let delta = (target - cur + 7) % 7;
    if (delta === 0) delta = 7;
    start = new Date(base.getTime() + delta * 86400000);
    end = new Date(start.getTime() + 86400000);
    timeframe = 'on that day';
  }

  // Check for specific date (MM/DD or MM/DD/YYYY)
  const dateMatch = m.match(/on\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dateMatch) {
    const yy = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();
    const mm = parseInt(dateMatch[1], 10) - 1;
    const dd = parseInt(dateMatch[2], 10);
    start = new Date(yy, mm, dd);
    end = new Date(yy, mm, dd + 1);
    timeframe = 'on that day';
  }

  return { start, end, timeframe };
}
