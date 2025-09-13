import { MongoClient } from 'mongodb';

let clientPromise;

export function getMongoClient() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI env var is required');
  }
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5 });
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb() {
  const client = await getMongoClient();
  const dbName = process.env.MONGODB_DB || 'dunorth';
  return client.db(dbName);
}


