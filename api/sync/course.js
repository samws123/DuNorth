/**
 * Course Content Sync Handler
 * Refactored to use modular handlers for different content types
 */

import { ensureSchema } from '../_lib/ensureSchema.js';
import { authenticateSync } from './utils/auth.js';
import { syncPages, syncSyllabus } from './handlers/pages-handler.js';
import { syncFiles } from './handlers/files-handler.js';
import { syncAnnouncements } from './handlers/announcements-handler.js';
import { saveToPinecone } from './utils/saveToPinecone.js';

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

    // --- RAG ingestion: course-level summary + best-effort content indexing ---
    (async function doRagIngestion() {
      try {
        // 1) Course sync summary
        const summaryText = [
          `Course ${courseId} sync summary:`,
          `Pages: ${counts.pages}`,
          `Syllabus: ${counts.syllabus}`,
          `Files: ${counts.files}`,
          `Announcements: ${counts.announcements}`,
          `Synced at: ${new Date().toISOString()}`
        ].join('\n');
        console.log("summaryText: ", summaryText)
        // try {
        //   await saveToPinecone(userId, courseId, `sync-summary-${courseId}`, summaryText, {
        //     type: 'course_sync',
        //     course_id: courseId,
        //     counts,
        //     timestamp: new Date().toISOString()
        //   });
        // } catch (err) {
        //   console.warn('RAG: failed to save sync summary to Pinecone', err);
        // }

        // 2) If syllabus handler returned text, index it as full syllabus
        // if (syllabusSync.status === 'fulfilled') {
        //   const sVal = syllabusSync.value;
        //   if (typeof sVal === 'string' && sVal.trim().length > 0) {
        //     try {
        //       await saveToPinecone(userId, courseId, `syllabus-${courseId}`, sVal, {
        //         type: 'syllabus',
        //         course_id: courseId
        //       });
        //     } catch (err) {
        //       console.warn('RAG: failed to save syllabus to Pinecone', err);
        //     }
        //   }
        // }

        // 3) If pages handler returned an array of pages, best-effort index page bodies
        if (pagesCount.status === 'fulfilled') {
          const pVal = pagesCount.value;
          if (Array.isArray(pVal)) {
            for (const pg of pVal) {
              const text = (pg && (pg.body || pg.content || pg.page_content || pg.text)) || null;
              const docId = pg?.id || pg?.page_id || `${courseId}-page-${Math.random().toString(36).slice(2,8)}`;
              if (text && String(text).trim().length > 0) {
                try {
                  await saveToPinecone(userId, courseId, docId, String(text), {
                    type: 'page',
                    course_id: courseId,
                    title: pg?.title || null,
                    url: pg?.url || null,
                    page_id: pg?.id || pg?.page_id || null
                  });
                } catch (err) {
                  console.warn(`RAG: failed to save page ${docId}`, err);
                }
              }
            }
          }
        }

        // 4) If files handler returned file objects (with extracted_text), index them
        if (filesCount.status === 'fulfilled') {
          const fVal = filesCount.value;
          if (Array.isArray(fVal)) {
            for (const f of fVal) {
              const text = f?.extracted_text || f?.text || f?.content || null;
              const docId = f?.id || f?.file_id || `${courseId}-file-${Math.random().toString(36).slice(2,8)}`;
              if (text && String(text).trim().length > 0) {
                try {
                  await saveToPinecone(userId, courseId, docId, String(text), {
                    type: 'file',
                    course_id: courseId,
                    filename: f?.filename || f?.display_name || null,
                    content_type: f?.content_type || null,
                    file_id: f?.id || f?.file_id || null,
                  });
                } catch (err) {
                  console.warn(`RAG: failed to save file ${docId}`, err);
                }
              }
            }
          }
        }

        // 5) If announcements handler returned announcement objects, index messages
        if (announcementsCount.status === 'fulfilled') {
          const aVal = announcementsCount.value;
          if (Array.isArray(aVal)) {
            for (const ann of aVal) {
              const text = ann?.message || ann?.body || ann?.summary || null;
              const docId = ann?.id || `${courseId}-announcement-${Math.random().toString(36).slice(2,8)}`;
              if (text && String(text).trim().length > 0) {
                try {
                  await saveToPinecone(userId, courseId, docId, String(text), {
                    type: 'announcement',
                    course_id: courseId,
                    title: ann?.title || null,
                    author: ann?.author?.display_name || ann?.user_name || null,
                    announcement_id: ann?.id || null,
                    posted_at: ann?.posted_at || null
                  });
                } catch (err) {
                  console.warn(`RAG: failed to save announcement ${docId}`, err);
                }
              }
            }
          }
        }
      } catch (err) {
        // Keep overall handler successful even if RAG ingestion partially fails
        console.warn('RAG ingestion encountered an error', err);
      }
    })();

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


