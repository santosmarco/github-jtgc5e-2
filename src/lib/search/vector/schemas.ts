import type { UnionToIntersection } from "type-fest";
import { z } from "zod";

import { JsonObject } from "~/lib/schemas/utils";

import {
  DEFAULT_SEARCH_CACHE_RESULTS,
  DEFAULT_SEARCH_DEDUPLICATE,
  DEFAULT_SEARCH_DEDUPLICATION_THRESHOLD,
  DEFAULT_SEARCH_HYBRID_ALPHA,
  DEFAULT_SEARCH_HYBRID_SEARCH,
  DEFAULT_SEARCH_INCLUDE_METADATA,
  DEFAULT_SEARCH_INCLUDE_VALUES,
  DEFAULT_SEARCH_MIN_SCORE,
  DEFAULT_SEARCH_TOP_K,
} from "./constants";

export const PineconeNamespace = z.union([
  z.undefined(), // default namespace
  z.enum(["entities", "relationships", "observations"]),
]);
export type PineconeNamespace = z.infer<typeof PineconeNamespace>;

export const PineconeMeetingChunkMetadata = z
  .object({
    type: z.literal("chunks"),
    clear_text: z.string(),
    profile_id: z.string(),
    api_video_id: z.string(),
    topic_id: z.string(),
    prev_topic_id: z.string(),
    next_topic_id: z.string(),
    prev_vector_topic_id: z.string(),
    next_vector_topic_id: z.string(),
    target_person: z.string(),
    chunk_index: z.number(),
    chunk_summary: z.string(),
    chunk_start_time_unix: z.number(),
    chunk_end_time_unix: z.number(),
    segment_start_index: z.number(),
    start_segment_offset_index: z.number(),
    segment_end_index: z.number(),
    end_segment_offset_index: z.number(),
    meeting_start_time_unix: z.number(),
    participants_list: z.array(z.string()),
    version: z.string(),
  })
  .partial();
export type PineconeMeetingChunkMetadata = z.infer<
  typeof PineconeMeetingChunkMetadata
>;

export const PineconeMomentMetadata = z
  .object({
    type: z.literal("moments"),
    clear_text: z.string(),
    profile_id: z.string(),
    api_video_id: z.string(),
    moments_id: z.string(),
    target_person: z.string(),
    activity_type: z.string(),
    start_segment_index: z.number(),
    end_segment_index: z.number(),
    version: z.string(),
  })
  .partial();
export type PineconeMomentMetadata = z.infer<typeof PineconeMomentMetadata>;

export const PineconeEntityMetadata = z
  .object({
    id: z.string(),
    content: z.string(),
    content_type: z.literal("entity"),
    profile_id: z.string(),
    meeting_id: z.string(),
    video_api_id: z.string(),
    entity_id: z.string(),
    entity_name: z.string(),
    entity_type: z.string(),
    topic_id: z.string(),
    topic_title: z.string(),
    topic_summary: z.string(),
  })
  .partial();
export type PineconeEntityMetadata = z.infer<typeof PineconeEntityMetadata>;

export const PineconeRelationshipMetadata = z
  .object({
    id: z.string(),
    content: z.string(),
    content_type: z.literal("relationship"),
    profile_id: z.string(),
    meeting_id: z.string(),
    video_api_id: z.string(),
    relationship_id: z.string(),
    object_entity: z.string(),
    subject_entity: z.string(),
    relationship_type: z.string(),
    topic_id: z.string(),
    topic_title: z.string(),
    topic_summary: z.string(),
  })
  .partial();
export type PineconeRelationshipMetadata = z.infer<
  typeof PineconeRelationshipMetadata
>;

export const PineconeObservationMetadata = z
  .object({
    id: z.string(),
    content: z.string(),
    content_type: z.literal("observation"),
    profile_id: z.string(),
    meeting_id: z.string(),
    video_api_id: z.string(),
    // observation_id: z.string(), // @todo: fix this
    topic_id: z.string(),
    topic_title: z.string(),
    topic_summary: z.string(),
  })
  .partial();
export type PineconeObservationMetadata = z.infer<
  typeof PineconeObservationMetadata
>;

export const PineconeMetadata = z.union([
  PineconeMeetingChunkMetadata,
  PineconeMomentMetadata,
  PineconeEntityMetadata,
  PineconeRelationshipMetadata,
  PineconeObservationMetadata,
]);
export type PineconeMetadata = z.infer<typeof PineconeMetadata>;

export const PineconeBaseRecord = z.object({
  id: z.string(),
  values: z.array(z.number()),
  sparseValues: z
    .object({
      indices: z.array(z.number()),
      values: z.array(z.number()),
    })
    .optional(),
  score: z.number().optional(),
});
export type PineconeBaseRecord = z.infer<typeof PineconeBaseRecord>;

export const PineconeMeetingChunkRecord = PineconeBaseRecord.extend({
  metadata: PineconeMeetingChunkMetadata.optional(),
});
export type PineconeMeetingChunkRecord = z.infer<
  typeof PineconeMeetingChunkRecord
>;

export const PineconeMomentRecord = PineconeBaseRecord.extend({
  metadata: PineconeMomentMetadata.optional(),
});
export type PineconeMomentRecord = z.infer<typeof PineconeMomentRecord>;

export const PineconeEntityRecord = PineconeBaseRecord.extend({
  metadata: PineconeEntityMetadata.optional(),
});
export type PineconeEntityRecord = z.infer<typeof PineconeEntityRecord>;

export const PineconeRelationshipRecord = PineconeBaseRecord.extend({
  metadata: PineconeRelationshipMetadata.optional(),
});
export type PineconeRelationshipRecord = z.infer<
  typeof PineconeRelationshipRecord
>;

export const PineconeObservationRecord = PineconeBaseRecord.extend({
  metadata: PineconeObservationMetadata.optional(),
});
export type PineconeObservationRecord = z.infer<
  typeof PineconeObservationRecord
>;

export const PineconeRecord = z.union([
  PineconeMeetingChunkRecord,
  PineconeMomentRecord,
  PineconeEntityRecord,
  PineconeRelationshipRecord,
  PineconeObservationRecord,
]);
export type PineconeRecord = z.infer<typeof PineconeRecord>;

export const PineconeMeetingChunksSearchResult = z.object({
  matches: z.array(PineconeMeetingChunkRecord),
  namespace: z.string(),
});
export type PineconeMeetingChunksSearchResult = z.infer<
  typeof PineconeMeetingChunksSearchResult
>;

export const PineconeMomentsSearchResult = z.object({
  matches: z.array(PineconeMomentRecord),
  namespace: z.string(),
});
export type PineconeMomentsSearchResult = z.infer<
  typeof PineconeMomentsSearchResult
>;

export const PineconeEntitiesSearchResult = z.object({
  matches: z.array(PineconeEntityRecord),
  namespace: z.literal("entities"),
});
export type PineconeEntitiesSearchResult = z.infer<
  typeof PineconeEntitiesSearchResult
>;

export const PineconeRelationshipsSearchResult = z.object({
  matches: z.array(PineconeRelationshipRecord),
  namespace: z.literal("relationships"),
});
export type PineconeRelationshipsSearchResult = z.infer<
  typeof PineconeRelationshipsSearchResult
>;

export const PineconeObservationsSearchResult = z.object({
  matches: z.array(PineconeObservationRecord),
  namespace: z.literal("observations"),
});
export type PineconeObservationsSearchResult = z.infer<
  typeof PineconeObservationsSearchResult
>;

export const PineconeSearchResult = z.union([
  PineconeMeetingChunksSearchResult,
  PineconeMomentsSearchResult,
  PineconeEntitiesSearchResult,
  PineconeRelationshipsSearchResult,
  PineconeObservationsSearchResult,
]);
export type PineconeSearchResult = z.infer<typeof PineconeSearchResult>;

export const VectorSearchOptions = z.object({
  query: z.string().min(1, "Query is required"),
  vector: z.array(z.number()).optional(),
  topK: z.number().int().min(1).max(100).default(DEFAULT_SEARCH_TOP_K),
  minScore: z.number().min(0).max(1).default(DEFAULT_SEARCH_MIN_SCORE),
  namespace: PineconeNamespace.optional(),
  filter: JsonObject.optional(),
  includeValues: z.boolean().default(DEFAULT_SEARCH_INCLUDE_VALUES),
  includeMetadata: z.boolean().default(DEFAULT_SEARCH_INCLUDE_METADATA),
  hybridSearch: z.boolean().default(DEFAULT_SEARCH_HYBRID_SEARCH),
  hybridAlpha: z.number().min(0).max(1).default(DEFAULT_SEARCH_HYBRID_ALPHA),
  cacheResults: z.boolean().default(DEFAULT_SEARCH_CACHE_RESULTS),
  deduplicate: z.boolean().default(DEFAULT_SEARCH_DEDUPLICATE),
  deduplicationThreshold: z
    .number()
    .min(0.8)
    .max(1)
    .default(DEFAULT_SEARCH_DEDUPLICATION_THRESHOLD),
  fetchMetadataFields: z
    .array(
      z.union([
        PineconeMeetingChunkMetadata.keyof(),
        PineconeMomentMetadata.keyof(),
        PineconeEntityMetadata.keyof(),
        PineconeRelationshipMetadata.keyof(),
        PineconeObservationMetadata.keyof(),
      ]) satisfies z.ZodType<keyof UnionToIntersection<PineconeMetadata>>,
    )
    .optional(),
});
export type VectorSearchOptions = z.infer<typeof VectorSearchOptions>;
