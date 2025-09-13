import { getDb } from '../_lib/mongo.js';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId, message } = req.body || {};
  if (!userId || !message) return res.status(400).json({ error: 'userId and message required' });
  const db = await getDb();

  // Simple rule routing
  const m = message.toLowerCase();
  if (m.includes('due') && (m.includes('week') || m.includes('today'))) {
    const now = new Date();
    const end = new Date(now.getTime() + (m.includes('today') ? 1 : 7) * 24 * 60 * 60 * 1000);
    const assignments = await db.collection('assignments').find({
      userId,
      due_at: { $gte: now.toISOString(), $lte: end.toISOString() },
      workflow_state: 'published'
    }).project({ name: 1, due_at: 1, course_id: 1 }).limit(50).toArray();
    return res.status(200).json({
      role: 'assistant',
      type: 'list',
      items: assignments
    });
  }

  // Fallback: minimal LLM if key present, otherwise echo
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


