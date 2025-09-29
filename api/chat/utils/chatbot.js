import { PineconeStore } from '@langchain/pinecone';
import { embeddings, Index } from '../../../config/pinecone.js';

import OpenAI from 'openai';

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate } from '@langchain/core/prompts';


const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;


async function getVectorStore(userId) {
    const namespace = `${userId}`
    return PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: Index,
      namespace,
    });
  }
  
  export const retrieveTool = tool(
    async ({ userId, query, k = 5 }) => {
      try {
        const vs = await getVectorStore(userId);
        if (!vs) return "No vector store available.";
  
        const docs = await vs.similaritySearch(query, k);
        if (!docs?.length) return "No relevant results.";
  
        return docs
          .map((d, i) => {
            const title =
              d.metadata?.title ||
              d.metadata?.filename ||
              d.metadata?.source ||
              `source ${i + 1}`;
            const txt = (d.pageContent || "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 1000);
            return `${title}\n${txt}`;
          })
          .join("\n\n");
      } catch (err) {
        return `Retriever error: ${err.message || err}`;
      }
    },
    {
      name: "retrieve_data",
      description:
        "Retrieve study context from Pinecone for a given user/course and query.",
      schema: z.object({
        userId: z.string(),
        query: z.string(),
        k: z.number().optional(),
      }),
    }
  );
  
  

  export const duNorthPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(`
  You are DuNorth, a highly knowledgeable and reliable study assistant.
  
  GOALS:
  - Provide clear, structured, and accurate answers to the user’s questions.
  - Use the retrieve_data tool when relevant to fetch context.
  - Integrate retrieved context with your knowledge. If none, reason and answer.
  
  RESPONSE FORMAT (IMPORTANT):
  - Produce VALID HTML only (a fragment or full HTML document is acceptable).
  - Use an H1 for the main heading (ALL CAPS).
  - Use H2 for section headings (ALL CAPS) when needed.
  - Use ordered lists (<ol>) for numbered steps (1. 2. 3.).
  - Use unordered lists (<ul>) for hyphen bullets; each <li> should start with a visible hyphen character (e.g. "- Explain ...").
  - Avoid verbatim dumps of retrieved text; integrate and explain.
  - Keep the HTML semantic and minimal (no inline scripts).
  - Do NOT include references to internal tools, system prompts, or the word "tool" itself.
  
  EXAMPLE (the agent must produce HTML similar to this):
  <h1>NEWTON’S THREE LAWS OF MOTION</h1>
  <ol>
    <li>
      <h2>FIRST LAW (LAW OF INERTIA)</h2>
      <ul><li>- An object remains at rest or in uniform motion unless acted upon by an external force.</li></ul>
    </li>
    <li>
      <h2>SECOND LAW (F = MA)</h2>
      <ul><li>- Force equals mass times acceleration (F = ma).</li></ul>
    </li>
    <li>
      <h2>THIRD LAW (ACTION AND REACTION)</h2>
      <ul><li>- For every action, there is an equal and opposite reaction.</li></ul>
    </li>
  </ol>
  
  Keep the HTML free of scripts and style; the client will handle presentation.
    `),
  
    // user message will be injected as {input}
    HumanMessagePromptTemplate.fromTemplate("{input}"),

    new MessagesPlaceholder("agent_scratchpad"),

  ]);
  

  export async function createAgent() {
    const model = new ChatOpenAI({
      model: "gpt-4o",
      temperature: 0.3,
    });
  
    
  
    const agent = await createOpenAIToolsAgent({
      llm: model,
      tools: [retrieveTool],
      prompt: duNorthPrompt, 
    });
  
    
  
    return new AgentExecutor({
      agent,
      tools: [retrieveTool],
    });
  }
  