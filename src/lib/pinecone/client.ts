import { Pinecone } from "@pinecone-database/pinecone";

import { env } from "~/env";
import type { PineconeMetadata } from "~/lib/search/vector/schemas";

let pineconeClient: Pinecone | null = null;

export async function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  }
  return pineconeClient;
}

export async function getIndex() {
  const pinecone = await getPineconeClient();
  return pinecone.index<PineconeMetadata>(env.PINECONE_INDEX);
}

export async function getEntitiesIndex() {
  const pinecone = await getPineconeClient();
  return pinecone.index("titan-mvp-v2");
}
