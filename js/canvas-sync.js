/**
 * Canvas Sync Operations Module
 * Handles importing and syncing Canvas data
 */

import { apiRequest, getUserToken, handleError, isTextFile, getFileExtension, sleep } from './utils/index.js';

// =============================================================================
// IMPORT OPERATIONS
// =============================================================================

/**
 * Import courses from Canvas
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Import result
 */
export async function importCourses(token) {
  try {
    const response = await apiRequest('/api/sync/import-courses', {
      method: 'POST'
    }, token);
    
    return await response.json();
  } catch (error) {
    handleError(error, 'Course import failed');
    throw error;
  }
}

/**
 * Import assignments from Canvas
 * @param {string} token - Auth token
 * @param {boolean} includeGrades - Whether to include grades
 * @returns {Promise<Object>} Import result
 */
export async function importAssignments(token, includeGrades = false) {
  try {
    const body = includeGrades ? JSON.stringify({ includeGrades: true }) : undefined;
    const response = await apiRequest('/api/sync/import-assignments', {
      method: 'POST',
      body
    }, token);
    
    return await response.json();
  } catch (error) {
    handleError(error, 'Assignment import failed');
    throw error;
  }
}

/**
 * Import grades from Canvas
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Import result
 */
export async function importGrades(token) {
  try {
    const response = await apiRequest('/api/sync/import-grades', {
      method: 'POST'
    }, token);
    
    return await response.json();
  } catch (error) {
    handleError(error, 'Grade import failed');
    throw error;
  }
}

/**
 * Import announcements from Canvas
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Import result
 */
export async function importAnnouncements(token) {
  try {
    const response = await apiRequest('/api/sync/import-announcements', {
      method: 'POST'
    }, token);
    
    return await response.json();
  } catch (error) {
    handleError(error, 'Announcement import failed');
    throw error;
  }
}

// =============================================================================
// COURSE SYNC OPERATIONS
// =============================================================================

/**
 * Sync individual course data
 * @param {string} token - Auth token
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Sync result
 */
export async function syncCourse(token, courseId) {
  try {
    const response = await apiRequest('/api/sync/course', {
      method: 'POST',
      body: JSON.stringify({ courseId })
    }, token);
    
    return await response.json();
  } catch (error) {
    handleError(error, `Course sync failed for ${courseId}`);
    throw error;
  }
}

/**
 * Get courses from database
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of courses
 */
export async function getCourses(userId) {
  try {
    const response = await apiRequest(`/api/debug/courses-db?userId=${encodeURIComponent(userId)}`);
    const data = await response.json();
    return Array.isArray(data?.courses) ? data.courses : [];
  } catch (error) {
    handleError(error, 'Failed to get courses');
    return [];
  }
}

// =============================================================================
// TEXT EXTRACTION OPERATIONS
// =============================================================================

/**
 * Extract text from all files in a course (server-side)
 * @param {string} token - Auth token
 * @param {string} courseId - Course ID
 * @param {number} limit - Maximum files to process
 * @param {boolean} force - Force re-extraction
 * @returns {Promise<Object>} Extraction result
 */
export async function extractCourseTexts(token, courseId, limit = 200, force = false) {
  try {
    const response = await apiRequest('/api/sync/extract-all', {
      method: 'POST',
      body: JSON.stringify({ courseId, limit, force })
    }, token);
    
    return await response.json();
  } catch (error) {
    handleError(error, `Text extraction failed for course ${courseId}`);
    throw error;
  }
}

/**
 * Get files from database for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} List of files
 */
export async function getCourseFiles(courseId) {
  try {
    const response = await apiRequest(`/api/debug/files-db?courseId=${courseId}`);
    const data = await response.json();
    return Array.isArray(data?.files) ? data.files : [];
  } catch (error) {
    handleError(error, `Failed to get files for course ${courseId}`);
    return [];
  }
}

/**
 * Client-side text extraction fallback
 * @param {string} courseId - Course ID
 * @param {Function} statusCallback - Callback for status updates
 * @returns {Promise<void>}
 */
export async function clientExtractTexts(courseId, statusCallback = null) {
  const updateStatus = statusCallback || (() => {});
  
  try {
    updateStatus(`🧩 Client extraction fallback: scanning course ${courseId}…`);
    
    const files = await getCourseFiles(courseId);
    updateStatus(`📁 Found ${files.length} total files in course ${courseId}`);
    
    // Filter for text-containing files
    const textFiles = files.filter(file => isTextFile(file.filename));
    updateStatus(`📄 Found ${textFiles.length} text-containing files`);
    
    // Find files that need extraction
    const pendingFiles = textFiles.filter(file => {
      const hasText = file.extracted_text && String(file.extracted_text).trim().length > 0;
      return !hasText;
    });
    
    updateStatus(`🔍 ${pendingFiles.length} files need text extraction`);
    
    if (pendingFiles.length === 0) {
      updateStatus('✅ All text files already have extracted text.');
      return;
    }
    
    // Create hidden iframe for extraction
    const iframe = createExtractionIframe();
    
    try {
      for (const file of pendingFiles) {
        await extractFileText(file, iframe, updateStatus);
      }
    } finally {
      // Clean up iframe
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }
    
    updateStatus('🧩 Client text extraction complete.');
    
  } catch (error) {
    handleError(error, `Client extraction failed for course ${courseId}`);
    throw error;
  }
}

/**
 * Create hidden iframe for text extraction
 * @returns {HTMLIFrameElement} Iframe element
 */
function createExtractionIframe() {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:0;height:0;border:0;position:absolute;left:-9999px;';
  document.body.appendChild(iframe);
  return iframe;
}

/**
 * Extract text from individual file
 * @param {Object} file - File object
 * @param {HTMLIFrameElement} iframe - Extraction iframe
 * @param {Function} statusCallback - Status callback
 * @returns {Promise<void>}
 */
async function extractFileText(file, iframe, statusCallback) {
  const extension = getFileExtension(file.filename);
  statusCallback(`📄 Extracting text from ${extension.toUpperCase()} file ${file.id}…`);
  
  try {
    iframe.src = `/extract.html?fileId=${file.id}`;
    
    // Poll until extraction is complete
    const startTime = Date.now();
    const timeout = 200000; // 200 seconds
    let extracted = false;
    
    while (!extracted && (Date.now() - startTime) < timeout) {
      await sleep(2000);
      
      try {
        const response = await apiRequest(`/api/debug/file-text-raw?fileId=${file.id}`);
        if (response.status === 200) {
          extracted = true;
        }
      } catch (error) {
        // Continue polling on error
      }
    }
    
    const status = extracted 
      ? `✅ Extracted text from ${file.filename}`
      : `⚠️ Timeout extracting ${file.filename}`;
    
    statusCallback(status);
    
  } catch (error) {
    statusCallback(`❌ Extraction error for ${file.filename}: ${error.message}`);
  }
}

// =============================================================================
// COMPREHENSIVE SYNC OPERATIONS
// =============================================================================

/**
 * Perform complete Canvas sync for all user courses
 * @param {string} userId - User ID
 * @param {string} token - Auth token
 * @param {Function} statusCallback - Status update callback
 * @returns {Promise<void>}
 */
export async function performFullSync(userId, token, statusCallback = null) {
  const updateStatus = statusCallback || (() => {});
  
  try {
    // Import all data types
    updateStatus('📥 Importing courses...');
    const courseResult = await importCourses(token);
    if (courseResult?.ok) {
      updateStatus(`📥 Imported ${courseResult.imported} courses from ${courseResult.baseUrl}`);
    }
    
    updateStatus('📝 Importing assignments...');
    const assignmentResult = await importAssignments(token);
    if (assignmentResult?.ok) {
      updateStatus(`📝 Imported ${assignmentResult.imported} assignments.`);
    }
    
    updateStatus('📊 Importing grades...');
    const gradeResult = await importGrades(token);
    if (gradeResult?.ok) {
      updateStatus(`📊 Imported ${gradeResult.imported} grades.`);
    }
    
    updateStatus('📢 Importing announcements...');
    const announcementResult = await importAnnouncements(token);
    if (announcementResult?.ok) {
      updateStatus(`📢 Imported ${announcementResult.imported} announcements.`);
    }
    
    // Get and sync all courses
    const courses = await getCourses(userId);
    
    for (const course of courses) {
      updateStatus(`⏳ Syncing course ${course.id}…`);
      
      try {
        const syncResult = await syncCourse(token, course.id);
        if (syncResult?.ok) {
          const counts = syncResult.counts || {};
          updateStatus(`✅ Synced ${course.id}: ${counts.pages || 0} pages, ${counts.files || 0} files`);
        }
      } catch (error) {
        updateStatus(`❌ Sync ${course.id} failed: ${error.message}`);
      }
      
      // Extract texts
      try {
        updateStatus(`🔍 Starting text extraction for course ${course.id}...`);
        const extractResult = await extractCourseTexts(token, course.id);
        
        if (extractResult?.ok) {
          updateStatus(`🧠 Server extracted ${extractResult.stored} texts in course ${course.id} (processed ${extractResult.processed}).`);
          
          if (extractResult.details && extractResult.details.length > 0) {
            const successful = extractResult.details.filter(d => d.ok).length;
            const failed = extractResult.details.filter(d => d.error).length;
            const skipped = extractResult.details.filter(d => d.skipped).length;
            updateStatus(`📊 Details: ${successful} successful, ${failed} failed, ${skipped} skipped`);
          }
        }
      } catch (error) {
        updateStatus(`❌ Server extract ${course.id} failed: ${error.message}`);
      }
    }
    
    // Client-side extraction fallback
    for (const course of courses) {
      await clientExtractTexts(course.id, updateStatus);
    }
    
    updateStatus('✅ Canvas session stored. Server will sync your data.');
    
  } catch (error) {
    handleError(error, 'Full sync failed');
    throw error;
  }
}
