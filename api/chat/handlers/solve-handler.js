/**
 * Assignment Solving Handler
 * Handles assignment solving queries with RAG context
 */

import { query } from '../../_lib/pg.js';
import { toDocumentStyle } from '../utils/text-formatting.js';
import { parseCourseFilter } from '../utils/course-parser.js';
import { parseOrdinalSelectors, parseFollowUpOrdinals } from '../utils/assignment-selector.js';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Build context chunks for RAG from assignments and related materials
 * @param {Array} assignments - Assignment objects
 * @param {Array} pages - Page objects
 * @param {Array} files - File objects
 * @returns {Array} Context chunks
 */
function buildContextChunks(assignments, pages, files) {
  const contextChunks = [];
  
  // Add assignment details
  for (const a of assignments) {
    contextChunks.push(`Assignment: ${a.name}${a.due_at ? ` (due ${new Date(a.due_at).toLocaleDateString()})` : ''}${a.points_possible ? ` — ${a.points_possible} pts` : ''}`);
    if (a.description) contextChunks.push(`Description:\n${a.description}`);
    if (a.html_url) contextChunks.push(`Link: ${a.html_url}`);
  }
  
  // Add page content
  for (const p of pages) {
    if (p?.title) contextChunks.push(`Page: ${p.title}`);
    if (p?.body) contextChunks.push(String(p.body).slice(0, 2000));
  }
  
  // Add file content
  for (const f of files) {
    if (f?.filename) contextChunks.push(`File: ${f.filename}`);
    if (f?.extracted_text) contextChunks.push(String(f.extracted_text).slice(0, 2000));
  }
  
  return contextChunks;
}

/**
 * Generate RAG prompt for assignment solving
 * @param {Array} contextChunks - Context chunks
 * @param {string} message - User message
 * @returns {string} RAG prompt
 */
function generateRagPrompt(contextChunks, message) {
  return `You are DuNorth, a rigorous study assistant. Use the provided context to solve the selected assignment(s) with clear reasoning and step-by-step solutions where appropriate. If multiple assignments are selected, answer each separately. Cite which context you used by title when helpful. If information is missing, state assumptions.

STRICT OUTPUT RULES: Plain text only. No Markdown characters (*, _, #). Document style: HEADING lines in ALL CAPS; numbered steps as 1. 2. 3.; hyphen bullets for sub-points.

Context:
${contextChunks.join('\n\n')}

User request: ${message}`;
}

/**
 * Process assignment solving with OpenAI
 * @param {string} ragPrompt - RAG prompt
 * @param {string} userId - User ID
 * @returns {Promise<string>} Generated answer
 */
async function processWithOpenAI(ragPrompt, userId) {
  if (!openai) {
    return 'LLM is disabled. I fetched assignment details; enable OPENAI_API_KEY to solve.';
  }

  const comp = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: ragPrompt }],
    temperature: 0.2,
    max_tokens: 1200
  });

  const answer = toDocumentStyle(comp.choices?.[0]?.message?.content || '');
  
  // Save answer to context
  await query(
    `INSERT INTO chat_context(user_id, last_answer_text, updated_at)
     VALUES($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET last_answer_text = EXCLUDED.last_answer_text, updated_at = NOW()`,
    [userId, answer]
  );

  return answer;
}

/**
 * Handle assignment solving queries
 * @param {string} message - User message
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Response object
 */
export async function handleSolveQuery(message, userId) {
  const m = message.toLowerCase();
  
  // Try to parse course
  let { courseId } = await parseCourseFilter(m, userId);
  
  // Get last list context
  const ctx = await query(`SELECT last_course_id, last_assignment_ids FROM chat_context WHERE user_id = $1`, [userId]);
  const lastCourseId = ctx.rows[0]?.last_course_id || null;
  const lastIds = ctx.rows[0]?.last_assignment_ids || [];
  
  if (!courseId) courseId = lastCourseId || null;

  // If no course filter and no last context, list courses and ask
  if (!courseId && lastIds.length === 0) {
    const { rows } = await query(`SELECT id, name FROM courses WHERE user_id = $1 ORDER BY name ASC LIMIT 50`, [userId]);
    if (rows.length === 0) {
      return { role: 'assistant', text: 'I don\'t see any courses yet. Click "Refresh Canvas" to sync.' };
    }
    
    const opts = rows.map((c, i) => `${i + 1}. ${c.name} (id ${c.id})`).join('\n');
    return { 
      role: 'assistant', 
      text: `Which course? Reply like "course id 12345" or "in ${rows[0].name}".\n\n${opts}` 
    };
  }

  // Parse ordinal selectors
  let targetIds = parseOrdinalSelectors(m, lastIds);

  if (targetIds.length === 0) {
    // List current assignments for the course and ask selection
    const clauses = ["user_id = $1", "(workflow_state IS NULL OR workflow_state = 'published')"];
    const params = [userId];
    let p = 2;
    
    if (courseId) {
      clauses.push(`course_id = $${p++}`);
      params.push(courseId);
    }
    
    const { rows } = await query(
      `SELECT id, name, due_at FROM assignments WHERE ${clauses.join(' AND ')} ORDER BY due_at NULLS LAST, updated_at DESC LIMIT 50`,
      params
    );
    
    if (rows.length === 0) {
      return { 
        role: 'assistant', 
        text: courseId ? `No assignments found for course ${courseId}.` : 'No assignments found.' 
      };
    }
    
    const ids2 = rows.map(r => r.id);
    await query(
      `INSERT INTO chat_context(user_id, last_course_id, last_assignment_ids, updated_at)
       VALUES($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET last_course_id = EXCLUDED.last_course_id, last_assignment_ids = EXCLUDED.last_assignment_ids, updated_at = NOW()`,
      [userId, courseId || null, ids2]
    );
    
    const list = rows.map((r, i) => 
      `${i + 1}. ${r.name}${r.due_at ? ` (due ${new Date(r.due_at).toLocaleDateString()})` : ''}`
    ).join('\n');
    
    return { 
      role: 'assistant', 
      text: toDocumentStyle(`SELECT ASSIGNMENT\n\n${list}\n\nYou can reply: 1, 2, 3 or all`) 
    };
  }

  // Fetch assignment details and related materials
  const { rows: assignments } = await query(
    `SELECT id, name, description, course_id, due_at, points_possible, submission_types, html_url
     FROM assignments WHERE user_id = $1 AND id = ANY($2)`,
    [userId, targetIds]
  );
  
  if (assignments.length === 0) {
    return { role: 'assistant', text: 'I could not find the assignment details. Try syncing and ask again.' };
  }
  
  const courseForRag = courseId || assignments[0].course_id || lastCourseId || null;
  
  // Pull related course content for lightweight RAG
  const [pages, files] = await Promise.all([
    query(`SELECT title, body FROM pages WHERE user_id = $1 AND course_id = $2 ORDER BY id DESC LIMIT 20`, [userId, courseForRag || 0]),
    query(`SELECT filename, extracted_text FROM files WHERE user_id = $1 AND course_id = $2 AND extracted_text IS NOT NULL ORDER BY id DESC LIMIT 20`, [userId, courseForRag || 0])
  ]);

  const contextChunks = buildContextChunks(assignments, pages.rows, files.rows);
  const ragPrompt = generateRagPrompt(contextChunks, message);
  const answer = await processWithOpenAI(ragPrompt, userId);

  return { role: 'assistant', text: answer };
}

/**
 * Handle ordinal follow-up queries
 * @param {string} message - User message
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Response object
 */
export async function handleOrdinalFollowUp(message, userId) {
  // Pull last known list
  const ctx = await query(`SELECT last_course_id, last_assignment_ids FROM chat_context WHERE user_id = $1`, [userId]);
  const lastCourseId = ctx.rows[0]?.last_course_id || null;
  const lastIds = ctx.rows[0]?.last_assignment_ids || [];
  
  if (!lastIds || lastIds.length === 0) {
    return { role: 'assistant', text: 'I don\'t have a recent assignment list. Say "show assignments" first.' };
  }
  
  // Map ordinals
  const targetIds = parseFollowUpOrdinals(message, lastIds);
  
  if (targetIds.length === 0) {
    return { role: 'assistant', text: 'Please say which one: first, second, third, or say "all".' };
  }
  
  // Fetch details
  const { rows: assignments } = await query(
    `SELECT id, name, description, course_id, due_at, points_possible, submission_types, html_url
     FROM assignments WHERE user_id = $1 AND id = ANY($2)`,
    [userId, targetIds]
  );
  
  if (assignments.length === 0) {
    return { role: 'assistant', text: 'I could not find the assignment details. Try syncing and ask again.' };
  }
  
  const courseForRag = assignments[0].course_id || lastCourseId || null;
  
  const [pages, files] = await Promise.all([
    query(`SELECT title, body FROM pages WHERE user_id = $1 AND course_id = $2 ORDER BY id DESC LIMIT 20`, [userId, courseForRag || 0]),
    query(`SELECT filename, extracted_text FROM files WHERE user_id = $1 AND course_id = $2 AND extracted_text IS NOT NULL ORDER BY id DESC LIMIT 20`, [userId, courseForRag || 0])
  ]);
  
  const contextChunks = buildContextChunks(assignments, pages.rows, files.rows);
  const ragPrompt = generateRagPrompt(contextChunks, message);
  const answer = await processWithOpenAI(ragPrompt, userId);

  return { role: 'assistant', text: answer };
}
