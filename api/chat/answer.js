import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import OpenAI from 'openai';
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

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
    const sql = `SELECT name, due_at, course_id, html_url FROM assignments
                 WHERE ${clauses.join(' AND ')}
                 ORDER BY due_at NULLS LAST, updated_at DESC
                 LIMIT 100`;
    const { rows } = await query(sql, params);
    if (rows.length === 0) {
      return res.status(200).json({ role: 'assistant', text: courseId ? `No assignments stored yet for course ${courseId}.` : 'No assignments stored yet. Click “Refresh Canvas”.' });
    }
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
      `SELECT name, due_at, course_id FROM assignments
       WHERE ${clauses.join(' AND ')}
       ORDER BY due_at ASC
       LIMIT 50`,
      params
    );

    if (openai && rows.length > 0) {
      const assignmentList = rows.map(r => `${r.name}${r.due_at ? ` (due ${new Date(r.due_at).toLocaleDateString()})` : ''}`).join('\n');
      const prompt = `Format this assignment list ${courseId ? `for course ${courseId} ` : ''}${timeframe}. Be concise, bullet the items, include due dates if present.\n\n${assignmentList}`;
      const r2 = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300
      });
      return res.status(200).json({ role: 'assistant', text: r2.choices?.[0]?.message?.content || '' });
    }

    if (rows.length === 0) {
      return res.status(200).json({ role: 'assistant', text: `No assignments ${timeframe}! 🎉` });
    }
    const formatted = rows.map((r, i) => `${i + 1}. ${r.name}${r.due_at ? ` (due ${new Date(r.due_at).toLocaleDateString()})` : ''}`).join('\n');
    return res.status(200).json({ role: 'assistant', text: `Assignments ${timeframe}:\n\n${formatted}` });
  }

  if (openai) {
    const prompt = `You are DuNorth, a helpful study assistant. Answer briefly. User: ${message}`;
    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 250
    });
    return res.status(200).json({ role: 'assistant', text: r.choices?.[0]?.message?.content || '' });
  }
  return res.status(200).json({ role: 'assistant', text: 'Ask about assignments due; LLM disabled in demo.' });
}


