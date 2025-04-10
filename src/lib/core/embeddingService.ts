import { v4 as uuidv4 } from "uuid";

import type {
  Entity,
  EntityRelation,
} from "~/lib/backend/services/entity-extraction/entity-extraction.schemas";
import { getEntitiesIndex } from "../pinecone/client";
import { embedText, embedTexts } from "../pinecone/embeddings";
import type { Tables } from "../supabase/database.types";
import type { EntityVectorMetadata } from "../processing/entity-embeddings";
import { executeWithRetry } from "./retry";

/**
 * Options for embedding entities, relationships, and observations
 */
export interface EmbeddingOptions {
  /** Custom namespace for the embeddings (defaults to entity-specific ones) */
  namespace?: string;
  /** Batch size for processing observations (default: 10) */
  batchSize?: number;
  /** Retry configuration */
  retryConfig?: {
    retries?: number;
    baseDelay?: number;
    timeout?: number;
  };
}

/**
 * Default embedding options
 */
const DEFAULT_BATCH_SIZE = 10;

/**
 * Service for embedding entities, relationships, and observations
 */
export class EmbeddingService {
  /**
   * Generates a prefixed ID for better document management
   */
  private generatePrefixedId(prefix: string, subType?: string): string {
    const uniqueId = uuidv4();
    return subType
      ? `${prefix}#${subType}#${uniqueId}`
      : `${prefix}#${uniqueId}`;
  }

  /**
   * Processes a batch of observations and embeds them
   */
  private async processBatchedObservations<
    T extends { observations: string[] },
  >(
    item: T,
    baseMetadata: EntityVectorMetadata,
    enhanceObservation: (observation: string) => string,
    namespace: string,
    batchSize: number = DEFAULT_BATCH_SIZE,
    retryConfig?: EmbeddingOptions["retryConfig"],
  ): Promise<void> {
    try {
      let index = await getEntitiesIndex();
      index = index.namespace(namespace);

      // Create a prefix for all observations related to this entity/relationship
      const idPrefix = `${baseMetadata.meeting_id}#${baseMetadata.topic_id}#${baseMetadata.id}`;

      for (let i = 0; i < item.observations.length; i += batchSize) {
        const batch = item.observations.slice(i, i + batchSize);
        const enhancedObservations = batch.map(enhanceObservation);

        // Get embeddings for batch with retry
        const embeddings = await executeWithRetry(
          () => embedTexts(enhancedObservations),
          {
            retries: retryConfig?.retries ?? 2,
            baseDelay: retryConfig?.baseDelay ?? 300,
            timeout: retryConfig?.timeout ?? 15000,
            onRetry: (attempt, error) => {
              console.warn(
                `Retry attempt ${attempt} for embedding batch of observations:`,
                error.message,
              );
            },
          },
        );

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

        // Upsert vectors with retry
        await executeWithRetry(() => index.upsert(vectors), {
          retries: retryConfig?.retries ?? 2,
          baseDelay: retryConfig?.baseDelay ?? 300,
          timeout: retryConfig?.timeout ?? 10000,
          onRetry: (attempt, error) => {
            console.warn(
              `Retry attempt ${attempt} for upserting observation vectors:`,
              error.message,
            );
          },
        });
      }
    } catch (error) {
      console.error("Error processing observations:", error);
      throw error;
    }
  }

  /**
   * Embeds a single entity and its observations
   */
  public async embedEntity(
    entity: Entity,
    meeting: Tables<"meetings">,
    topicId: string,
    topicTitle: string,
    options?: EmbeddingOptions,
  ): Promise<void> {
    try {
      const namespace = options?.namespace || "entities";
      let index = await getEntitiesIndex();
      index = index.namespace(namespace);

      // Create a comprehensive text representation of the entity
      const entityText = `Entity: ${entity.name}\nType: ${entity.type}\nDescription: ${entity.description}`;

      // Generate a prefixed ID for the entity
      const entityPrefix = `${meeting.video_api_id}#${topicId}#entity`;
      const entitySubType = `${entity.type}#${entity.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const entityId = this.generatePrefixedId(entityPrefix, entitySubType);

      // Get the embedding with retry
      const embedding = await executeWithRetry(() => embedText(entityText), {
        retries: options?.retryConfig?.retries ?? 2,
        baseDelay: options?.retryConfig?.baseDelay ?? 300,
        timeout: options?.retryConfig?.timeout ?? 10000,
        onRetry: (attempt, error) => {
          console.warn(
            `Retry attempt ${attempt} for entity embedding:`,
            error.message,
          );
        },
      });

      // Prepare metadata (keeping the same structure)
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

      // Upsert the vector with retry
      await executeWithRetry(
        () =>
          index.upsert([
            {
              id: entityId,
              values: embedding,
              metadata,
            },
          ]),
        {
          retries: options?.retryConfig?.retries ?? 2,
          baseDelay: options?.retryConfig?.baseDelay ?? 300,
          timeout: options?.retryConfig?.timeout ?? 10000,
          onRetry: (attempt, error) => {
            console.warn(
              `Retry attempt ${attempt} for entity upsert:`,
              error.message,
            );
          },
        },
      );

      // Embed each observation separately if they exist
      if (entity.observations && entity.observations.length > 0) {
        await this.processBatchedObservations(
          entity,
          metadata,
          (obs) => `Observation about ${entity.type} "${entity.name}": ${obs}`,
          namespace,
          options?.batchSize,
          options?.retryConfig,
        );
      }
    } catch (error) {
      console.error(`Error embedding entity ${entity.name}:`, error);
      throw error;
    }
  }

  /**
   * Embeds a relationship between entities and its observations
   */
  public async embedRelationship(
    relationship: EntityRelation,
    meeting: Tables<"meetings">,
    topicId: string,
    topicTitle: string,
    options?: EmbeddingOptions,
  ): Promise<void> {
    try {
      const namespace = options?.namespace || "relationships";
      let index = await getEntitiesIndex();
      index = index.namespace(namespace);

      // Create a comprehensive text representation of the relationship
      const relationshipText = `Relationship: ${relationship.entity1} ${relationship.relationship} ${relationship.entity2}`;

      // Generate a prefixed ID for the relationship
      const relationPrefix = `${meeting.video_api_id}#${topicId}#relation`;
      const relationSubType = `${relationship.entity1.replace(/[^a-zA-Z0-9]/g, "_")}#${relationship.relationship.replace(/[^a-zA-Z0-9]/g, "_")}#${relationship.entity2.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const relationshipId = this.generatePrefixedId(
        relationPrefix,
        relationSubType,
      );

      // Get the embedding with retry
      const embedding = await executeWithRetry(
        () => embedText(relationshipText),
        {
          retries: options?.retryConfig?.retries ?? 2,
          baseDelay: options?.retryConfig?.baseDelay ?? 300,
          timeout: options?.retryConfig?.timeout ?? 10000,
          onRetry: (attempt, error) => {
            console.warn(
              `Retry attempt ${attempt} for relationship embedding:`,
              error.message,
            );
          },
        },
      );

      // Prepare metadata (keeping the same structure)
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

      // Upsert the vector with retry
      await executeWithRetry(
        () =>
          index.upsert([
            {
              id: relationshipId,
              values: embedding,
              metadata,
            },
          ]),
        {
          retries: options?.retryConfig?.retries ?? 2,
          baseDelay: options?.retryConfig?.baseDelay ?? 300,
          timeout: options?.retryConfig?.timeout ?? 10000,
          onRetry: (attempt, error) => {
            console.warn(
              `Retry attempt ${attempt} for relationship upsert:`,
              error.message,
            );
          },
        },
      );

      // Embed each observation separately if they exist
      if (relationship.observations && relationship.observations.length > 0) {
        await this.processBatchedObservations(
          relationship,
          metadata,
          (obs) =>
            `Observation about relationship "${relationship.entity1} ${relationship.relationship} ${relationship.entity2}": ${obs}`,
          namespace,
          options?.batchSize,
          options?.retryConfig,
        );
      }
    } catch (error) {
      console.error(
        `Error embedding relationship ${relationship.relationship}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Embeds general observations
   */
  public async embedObservations(
    observations: string[],
    meeting: Tables<"meetings">,
    topicId: string,
    topicTitle: string,
    options?: EmbeddingOptions,
  ): Promise<void> {
    try {
      const namespace = options?.namespace || "observations";
      let index = await getEntitiesIndex();
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

        // Get embeddings for the batch with retry
        const embeddings = await executeWithRetry(
          () => embedTexts(enhancedObservations),
          {
            retries: options?.retryConfig?.retries ?? 2,
            baseDelay: options?.retryConfig?.baseDelay ?? 300,
            timeout: options?.retryConfig?.timeout ?? 15000,
            onRetry: (attempt, error) => {
              console.warn(
                `Retry attempt ${attempt} for embedding batch of general observations:`,
                error.message,
              );
            },
          },
        );

        // Prepare vectors for batch insertion
        const vectors = batch.map((observation, index) => {
          const observationId = this.generatePrefixedId(observationPrefix);
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

        // Upsert the vectors with retry
        await executeWithRetry(() => index.upsert(vectors), {
          retries: options?.retryConfig?.retries ?? 2,
          baseDelay: options?.retryConfig?.baseDelay ?? 300,
          timeout: options?.retryConfig?.timeout ?? 10000,
          onRetry: (attempt, error) => {
            console.warn(
              `Retry attempt ${attempt} for upserting general observation vectors:`,
              error.message,
            );
          },
        });
      }
    } catch (error) {
      console.error("Error embedding observations:", error);
      throw error;
    }
  }

  /**
   * Embeds all entities, relationships, and observations from a topic
   */
  public async embedTopicEntities(
    extractionOutput: {
      entities: Entity[];
      relationships: EntityRelation[];
      observations?: string[];
    },
    meeting: Tables<"meetings">,
    topicId: string,
    topicTitle: string,
    options?: EmbeddingOptions,
  ): Promise<void> {
    try {
      // Embed entities
      await Promise.all(
        extractionOutput.entities.map((entity) =>
          this.embedEntity(entity, meeting, topicId, topicTitle, options),
        ),
      );

      // Embed relationships
      await Promise.all(
        extractionOutput.relationships.map((relationship) =>
          this.embedRelationship(
            relationship,
            meeting,
            topicId,
            topicTitle,
            options,
          ),
        ),
      );

      // Embed general observations
      if (
        extractionOutput.observations &&
        Array.isArray(extractionOutput.observations) &&
        extractionOutput.observations.length > 0
      ) {
        await this.embedObservations(
          extractionOutput.observations,
          meeting,
          topicId,
          topicTitle,
          options,
        );
      }
    } catch (error) {
      console.error(
        `Error embedding topic entities for topic ${topicId}:`,
        error,
      );
      throw error;
    }
  }
}
