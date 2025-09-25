/**
 * Import Announcements Handler
 * Refactored to use shared utilities and modular structure
 */

import { ensureSchema } from '../_lib/ensureSchema.js';
import { authenticateSync } from './utils/auth.js';
import { callCanvasPaged } from './utils/canvas-api.js';
import { ImportStats, upsertAnnouncement, getUserCourses } from './utils/database.js';

/**
 * Import announcements from all user courses
 * @param {string} userId - User ID
 * @param {string} baseUrl - Canvas base URL
 * @param {string} cookieValue - Session cookie
 * @returns {Promise<Object>} Import statistics
 */
async function importAnnouncements(userId, baseUrl, cookieValue) {
  const stats = new ImportStats();
  await stats.initializeExisting('announcements', userId);

  // Get user courses
  const courses = await getUserCourses(userId);

  // Import announcements per course
  for (const course of courses) {
    const courseId = course.id;
    try {
      const announcements = await callCanvasPaged(
        baseUrl, 
        cookieValue, 
        `/api/v1/courses/${courseId}/discussion_topics?only_announcements=true&per_page=100&include[]=all_dates&include[]=submission_types&include[]=rubric`
      );
      
      let perCourseProcessed = 0;
      for (const announcement of announcements) {
        // Only process items that are actually announcements
        if (!announcement.is_announcement) continue;
        
        await upsertAnnouncement(userId, announcement, courseId);
        
        if (stats.recordItem(announcement.id)) {
          perCourseProcessed++;
        }
      }
      
      stats.addDetail({ courseId, count: perCourseProcessed });
    } catch (error) {
      stats.addDetail({ courseId, error: String(error.message || error) });
    }
  }

  return stats.getStats();
}

/**
 * Main announcements import handler with shared utilities
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

    // Import announcements using modular approach
    const stats = await importAnnouncements(userId, baseUrl, cookieValue);

    // Add backward compatibility field
    const response = { 
      ok: true, 
      ...stats,
      uniqueAnnouncementsThisRun: stats.uniqueItemsThisRun
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('sync/import-announcements error', error);
    
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
