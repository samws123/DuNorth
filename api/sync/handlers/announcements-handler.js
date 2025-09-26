/**
 * Announcements Handler
 * Handles syncing Canvas announcements
 */

import { callCanvasPaged } from '../utils/canvas-api.js';
import { upsertAnnouncement } from '../utils/database.js';

/**
 * Sync announcements for a course
 * @param {string} userId - User ID
 * @param {number} courseId - Course ID
 * @param {string} baseUrl - Canvas base URL
 * @param {string} cookieValue - Session cookie
 * @returns {Promise<number>} Number of announcements synced
 */
export async function syncAnnouncements(userId, courseId, baseUrl, cookieValue) {
  const announcements = await callCanvasPaged(
    baseUrl, 
    cookieValue, 
    `/api/v1/courses/${courseId}/discussion_topics?only_announcements=true&per_page=100&include[]=all_dates&include[]=submission_types&include[]=rubric`
  );
  
  let syncedCount = 0;
  
  for (const announcement of announcements) {
    // Only process items that are actually announcements
    if (!announcement.is_announcement) continue;
    
    try {
      await upsertAnnouncement(userId, announcement, courseId);
      if (announcement.message) {
        await saveToPinecone(userId, courseId, announcement.id, announcement.message, {
          type: 'announcement',
          title: announcement.title,
          url: announcement.html_url,
          author: announcement.author?.display_name,
        });
      }

      syncedCount++;
    } catch (error) {
      console.warn(`Failed to sync announcement ${announcement.id}:`, error.message);
    }
  }
  
  return syncedCount;
}
