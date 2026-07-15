import { Pinecone } from "@pinecone-database/pinecone";
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

export const INDEX_NAME = "rag";
export const NAMESPACE = "ns1";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });

export function getIndex() {
  return pc.index({ name: INDEX_NAME, namespace: NAMESPACE });
}

const embeddingModel = openai.embedding("text-embedding-3-small");

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel, value: text });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
  });
  return embeddings;
}
