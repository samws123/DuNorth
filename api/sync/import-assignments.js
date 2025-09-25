/**
 * Import Assignments Handler
 * Refactored to use shared utilities and modular structure
 */

import { ensureSchema } from '../_lib/ensureSchema.js';
import { authenticateSync } from './utils/auth.js';
import { callCanvasPaged } from './utils/canvas-api.js';
import { ImportStats, upsertAssignment, getUserCourses } from './utils/database.js';

/**
 * Import assignments from planner and per-course endpoints
 * @param {string} userId - User ID
 * @param {string} baseUrl - Canvas base URL
 * @param {string} cookieValue - Session cookie
 * @returns {Promise<Object>} Import statistics
 */
async function importAssignments(userId, baseUrl, cookieValue) {
  const stats = new ImportStats();
  await stats.initializeExisting('assignments', userId);

  // Get user courses for per-course import
  const courses = await getUserCourses(userId);

  // 1) Fast path: Planner items (captures upcoming assignments quickly)
  try {
    const now = new Date();
    const startISO = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString();
    const endISO = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 120).toISOString();
    
    const plannerItems = await callCanvasPaged(
      baseUrl, 
      cookieValue, 
      `/api/v1/planner/items?per_page=100&start_date=${encodeURIComponent(startISO)}&end_date=${encodeURIComponent(endISO)}`
    );
    
    let plannerProcessed = 0;
    for (const item of plannerItems) {
      if (!item || String(item.plannable_type).toLowerCase() !== 'assignment') continue;
      
      const assignment = item.plannable || {};
      const courseId = item.course_id || item.context_code?.replace('course_', '') || null;
      
      if (!assignment.id || !courseId) continue;
      
      // Convert planner item to assignment format
      const assignmentData = {
        id: assignment.id,
        name: assignment.name || item.title || null,
        due_at: assignment.due_at || item.plannable_date,
        description: assignment.description || item.details || null,
        updated_at: assignment.updated_at,
        points_possible: assignment.points_possible || null,
        submission_types: Array.isArray(assignment.submission_types) ? assignment.submission_types : (assignment.submission_types ? [assignment.submission_types] : []),
        html_url: assignment.html_url || item.html_url || null,
        published: assignment.published === true,
        raw_json: item
      };
      
      await upsertAssignment(userId, assignmentData, Number(courseId));
      
      if (stats.recordItem(assignment.id)) {
        plannerProcessed++;
      }
    }
    
    stats.addDetail({ source: 'planner', count: plannerProcessed });
  } catch (error) {
    stats.addDetail({ source: 'planner', error: String(error.message || error) });
  }

  // 2) Per-course assignments (authoritative)
  for (const course of courses) {
    const courseId = course.id;
    try {
      const assignments = await callCanvasPaged(
        baseUrl, 
        cookieValue, 
        `/api/v1/courses/${courseId}/assignments?per_page=100&include[]=all_dates&include[]=submission_types&include[]=rubric`
      );
      
      let perCourseProcessed = 0;
      for (const assignment of assignments) {
        await upsertAssignment(userId, assignment, courseId);
        
        if (stats.recordItem(assignment.id)) {
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
 * Main assignments import handler with shared utilities
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

    // Import assignments using modular approach
    const stats = await importAssignments(userId, baseUrl, cookieValue);

    return res.status(200).json({ ok: true, ...stats });

  } catch (error) {
    console.error('sync/import-assignments error', error);
    
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


