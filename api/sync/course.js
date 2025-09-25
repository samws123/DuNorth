/**
 * Course Content Sync Handler
 * Refactored to use modular handlers for different content types
 */

import { ensureSchema } from '../_lib/ensureSchema.js';
import { authenticateSync } from './utils/auth.js';
import { syncPages, syncSyllabus } from './handlers/pages-handler.js';
import { syncFiles } from './handlers/files-handler.js';
import { syncAnnouncements } from './handlers/announcements-handler.js';

/**
 * Main course content sync handler with modular structure
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

    // Authenticate and get session
    const { userId, baseUrl, cookieValue } = await authenticateSync(req);

    const { courseId } = req.body || {};
    if (!courseId) {
      return res.status(400).json({ error: 'courseId required' });
    }

    // Sync different content types using dedicated handlers
    const [pagesCount, syllabusSync, filesCount, announcementsCount] = await Promise.allSettled([
      syncPages(userId, courseId, baseUrl, cookieValue),
      syncSyllabus(userId, courseId, baseUrl, cookieValue),
      syncFiles(userId, courseId, baseUrl, cookieValue),
      syncAnnouncements(userId, courseId, baseUrl, cookieValue)
    ]);

    // Extract results, defaulting to 0 for failed operations
    const counts = {
      pages: pagesCount.status === 'fulfilled' ? pagesCount.value : 0,
      syllabus: syllabusSync.status === 'fulfilled' ? (syllabusSync.value ? 1 : 0) : 0,
      files: filesCount.status === 'fulfilled' ? filesCount.value : 0,
      announcements: announcementsCount.status === 'fulfilled' ? announcementsCount.value : 0
    };

    // Log any failures
    [pagesCount, syllabusSync, filesCount, announcementsCount].forEach((result, index) => {
      if (result.status === 'rejected') {
        const types = ['pages', 'syllabus', 'files', 'announcements'];
        console.warn(`Failed to sync ${types[index]} for course ${courseId}:`, result.reason);
      }
    });

    return res.status(200).json({ 
      ok: true, 
      courseId, 
      counts 
    });

  } catch (error) {
    console.error('sync/course error', error);
    
    // Handle specific error types
    if (error.message === 'Missing token' || error.message === 'Invalid token') {
      return res.status(401).json({ error: error.message });
    }
    
    if (error.message === 'No stored Canvas session') {
      return res.status(404).json({ error: 'No stored session' });
    }
    
    return res.status(500).json({ 
      ok: false, 
      error: String(error.message || error) 
    });
  }
}


