import { Pinecone } from "@pinecone-database/pinecone";
import { z } from "zod";

import { env } from "~/env";

export const IndexMetadata = z
  .object({
    activity_type: z.string(),
    api_video_id: z.string(),
    clear_text: z.string(),
    end_segment_index: z.number(),
    moments_id: z.string(),
    profile_id: z.string(),
    start_segment_index: z.number(),
    target_person: z.string(),
    type: z.string(),
    version: z.string(),
  })
  .partial()
  .and(
    z.record(
      z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
    ),
  );
export type IndexMetadata = z.infer<typeof IndexMetadata>;

let pineconeClient: Pinecone | null = null;

export async function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  }
  return pineconeClient;
}

export async function getIndex() {
  const pinecone = await getPineconeClient();
  return pinecone.index<IndexMetadata>(env.PINECONE_INDEX);
}

export async function getEntitiesIndex() {
  const pinecone = await getPineconeClient();
  return pinecone.index("titan-mvp-v2");
}
