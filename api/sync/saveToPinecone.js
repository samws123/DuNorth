import { PineconeStore } from "@langchain/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";


const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
export const Index = pc.index("dunorth-vectors"); 
export const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
});


export async function saveToPinecone(userId, courseId, docId, text, metadata = {}) {
  
    if (!text) return;
    try {
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
        namespace: `${userId}`,
      });
    } catch (err) {
      console.log(err)
    }
  }