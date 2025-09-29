/**
 * Chat Answer Handler
 * Main entry point for processing chat queries with modular handlers
 */

import { ensureSchema } from '../_lib/ensureSchema.js';
import { resolveUserId } from './utils/user-management.js';
import { handleCourseQuery } from './handlers/course-handler.js';
import { handleAssignmentQuery, handleAssignmentDueQuery } from './handlers/assignment-handler.js';
import { handleSolveQuery, handleOrdinalFollowUp } from './handlers/solve-handler.js';
import { handleGeneralQuery } from './handlers/general-handler.js';
import { isOrdinalOnlyMessage } from './utils/assignment-selector.js';

import { PineconeStore } from '@langchain/pinecone';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { query } from '../_lib/pg.js';
import { toDocumentStyle } from './utils/text-formatting.js';
import { embeddings, Index } from '../../config/pinecone.js';

/**
 * Main chat handler with improved modular structure
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<Object>} Response
 */



// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   const { userId: rawUserId, message } = req.body || {};
//   if (!rawUserId || !message) {
//     return res.status(400).json({ error: 'userId and message required' });
//   }

//   await ensureSchema();
//   const userId = await resolveUserId(rawUserId);
//   const m = message.toLowerCase();

//   try {
//     // Course listing queries
//     if (m.includes('what') && m.includes('my') && (m.includes('class') || m.includes('course') || m.includes('courses') || m.includes('cours'))) {
//       const response = await handleCourseQuery(userId);
//       return res.status(200).json(response);
//     }

//     // Assignment listing queries (no date filter)
//     if (m.includes('assignment') && !m.includes('due')) {
//       const response = await handleAssignmentQuery(message, userId);
//       return res.status(200).json(response);
//     }

//     // Assignment due date queries
//     if (m.includes('assignment') && (m.includes('due') || m.includes('overdue') || m.includes('late') || m.includes('today') || m.includes('tomorrow') || m.includes('week') || m.includes('on '))) {
//       const response = await handleAssignmentDueQuery(message, userId);
//       return res.status(200).json(response);
//     }

//     // Assignment solving queries
//     if ((m.includes('solve') && m.includes('assignment')) ||
//       m.includes('do my hw') ||
//       m.includes('do my homework') ||
//       (m.startsWith('solve ') && (m.includes('first') || m.includes('second') || m.includes('third') || m.includes('1st') || m.includes('2nd') || m.includes('3rd') || m.includes('all')))) {
//       const response = await handleSolveQuery(message, userId);
//       return res.status(200).json(response);
//     }

//     // Ordinal-only follow-ups
//     if (isOrdinalOnlyMessage(message)) {
//       const response = await handleOrdinalFollowUp(message, userId);
//       return res.status(200).json(response);
//     }

//     // General queries
//     // const response = await handleGeneralQuery(message);

//     const docs = await retrieveUserContextDocs(userId, message, 6); // returns LangChain Documents
//     const context = (docs || []).map(d => {
//       // include small provenance line (title/url) when available, then snippet
//       let meta = '';
//       if (d.metadata) {
//         if (d.metadata.title) meta += `${d.metadata.title} `;
//         if (d.metadata.url) meta += `(${d.metadata.url})`;
//       }
//       // pageContent can be long — keep it but you may want to truncate in future
//       return `${meta}\n${d.pageContent || ''}`;
//     }).join('\n\n---\n\n');


//     const prompt = `You are DuNorth, a helpful study assistant.
//       Provide answers in document style (no Markdown):
//       HEADING lines in ALL CAPS, numbered steps as 1. 2. 3., and hyphen bullets for sub-points.
//       Solve the following problem completely, step by step if needed.
//       Context:
//       ${context}

//       User: ${message}`;

//     const model = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0.2 });

//     let llmOutput = '';
//     try {
//       llmOutput = await model.invoke(prompt);
//     } catch (err) {
//       console.warn('RAG LLM call failed:', err.message || err);
//       return res.status(200).json({ role: 'assistant', text: toDocumentStyle('Sorry — I could not fetch an answer right now.') });
//     }
//     return res.status(200).json({
//       role: 'assistant',
//       text: toDocumentStyle(llmOutput.content || ''),
//     });


//   } catch (err) {
//     const msg = err && err.message ? err.message : String(err);
//     return res.status(200).json({ role: 'assistant', text: `Server error: ${msg}` });
//   }
// }


import { createAgent } from './utils/chatbot.js';


// const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;


/**
 * Return a LangChain PineconeStore for the same namespace used at ingestion.
 * Namespace pattern: `${userId}-${courseId}` if courseId provided, else `${userId}`
 */




export default async function handler(req, res) {
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId: rawUserId,  message } = req.body || {};
  if (!rawUserId || !message) {
    return res
      .status(400)
      .json({ error: "userId and message required" });
  }
  console.log('testringt !!!!!!')
  await ensureSchema();
  const userId = await resolveUserId(rawUserId);
  
  try {
    const agent = await createAgent();
  
    // Let the agent decide whether to call the retriever or answer directly
    const result = await agent.invoke({
      input: `${message}`,
      userId,
      
    });


    return res.status(200).json({
      role: "assistant",
      text: toDocumentStyle(result.output),
    });
  } catch (err) {
    return res.status(200).json({
      role: "assistant",
      text: `Server error: ${err.message || err}`,
    });
  }
}
