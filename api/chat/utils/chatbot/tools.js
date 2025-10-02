// tools.js
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { PineconeStore } from "@langchain/pinecone";
import { embeddings, Index } from "../../../../config/pinecone.js"
import { getPool } from "./db.js";

/* ------------------
   Supabase Query Tool
------------------ */

export const querySupabaseTool = tool(
  async ({ sql, userId, params }) => {
    const client = await getPool().connect();
    try {
      console.log("params - tool (querySupabaseTool):", { params });

      // TEMP FIX: always use actual userId
      const actualUserId = "236cddba-adb8-4e16-a817-f5913841be37";

      const finalParams = [];

      // Inject actual UUID into $1 if query has it
      if (sql.includes("$1")) finalParams.push(actualUserId);

      // Add extra params if provided
      if (params?.length) finalParams.push(...params);

      console.log("userId - tools (querySupabaseTool):", userId);
      console.log("📌 Final SQL Params:", finalParams);

      const { rows } = await client.query(sql, finalParams);
      console.log("[Tool:querySupabase] Query success, rows:", rows.length);
      return rows.length ? JSON.stringify(rows, null, 2) : "No results found.";
    } catch (err) {
      console.error("[Tool:querySupabase] Error:", err);
      return `Supabase query error: ${err.message}`;
    } finally {
      client.release();
    }
  },
  {
    name: "query_supabase",
    description: "Query Supabase database with SQL.",
    schema: z.object({
      sql: z.string(),
      userId: z.string().optional(),
      params: z.array(z.union([z.string(), z.number()])).optional(),
    }),
  }
);

  


/* ------------------
   Pinecone Retriever Tool
------------------ */
async function getVectorStore(userId) {
  return PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: Index,
    namespace: `${userId}`,
  });
}

export const retrieveTool = tool(
  async ({ userId, query, k = 5 }) => {
    try {
      const vs = await getVectorStore(userId);
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
      return `Retriever error: ${err.message}`;
    }
  },
  {
    name: "retrieve_data",
    description: "Retrieve study context from Pinecone for a given user/course and query.",
    schema: z.object({
      userId: z.string(),
      query: z.string(),
      k: z.number().optional(),
    }),
  }
);
