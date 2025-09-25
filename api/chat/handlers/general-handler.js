/**
 * General Query Handler
 * Handles general chat queries using OpenAI
 */

import { toDocumentStyle } from '../utils/text-formatting.js';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Handle general queries using OpenAI
 * @param {string} message - User message
 * @returns {Promise<Object>} Response object
 */
export async function handleGeneralQuery(message) {
  if (!openai) {
    return { role: 'assistant', text: 'Ask about assignments due; LLM disabled in demo.' };
  }

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

  return { 
    role: 'assistant', 
    text: toDocumentStyle(r.choices?.[0]?.message?.content || '') 
  };
}
