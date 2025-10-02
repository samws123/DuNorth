// index.js
import { runDuNorth } from "./agent.js";

if (process.env.NODE_ENV !== "production") {
  const userId = "236cddba-adb8-4e16-a817-f5913841be37"; // actual UUID
  const prompt = "Show me my all assignments grades";
  
  (async () => {
    const result = await runDuNorth(userId, prompt);
    console.log("\n[Final Response]");
    console.log(result);
  })();
}



export { createAgent, runDuNorth } from "./agent.js";



