/**
 * Files Handler
 * Handles syncing Canvas files with text extraction
 */

import { query } from '../../_lib/pg.js';
import { callCanvasPaged, callCanvasAPI, fetchCanvasFile } from '../utils/canvas-api.js';
import { cleanText, saveToPinecone } from '../utils/saveToPinecone.js';

/**
 * Sync files for a course
 * @param {string} userId - User ID
 * @param {number} courseId - Course ID
 * @param {string} baseUrl - Canvas base URL
 * @param {string} cookieValue - Session cookie
 * @returns {Promise<number>} Number of files synced
 */
export async function syncFiles(userId, courseId, baseUrl, cookieValue) {
  const files = await callCanvasPaged(baseUrl, cookieValue, `/api/v1/courses/${courseId}/files?per_page=100`);
  
  let syncedCount = 0;
  
  // Load PDF parser lazily so the route still works if the module isn't present
  let extractTextUniversal;
  try {
    const extractModule = await import('../../_lib/extractText.js');
    extractTextUniversal = extractModule.extractTextUniversal;
  } catch (error) {
    console.warn('Text extraction module not available:', error.message);
  }
  
  for (const file of files) {
    try {
      // Get public URL for the file
      const publicUrl = await getFilePublicUrl(baseUrl, cookieValue, file.id);
      
      // Extract text content if possible
      let extractedText = null;
      if (publicUrl && extractTextUniversal) {
        extractedText = await extractFileText(publicUrl, file, extractTextUniversal);
      }
      
      // Save file metadata
      await query(
        `INSERT INTO files(user_id, id, course_id, filename, content_type, size, download_url, public_download_url, raw_json)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (user_id, id) DO UPDATE SET 
           filename=EXCLUDED.filename, 
           content_type=EXCLUDED.content_type, 
           size=EXCLUDED.size, 
           download_url=EXCLUDED.download_url, 
           public_download_url=EXCLUDED.public_download_url, 
           raw_json=EXCLUDED.raw_json`,
        [
          userId, 
          file.id, 
          courseId, 
          file.display_name || file.filename || null, 
          file.content_type || null, 
          file.size || null, 
          file.url || null, 
          publicUrl, 
          file
        ]
      );
      
      // Update with extracted text if available
      if (extractedText) {
        await query(
          `UPDATE files SET extracted_text = $1 WHERE user_id = $2 AND id = $3`, 
          [extractedText, userId, file.id]
        );
      }
      const text = cleanText(
        extractedText
      );
      await saveToPinecone(userId, courseId, file.id, text, {
        type: 'file',
        filename: file.display_name || file.filename,
        contentType: file.content_type,
      });

      
      syncedCount++;
    } catch (error) {
      console.warn(`Failed to sync file ${file.id}:`, error.message);
    }
  }
  
  return syncedCount;
}

/**
 * Get public URL for a Canvas file
 * @param {string} baseUrl - Canvas base URL
 * @param {string} cookieValue - Session cookie
 * @param {number} fileId - File ID
 * @returns {Promise<string|null>} Public URL or null
 */
async function getFilePublicUrl(baseUrl, cookieValue, fileId) {
  try {
    const response = await callCanvasAPI(baseUrl, cookieValue, `/api/v1/files/${fileId}/public_url`);
    return response?.public_url || null;
  } catch (error) {
    console.warn(`Failed to get public URL for file ${fileId}:`, error.message);
    return null;
  }
}

/**
 * Extract text from file content
 * @param {string} publicUrl - File public URL
 * @param {Object} file - File metadata
 * @param {Function} extractTextUniversal - Text extraction function
 * @returns {Promise<string|null>} Extracted text or null
 */
async function extractFileText(publicUrl, file, extractTextUniversal) {
  try {
    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    const MAX_TEXT_LENGTH = 2_000_000; // 2M characters
    
    // Check if file might contain extractable text
    const isPdf = (file.content_type || '').includes('pdf') || 
                  String(file.display_name || file.filename || '').toLowerCase().endsWith('.pdf');
    
    if (!isPdf) return null; // Only extract from PDFs for now
    
    const buffer = await fetchCanvasFile(publicUrl, { maxSize: MAX_FILE_SIZE });
    if (!buffer) return null;
    
    const text = await extractTextUniversal(
      buffer, 
      file.display_name || file.filename || '', 
      file.content_type || ''
    );
    
    return text ? String(text).trim().slice(0, MAX_TEXT_LENGTH) : null;
  } catch (error) {
    console.warn(`Failed to extract text from file:`, error.message);
    return null;
  }
}
