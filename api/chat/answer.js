import { query } from '../_lib/pg.js';
import { ensureSchema } from '../_lib/ensureSchema.js';
import OpenAI from 'openai';
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function isUuid(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v); }
async function resolveUserId(raw) {
  if (isUuid(raw)) return raw;
  const email = `${String(raw).replace(/[^a-zA-Z0-9._-]/g,'_')}@local.test`;
  const up = await query(
    `INSERT INTO users(email, name) VALUES($1,$2)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [email, 'Chat Test User']
  );
  return up.rows[0].id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId: rawUserId, message } = req.body || {};
  if (!rawUserId || !message) return res.status(400).json({ error: 'userId and message required' });
  await ensureSchema();
  const userId = await resolveUserId(rawUserId);
  const m = message.toLowerCase();

  if (m.includes('what') && m.includes('my') && m.includes('name')) {
    const r = await query(`SELECT name FROM users WHERE id = $1`, [userId]);
    const name = r.rows[0]?.name || null;
    if (name) return res.status(200).json({ role: 'assistant', text: `Your name on Canvas is ${name}.` });
    return res.status(200).json({ role: 'assistant', text: 'I don\'t have your name yet. Click “Refresh Canvas”.' });
  }

  if (m.includes('what') && m.includes('my') && (m.includes('class') || m.includes('course'))) {
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

  if (m.includes('due') && (m.includes('week') || m.includes('today'))) {
    const now = new Date();
    const end = new Date(now.getTime() + (m.includes('today') ? 1 : 7) * 24 * 60 * 60 * 1000);
    const { rows } = await query(
      `SELECT name, due_at, course_id FROM assignments
       WHERE user_id = $1 AND workflow_state = 'published'
         AND due_at BETWEEN $2 AND $3
       ORDER BY due_at ASC
       LIMIT 50`,
      [userId, now, end]
    );
    
    if (openai && rows.length > 0) {
      const timeframe = m.includes('today') ? 'today' : 'this week';
      const assignmentList = rows.map(r => `${r.name} (due ${new Date(r.due_at).toLocaleDateString()})`).join('\n');
      const prompt = `Format this assignment list for a student asking what's due ${timeframe}. Be helpful and organized:\n\n${assignmentList}`;
      
      const r2 = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300
      });
      return res.status(200).json({ role: 'assistant', text: r2.choices?.[0]?.message?.content || '' });
    }
    
    const timeframe = m.includes('today') ? 'today' : 'this week';
    if (rows.length === 0) {
      return res.status(200).json({ role: 'assistant', text: `No assignments due ${timeframe}! 🎉` });
    }
    const formatted = rows.map((r, i) => `${i + 1}. ${r.name} (due ${new Date(r.due_at).toLocaleDateString()})`).join('\n');
    return res.status(200).json({ role: 'assistant', text: `Assignments due ${timeframe}:\n\n${formatted}` });
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


