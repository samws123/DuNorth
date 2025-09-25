/**
 * Database Utilities
 * Shared database operations and statistics tracking for sync endpoints
 */

import { query } from '../../_lib/pg.js';

/**
 * Statistics tracker for import operations
 */
export class ImportStats {
  constructor() {
    this.processed = 0;
    this.insertedNew = 0;
    this.updatedExisting = 0;
    this.details = [];
    this.seenThisRun = new Set();
    this.existingIds = new Set();
  }

  /**
   * Initialize with existing IDs from database
   * @param {string} tableName - Database table name
   * @param {string} userId - User ID
   */
  async initializeExisting(tableName, userId) {
    const existing = await query(`SELECT id FROM ${tableName} WHERE user_id = $1`, [userId]);
    this.existingIds = new Set(existing.rows.map(r => Number(r.id)));
  }

  /**
   * Record processing of an item
   * @param {number} itemId - Item ID
   * @returns {boolean} True if this is a new item for this run
   */
  recordItem(itemId) {
    const id = Number(itemId);
    
    if (this.seenThisRun.has(id)) {
      return false; // Already processed in this run
    }
    
    this.processed++;
    this.seenThisRun.add(id);
    
    if (this.existingIds.has(id)) {
      this.updatedExisting++;
    } else {
      this.insertedNew++;
      this.existingIds.add(id);
    }
    
    return true;
  }

  /**
   * Add detail entry for a source/course
   * @param {Object} detail - Detail object
   */
  addDetail(detail) {
    this.details.push(detail);
  }

  /**
   * Get final statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      processed: this.processed,
      insertedNew: this.insertedNew,
      updatedExisting: this.updatedExisting,
      uniqueItemsThisRun: this.seenThisRun.size,
      imported: this.seenThisRun.size, // For backward compatibility
      details: this.details
    };
  }
}

/**
 * Execute upsert operation for courses
 * @param {string} userId - User ID
 * @param {Object} course - Course data
 */
export async function upsertCourse(userId, course) {
  await query(
    `INSERT INTO courses(user_id, id, name, course_code, term, raw_json)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id, id) DO UPDATE
       SET name = EXCLUDED.name,
           course_code = EXCLUDED.course_code,
           term = EXCLUDED.term,
           raw_json = EXCLUDED.raw_json`,
    [userId, course.id, course.name || null, course.course_code || null, course.term || null, course]
  );
}

/**
 * Execute upsert operation for assignments
 * @param {string} userId - User ID
 * @param {Object} assignment - Assignment data
 * @param {number} courseId - Course ID
 */
export async function upsertAssignment(userId, assignment, courseId) {
  await query(
    `INSERT INTO assignments(user_id, id, course_id, name, due_at, description, updated_at, points_possible, submission_types, html_url, workflow_state, raw_json)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (user_id, id) DO UPDATE SET
       name = EXCLUDED.name,
       due_at = EXCLUDED.due_at,
       description = EXCLUDED.description,
       updated_at = EXCLUDED.updated_at,
       points_possible = EXCLUDED.points_possible,
       submission_types = EXCLUDED.submission_types,
       html_url = EXCLUDED.html_url,
       workflow_state = EXCLUDED.workflow_state,
       raw_json = EXCLUDED.raw_json`,
    [
      userId,
      assignment.id,
      courseId,
      assignment.name || null,
      assignment.due_at ? new Date(assignment.due_at) : null,
      assignment.description || null,
      assignment.updated_at ? new Date(assignment.updated_at) : null,
      assignment.points_possible || null,
      Array.isArray(assignment.submission_types) ? assignment.submission_types : (assignment.submission_types ? [assignment.submission_types] : []),
      assignment.html_url || null,
      assignment.published === true ? 'published' : 'unpublished',
      assignment
    ]
  );
}

/**
 * Execute upsert operation for announcements
 * @param {string} userId - User ID
 * @param {Object} announcement - Announcement data
 * @param {number} courseId - Course ID
 */
export async function upsertAnnouncement(userId, announcement, courseId) {
  await query(
    `INSERT INTO announcements(user_id, id, course_id, title, message, posted_at, created_at, last_reply_at, html_url, author_name, author_id, read_state, locked, published, raw_json)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (user_id, id) DO UPDATE SET
       title = EXCLUDED.title,
       message = EXCLUDED.message,
       posted_at = EXCLUDED.posted_at,
       created_at = EXCLUDED.created_at,
       last_reply_at = EXCLUDED.last_reply_at,
       html_url = EXCLUDED.html_url,
       author_name = EXCLUDED.author_name,
       author_id = EXCLUDED.author_id,
       read_state = EXCLUDED.read_state,
       locked = EXCLUDED.locked,
       published = EXCLUDED.published,
       raw_json = EXCLUDED.raw_json`,
    [
      userId,
      announcement.id,
      courseId,
      announcement.title || null,
      announcement.message || null,
      announcement.posted_at ? new Date(announcement.posted_at) : null,
      announcement.created_at ? new Date(announcement.created_at) : null,
      announcement.last_reply_at ? new Date(announcement.last_reply_at) : null,
      announcement.html_url || null,
      announcement.author?.display_name || announcement.user_name || null,
      announcement.author?.id || null,
      announcement.read_state || null,
      announcement.locked || false,
      announcement.published || false,
      announcement
    ]
  );
}

/**
 * Execute upsert operation for grades
 * @param {string} userId - User ID
 * @param {Object} submission - Submission/grade data
 * @param {number} assignmentId - Assignment ID
 * @param {number} courseId - Course ID
 */
export async function upsertGrade(userId, submission, assignmentId, courseId) {
  await query(
    `INSERT INTO grades(user_id, id, assignment_id, course_id, student_id, score, grade, excused, late, missing, submitted_at, graded_at, workflow_state, submission_type, attempt, raw_json)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT (user_id, id) DO UPDATE SET
       assignment_id = EXCLUDED.assignment_id,
       course_id = EXCLUDED.course_id,
       student_id = EXCLUDED.student_id,
       score = EXCLUDED.score,
       grade = EXCLUDED.grade,
       excused = EXCLUDED.excused,
       late = EXCLUDED.late,
       missing = EXCLUDED.missing,
       submitted_at = EXCLUDED.submitted_at,
       graded_at = EXCLUDED.graded_at,
       workflow_state = EXCLUDED.workflow_state,
       submission_type = EXCLUDED.submission_type,
       attempt = EXCLUDED.attempt,
       raw_json = EXCLUDED.raw_json`,
    [
      userId,
      submission.id,
      assignmentId,
      courseId,
      submission.user_id || null,
      submission.score || null,
      submission.grade || null,
      submission.excused || false,
      submission.late || false,
      submission.missing || false,
      submission.submitted_at ? new Date(submission.submitted_at) : null,
      submission.graded_at ? new Date(submission.graded_at) : null,
      submission.workflow_state || null,
      submission.submission_type || null,
      submission.attempt || null,
      submission
    ]
  );
}

/**
 * Get user's courses
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of courses
 * @returns {Promise<Array>} Array of course objects
 */
export async function getUserCourses(userId, limit = 1000) {
  const result = await query(`SELECT id FROM courses WHERE user_id = $1 LIMIT $2`, [userId, limit]);
  return result.rows;
}

/**
 * Get user's assignments
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of assignments
 * @returns {Promise<Array>} Array of assignment objects
 */
export async function getUserAssignments(userId, limit = 10000) {
  const result = await query(`SELECT id, course_id FROM assignments WHERE user_id = $1 LIMIT $2`, [userId, limit]);
  return result.rows;
}
