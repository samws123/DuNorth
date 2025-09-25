/**
 * Assignment Query Handler
 * Handles assignment-related chat queries
 */

import { query } from '../../_lib/pg.js';
import { formatAssignmentList, toDocumentStyle } from '../utils/text-formatting.js';
import { parseCourseFilter, parseDateFilter } from '../utils/course-parser.js';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Handle assignment listing queries (no date filter)
 * @param {string} message - User message
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Response object
 */
export async function handleAssignmentQuery(message, userId) {
  const { courseId } = await parseCourseFilter(message, userId);
  
  const clauses = ["user_id = $1", "(workflow_state IS NULL OR workflow_state = 'published')"];
  const params = [userId];
  let p = 2;
  
  if (courseId) {
    clauses.push(`course_id = $${p++}`);
    params.push(courseId);
  }
  
  const sql = `SELECT id, name, due_at, course_id, html_url FROM assignments
               WHERE ${clauses.join(' AND ')}
               ORDER BY due_at NULLS LAST, updated_at DESC
               LIMIT 100`;
  
  const { rows } = await query(sql, params);
  
  if (rows.length === 0) {
    return {
      role: 'assistant',
      text: courseId ? `No assignments stored yet for course ${courseId}.` : 'No assignments stored yet. Click "Refresh Canvas".'
    };
  }
  
  // Save last list in chat_context
  const ids = rows.map(r => r.id);
  await query(
    `INSERT INTO chat_context(user_id, last_course_id, last_assignment_ids, updated_at)
     VALUES($1, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE SET last_course_id = EXCLUDED.last_course_id, last_assignment_ids = EXCLUDED.last_assignment_ids, updated_at = NOW()`,
    [userId, courseId || null, ids]
  );
  
  const lines = rows.map((r, i) => 
    `${i + 1}. ${r.name}${r.due_at ? ` — due ${new Date(r.due_at).toLocaleDateString()}` : ''}${r.html_url ? ` — ${r.html_url}` : ''}`
  );
  
  return {
    role: 'assistant',
    text: `${courseId ? `Assignments for course ${courseId}` : 'Assignments'}:\n\n${lines.join('\n')}`
  };
}

/**
 * Handle assignment due date queries
 * @param {string} message - User message
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Response object
 */
export async function handleAssignmentDueQuery(message, userId) {
  const { start, end, timeframe } = parseDateFilter(message);
  const { courseId } = await parseCourseFilter(message, userId);
  
  const clauses = ["user_id = $1", "(workflow_state IS NULL OR workflow_state = 'published')"];
  const params = [userId];
  let p = 2;
  
  if (courseId) {
    clauses.push(`course_id = $${p++}`);
    params.push(courseId);
  }
  
  if (start && end) {
    clauses.push(`due_at >= $${p++} AND due_at < $${p++}`);
    params.push(start, end);
  } else if (end && !start) {
    clauses.push(`due_at IS NOT NULL AND due_at < $${p++}`);
    params.push(end);
  } else {
    const now = new Date();
    clauses.push(`due_at IS NOT NULL AND due_at >= $${p++}`);
    params.push(now);
  }
  
  const { rows } = await query(
    `SELECT id, name, due_at, course_id FROM assignments
     WHERE ${clauses.join(' AND ')}
     ORDER BY due_at ASC
     LIMIT 50`,
    params
  );

  // Use OpenAI for formatting if available and there are results
  if (openai && rows.length > 0) {
    const assignmentList = rows.map(r => 
      `${r.name}${r.due_at ? ` (due ${new Date(r.due_at).toLocaleDateString()})` : ''}`
    ).join('\n');
    
    const prompt = `Format this assignment list ${courseId ? `for course ${courseId} ` : ''}${timeframe}. STRICT: No Markdown characters (no *, _, #). Output in plain text document style with ALL CAPS heading, numbered items like 1. 2. 3., and hyphen bullets. Be concise and include due dates if present.\n\n${assignmentList}`;
    
    const r2 = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 300
    });
    
    const out = toDocumentStyle(r2.choices?.[0]?.message?.content || '');
    return { role: 'assistant', text: out };
  }

  if (rows.length === 0) {
    return { role: 'assistant', text: `No assignments ${timeframe}! 🎉` };
  }
  
  // Save last list in chat_context
  const ids = rows.map(r => r.id);
  await query(
    `INSERT INTO chat_context(user_id, last_course_id, last_assignment_ids, updated_at)
     VALUES($1, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE SET last_course_id = EXCLUDED.last_course_id, last_assignment_ids = EXCLUDED.last_assignment_ids, updated_at = NOW()`,
    [userId, courseId || null, ids]
  );
  
  return { role: 'assistant', text: formatAssignmentList(rows, timeframe) };
}
