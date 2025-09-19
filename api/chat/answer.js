import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import OpenAI from 'openai';
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function toDocumentStyle(text) {
  if (!text) return '';
  let t = String(text);
  // Strip Markdown bold/italic/underline syntax
  t = t.replace(/\*\*(.*?)\*\*/g, '$1');
  t = t.replace(/\*(.*?)\*/g, '$1');
  t = t.replace(/__(.*?)__/g, '$1');
  t = t.replace(/_(.*?)_/g, '$1');
  t = t.replace(/^\s*#+\s*/gm, '');
  // Normalize bullets and numbering
  t = t.replace(/^\s*[•·]\s*/gm, '- ');
  t = t.replace(/^\s*-\s*/gm, '- ');
  t = t.replace(/^\s*(\d+)\)\s+/gm, '$1. ');
  // Ensure headings end the line (ALL CAPS or ends with colon)
  t = t.replace(/^([A-Z0-9 ,&()\-]+:)\s+/gm, '$1\n');
  // Ensure each numbered item title is on its own line
  // If a bullet follows on same line after number, push bullet to next line
  t = t.replace(/^(\s*\d+\.\s+[^\n]+?)\s+-\s+/gm, '$1\n- ');
  // If multiple sentences on a numbered line, keep as is but ensure a newline before next bullet/number
  t = t.replace(/(\n\s*\d+\.\s+[^\n]+)(\s*)(\n?)(-\s+)/g, '$1\n$4');
  // Collapse extra spaces
  t = t.replace(/[ \t]+$/gm, '');
  return t.trim();
}

function isUuid(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); }
async function resolveUserId(raw) {
  if (isUuid(raw)) return raw;
  const email = `${String(raw).replace(/[^a-zA-Z0-9._-]/g,'_')}@local.test`;
  // Do not overwrite an existing name; only insert if missing
  const existing = await query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existing.rows[0]?.id) return existing.rows[0].id;
  const inserted = await query(
    `INSERT INTO users(email, name) VALUES($1,$2)
     RETURNING id`,
    [email, 'Chat User']
  );
  return inserted.rows[0].id;
}

async function getLatestCanvasSession(userId) {
  const { rows } = await query(
    `SELECT base_url, session_cookie
     FROM user_canvas_sessions
     WHERE user_id = $1
     ORDER BY updated_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function fetchCanvasSelf(baseUrl, cookieValue) {
  const tryNames = ['_legacy_normandy_session', 'canvas_session'];
  for (const name of tryNames) {
    const r = await fetch(`${baseUrl}/api/v1/users/self`, {
      headers: {
        'Accept': 'application/json',
        'Cookie': `${name}=${cookieValue}`,
        'User-Agent': 'DuNorth-Server/1.0'
      },
      redirect: 'follow'
    });
    const ct = r.headers.get('content-type') || '';
    if (r.ok && ct.includes('application/json')) return await r.json();
    if (![401,403].includes(r.status)) {
      const t = await r.text().catch(()=> '');
      throw new Error(`Canvas error ${r.status}: ${t.slice(0,200)}`);
    }
  }
  throw new Error('Unauthorized');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId: rawUserId, message } = req.body || {};
  if (!rawUserId || !message) return res.status(400).json({ error: 'userId and message required' });
  await ensureSchema();
  const userId = await resolveUserId(rawUserId);
  const m = message.toLowerCase();
  try {
  // Helper: parse optional course filter (numeric course id or fuzzy name/code at the end)
  async function parseCourseFilter(text) {
    const idMatch = text.match(/course\s*(?:id\s*)?(\d{3,})/) || text.match(/\bid\s*(\d{3,})\b/);
    if (idMatch) {
      const cid = Number(idMatch[1]);
      if (Number.isFinite(cid)) return { courseId: cid };
    }
    const nameMatch = text.match(/(?:for|in)\s+(?:course|class)?\s*([a-z0-9 .\-]{3,})$/);
    if (nameMatch && nameMatch[1]) {
      const term = `%${nameMatch[1].trim()}%`;
      const r = await query(
        `SELECT id FROM courses WHERE user_id = $1 AND (name ILIKE $2 OR course_code ILIKE $2) ORDER BY name ASC LIMIT 1`,
        [userId, term]
      );
      if (r.rows[0]?.id) return { courseId: r.rows[0].id };
    }
    return {};
  }

  if (m.includes('what') && m.includes('my') && (m.includes('class') || m.includes('course') || m.includes('courses') || m.includes('cours'))) {
    const { rows } = await query(
      `SELECT id, name, course_code FROM courses WHERE user_id = $1 ORDER BY name ASC LIMIT 100`,
      [userId]
    );
    if (rows.length === 0) {
      return res.status(200).json({ role: 'assistant', text: 'I don\'t see any courses yet. Click “Refresh Canvas” to sync.' });
    }
    const lines = rows.map((c, i) => `${i + 1}. ${c.name}${c.course_code ? ` (${c.course_code})` : ''}`);
    return res.status(200).json({ role: 'assistant', text: `Your courses:\n\n${lines.join('\n')}` });
  }

  // List assignments (optionally per course), no date filter
  if (m.includes('assignment') && !m.includes('due')) {
    const { courseId } = await parseCourseFilter(m);
    const clauses = ["user_id = $1", "(workflow_state IS NULL OR workflow_state = 'published')"];
    const params = [userId];
    let p = 2;
    if (courseId) { clauses.push(`course_id = $${p++}`); params.push(courseId); }
    const sql = `SELECT id, name, due_at, course_id, html_url FROM assignments
                 WHERE ${clauses.join(' AND ')}
                 ORDER BY due_at NULLS LAST, updated_at DESC
                 LIMIT 100`;
    const { rows } = await query(sql, params);
    if (rows.length === 0) {
      return res.status(200).json({ role: 'assistant', text: courseId ? `No assignments stored yet for course ${courseId}.` : 'No assignments stored yet. Click “Refresh Canvas”.' });
    }
    // Save last list in chat_context
    const ids = rows.map(r => r.id);
    await query(
      `INSERT INTO chat_context(user_id, last_course_id, last_assignment_ids, updated_at)
       VALUES($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET last_course_id = EXCLUDED.last_course_id, last_assignment_ids = EXCLUDED.last_assignment_ids, updated_at = NOW()`,
      [userId, courseId || null, ids]
    );
    const lines = rows.map((r, i) => `${i + 1}. ${r.name}${r.due_at ? ` — due ${new Date(r.due_at).toLocaleDateString()}` : ''}${r.html_url ? ` — ${r.html_url}` : ''}`);
    return res.status(200).json({ role: 'assistant', text: `${courseId ? `Assignments for course ${courseId}` : 'Assignments'}:\n\n${lines.join('\n')}` });
  }

  // Assignments due: today/this week/on <date>/<weekday>/overdue; optional course filter
  if (m.includes('assignment') && (m.includes('due') || m.includes('overdue') || m.includes('late') || m.includes('today') || m.includes('tomorrow') || m.includes('week') || m.includes('on '))) {
    const now = new Date();
    let start = null; let end = null; let timeframe = 'upcoming';
    if (m.includes('today')) { const s = new Date(now.getFullYear(), now.getMonth(), now.getDate()); start = s; end = new Date(s.getTime() + 86400000); timeframe = 'today'; }
    else if (m.includes('tomorrow')) { const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); start = s; end = new Date(s.getTime() + 86400000); timeframe = 'tomorrow'; }
    else if (m.includes('week')) { const s = new Date(now.getFullYear(), now.getMonth(), now.getDate()); start = s; end = new Date(s.getTime() + 7*86400000); timeframe = 'this week'; }
    else if (m.includes('overdue') || m.includes('late')) { start = null; end = now; timeframe = 'overdue'; }
    const md = m.match(/on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    const md2 = m.match(/on\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (md) {
      const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dowMap = { sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6 };
      const target = dowMap[md[1]]; const cur = base.getDay();
      let delta = (target - cur + 7) % 7; if (delta === 0) delta = 7;
      start = new Date(base.getTime() + delta*86400000); end = new Date(start.getTime() + 86400000); timeframe = 'on that day';
    } else if (md2) {
      const yy = md2[3] ? parseInt(md2[3],10) : now.getFullYear();
      const mm = parseInt(md2[1],10)-1; const dd = parseInt(md2[2],10);
      start = new Date(yy,mm,dd); end = new Date(yy,mm,dd+1); timeframe = 'on that day';
    }
    const { courseId } = await parseCourseFilter(m);
    const clauses = ["user_id = $1", "(workflow_state IS NULL OR workflow_state = 'published')"]; const params = [userId];
    let p = 2;
    if (courseId) { clauses.push(`course_id = $${p++}`); params.push(courseId); }
    if (start && end) { clauses.push(`due_at >= $${p++} AND due_at < $${p++}`); params.push(start, end); }
    else if (end && !start) { clauses.push(`due_at IS NOT NULL AND due_at < $${p++}`); params.push(end); }
    else { clauses.push(`due_at IS NOT NULL AND due_at >= $${p++}`); params.push(now); timeframe = timeframe || 'upcoming'; }
    const { rows } = await query(
      `SELECT id, name, due_at, course_id FROM assignments
       WHERE ${clauses.join(' AND ')}
       ORDER BY due_at ASC
       LIMIT 50`,
      params
    );

    if (openai && rows.length > 0) {
      const assignmentList = rows.map(r => `${r.name}${r.due_at ? ` (due ${new Date(r.due_at).toLocaleDateString()})` : ''}`).join('\n');
      const prompt = `Format this assignment list ${courseId ? `for course ${courseId} ` : ''}${timeframe}. STRICT: No Markdown characters (no *, _, #). Output in plain text document style with ALL CAPS heading, numbered items like 1. 2. 3., and hyphen bullets. Be concise and include due dates if present.\n\n${assignmentList}`;
      const r2 = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300
      });
      const out = toDocumentStyle(r2.choices?.[0]?.message?.content || '');
      return res.status(200).json({ role: 'assistant', text: out });
    }

    if (rows.length === 0) {
      return res.status(200).json({ role: 'assistant', text: `No assignments ${timeframe}! 🎉` });
    }
    // Save last list in chat_context
    const ids = rows.map(r => r.id);
    await query(
      `INSERT INTO chat_context(user_id, last_course_id, last_assignment_ids, updated_at)
       VALUES($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET last_course_id = EXCLUDED.last_course_id, last_assignment_ids = EXCLUDED.last_assignment_ids, updated_at = NOW()`,
      [userId, courseId || null, ids]
    );
    const formatted = rows.map((r, i) => `${i + 1}. ${r.name}${r.due_at ? ` (due ${new Date(r.due_at).toLocaleDateString()})` : ''}`).join('\n');
    return res.status(200).json({ role: 'assistant', text: toDocumentStyle(`ASSIGNMENTS ${timeframe.toUpperCase()}\n\n${formatted}`) });
  }
  
  // Solve intent: "solve assignment", "do my homework", etc.
  if ((m.includes('solve') && m.includes('assignment')) || m.includes('do my hw') || m.includes('do my homework') || (m.startsWith('solve ') && (m.includes('first') || m.includes('second') || m.includes('third') || m.includes('1st') || m.includes('2nd') || m.includes('3rd') || m.includes('all')))) {
    // Try to parse course
    let { courseId } = await parseCourseFilter(m);
    // Get last list context
    const ctx = await query(`SELECT last_course_id, last_assignment_ids FROM chat_context WHERE user_id = $1`, [userId]);
    const lastCourseId = ctx.rows[0]?.last_course_id || null;
    const lastIds = ctx.rows[0]?.last_assignment_ids || [];
    if (!courseId) courseId = lastCourseId || null;

    // If no course filter and no last context, list courses and ask
    if (!courseId && lastIds.length === 0) {
      const { rows } = await query(`SELECT id, name FROM courses WHERE user_id = $1 ORDER BY name ASC LIMIT 50`, [userId]);
      if (rows.length === 0) return res.status(200).json({ role: 'assistant', text: 'I don\'t see any courses yet. Click “Refresh Canvas” to sync.' });
      const opts = rows.map((c, i) => `${i + 1}. ${c.name} (id ${c.id})`).join('\n');
      return res.status(200).json({ role: 'assistant', text: `Which course? Reply like "course id 12345" or "in ${rows[0].name}".\n\n${opts}` });
    }

    // If the user asked for first/second/… or all, map using last list; otherwise, (re)list assignments for the course
    let targetIds = [];
    const ordinalMap = [
      { re: /(first|1st|one|#?1)\b/, index: 0 },
      { re: /(second|2nd|two|#?2)\b/, index: 1 },
      { re: /(third|3rd|three|#?3)\b/, index: 2 },
      { re: /(fourth|4th|four|#?4)\b/, index: 3 },
      { re: /(fifth|5th|five|#?5)\b/, index: 4 }
    ];
    const allRequested = /\ball\b|\ball of them\b/.test(m);
    const anyOrdinal = ordinalMap.find(o => o.re.test(m));
    if ((allRequested || anyOrdinal) && lastIds.length > 0) {
      if (allRequested) targetIds = lastIds;
      else if (anyOrdinal && lastIds[anyOrdinal.index] != null) targetIds = [lastIds[anyOrdinal.index]];
    }

    if (targetIds.length === 0) {
      // List current assignments for the course and ask selection
      const clauses = ["user_id = $1", "(workflow_state IS NULL OR workflow_state = 'published')"]; const params = [userId];
      let p = 2;
      if (courseId) { clauses.push(`course_id = $${p++}`); params.push(courseId); }
      const { rows } = await query(
        `SELECT id, name, due_at FROM assignments WHERE ${clauses.join(' AND ')} ORDER BY due_at NULLS LAST, updated_at DESC LIMIT 50`,
        params
      );
      if (rows.length === 0) {
        return res.status(200).json({ role: 'assistant', text: courseId ? `No assignments found for course ${courseId}.` : 'No assignments found.' });
      }
      const ids2 = rows.map(r => r.id);
      await query(
        `INSERT INTO chat_context(user_id, last_course_id, last_assignment_ids, updated_at)
         VALUES($1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET last_course_id = EXCLUDED.last_course_id, last_assignment_ids = EXCLUDED.last_assignment_ids, updated_at = NOW()`,
        [userId, courseId || null, ids2]
      );
      const list = rows.map((r, i) => `${i + 1}. ${r.name}${r.due_at ? ` (due ${new Date(r.due_at).toLocaleDateString()})` : ''}`).join('\n');
      return res.status(200).json({ role: 'assistant', text: toDocumentStyle(`SELECT ASSIGNMENT\n\n${list}\n\nYou can reply: 1, 2, 3 or all`) });
    }

    // Fetch details and related materials for targetIds
    const { rows: assignments } = await query(
      `SELECT id, name, description, course_id, due_at, points_possible, submission_types, html_url
       FROM assignments WHERE user_id = $1 AND id = ANY($2)`,
      [userId, targetIds]
    );
    if (assignments.length === 0) {
      return res.status(200).json({ role: 'assistant', text: 'I could not find the assignment details. Try syncing and ask again.' });
    }
    const courseForRag = courseId || assignments[0].course_id || lastCourseId || null;
    // Pull related course content for lightweight RAG
    const [pages, files] = await Promise.all([
      query(`SELECT title, body FROM pages WHERE user_id = $1 AND course_id = $2 ORDER BY id DESC LIMIT 20`, [userId, courseForRag || 0]),
      query(`SELECT filename, extracted_text FROM files WHERE user_id = $1 AND course_id = $2 AND extracted_text IS NOT NULL ORDER BY id DESC LIMIT 20`, [userId, courseForRag || 0])
    ]);

    const contextChunks = [];
    for (const a of assignments) {
      contextChunks.push(`Assignment: ${a.name}${a.due_at ? ` (due ${new Date(a.due_at).toLocaleDateString()})` : ''}${a.points_possible ? ` — ${a.points_possible} pts` : ''}`);
      if (a.description) contextChunks.push(`Description:\n${a.description}`);
      if (a.html_url) contextChunks.push(`Link: ${a.html_url}`);
    }
    for (const p of pages.rows) {
      if (p?.title) contextChunks.push(`Page: ${p.title}`);
      if (p?.body) contextChunks.push(String(p.body).slice(0, 2000));
    }
    for (const f of files.rows) {
      if (f?.filename) contextChunks.push(`File: ${f.filename}`);
      if (f?.extracted_text) contextChunks.push(String(f.extracted_text).slice(0, 2000));
    }

    const ragPrompt = `You are DuNorth, a rigorous study assistant. Use the provided context to solve the selected assignment(s) with clear reasoning and step-by-step solutions where appropriate. If multiple assignments are selected, answer each separately. Cite which context you used by title when helpful. If information is missing, state assumptions.

STRICT OUTPUT RULES: Plain text only. No Markdown characters (*, _, #). Document style: HEADING lines in ALL CAPS; numbered steps as 1. 2. 3.; hyphen bullets for sub-points.

Context:\n${contextChunks.join('\n\n')}\n\nUser request: ${message}`;

    if (!openai) {
      return res.status(200).json({ role: 'assistant', text: 'LLM is disabled. I fetched assignment details; enable OPENAI_API_KEY to solve.' });
    }

    const comp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: ragPrompt }],
      temperature: 0.2,
      max_tokens: 1200
    });
    const answer = toDocumentStyle(comp.choices?.[0]?.message?.content || '');
    await query(
      `INSERT INTO chat_context(user_id, last_answer_text, updated_at)
       VALUES($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET last_answer_text = EXCLUDED.last_answer_text, updated_at = NOW()`,
      [userId, answer]
    );
    return res.status(200).json({ role: 'assistant', text: answer });
  }

  // Ordinal-only follow-ups like "first", "second", "all" should solve using last list
  if (/\b(first|1st|1|second|2nd|2|third|3rd|3|fourth|4th|4|fifth|5th|5|all)\b/.test(m)) {
    // Pull last known list
    const ctx = await query(`SELECT last_course_id, last_assignment_ids FROM chat_context WHERE user_id = $1`, [userId]);
    const lastCourseId = ctx.rows[0]?.last_course_id || null;
    const lastIds = ctx.rows[0]?.last_assignment_ids || [];
    if (!lastIds || lastIds.length === 0) {
      return res.status(200).json({ role: 'assistant', text: 'I don\'t have a recent assignment list. Say "show assignments" first.' });
    }
    // Map ordinals
    let targetIds = [];
    const allRequested = /\ball\b/.test(m);
    if (allRequested) {
      targetIds = lastIds;
    } else {
      const ordinalMap = [
        { re: /(first|1st|\b1\b)/, index: 0 },
        { re: /(second|2nd|\b2\b)/, index: 1 },
        { re: /(third|3rd|\b3\b)/, index: 2 },
        { re: /(fourth|4th|\b4\b)/, index: 3 },
        { re: /(fifth|5th|\b5\b)/, index: 4 }
      ];
      const anyOrdinal = ordinalMap.find(o => o.re.test(m));
      if (anyOrdinal && lastIds[anyOrdinal.index] != null) targetIds = [lastIds[anyOrdinal.index]];
    }
    if (targetIds.length === 0) {
      return res.status(200).json({ role: 'assistant', text: 'Please say which one: first, second, third, or say "all".' });
    }
    // Fetch details
    const { rows: assignments } = await query(
      `SELECT id, name, description, course_id, due_at, points_possible, submission_types, html_url
       FROM assignments WHERE user_id = $1 AND id = ANY($2)`,
      [userId, targetIds]
    );
    if (assignments.length === 0) {
      return res.status(200).json({ role: 'assistant', text: 'I could not find the assignment details. Try syncing and ask again.' });
    }
    const courseForRag = assignments[0].course_id || lastCourseId || null;
    const [pages, files] = await Promise.all([
      query(`SELECT title, body FROM pages WHERE user_id = $1 AND course_id = $2 ORDER BY id DESC LIMIT 20`, [userId, courseForRag || 0]),
      query(`SELECT filename, extracted_text FROM files WHERE user_id = $1 AND course_id = $2 AND extracted_text IS NOT NULL ORDER BY id DESC LIMIT 20`, [userId, courseForRag || 0])
    ]);
    const contextChunks = [];
    for (const a of assignments) {
      contextChunks.push(`Assignment: ${a.name}${a.due_at ? ` (due ${new Date(a.due_at).toLocaleDateString()})` : ''}${a.points_possible ? ` — ${a.points_possible} pts` : ''}`);
      if (a.description) contextChunks.push(`Description:\n${a.description}`);
      if (a.html_url) contextChunks.push(`Link: ${a.html_url}`);
    }
    for (const p of pages.rows) {
      if (p?.title) contextChunks.push(`Page: ${p.title}`);
      if (p?.body) contextChunks.push(String(p.body).slice(0, 2000));
    }
    for (const f of files.rows) {
      if (f?.filename) contextChunks.push(`File: ${f.filename}`);
      if (f?.extracted_text) contextChunks.push(String(f.extracted_text).slice(0, 2000));
    }
    const ragPrompt = `You are DuNorth, a rigorous study assistant. Use the provided context to solve the selected assignment(s) with clear reasoning and step-by-step solutions where appropriate. If multiple assignments are selected, answer each separately. Cite which context you used by title when helpful. If information is missing, state assumptions.\n\nSTRICT OUTPUT RULES: Plain text only. No Markdown characters (*, _, #). Document style: HEADING lines in ALL CAPS; numbered steps as 1. 2. 3.; hyphen bullets for sub-points.\n\nContext:\n${contextChunks.join('\n\n')}\n\nUser request: ${message}`;
    if (!openai) {
      return res.status(200).json({ role: 'assistant', text: 'LLM is disabled. I fetched assignment details; enable OPENAI_API_KEY to solve.' });
    }
    const comp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: ragPrompt }],
      temperature: 0.2,
      max_tokens: 1200
    });
    const answer = toDocumentStyle(comp.choices?.[0]?.message?.content || '');
    await query(
      `INSERT INTO chat_context(user_id, last_answer_text, updated_at)
       VALUES($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET last_answer_text = EXCLUDED.last_answer_text, updated_at = NOW()`,
      [userId, answer]
    );
    return res.status(200).json({ role: 'assistant', text: answer });
  }
  if (openai) {
    const prompt = `You are DuNorth, a helpful study assistant.
Provide answers in document style (no Markdown):
HEADING lines in ALL CAPS, numbered steps as 1. 2. 3., and hyphen bullets for sub-points.
Solve the following problem completely, step by step if needed.
User: ${message}`;
  
    const r = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,   // a bit more creative
      max_tokens: 1000    // allow longer answers
    });
  
    return res.status(200).json({ role: 'assistant', text: toDocumentStyle(r.choices?.[0]?.message?.content || '') });
  }
  
  return res.status(200).json({ role: 'assistant', text: 'Ask about assignments due; LLM disabled in demo.' });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    return res.status(200).json({ role: 'assistant', text: `Server error: ${msg}` });
  }
}


