import { PineconeStore } from "@langchain/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
});
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const Index = pc.index("dunorth-vectors"); // must already exist

export async function saveToPinecone(userId, courseId, docId, text, metadata = {}) {
    if (!text) return;
  
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });
  
    const docs = await splitter.createDocuments([text], {
      userId,
      courseId,
      docId,
      ...metadata,
    });
  
    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: Index,
      namespace: `${userId}`, // optional separation
    });
}

export function cleanText(input) {
  if (!input) return "";

  let text = String(input);

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Collapse multiple spaces/newlines
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
