import { getEntitiesIndex } from "../pinecone/client";
import { embedText } from "../pinecone/embeddings";
import type { EntityVectorMetadata } from "../processing/entity-embeddings";
import { executeWithRetry } from "./retry";

/**
 * Search options that apply to all search operations
 */
export interface SearchOptions {
  /** Filter by meeting ID */
  meetingIds?: string[];
  /** Filter by topic ID */
  topicIds?: string[];
  /** Filter by profile ID */
  profileIds?: string[];
  /** Filter by entity type */
  entityTypes?: string[];
  /** Filter by entity name */
  entityNames?: string[];
  /** Filter by relationship type */
  relationshipTypes?: string[];
  /** Custom filters */
  filter?: Record<string, unknown>;
  /** Maximum number of results per category */
  topK?: number;
  /** Minimum similarity score (0-1) */
  minScore?: number;
  /** Include topic context in response */
  includeTopicContext?: boolean;
  /** Namespace to search in (leave undefined to search all) */
  namespace?: string;
  /** Retry configuration */
  retryConfig?: {
    retries?: number;
    baseDelay?: number;
    timeout?: number;
  };
}

/**
 * Unified search result format
 */
export interface SearchResult {
  entities: Array<{
    score: number;
    metadata: EntityVectorMetadata;
  }>;
  relationships: Array<{
    score: number;
    metadata: EntityVectorMetadata;
  }>;
  observations: Array<{
    score: number;
    metadata: EntityVectorMetadata;
  }>;
}

/**
 * Service responsible for all search operations across entity, relationship,
 * and observation namespaces
 */
export class SearchService {
  /**
   * Creates a base filter from search options
   */
  private createBaseFilter(options: SearchOptions): Record<string, unknown> {
    const baseFilter: Record<string, unknown> = { ...options.filter };

    if (options.meetingIds?.length) {
      baseFilter.meeting_id = { $in: options.meetingIds };
    }

    if (options.topicIds?.length) {
      baseFilter.topic_id = { $in: options.topicIds };
    }

    if (options.profileIds?.length) {
      baseFilter.profile_id = { $in: options.profileIds };
    }

    if (options.entityTypes?.length) {
      baseFilter.entity_type = { $in: options.entityTypes };
    }

    if (options.entityNames?.length) {
      baseFilter.entity_name = { $in: options.entityNames };
    }

    if (options.relationshipTypes?.length) {
      baseFilter.relationship_type = { $in: options.relationshipTypes };
    }

    return baseFilter;
  }

  /**
   * Performs search for a specific content type with specialized filters
   */
  private async searchNamespace(
    namespace: string,
    query: string,
    embedding: number[],
    options: SearchOptions,
    contentTypeFilter?: Record<string, unknown>,
  ) {
    const baseFilter = this.createBaseFilter(options);
    const filter = {
      ...baseFilter,
      ...contentTypeFilter,
    };

    const index = (await getEntitiesIndex()).namespace(namespace);

    return executeWithRetry(
      async () => {
        const results = await index.query({
          vector: embedding,
          topK: options.topK || 10,
          filter,
          includeMetadata: true,
        });

        // Filter by minimum score
        const minScore = options.minScore ?? 0.2;
        return results.matches
          .filter((match) => (match.score || 0) >= minScore)
          .map((match) => ({
            score: match.score || 0,
            metadata: match.metadata as EntityVectorMetadata,
          }));
      },
      {
        retries: options.retryConfig?.retries ?? 2,
        baseDelay: options.retryConfig?.baseDelay ?? 300,
        timeout: options.retryConfig?.timeout ?? 10000,
        onRetry: (attempt, error) => {
          console.warn(
            `Retry attempt ${attempt} for search in namespace '${namespace}':`,
            error.message,
          );
        },
      },
    );
  }

  /**
   * Performs semantic search for entities, relationships, and observations
   * using unified options and error handling
   */
  public async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult> {
    try {
      // Get query embedding
      const embedding = await embedText(query);

      // Perform parallel searches across namespaces
      const [entityResults, relationshipResults, observationResults] =
        await Promise.all([
          this.searchNamespace("entities", query, embedding, options, {
            content_type: { $eq: "entity" },
          }),
          this.searchNamespace("relationships", query, embedding, options, {
            content_type: { $eq: "relationship" },
          }),
          this.searchNamespace("observations", query, embedding, options, {
            content_type: { $eq: "observation" },
          }),
        ]);

      return {
        entities: entityResults,
        relationships: relationshipResults,
        observations: observationResults,
      };
    } catch (error) {
      console.error("Search service error:", error);
      throw error;
    }
  }

  /**
   * Specialized search for entities by exact name
   */
  public async searchByEntityName(
    entityName: string,
    options: SearchOptions = {},
  ): Promise<SearchResult> {
    // Create a search specifically for this entity name
    const entityNameFilter = { entity_name: { $eq: entityName } };

    // Find direct matches for the entity
    const entityResults = await this.searchNamespace(
      "entities",
      entityName,
      await embedText(entityName),
      options,
      { ...entityNameFilter, content_type: { $eq: "entity" } },
    );

    // Find relationships where this entity is the subject
    const asSubjectFilter = { subject_entity: { $eq: entityName } };
    const subjectResults = await this.searchNamespace(
      "relationships",
      entityName,
      await embedText(entityName),
      options,
      { ...asSubjectFilter, content_type: { $eq: "relationship" } },
    );

    // Find relationships where this entity is the object
    const asObjectFilter = { object_entity: { $eq: entityName } };
    const objectResults = await this.searchNamespace(
      "relationships",
      entityName,
      await embedText(entityName),
      options,
      { ...asObjectFilter, content_type: { $eq: "relationship" } },
    );

    // Find observations about this entity
    const observationQuery = `observations about ${entityName}`;
    const observationResults = await this.searchNamespace(
      "observations",
      observationQuery,
      await embedText(observationQuery),
      options,
      { content_type: { $eq: "observation" } },
    );

    return {
      entities: entityResults,
      relationships: [...subjectResults, ...objectResults],
      observations: observationResults,
    };
  }

  /**
   * Performs multi-criteria search based on weighted search criteria
   */
  public async multiCriteriaSearch(
    criteria: Array<{ query: string; weight: number }>,
    options: SearchOptions = {},
  ): Promise<SearchResult> {
    // Normalize weights to sum to 1
    const totalWeight = criteria.reduce(
      (sum, criterion) => sum + criterion.weight,
      0,
    );
    const normalizedCriteria = criteria.map((c) => ({
      ...c,
      weight: c.weight / totalWeight,
    }));

    // Perform each search
    const searchResults = await Promise.all(
      normalizedCriteria.map((criterion) =>
        this.search(criterion.query, options),
      ),
    );

    // Track entities, relationships, and observations with scores
    const entityScores = new Map<
      string,
      {
        score: number;
        result: { score: number; metadata: EntityVectorMetadata };
      }
    >();
    const relationshipScores = new Map<
      string,
      {
        score: number;
        result: { score: number; metadata: EntityVectorMetadata };
      }
    >();
    const observationScores = new Map<
      string,
      {
        score: number;
        result: { score: number; metadata: EntityVectorMetadata };
      }
    >();

    // Process each search result with its weight
    normalizedCriteria.forEach((criterion, index) => {
      const result = searchResults[index];
      if (!result) return;

      // Process entities
      for (const entity of result.entities) {
        const id = entity.metadata.id;
        const weightedScore = entity.score * criterion.weight;

        if (
          !entityScores.has(id) ||
          weightedScore > (entityScores.get(id)?.score || 0)
        ) {
          entityScores.set(id, { score: weightedScore, result: entity });
        }
      }

      // Process relationships
      for (const relationship of result.relationships) {
        const id = relationship.metadata.id;
        const weightedScore = relationship.score * criterion.weight;

        if (
          !relationshipScores.has(id) ||
          weightedScore > (relationshipScores.get(id)?.score || 0)
        ) {
          relationshipScores.set(id, {
            score: weightedScore,
            result: relationship,
          });
        }
      }

      // Process observations
      for (const observation of result.observations) {
        const id = observation.metadata.id;
        const weightedScore = observation.score * criterion.weight;

        if (
          !observationScores.has(id) ||
          weightedScore > (observationScores.get(id)?.score || 0)
        ) {
          observationScores.set(id, {
            score: weightedScore,
            result: observation,
          });
        }
      }
    });

    // Combine and return results
    return {
      entities: Array.from(entityScores.values())
        .sort((a, b) => b.score - a.score)
        .map((item) => item.result)
        .slice(0, options.topK || 10),

      relationships: Array.from(relationshipScores.values())
        .sort((a, b) => b.score - a.score)
        .map((item) => item.result)
        .slice(0, options.topK || 10),

      observations: Array.from(observationScores.values())
        .sort((a, b) => b.score - a.score)
        .map((item) => item.result)
        .slice(0, options.topK || 10),
    };
  }
}
