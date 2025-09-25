/**
 * Import Grades Handler
 * Refactored to use shared utilities and modular structure
 */

import { ensureSchema } from '../_lib/ensureSchema.js';
import { authenticateSync } from './utils/auth.js';
import { callCanvasPaged } from './utils/canvas-api.js';
import { ImportStats, upsertGrade, getUserCourses, getUserAssignments } from './utils/database.js';

/**
 * Import grades from assignments and course gradebook
 * @param {string} userId - User ID
 * @param {string} baseUrl - Canvas base URL
 * @param {string} cookieValue - Session cookie
 * @returns {Promise<Object>} Import statistics
 */
async function importGrades(userId, baseUrl, cookieValue) {
  const stats = new ImportStats();
  await stats.initializeExisting('grades', userId);

  // Get user assignments and courses
  const assignments = await getUserAssignments(userId);
  const courses = await getUserCourses(userId);

  // 1) Import grades for each assignment
  for (const assignment of assignments) {
    const assignmentId = assignment.id;
    const courseId = assignment.course_id;
    
    try {
      const submissions = await callCanvasPaged(
        baseUrl, 
        cookieValue, 
        `/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions?per_page=100&include[]=submission_history&include[]=submission_comments&include[]=rubric_assessment`
      );
      
      let assignmentProcessed = 0;
      for (const submission of submissions) {
        if (!submission.id) continue;
        
        await upsertGrade(userId, submission, assignmentId, courseId);
        
        if (stats.recordItem(submission.id)) {
          assignmentProcessed++;
        }
      }
      
      if (assignmentProcessed > 0) {
        stats.addDetail({ assignmentId, courseId, count: assignmentProcessed });
      }
    } catch (error) {
      stats.addDetail({ assignmentId, courseId, error: String(error.message || error) });
    }
  }

  // 2) Import grades from course gradebook for comprehensive view
  for (const course of courses) {
    const courseId = course.id;
    try {
      const submissions = await callCanvasPaged(
        baseUrl, 
        cookieValue, 
        `/api/v1/courses/${courseId}/students/submissions?per_page=100&include[]=assignment&include[]=submission_history&include[]=submission_comments&include[]=rubric_assessment`
      );
      
      let courseProcessed = 0;
      for (const submission of submissions) {
        if (!submission.id) continue;
        
        // Skip if we already processed this submission
        if (stats.seenThisRun.has(Number(submission.id))) continue;
        
        await upsertGrade(userId, submission, submission.assignment_id || null, courseId);
        
        if (stats.recordItem(submission.id)) {
          courseProcessed++;
        }
      }
      
      if (courseProcessed > 0) {
        stats.addDetail({ source: 'course_gradebook', courseId, count: courseProcessed });
      }
    } catch (error) {
      stats.addDetail({ source: 'course_gradebook', courseId, error: String(error.message || error) });
    }
  }

  return stats.getStats();
}

/**
 * Main grades import handler with shared utilities
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

    // Import grades using modular approach
    const stats = await importGrades(userId, baseUrl, cookieValue);

    // Add backward compatibility field
    const response = { 
      ok: true, 
      ...stats,
      uniqueGradesThisRun: stats.uniqueItemsThisRun
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('sync/import-grades error', error);
    
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
