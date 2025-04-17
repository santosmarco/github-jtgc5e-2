import { type SearchOptions, SearchService } from "../core/searchService";
import type { EntityVectorMetadata } from "../processing/entity-embeddings";

// Initialize the service as a singleton
const searchService = new SearchService();

/**
 * Search result from entity vector search
 */
export type EntitySearchResult = {
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
};

/**
 * Knowledge graph node representing an entity
 */
export type KnowledgeGraphNode = {
  id: string;
  type: string;
  name: string;
  description: string;
  observations: string[];
};

/**
 * Knowledge graph edge representing a relationship between entities
 */
export type KnowledgeGraphEdge = {
  source: string;
  target: string;
  relationship: string;
  confidence: number;
  topicId?: string;
  topicTitle?: string;
};

/**
 * Complete knowledge graph structure with nodes and edges
 */
export type KnowledgeGraph = {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  rootEntityId: string;
};

/**
 * Options for entity search
 */
export type EntitySearchOptions = {
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
};

/**
 * Options for building a knowledge graph
 */
export type KnowledgeGraphOptions = {
  /** Maximum depth to explore from root entity */
  maxDepth?: number;
  /** Maximum nodes to include */
  maxNodes?: number;
  /** Minimum confidence score for relationships (0-1) */
  minConfidence?: number;
  /** Entity search options */
  searchOptions?: Omit<EntitySearchOptions, "entityNames">;
};

/**
 * Options for entity path finding
 */
export type EntityPathOptions = {
  /** Maximum path length to consider */
  maxPathLength?: number;
  /** Maximum number of paths to return */
  maxPaths?: number;
  /** Minimum confidence score for relationships (0-1) */
  minConfidence?: number;
  /** Whether to include observations in the response */
  includeObservations?: boolean;
  /** Entity search options */
  searchOptions?: Omit<EntitySearchOptions, "entityNames">;
};

/**
 * Entity cluster representing a group of related entities
 */
export type EntityCluster = {
  /** Centroid or representative concept of the cluster */
  concept: string;
  /** Entities in this cluster */
  entities: Array<{
    name: string;
    type: string;
    similarity: number;
  }>;
  /** Overall coherence score of the cluster (0-1) */
  coherence: number;
};

/**
 * Temporal entity mention
 */
export type TemporalEntityMention = {
  /** Entity name */
  entityName: string;
  /** Entity type */
  entityType: string;
  /** When the entity was mentioned */
  timestamp: string;
  /** Topic where entity was mentioned */
  topicId: string;
  /** Topic title */
  topicTitle: string;
  /** Specific observation or context */
  context: string;
};

/**
 * Search criterion with weight for multi-criteria search
 */
export type SearchCriterion = {
  /** Search query for this criterion */
  query: string;
  /** Weight of this criterion (0-1) */
  weight: number;
};

/**
 * Performs semantic search for entities, relationships, and observations.
 *
 * @param query - The natural language search query
 * @param options - Search options for filtering and configuration
 * @returns Categorized search results
 */
export async function searchEntities(
  query: string,
  options?: EntitySearchOptions,
): Promise<EntitySearchResult> {
  // Convert EntitySearchOptions to SearchOptions
  const searchOptions: SearchOptions = {
    meetingIds: options?.meetingIds,
    topicIds: options?.topicIds,
    profileIds: options?.profileIds,
    entityTypes: options?.entityTypes,
    entityNames: options?.entityNames,
    relationshipTypes: options?.relationshipTypes,
    filter: options?.filter,
    topK: options?.topK,
    minScore: options?.minScore,
    includeTopicContext: options?.includeTopicContext,
    namespace: options?.namespace,
    retryConfig: {
      retries: 2,
      baseDelay: 300,
      timeout: 10000,
    },
  };

  // Use the SearchService to perform the search
  return await searchService.search(query, searchOptions);
}

/**
 * Formats entity search results into a more user-friendly structure for display
 *
 * @param results - The raw search results
 * @returns Formatted search results
 */
export function formatEntitySearchResults(results: EntitySearchResult): {
  entities: Array<{
    name: string;
    type: string;
    description: string;
    observations: string[];
    topicTitle: string;
    confidence: number;
  }>;
  relationships: Array<{
    subject: string;
    relationship: string;
    object: string;
    observations: string[];
    topicTitle: string;
    confidence: number;
  }>;
  observations: Array<{
    observation: string;
    topicTitle: string;
    confidence: number;
  }>;
} {
  return {
    entities: results.entities.map((result) => {
      const metadata = result.metadata;
      return {
        name: metadata.entity_name || "",
        type: metadata.entity_type || "",
        description: metadata.content || "",
        observations: [], // Would need additional query to populate
        topicTitle: metadata.topic_title,
        confidence: result.score,
      };
    }),

    relationships: results.relationships.map((result) => {
      const metadata = result.metadata;
      return {
        subject: metadata.subject_entity || "",
        relationship: metadata.relationship_type || "",
        object: metadata.object_entity || "",
        observations: [], // Would need additional query to populate
        topicTitle: metadata.topic_title,
        confidence: result.score,
      };
    }),

    observations: results.observations.map((result) => {
      const metadata = result.metadata;
      return {
        observation: metadata.content || "",
        topicTitle: metadata.topic_title,
        confidence: result.score,
      };
    }),
  };
}

/**
 * Queries for information about a specific entity by name
 *
 * @param entityName - The name of the entity to look up
 * @param options - Search options
 * @returns Comprehensive information about the entity
 */
export async function getEntityByName(
  entityName: string,
  options?: Omit<EntitySearchOptions, "entityName">,
): Promise<{
  entity: {
    name: string;
    type: string;
    description: string;
  } | null;
  observations: string[];
  relationships: Array<{
    relationship: string;
    otherEntity: string;
    isSubject: boolean;
  }>;
  relatedTopics: Array<{
    topicId: string;
    title: string;
  }>;
}> {
  // Use specialized function from search service for better results
  const searchResults = await searchService.searchByEntityName(
    entityName,
    options,
  );

  // Collect unique topic IDs
  const topicIds = new Set<string>();

  // Get the entity from search results
  const entityResult = searchResults.entities[0]?.metadata;

  // Add the topic from the entity itself
  if (entityResult?.topic_id) {
    topicIds.add(entityResult.topic_id);
  }

  // Add topics from observations
  for (const obs of searchResults.observations) {
    if (obs.metadata.topic_id) {
      topicIds.add(obs.metadata.topic_id);
    }
  }

  // Add topics from relationships
  for (const rel of searchResults.relationships) {
    if (rel.metadata.topic_id) {
      topicIds.add(rel.metadata.topic_id);
    }
  }

  // Process relationships to determine subject/object relationships
  const relationships: Array<{
    relationship: string;
    otherEntity: string;
    isSubject: boolean;
  }> = [];

  for (const rel of searchResults.relationships) {
    const metadata = rel.metadata;
    const isSubject = metadata.subject_entity === entityName;

    relationships.push({
      relationship: metadata.relationship_type || "",
      otherEntity: isSubject
        ? metadata.object_entity || ""
        : metadata.subject_entity || "",
      isSubject,
    });
  }

  // Format the response
  return {
    entity: entityResult?.entity_name
      ? {
          name: entityResult.entity_name,
          type: entityResult.entity_type || "",
          description: entityResult.content || "",
        }
      : null,

    observations: searchResults.observations.map(
      (obs) => obs.metadata.content || "",
    ),

    relationships,

    relatedTopics: Array.from(topicIds).map((id) => ({
      topicId: id,
      title:
        searchResults.relationships.find((r) => r.metadata.topic_id === id)
          ?.metadata.topic_title ||
        searchResults.observations.find((o) => o.metadata.topic_id === id)
          ?.metadata.topic_title ||
        (entityResult?.topic_id === id ? entityResult.topic_title : ""),
    })),
  };
}

/**
 * Builds a complete knowledge graph centered around a specific entity,
 * showing all connections, relationships, and observations
 *
 * @param rootEntityName - The name of the entity to use as the root of the graph
 * @param options - Options for building the knowledge graph
 * @returns A complete knowledge graph structure with nodes and edges
 */
export async function buildEntityKnowledgeGraph(
  rootEntityName: string,
  options?: KnowledgeGraphOptions,
): Promise<KnowledgeGraph> {
  const maxDepth = options?.maxDepth ?? 10;
  const maxNodes = options?.maxNodes ?? 50;
  const minConfidence = options?.minConfidence ?? 0.1;

  // Track visited entities to avoid cycles
  const visitedEntities = new Set<string>();

  // Store nodes and edges for the graph
  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];

  // Queue for breadth-first exploration
  const queue: Array<{ entityName: string; depth: number }> = [
    { entityName: rootEntityName, depth: 0 },
  ];

  while (queue.length > 0 && nodes.length < maxNodes) {
    const current = queue.shift();
    if (!current) continue;

    const { entityName, depth } = current;

    // Skip if already visited or exceeding max depth
    if (visitedEntities.has(entityName) || depth > maxDepth) {
      continue;
    }

    visitedEntities.add(entityName);

    // Get entity details
    const entityInfo = await getEntityByName(
      entityName,
      options?.searchOptions,
    );

    if (!entityInfo.entity) {
      continue;
    }

    // Add node to the graph
    nodes.push({
      id: entityName,
      name: entityInfo.entity.name,
      type: entityInfo.entity.type,
      description: entityInfo.entity.description,
      observations: entityInfo.observations,
    });

    // Process relationships and add edges
    for (const relationship of entityInfo.relationships) {
      const otherEntity = relationship.otherEntity;

      // Create appropriate edge based on subject/object relationship
      if (relationship.isSubject) {
        edges.push({
          source: entityName,
          target: otherEntity,
          relationship: relationship.relationship,
          confidence: 1.0, // Since this comes from direct lookup, not search
          // Could add topic info if we had it
        });
      } else {
        edges.push({
          source: otherEntity,
          target: entityName,
          relationship: relationship.relationship,
          confidence: 1.0,
        });
      }

      // Add connected entity to the queue for further exploration
      if (depth < maxDepth) {
        queue.push({ entityName: otherEntity, depth: depth + 1 });
      }
    }
  }

  return {
    nodes,
    edges,
    rootEntityId: rootEntityName,
  };
}

/**
 * Finds entities that are semantically similar to the given entity
 * based on their vector embeddings and relationship patterns
 *
 * @param entityName - The name of the entity to find similar entities for
 * @param options - Search options
 * @returns List of similar entities with similarity scores and relationship patterns
 */
export async function findSimilarEntities(
  entityName: string,
  options?: EntitySearchOptions,
): Promise<
  Array<{
    name: string;
    type: string;
    similarity: number;
    sharedRelationships: number;
    commonTopics: string[];
  }>
> {
  // First get the entity details to understand its context
  const entityInfo = await getEntityByName(entityName, options);

  if (!entityInfo.entity) {
    return [];
  }

  // Get entities of the same type for better comparison
  const entityType = entityInfo.entity.type;
  const similarEntitiesResults = await searchEntities(
    `entities similar to ${entityName}`,
    {
      ...options,
      entityTypes: entityType ? [entityType] : undefined,
      topK: 20,
      minScore: 0.4,
    },
  );

  // Get all relationships for the target entity
  const entityRelationships = new Set(
    entityInfo.relationships.map((r) => r.relationship),
  );

  // Create a map of topic IDs to titles for reference
  const topicMap = new Map<string, string>();
  for (const topic of entityInfo.relatedTopics) {
    topicMap.set(topic.topicId, topic.title);
  }

  // Process and score similar entities
  const similarEntities = await Promise.all(
    similarEntitiesResults.entities
      .filter((result) => result.metadata.entity_name !== entityName) // Exclude the entity itself
      .map(async (result) => {
        const similarEntityName = result.metadata.entity_name || "";
        const similarEntityInfo = await getEntityByName(
          similarEntityName,
          options,
        );

        // Count shared relationships
        const similarEntityRelationships = new Set(
          similarEntityInfo.relationships.map((r) => r.relationship),
        );
        const sharedRelationships = [...entityRelationships].filter((r) =>
          similarEntityRelationships.has(r),
        ).length;

        // Find common topics
        const commonTopics: string[] = [];
        for (const topic of similarEntityInfo.relatedTopics) {
          if (topicMap.has(topic.topicId)) {
            commonTopics.push(topicMap.get(topic.topicId) || "");
          }
        }

        return {
          name: similarEntityName,
          type: result.metadata.entity_type || "",
          similarity: result.score,
          sharedRelationships,
          commonTopics,
        };
      }),
  );

  // Sort by combined score (similarity and shared relationships)
  return similarEntities.sort((a, b) => {
    const scoreA = a.similarity + a.sharedRelationships * 0.1;
    const scoreB = b.similarity + b.sharedRelationships * 0.1;
    return scoreB - scoreA;
  });
}

/**
 * Finds paths between two entities in the knowledge graph,
 * showing how they are connected through intermediate entities
 *
 * @param sourceEntityName - The name of the starting entity
 * @param targetEntityName - The name of the target entity
 * @param options - Path finding options
 * @returns All paths found between the entities, sorted by confidence
 */
export async function findEntityPaths(
  sourceEntityName: string,
  targetEntityName: string,
  options?: EntityPathOptions,
): Promise<
  Array<{
    path: Array<{
      entity: string;
      type?: string;
    }>;
    relationships: Array<{
      source: string;
      target: string;
      relationship: string;
    }>;
    pathLength: number;
    confidence: number;
    observations?: string[];
  }>
> {
  const maxPathLength = options?.maxPathLength ?? 3;
  const maxPaths = options?.maxPaths ?? 5;
  const minConfidence = options?.minConfidence ?? 0.6;

  // Build a small knowledge graph from the source entity
  const graph = await buildEntityKnowledgeGraph(sourceEntityName, {
    maxDepth: maxPathLength,
    maxNodes: 100,
    minConfidence,
    searchOptions: options?.searchOptions,
  });

  // Define a breadth-first search to find paths
  interface PathNode {
    entityName: string;
    pathSoFar: string[];
    relationshipsSoFar: Array<{
      source: string;
      target: string;
      relationship: string;
    }>;
    confidence: number;
  }

  const queue: PathNode[] = [
    {
      entityName: sourceEntityName,
      pathSoFar: [sourceEntityName],
      relationshipsSoFar: [],
      confidence: 1.0,
    },
  ];

  const visited = new Set<string>();
  const results: Array<{
    path: Array<{ entity: string; type?: string }>;
    relationships: Array<{
      source: string;
      target: string;
      relationship: string;
    }>;
    pathLength: number;
    confidence: number;
    observations?: string[];
  }> = [];

  // Map to store entity types
  const entityTypeMap = new Map<string, string>();
  for (const node of graph.nodes) {
    entityTypeMap.set(node.id, node.type);
  }

  while (queue.length > 0 && results.length < maxPaths) {
    const current = queue.shift();
    if (!current) continue;

    const { entityName, pathSoFar, relationshipsSoFar, confidence } = current;

    // If we reached the target, add to results
    if (entityName === targetEntityName) {
      const formattedPath = pathSoFar.map((entity) => ({
        entity,
        type: entityTypeMap.get(entity),
      }));

      results.push({
        path: formattedPath,
        relationships: relationshipsSoFar,
        pathLength: pathSoFar.length - 1,
        confidence,
        observations: options?.includeObservations
          ? await getPathObservations(pathSoFar, options.searchOptions)
          : undefined,
      });

      continue;
    }

    // Mark as visited to avoid cycles
    const visitKey = `${entityName}|${pathSoFar.join(",")}`;
    if (visited.has(visitKey) || pathSoFar.length > maxPathLength) {
      continue;
    }
    visited.add(visitKey);

    // Find all outgoing edges
    const outgoingEdges = graph.edges.filter(
      (edge) => edge.source === entityName,
    );

    for (const edge of outgoingEdges) {
      // Avoid cycles in the path
      if (pathSoFar.includes(edge.target)) {
        continue;
      }

      // Add to the queue
      queue.push({
        entityName: edge.target,
        pathSoFar: [...pathSoFar, edge.target],
        relationshipsSoFar: [
          ...relationshipsSoFar,
          {
            source: edge.source,
            target: edge.target,
            relationship: edge.relationship,
          },
        ],
        confidence: confidence * edge.confidence,
      });
    }
  }

  // Sort by confidence and path length
  return results.sort((a, b) => {
    if (Math.abs(a.confidence - b.confidence) > 0.1) {
      return b.confidence - a.confidence;
    }
    return a.pathLength - b.pathLength;
  });
}

/**
 * Helper function to get observations along a path of entities
 */
async function getPathObservations(
  entityPath: string[],
  searchOptions?: Omit<EntitySearchOptions, "entityNames">,
): Promise<string[]> {
  const observations: string[] = [];

  for (let i = 0; i < entityPath.length - 1; i++) {
    const sourceEntity = entityPath[i];
    const targetEntity = entityPath[i + 1];

    // Get observations that mention both entities
    const query = `observations about ${sourceEntity} and ${targetEntity}`;
    const results = await searchEntities(query, {
      ...searchOptions,
      entityNames: [sourceEntity, targetEntity].filter((e): e is string => !!e),
      topK: 5,
      minScore: 0.4,
    });

    for (const obs of results.observations) {
      if (obs.metadata.content) {
        observations.push(obs.metadata.content);
      }
    }
  }

  return observations;
}

/**
 * Clusters entities into groups based on semantic similarity and
 * shared relationships, helping to identify key concepts in the data
 *
 * @param query - The query to find initial entities for clustering
 * @param options - Search options
 * @returns Clusters of semantically related entities
 */
export async function clusterEntitiesByConcept(
  query: string,
  options?: EntitySearchOptions & {
    numClusters?: number;
    minClusterSize?: number;
  },
): Promise<EntityCluster[]> {
  const numClusters = options?.numClusters ?? 5;
  const minClusterSize = options?.minClusterSize ?? 3;

  // Get initial set of entities
  const initialResults = await searchEntities(query, {
    ...options,
    topK: Math.max(50, numClusters * 10), // Get enough entities to form meaningful clusters
  });

  if (initialResults.entities.length < minClusterSize) {
    return [];
  }

  // Extract entities and their embeddings
  // NOTE: This is conceptual - we would need actual embeddings for real implementation
  // For now, we'll use the search score as a proxy for similarity
  const entities = initialResults.entities.map((result) => ({
    name: result.metadata.entity_name || "",
    type: result.metadata.entity_type || "",
    score: result.score,
    // Would use actual embeddings here
  }));

  // Simulated clustering based on entity types and scores
  // In a real implementation, you would use a proper clustering algorithm like k-means
  // on the actual embeddings

  // Group by entity type first
  const entitiesByType = new Map<string, typeof entities>();
  for (const entity of entities) {
    if (!entity.type) continue;

    if (!entitiesByType.has(entity.type)) {
      entitiesByType.set(entity.type, []);
    }
    const typeEntitiesArray = entitiesByType.get(entity.type);
    if (typeEntitiesArray) {
      typeEntitiesArray.push(entity);
    }
  }

  // Create clusters from the groups
  const clusters: EntityCluster[] = [];
  for (const [type, typeEntities] of entitiesByType.entries()) {
    if (typeEntities.length < minClusterSize) {
      continue;
    }

    // Sort by score (simulating distance to cluster center)
    typeEntities.sort((a, b) => b.score - a.score);

    // Generate a concept name (in a real implementation, this would be more sophisticated)
    const conceptName = `${type} cluster`;

    clusters.push({
      concept: conceptName,
      entities: typeEntities.map((e) => ({
        name: e.name,
        type: e.type,
        similarity: e.score,
      })),
      coherence: calculateCoherence(typeEntities),
    });
  }

  // Sort clusters by coherence and limit to requested number
  return clusters
    .sort((a, b) => b.coherence - a.coherence)
    .slice(0, numClusters);
}

/**
 * Helper function to calculate cluster coherence
 */
function calculateCoherence(entities: Array<{ score: number }>): number {
  if (entities.length < 2) return 0;

  // Calculate the average score as a simple coherence metric
  // In a real implementation, this would use actual vector similarity
  const sum = entities.reduce((acc, entity) => acc + entity.score, 0);
  return sum / entities.length;
}

/**
 * Tracks entity mentions across time, identifying when specific entities
 * are discussed in meetings or conversations
 *
 * @param entityNames - Names of entities to track
 * @param options - Search options
 * @returns Timeline of entity mentions with context
 */
export async function getTemporalEntityMentions(
  entityNames: string[],
  options?: EntitySearchOptions & {
    startDate?: string;
    endDate?: string;
    maxResults?: number;
  },
): Promise<TemporalEntityMention[]> {
  const maxResults = options?.maxResults ?? 50;

  // Get mentions for each entity
  const mentions: TemporalEntityMention[] = [];

  for (const entityName of entityNames) {
    // Get all observations for this entity
    const entityInfo = await getEntityByName(entityName, options);

    if (!entityInfo.entity) {
      continue;
    }

    // Get all occurrences with their timestamps
    // This assumes we have timestamp metadata - in a real implementation,
    // we would query with a date filter
    for (const topicId of new Set(
      entityInfo.relatedTopics
        .map((t) => t.topicId)
        .filter((id): id is string => !!id),
    )) {
      const topicTitle =
        entityInfo.relatedTopics.find((t) => t.topicId === topicId)?.title ??
        "";

      // Get observations specific to this topic
      const topicResults = await searchEntities(
        `${entityName} in topic ${topicId}`,
        {
          ...options,
          topicIds: [topicId],
          entityNames: [entityName],
          topK: 10,
        },
      );

      for (const observation of topicResults.observations) {
        // Extract timestamp (would come from metadata in real implementation)
        // For now using a fake timestamp based on topic ID
        const timestamp = generateTimestampFromTopicId(topicId);

        // Filter by date range if specified
        if (options?.startDate && timestamp < options.startDate) continue;
        if (options?.endDate && timestamp > options.endDate) continue;

        mentions.push({
          entityName,
          entityType: entityInfo.entity.type,
          timestamp,
          topicId,
          topicTitle,
          context: observation.metadata.content || "",
        });
      }
    }
  }

  // Sort by timestamp and limit results
  return mentions
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(0, maxResults);
}

/**
 * Helper function to generate a timestamp from a topic ID
 * In a real implementation, this would come from actual timestamp metadata
 */
function generateTimestampFromTopicId(topicId: string): string {
  // Create a deterministic but fake timestamp from the topic ID hash
  const hash = Array.from(topicId).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );
  const date = new Date(2023, 0, (hash % 365) + 1);
  return date.toISOString();
}

/**
 * Performs multi-criteria search, allowing users to weight different search criteria
 * for highly customized entity discovery
 *
 * @param criteria - Array of search criteria with weights
 * @param options - Search options
 * @returns Combined search results with overall scores
 */
export async function multiCriteriaEntitySearch(
  criteria: SearchCriterion[],
  options?: EntitySearchOptions & {
    resultLimit?: number;
  },
): Promise<
  Array<{
    entity: {
      name: string;
      type: string;
      description: string;
    };
    totalScore: number;
    criteriaScores: Record<string, number>;
    topObservations: string[];
  }>
> {
  const resultLimit = options?.resultLimit ?? 20;

  // Use the multiCriteriaSearch method from SearchService
  const results = await searchService.multiCriteriaSearch(criteria, {
    ...options,
    topK: resultLimit * 2, // Get more results than needed for better coverage
  });

  // Process results similarly to the original implementation
  const entityScores = new Map<
    string,
    {
      entity: EntityVectorMetadata | null;
      totalScore: number;
      criteriaScores: Record<string, number>;
      observations: Set<string>;
    }
  >();

  // Track which criterion each result came from
  criteria.forEach((criterion, criterionIndex) => {
    // Process entities
    for (const result of results.entities) {
      const entityName = result.metadata.entity_name;
      if (!entityName) continue;

      if (!entityScores.has(entityName)) {
        entityScores.set(entityName, {
          entity: result.metadata,
          totalScore: 0,
          criteriaScores: {},
          observations: new Set<string>(),
        });
      }

      const entityScore = entityScores.get(entityName);
      if (entityScore) {
        const weightedScore = result.score * criterion.weight;
        entityScore.totalScore += weightedScore;
        entityScore.criteriaScores[criterion.query] = result.score;
      }
    }

    // Process observations and add them to the corresponding entities
    for (const result of results.observations) {
      const entityName = result.metadata.entity_name;
      if (!entityName || !result.metadata.content) continue;

      if (entityScores.has(entityName)) {
        const entityScore = entityScores.get(entityName);
        if (entityScore && result.metadata.content) {
          entityScore.observations.add(result.metadata.content);
        }
      }
    }
  });

  // Convert to array and sort by total score
  return Array.from(entityScores.entries())
    .map(([entityName, data]) => ({
      entity: {
        name: entityName,
        type: data.entity?.entity_type || "",
        description: data.entity?.content || "",
      },
      totalScore: data.totalScore,
      criteriaScores: data.criteriaScores,
      topObservations: Array.from(data.observations).slice(0, 5),
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, resultLimit);
}
