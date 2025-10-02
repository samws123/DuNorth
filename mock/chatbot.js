// duNorthAgent.js
import { Pool } from "pg";
import { PineconeStore } from "@langchain/pinecone";
import { embeddings, Index } from "../../../../config/pinecone.js";

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";

/* ------------------
   SUPABASE CONNECTION
------------------ */
let pool;
export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  if (!pool) {
    console.log("🔌 Initializing DB pool...");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3, // keep very low for Supabase session mode
      idleTimeoutMillis: 10000, // 10s
      connectionTimeoutMillis: 20000, // wait longer before timing out
      ssl: { rejectUnauthorized: false }, // Supabase needs this
    });

    pool.on("connect", () => console.log("✅ DB connection established"));
    pool.on("acquire", () => console.log("📥 Client acquired from pool"));
    pool.on("remove", () => console.log("❌ Client removed from pool"));
    pool.on("error", (err) => console.error("🔥 Pool error:", err));
  }
  return pool;
}

/* ------------------
   QUERY HELPER (optional direct use)
------------------ */
export async function queryDb(collection, filters = {}) {
  const client = await getPool().connect();
  try {
    let sql = `SELECT * FROM ${collection}`;
    const values = [];

    const conditions = Object.keys(filters).map((key, i) => {
      values.push(filters[key]);
      return `${key} = $${i + 1}`;
    });

    if (conditions.length) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += " ORDER BY created_at DESC LIMIT 10";

    console.log(`[DB] Running query: ${sql} with values: ${JSON.stringify(values)}`);

    const res = await client.query(sql, values);
    console.log(`[DB] Query success, rows: ${res.rowCount}`);
    return res.rows;
  } catch (err) {
    console.error("❌ DB query failed:", err);
    throw err;
  } finally {
    client.release();
    console.log("[DB] Client released back to pool");
  }
}

/* ------------------
   VECTORSTORE (Pinecone)
------------------ */
async function getVectorStore(userId) {
  const namespace = `${userId}`;
  return PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: Index,
    namespace,
  });
}

/* ------------------
   TOOL: Supabase Query
------------------ */
export const querySupabaseTool = tool(
  async ({ sql, params }) => {
    const client = await getPool().connect();
    try {
      console.log("[Tool:querySupabase] Executing raw SQL:", sql, params);
      const { rows } = await client.query(sql, params || []);
      console.log("[Tool:querySupabase] Query success, rows:", rows);
      return rows?.length ? JSON.stringify(rows, null, 2) : "No results found.";
    } catch (err) {
      console.error("[Tool:querySupabase] Error:", err);
      return `Supabase query error: ${err.message || err}`;
    } finally {
      client.release();
    }
  },
  {
    name: "query_supabase",
    description:
      "Query the Supabase Postgres database with SQL. Use this when the user asks about structured data (assignments, courses, grades, etc.).",
    schema: z.object({
      sql: z.string(),
      params: z.array(z.union([z.string(), z.number()])).optional().default([]),
    }),
  }
);

/* ------------------
   TOOL: Pinecone Retriever
------------------ */
export const retrieveTool = tool(
  async ({ userId, query, k = 5 }) => {
    try {
      const vs = await getVectorStore(userId);
      if (!vs) return "No vector store available.";

      console.log("[Tool:retrieve] Searching:", query);
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
      console.error("[Tool:retrieve] Error:", err);
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

/* ------------------
   PROMPT TEMPLATE
------------------ */
export const duNorthPrompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(`
  You are DuNorth, a highly knowledgeable and reliable study assistant.

  GOALS:
  - Provide clear, structured, and accurate answers to the user’s questions.
  - Use query_supabase when the user asks about structured DB records.
  - Use retrieve_data when the user asks about study content.
  - Integrate retrieved context with your knowledge. If none, reason and answer.

  DATABASE SCHEMA (for SQL queries):
  - assignments(course_id, name, due_at, workflow_state, raw_json, html_url, points_possible, description)
  - courses(id, name,course_code, term, raw_json, created_at, updated_at)

  RULES:
  - Only query the tables listed above.
  - Always SELECT explicit columns, not *.
  - Always return complete row JSON if unsure about structure.
  - Use params array for dynamic values instead of hardcoding.

  RESPONSE FORMAT (IMPORTANT):
  - Produce VALID HTML only (a fragment or full HTML document is acceptable).
  - Use an H1 for the main heading (ALL CAPS).
  - Use H2 for section headings (ALL CAPS) when needed.
  - Use ordered lists (<ol>) for numbered steps (1. 2. 3.).
  - Use unordered lists (<ul>) for hyphen bullets; each <li> should start with "-".
  - Avoid verbatim dumps of retrieved JSON; explain naturally in HTML.
  `),

  HumanMessagePromptTemplate.fromTemplate("{input}"),

  new MessagesPlaceholder("agent_scratchpad"),
]);

/* ------------------
   CREATE AGENT
------------------ */
export async function createAgent() {
  const model = new ChatOpenAI({
    model: "gpt-4o",
    temperature: 0.7,
  });

  const agent = await createOpenAIToolsAgent({
    llm: model,
    tools: [querySupabaseTool, retrieveTool],
    prompt: duNorthPrompt,
  });

  return new AgentExecutor({
    agent,
    tools: [querySupabaseTool, retrieveTool],
  });
}

/* ------------------
   RUN FUNCTION
------------------ */
export async function runDuNorth(userId, userPrompt) {
  console.log("\n==============================");
  console.log("runDuNorth");
  console.log("userId:", userId);
  console.log("userPrompt:", userPrompt);
  console.log("==============================");

  const agent = await createAgent();

  const response = await agent.invoke({
    input: userPrompt,
    userId,
  });

  console.log("--------------------------------");
  console.log("✅ Agent response ready");
  console.log("--------------------------------");

  return response.output; // HTML string
}

/* ------------------
   Example usage
------------------ */
if (process.env.NODE_ENV !== "production") {
  (async () => {
    const userId = "236cddba-adb8-4e16-a817-f5913841be37";
    const prompt = "Show me the latest assignments with all details";

    const result = await runDuNorth(userId, prompt);
    console.log("\n[Final Response]");
    console.log(result);
  })();
}
