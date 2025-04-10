import { v4 as uuidv4 } from "uuid";

import type {
  Entity,
  EntityExtractionOutput,
  EntityRelation,
} from "~/lib/backend/services/entity-extraction/entity-extraction.schemas";

import { getEntitiesIndex } from "../pinecone/client";
import { embedText, embedTexts } from "../pinecone/embeddings";
import type { Tables } from "../supabase/database.types";
import { EmbeddingService } from "../core/embeddingService";
import { SearchService } from "../core/searchService";

// Initialize the services as singletons
const embeddingService = new EmbeddingService();
const searchService = new SearchService();

/**
 * Metadata for entity vectors in Pinecone
 */
export type EntityVectorMetadata = {
  // Required fields
  id: string;
  meeting_id: string;
  topic_id: string;
  profile_id: string;
  video_api_id: string;

  // Entity-specific fields
  entity_type?: string;
  entity_name?: string;
  entity_id?: string;

  // Relationship-specific fields
  relationship_type?: string;
  subject_entity?: string;
  object_entity?: string;
  relationship_id?: string;

  // Content fields
  content_type: "entity" | "relationship" | "observation";
  content: string;

  // Context fields
  topic_title: string;
  topic_summary?: string;
  timestamp_start?: number;
  timestamp_end?: number;
};

/**
 * Options for embedding the entities
 */
export type EntityEmbeddingOptions = {
  namespace?: string;
  batchSize?: number;
};

/**
 * Default embedding options
 */
const DEFAULT_BATCH_SIZE = 10;

/**
 * Generates a prefixed ID for better document management
 */
function generatePrefixedId(prefix: string, subType?: string): string {
  const uniqueId = uuidv4();
  return subType ? `${prefix}#${subType}#${uniqueId}` : `${prefix}#${uniqueId}`;
}

/**
 * Processes observations in batches and embeds them
 */
async function processBatchedObservations<T extends { observations: string[] }>(
  item: T,
  baseMetadata: EntityVectorMetadata,
  enhanceObservation: (observation: string) => string,
  namespace: string,
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<void> {
  let index = await getEntitiesIndex();
  index = index.namespace(namespace);

  // Create a prefix for all observations related to this entity/relationship
  const idPrefix = `${baseMetadata.meeting_id}#${baseMetadata.topic_id}#${baseMetadata.id}`;

  for (let i = 0; i < item.observations.length; i += batchSize) {
    const batch = item.observations.slice(i, i + batchSize);
    const enhancedObservations = batch.map(enhanceObservation);
    const embeddings = await embedTexts(enhancedObservations);

    const vectors = batch.map((observation, index) => {
      const observationId = `${idPrefix}#obs${i + index}`;
      const metadata: EntityVectorMetadata = {
        ...baseMetadata,
        id: observationId,
        content_type: "observation",
        content: observation,
      };

      return {
        id: observationId,
        values: embeddings[index] ?? [],
        metadata,
      };
    });

    await index.upsert(vectors);
  }
}

/**
 * Embeds a single entity and inserts it into Pinecone
 * @deprecated Use embeddingService.embedEntity instead
 */
export async function embedEntity(
  entity: Entity,
  meeting: Tables<"meetings">,
  topicId: string,
  topicTitle: string,
  options?: EntityEmbeddingOptions,
): Promise<void> {
  await embeddingService.embedEntity(entity, meeting, topicId, topicTitle, {
    namespace: options?.namespace,
    batchSize: options?.batchSize,
  });
}

/**
 * Embeds a relationship between entities
 * @deprecated Use embeddingService.embedRelationship instead
 */
export async function embedRelationship(
  relationship: EntityRelation,
  meeting: Tables<"meetings">,
  topicId: string,
  topicTitle: string,
  options?: EntityEmbeddingOptions,
): Promise<void> {
  await embeddingService.embedRelationship(
    relationship,
    meeting,
    topicId,
    topicTitle,
    {
      namespace: options?.namespace,
      batchSize: options?.batchSize,
    },
  );
}

/**
 * Embeds general observations
 * @deprecated Use embeddingService.embedObservations instead
 */
export async function embedObservations(
  observations: string[],
  meeting: Tables<"meetings">,
  topicId: string,
  topicTitle: string,
  options?: EntityEmbeddingOptions,
): Promise<void> {
  await embeddingService.embedObservations(
    observations,
    meeting,
    topicId,
    topicTitle,
    {
      namespace: options?.namespace,
      batchSize: options?.batchSize,
    },
  );
}

/**
 * Embeds all entities, relationships, and observations from a topic
 * @deprecated Use embeddingService.embedTopicEntities instead
 */
export async function embedTopicEntities(
  extractionOutput: EntityExtractionOutput,
  meeting: Tables<"meetings">,
  topicId: string,
  topicTitle: string,
  options?: EntityEmbeddingOptions,
): Promise<void> {
  await embeddingService.embedTopicEntities(
    extractionOutput,
    meeting,
    topicId,
    topicTitle,
    {
      namespace: options?.namespace,
      batchSize: options?.batchSize,
    },
  );
}

/**
 * Advanced semantic search for entity-related vectors
 *
 * @param query - The natural language search query
 * @param options - Search configuration options
 * @returns Structured search results organized by content type with detailed metadata
 * @deprecated Use SearchService.search instead
 */
export async function searchEntityVectors(
  query: string,
  options?: {
    filter?: Record<string, unknown>;
    topK?: number;
    minScore?: number;
  },
) {
  const results = await searchService.search(query, {
    filter: options?.filter,
    topK: options?.topK,
    minScore: options?.minScore,
    retryConfig: {
      retries: 2,
      baseDelay: 300,
      timeout: 10000,
    },
  });

  // Add the summary field to match the previous implementation's format
  return {
    entities: results.entities.map((item) => ({
      ...item,
      summary: {
        name: item.metadata.entity_name || "",
        type: item.metadata.entity_type || "",
        description: item.metadata.content || "",
        topicTitle: item.metadata.topic_title,
        topicId: item.metadata.topic_id,
        meetingId: item.metadata.meeting_id,
      },
    })),
    relationships: results.relationships.map((item) => ({
      ...item,
      summary: {
        subject: item.metadata.subject_entity || "",
        relationship: item.metadata.relationship_type || "",
        object: item.metadata.object_entity || "",
        topicTitle: item.metadata.topic_title,
        topicId: item.metadata.topic_id,
        meetingId: item.metadata.meeting_id,
      },
    })),
    observations: results.observations.map((item) => ({
      ...item,
      summary: {
        content: item.metadata.content || "",
        topicTitle: item.metadata.topic_title,
        topicId: item.metadata.topic_id,
        meetingId: item.metadata.meeting_id,
        entityName: item.metadata.entity_name,
        entityType: item.metadata.entity_type,
      },
    })),
  };
}
