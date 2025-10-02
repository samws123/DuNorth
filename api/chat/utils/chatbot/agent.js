// agent.js
import { ChatOpenAI } from "@langchain/openai";
import { createOpenAIToolsAgent, AgentExecutor } from "langchain/agents";
import { querySupabaseTool, retrieveTool } from "./tools.js";
import { duNorthPrompt } from "./prompt.js";

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

export async function runDuNorth(userId, userPrompt) {
  console.log("\n==============================");
  console.log("runDuNorth");
  console.log("userId:", userId);
  console.log("userPrompt:", userPrompt);
  console.log("==============================");


  
  

  const agent = await createAgent();
  const response = await agent.invoke({
    input: userPrompt,

    toolsInput: {
      query_supabase: {
        params: [userId],
      },
    },
  });

  console.log("--------------------------------");
  console.log("✅ Agent response ready");
  console.log("--------------------------------");

  return response.output; // HTML string
}


