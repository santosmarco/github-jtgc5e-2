import { v4 as uuidv4 } from "uuid";
import { getIndex } from "../pinecone/client";
import { embedText, embedTexts } from "../pinecone/embeddings";
import type {
  Entity,
  EntityRelation,
  EntityExtractionOutput,
} from "./entity-extraction";
import type { Tables } from "../supabase/database.types";

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
  let index = await getIndex();
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
 */
export async function embedEntity(
  entity: Entity,
  meeting: Tables<"meetings">,
  topicId: string,
  topicTitle: string,
  options?: EntityEmbeddingOptions,
): Promise<void> {
  const namespace = options?.namespace || "entities";
  let index = await getIndex();
  index = index.namespace(namespace);

  // Create a comprehensive text representation of the entity
  const entityText = `Entity: ${entity.name}\nType: ${entity.type}\nDescription: ${entity.description}`;

  // Generate a prefixed ID for the entity
  const entityPrefix = `${meeting.video_api_id}#${topicId}#entity`;
  const entitySubType = `${entity.type}#${entity.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const entityId = generatePrefixedId(entityPrefix, entitySubType);

  // Get the embedding
  const embedding = await embedText(entityText);

  // Prepare metadata
  const metadata: EntityVectorMetadata = {
    id: entityId,
    meeting_id: meeting.video_api_id,
    topic_id: topicId,
    profile_id: meeting.profile_id || "",
    video_api_id: meeting.video_api_id,
    entity_type: entity.type,
    entity_name: entity.name,
    entity_id: entityId,
    content_type: "entity",
    content: entityText,
    topic_title: topicTitle,
    topic_summary: meeting.summary || undefined,
  };

  // Upsert the vector
  await index.upsert([
    {
      id: entityId,
      values: embedding,
      metadata,
    },
  ]);

  // Embed each observation separately
  if (entity.observations && entity.observations.length > 0) {
    await processBatchedObservations(
      entity,
      metadata,
      (obs) => `Observation about ${entity.type} "${entity.name}": ${obs}`,
      namespace,
      options?.batchSize,
    );
  }
}

/**
 * Embeds a relationship between entities
 */
export async function embedRelationship(
  relationship: EntityRelation,
  meeting: Tables<"meetings">,
  topicId: string,
  topicTitle: string,
  options?: EntityEmbeddingOptions,
): Promise<void> {
  const namespace = options?.namespace || "relationships";
  let index = await getIndex();
  index = index.namespace(namespace);

  // Create a comprehensive text representation of the relationship
  const relationshipText = `Relationship: ${relationship.entity1} ${relationship.relationship} ${relationship.entity2}`;

  // Generate a prefixed ID for the relationship
  const relationPrefix = `${meeting.video_api_id}#${topicId}#relation`;
  const relationSubType = `${relationship.entity1.replace(/[^a-zA-Z0-9]/g, "_")}#${relationship.relationship.replace(/[^a-zA-Z0-9]/g, "_")}#${relationship.entity2.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const relationshipId = generatePrefixedId(relationPrefix, relationSubType);

  // Get the embedding
  const embedding = await embedText(relationshipText);

  // Prepare metadata
  const metadata: EntityVectorMetadata = {
    id: relationshipId,
    meeting_id: meeting.video_api_id,
    topic_id: topicId,
    profile_id: meeting.profile_id || "",
    video_api_id: meeting.video_api_id,
    relationship_type: relationship.relationship,
    subject_entity: relationship.entity1,
    object_entity: relationship.entity2,
    relationship_id: relationshipId,
    content_type: "relationship",
    content: relationshipText,
    topic_title: topicTitle,
    topic_summary: meeting.summary || undefined,
  };

  // Upsert the vector
  await index.upsert([
    {
      id: relationshipId,
      values: embedding,
      metadata,
    },
  ]);

  // Embed each observation separately
  if (relationship.observations && relationship.observations.length > 0) {
    await processBatchedObservations(
      relationship,
      metadata,
      (obs) =>
        `Observation about relationship "${relationship.entity1} ${relationship.relationship} ${relationship.entity2}": ${obs}`,
      namespace,
      options?.batchSize,
    );
  }
}

/**
 * Embeds general observations
 */
export async function embedObservations(
  observations: string[],
  meeting: Tables<"meetings">,
  topicId: string,
  topicTitle: string,
  options?: EntityEmbeddingOptions,
): Promise<void> {
  const namespace = options?.namespace || "observations";
  let index = await getIndex();
  index = index.namespace(namespace);

  // Process observations in batches
  const batchSize = options?.batchSize || DEFAULT_BATCH_SIZE;
  const observationPrefix = `${meeting.video_api_id}#${topicId}#observation`;

  for (let i = 0; i < observations.length; i += batchSize) {
    const batch = observations.slice(i, i + batchSize);

    // Enhance each observation with context
    const enhancedObservations = batch.map(
      (obs) => `General observation about topic "${topicTitle}": ${obs}`,
    );

    // Get embeddings for the batch
    const embeddings = await embedTexts(enhancedObservations);

    // Prepare vectors for batch insertion
    const vectors = batch.map((observation, index) => {
      const observationId = generatePrefixedId(observationPrefix);
      const metadata: EntityVectorMetadata = {
        id: observationId,
        meeting_id: meeting.video_api_id,
        topic_id: topicId,
        profile_id: meeting.profile_id || "",
        video_api_id: meeting.video_api_id,
        content_type: "observation",
        content: observation,
        topic_title: topicTitle,
        topic_summary: meeting.summary || undefined,
      };

      return {
        id: observationId,
        values: embeddings[index] ?? [],
        metadata,
      };
    });

    // Upsert the vectors
    await index.upsert(vectors);
  }
}

/**
 * Embeds all entities, relationships, and observations from a topic
 */
export async function embedTopicEntities(
  extractionOutput: EntityExtractionOutput,
  meeting: Tables<"meetings">,
  topicId: string,
  topicTitle: string,
  options?: EntityEmbeddingOptions,
): Promise<void> {
  // Embed entities
  await Promise.all(
    extractionOutput.entities.map((entity) =>
      embedEntity(entity, meeting, topicId, topicTitle, options),
    ),
  );

  // Embed relationships
  await Promise.all(
    extractionOutput.relationships.map((relationship) =>
      embedRelationship(relationship, meeting, topicId, topicTitle, options),
    ),
  );

  // Embed general observations
  if (
    extractionOutput.observations &&
    Array.isArray(extractionOutput.observations) &&
    extractionOutput.observations.length > 0
  ) {
    await embedObservations(
      extractionOutput.observations,
      meeting,
      topicId,
      topicTitle,
      options,
    );
  }
}

/**
 * Advanced semantic search for entity-related vectors
 */
export async function searchEntityVectors(
  query: string,
  options?: {
    filter?: Record<string, unknown>;
    topK?: number;
    minScore?: number;
    namespace?: string;
  },
): Promise<{
  entities: Array<{ score: number; metadata: EntityVectorMetadata }>;
  relationships: Array<{ score: number; metadata: EntityVectorMetadata }>;
  observations: Array<{ score: number; metadata: EntityVectorMetadata }>;
}> {
  const {
    filter = {},
    topK = 10,
    minScore = 0.2,
    namespace = undefined,
  } = options || {};

  const queryEmbedding = await embedText(query);
  const baseIndex = await getIndex();

  // Query entities
  const entitiesIndex = namespace ? baseIndex.namespace("entities") : baseIndex;
  const entityResults = await entitiesIndex.query({
    vector: queryEmbedding,
    topK: topK,
    filter: { ...filter, content_type: { $eq: "entity" } },
    includeMetadata: true,
  });

  // Query relationships
  const relationshipsIndex = namespace
    ? baseIndex.namespace("relationships")
    : baseIndex;
  const relationshipResults = await relationshipsIndex.query({
    vector: queryEmbedding,
    topK: topK,
    filter: { ...filter, content_type: { $eq: "relationship" } },
    includeMetadata: true,
  });

  // Query observations
  const observationsIndex = namespace
    ? baseIndex.namespace("observations")
    : baseIndex;
  const observationResults = await observationsIndex.query({
    vector: queryEmbedding,
    topK: topK,
    filter: { ...filter, content_type: { $eq: "observation" } },
    includeMetadata: true,
  });

  // Process entity results
  const entities = entityResults.matches
    .filter((match) => (match.score || 0) >= minScore)
    .map((match) => ({
      score: match.score || 0,
      metadata: match.metadata as EntityVectorMetadata,
    }));

  // Process relationship results
  const relationships = relationshipResults.matches
    .filter((match) => (match.score || 0) >= minScore)
    .map((match) => ({
      score: match.score || 0,
      metadata: match.metadata as EntityVectorMetadata,
    }));

  // Process observation results
  const observations = observationResults.matches
    .filter((match) => (match.score || 0) >= minScore)
    .map((match) => ({
      score: match.score || 0,
      metadata: match.metadata as EntityVectorMetadata,
    }));

  return {
    entities,
    relationships,
    observations,
  };
}
