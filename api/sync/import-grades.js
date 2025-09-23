import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

async function callPaged(baseUrl, cookie, path) {
  const names = ['canvas_session', '_legacy_normandy_session'];
  const out = [];
  let url = `${baseUrl}${path}`;
  for (let page = 0; page < 50 && url; page++) {
    let resp;
    for (const n of names) {
      resp = await fetch(url, { headers: { 'Accept': 'application/json', 'Cookie': `${n}=${cookie}`, 'User-Agent': 'DuNorth-Server/1.0' }, redirect: 'follow' });
      if (resp.ok) break;
      if (![401,403].includes(resp.status)) break;
    }
    if (!resp?.ok) {
      const txt = await resp.text().catch(()=> '');
      if (resp.status === 404 && /disabled for this course/i.test(txt)) return out;
      if (resp.status === 401 || resp.status === 403) return out;
      throw new Error(`Canvas ${resp.status}: ${txt.slice(0,200)}`);
    }
    const data = await resp.json();
    if (Array.isArray(data)) out.push(...data);
    const link = resp.headers.get('Link') || '';
    const m = /<([^>]+)>;\s*rel="next"/.exec(link);
    url = m ? m[1] : null;
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await ensureSchema();

    // Auth
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
    let userId;
    try { userId = jwt.verify(auth.slice(7), JWT_SECRET).userId; } catch { return res.status(401).json({ error: 'Invalid token' }); }

    // Session
    const s = await query(
      `SELECT base_url, session_cookie FROM user_canvas_sessions
       WHERE user_id = $1 ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1`,
      [userId]
    );
    if (!s.rows[0]) return res.status(404).json({ error: 'No stored session' });
    const baseUrl = s.rows[0].base_url; const cookie = s.rows[0].session_cookie;

    // Get courses and assignments for this user
    const c = await query(`SELECT id FROM courses WHERE user_id = $1 LIMIT 1000`, [userId]);
    const a = await query(`SELECT id, course_id FROM assignments WHERE user_id = $1 LIMIT 10000`, [userId]);

    let processed = 0; let insertedNew = 0; let updatedExisting = 0; const details = [];
    // Preload existing grade ids to distinguish new vs update
    const existing = await query(`SELECT id FROM grades WHERE user_id = $1`, [userId]);
    const existingIds = new Set(existing.rows.map(r => Number(r.id)));
    // Track IDs seen in this run to avoid double-counting
    const seenThisRun = new Set();

    // Import grades for each assignment
    for (const assignmentRow of a.rows) {
      const assignmentId = assignmentRow.id;
      const courseId = assignmentRow.course_id;
      
      try {
        // Fetch submissions for this assignment (which contain grades)
        const path = `/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions?per_page=100&include[]=submission_history&include[]=submission_comments&include[]=rubric_assessment`;
        const submissions = await callPaged(baseUrl, cookie, path);
        
        let assignmentProcessed = 0;
        for (const submission of submissions) {
          if (!submission.id) continue;
          
          const submissionId = Number(submission.id);
          
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
          
          if (!seenThisRun.has(submissionId)) {
            processed++;
            assignmentProcessed++;
            if (!existingIds.has(submissionId)) insertedNew++; else updatedExisting++;
            seenThisRun.add(submissionId);
            existingIds.add(submissionId);
          }
        }
        
        if (assignmentProcessed > 0) {
          details.push({ assignmentId, courseId, count: assignmentProcessed });
        }
      } catch (e) {
        details.push({ assignmentId, courseId, error: String(e.message || e) });
      }
    }

    // Also try to get grades from the gradebook API for a more comprehensive view
    for (const row of c.rows) {
      const cid = row.id;
      try {
        const path = `/api/v1/courses/${cid}/students/submissions?per_page=100&include[]=assignment&include[]=submission_history&include[]=submission_comments&include[]=rubric_assessment`;
        const submissions = await callPaged(baseUrl, cookie, path);
        
        let courseProcessed = 0;
        for (const submission of submissions) {
          if (!submission.id) continue;
          
          const submissionId = Number(submission.id);
          
          // Skip if we already processed this submission
          if (seenThisRun.has(submissionId)) continue;
          
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
              submission.assignment_id || null,
              cid,
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
          
          processed++;
          courseProcessed++;
          if (!existingIds.has(submissionId)) insertedNew++; else updatedExisting++;
          seenThisRun.add(submissionId);
          existingIds.add(submissionId);
        }
        
        if (courseProcessed > 0) {
          details.push({ source: 'course_gradebook', courseId: cid, count: courseProcessed });
        }
      } catch (e) {
        details.push({ source: 'course_gradebook', courseId: cid, error: String(e.message || e) });
      }
    }

    return res.status(200).json({ 
      ok: true, 
      processed, 
      insertedNew, 
      updatedExisting, 
      uniqueGradesThisRun: seenThisRun.size, 
      imported: seenThisRun.size, 
      details 
    });
  } catch (e) {
    return res.status(500).json({ error: 'internal_error', detail: String(e.message || e) });
  }
}
