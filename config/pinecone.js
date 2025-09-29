import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
export const Index = pc.index("dunorth-vectors"); // must already exist
export const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function saveToPinecone(userId, courseId, docs) {
  await PineconeStore.fromDocuments(docs, embeddings, {
    pineconeIndex: Index,
    namespace: `${userId}`,
  });
}
