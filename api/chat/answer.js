/**
 * Chat Answer Handler
 * Main entry point for processing chat queries with modular handlers
 */

import { ensureSchema } from '../_lib/ensureSchema.js';
import { resolveUserId } from './utils/user-management.js';
import { handleCourseQuery } from './handlers/course-handler.js';
import { handleAssignmentQuery, handleAssignmentDueQuery } from './handlers/assignment-handler.js';
import { handleSolveQuery, handleOrdinalFollowUp } from './handlers/solve-handler.js';
import { handleGeneralQuery } from './handlers/general-handler.js';
import { isOrdinalOnlyMessage } from './utils/assignment-selector.js';

/**
 * Main chat handler with improved modular structure
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Response
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId: rawUserId, message } = req.body || {};
  if (!rawUserId || !message) {
    return res.status(400).json({ error: 'userId and message required' });
  }

  await ensureSchema();
  const userId = await resolveUserId(rawUserId);
  const m = message.toLowerCase();

  try {
    // Course listing queries
    if (m.includes('what') && m.includes('my') && (m.includes('class') || m.includes('course') || m.includes('courses') || m.includes('cours'))) {
      const response = await handleCourseQuery(userId);
      return res.status(200).json(response);
    }

    // Assignment listing queries (no date filter)
    if (m.includes('assignment') && !m.includes('due')) {
      const response = await handleAssignmentQuery(message, userId);
      return res.status(200).json(response);
    }

    // Assignment due date queries
    if (m.includes('assignment') && (m.includes('due') || m.includes('overdue') || m.includes('late') || m.includes('today') || m.includes('tomorrow') || m.includes('week') || m.includes('on '))) {
      const response = await handleAssignmentDueQuery(message, userId);
      return res.status(200).json(response);
    }

    // Assignment solving queries
    if ((m.includes('solve') && m.includes('assignment')) || 
        m.includes('do my hw') || 
        m.includes('do my homework') || 
        (m.startsWith('solve ') && (m.includes('first') || m.includes('second') || m.includes('third') || m.includes('1st') || m.includes('2nd') || m.includes('3rd') || m.includes('all')))) {
      const response = await handleSolveQuery(message, userId);
      return res.status(200).json(response);
    }

    // Ordinal-only follow-ups
    if (isOrdinalOnlyMessage(message)) {
      const response = await handleOrdinalFollowUp(message, userId);
      return res.status(200).json(response);
    }

    // General queries
    const response = await handleGeneralQuery(message);
    return res.status(200).json(response);

  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    return res.status(200).json({ role: 'assistant', text: `Server error: ${msg}` });
  }
}


