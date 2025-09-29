/**
 * Pages Handler
 * Handles syncing Canvas pages and syllabus content
 */

import { query } from '../../_lib/pg.js';
import { callCanvasPaged, callCanvasAPI } from '../utils/canvas-api.js';
import { cleanText, saveToPinecone } from '../utils/saveToPinecone.js';

/**
 * Sync pages for a course
 * @param {string} userId - User ID
 * @param {number} courseId - Course ID
 * @param {string} baseUrl - Canvas base URL
 * @param {string} cookieValue - Session cookie
 * @returns {Promise<number>} Number of pages synced
 */
export async function syncPages(userId, courseId, baseUrl, cookieValue) {
  // Get page list
  const pages = await callCanvasPaged(baseUrl, cookieValue, `/api/v1/courses/${courseId}/pages?per_page=100`);
  
  let syncedCount = 0;
  
  // Fetch full page content for each page
  for (const page of pages) {
    try {
      const fullPage = await callCanvasAPI(baseUrl, cookieValue, `/api/v1/courses/${courseId}/pages/${page.url}`);
      
      if (fullPage) {
        await query(
          `INSERT INTO pages(user_id, id, course_id, title, url, body, raw_json)
           VALUES($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (user_id, id) DO UPDATE SET 
             title=EXCLUDED.title, 
             url=EXCLUDED.url, 
             body=EXCLUDED.body, 
             raw_json=EXCLUDED.raw_json`,
          [
            userId, 
            fullPage.page_id || fullPage.id, 
            courseId, 
            fullPage.title || null, 
            fullPage.url || null, 
            fullPage.body || null, 
            fullPage
          ]
        );
        if (fullPage.body) {
          const text = cleanText(
            fullPage.body
          );
          await saveToPinecone(
            userId,
            courseId,
            fullPage.page_id || fullPage.id,
            text,
            {
              type: 'page',
              title: fullPage.title,
              url: fullPage.url,
            }
          );
        }
        syncedCount++;
      }
    } catch (error) {
      console.warn(`Failed to sync page ${page.url}:`, error.message);
    }
  }
  
  return syncedCount;
}

/**
 * Sync syllabus content for a course
 * @param {string} userId - User ID
 * @param {number} courseId - Course ID
 * @param {string} baseUrl - Canvas base URL
 * @param {string} cookieValue - Session cookie
 * @returns {Promise<boolean>} True if syllabus was synced
 */
export async function syncSyllabus(userId, courseId, baseUrl, cookieValue) {
  try {
    const courseData = await callCanvasAPI(baseUrl, cookieValue, `/api/v1/courses/${courseId}?include[]=syllabus_body`);
    
    if (courseData?.syllabus_body) {
      const syntheticId = -1 * Number(courseId); // Negative ID for syllabus
      
      await query(
        `INSERT INTO pages(user_id, id, course_id, title, url, body, raw_json)
         VALUES($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (user_id, id) DO UPDATE SET 
           title=EXCLUDED.title, 
           url=EXCLUDED.url, 
           body=EXCLUDED.body, 
           raw_json=EXCLUDED.raw_json`,
        [
          userId, 
          syntheticId, 
          courseId, 
          'Syllabus', 
          'syllabus', 
          courseData.syllabus_body, 
          { source: 'course.syllabus_body' }
        ]
      );
      await saveToPinecone(userId, courseId, syntheticId, courseData.syllabus_body, {
        type: 'syllabus',
        title: 'Syllabus',
        url: 'syllabus',
      });

      return true;
    }
  } catch (error) {
    console.warn(`Failed to sync syllabus for course ${courseId}:`, error.message);
  }
  
  return false;
}
