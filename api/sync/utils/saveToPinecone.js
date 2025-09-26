import { PineconeStore } from "@langchain/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

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
      namespace: `${userId}-${courseId}`, // optional separation
    });
  }