import { z } from "zod";
import { tool } from "ai";
import {
  searchEntities,
  formatEntitySearchResults,
  getEntityByName,
  type EntitySearchOptions,
} from "../graph/entity-search";

/**
 * Tool that allows the LLM to perform semantic search over entities
 *
 * This tool should be used when the LLM needs to find information about
 * specific entities, relationships, or observations that might be relevant
 * to answering a question or solving a problem.
 */
export const entitySemanticSearchTool = tool({
  description:
    "Search for entities, relationships, and observations using natural language",
  parameters: z.object({
    query: z.string().describe("The natural language search query"),
    meetingIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of meeting IDs to limit the search to"),
    topicIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of topic IDs to limit the search to"),
    profileIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of profile IDs to limit the search to"),
    entityTypes: z
      .array(z.string())
      .optional()
      .describe(
        "Optional array of entity types to filter by (e.g., 'Person', 'Project', 'Decision')",
      ),
    minScore: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Minimum similarity score (0-1) to include in results"),
    topK: z
      .number()
      .positive()
      .optional()
      .describe("Maximum number of results to return per category"),
  }),
  execute: async (params) => {
    try {
      const {
        query,
        meetingIds,
        topicIds,
        profileIds,
        entityTypes,
        minScore = 0.2,
        topK = 10,
      } = params;

      const options: EntitySearchOptions = {
        meetingIds,
        topicIds,
        profileIds,
        entityTypes,
        minScore,
        topK,
      };

      // Perform the semantic search
      const results = await searchEntities(query, options);

      // Format the results to be more readable
      const formattedResults = formatEntitySearchResults(results);

      // Return a well-structured response
      return {
        success: true,
        query,
        totalResults: {
          entities: results.entities.length,
          relationships: results.relationships.length,
          observations: results.observations.length,
        },
        results: formattedResults,
      };
    } catch (error) {
      return {
        success: false,
        query: params.query,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred during search",
        suggestion:
          "Try a different search query or check your filter parameters",
      };
    }
  },
});

/**
 * Tool that allows the LLM to look up comprehensive information about a specific entity
 *
 * This tool should be used when the LLM needs detailed information about a specific
 * entity, including its relationships and observations across different contexts.
 */
export const entityLookupTool = tool({
  description:
    "Look up comprehensive information about a specific entity by name",
  parameters: z.object({
    entityName: z.string().describe("The exact name of the entity to look up"),
    meetingIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of meeting IDs to limit the search to"),
    topicIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of topic IDs to limit the search to"),
    profileIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of profile IDs to limit the search to"),
  }),
  execute: async (params) => {
    try {
      const { entityName, meetingIds, topicIds, profileIds } = params;

      const options: Omit<EntitySearchOptions, "entityName"> = {
        meetingIds,
        topicIds,
        profileIds,
      };

      // Get comprehensive entity information
      const entityInfo = await getEntityByName(entityName, options);

      if (!entityInfo.entity) {
        return {
          success: false,
          entityName,
          error: `Entity '${entityName}' not found`,
          suggestion: "Check the entity name or try a semantic search instead",
        };
      }

      return {
        success: true,
        entityName,
        entity: entityInfo.entity,
        observations: entityInfo.observations,
        relationships: entityInfo.relationships,
        relatedTopics: entityInfo.relatedTopics,
      };
    } catch (error) {
      return {
        success: false,
        entityName: params.entityName,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred during entity lookup",
        suggestion:
          "Try a different entity name or check your filter parameters",
      };
    }
  },
});

/**
 * Tool that allows the LLM to find topics related to a specific query
 *
 * This tool should be used when the LLM needs to find meeting topics
 * that might contain relevant information for answering a question.
 */
export const findRelatedTopicsTool = tool({
  description: "Find meeting topics that are relevant to a specific query",
  parameters: z.object({
    query: z.string().describe("The natural language search query"),
    meetingIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of meeting IDs to limit the search to"),
    profileIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of profile IDs to limit the search to"),
    minScore: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Minimum similarity score (0-1) to include in results"),
    maxTopics: z
      .number()
      .positive()
      .optional()
      .describe("Maximum number of topics to return"),
  }),
  execute: async (params) => {
    try {
      const {
        query,
        meetingIds,
        profileIds,
        minScore = 0.7,
        maxTopics = 5,
      } = params;

      // Perform a search that targets topic titles and summaries
      const results = await searchEntities(query, {
        meetingIds,
        profileIds,
        minScore,
        topK: maxTopics * 3, // Get more results to ensure we have enough unique topics
      });

      // Extract unique topics from all results
      const topicMap = new Map<
        string,
        { topicId: string; title: string; score: number }
      >();

      // Process entities
      for (const item of results.entities) {
        if (!topicMap.has(item.metadata.topic_id)) {
          topicMap.set(item.metadata.topic_id, {
            topicId: item.metadata.topic_id,
            title: item.metadata.topic_title,
            score: item.score,
          });
        }
      }

      // Process relationships
      for (const item of results.relationships) {
        if (!topicMap.has(item.metadata.topic_id)) {
          topicMap.set(item.metadata.topic_id, {
            topicId: item.metadata.topic_id,
            title: item.metadata.topic_title,
            score: item.score,
          });
        }
      }

      // Process observations
      for (const item of results.observations) {
        if (!topicMap.has(item.metadata.topic_id)) {
          topicMap.set(item.metadata.topic_id, {
            topicId: item.metadata.topic_id,
            title: item.metadata.topic_title,
            score: item.score,
          });
        }
      }

      // Convert to array, sort by score, and limit to maxTopics
      const topics = Array.from(topicMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, maxTopics);

      return {
        success: true,
        query,
        totalTopicsFound: topics.length,
        topics,
      };
    } catch (error) {
      return {
        success: false,
        query: params.query,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred during topic search",
        suggestion:
          "Try a different search query or check your filter parameters",
      };
    }
  },
});

/**
 * Tool that allows the LLM to find all relationships for a specific entity
 *
 * This tool should be used when the LLM needs to understand all connections
 * and relationships a particular entity has within the knowledge graph.
 */
export const findEntityRelationshipsTool = tool({
  description:
    "Find all relationships that a specific entity has with other entities",
  parameters: z.object({
    entityName: z
      .string()
      .describe("The exact name of the entity to find relationships for"),
    meetingIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of meeting IDs to limit the search to"),
    topicIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of topic IDs to limit the search to"),
    profileIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of profile IDs to limit the search to"),
    relationshipTypes: z
      .array(z.string())
      .optional()
      .describe("Optional array of relationship types to filter by"),
    maxRelationships: z
      .number()
      .positive()
      .optional()
      .describe("Maximum number of relationships to return"),
  }),
  execute: async (params) => {
    try {
      const {
        entityName,
        meetingIds,
        topicIds,
        profileIds,
        relationshipTypes,
        maxRelationships = 20,
      } = params;

      const options: EntitySearchOptions = {
        meetingIds,
        topicIds,
        profileIds,
        relationshipTypes,
        topK: maxRelationships,
      };

      // Find relationships where this entity is the subject
      const asSubjectResults = await searchEntities("", {
        ...options,
        filter: {
          subject_entity: { $eq: entityName },
        },
      });

      // Find relationships where this entity is the object
      const asObjectResults = await searchEntities("", {
        ...options,
        filter: {
          object_entity: { $eq: entityName },
        },
      });

      // Combine the relationships
      const allRelationships = [
        ...asSubjectResults.relationships.map((rel) => ({
          relationship: rel.metadata.relationship_type || "",
          otherEntity: rel.metadata.object_entity || "",
          isSubject: true,
          topicId: rel.metadata.topic_id,
          topicTitle: rel.metadata.topic_title,
          score: rel.score,
        })),
        ...asObjectResults.relationships.map((rel) => ({
          relationship: rel.metadata.relationship_type || "",
          otherEntity: rel.metadata.subject_entity || "",
          isSubject: false,
          topicId: rel.metadata.topic_id,
          topicTitle: rel.metadata.topic_title,
          score: rel.score,
        })),
      ]
        .sort((a, b) => b.score - a.score)
        .slice(0, maxRelationships);

      return {
        success: true,
        entityName,
        totalRelationships: allRelationships.length,
        relationships: allRelationships,
      };
    } catch (error) {
      return {
        success: false,
        entityName: params.entityName,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred during relationship search",
        suggestion:
          "Try a different entity name or check your filter parameters",
      };
    }
  },
});

/**
 * Tool that allows the LLM to discover key entities across meetings
 *
 * This tool should be used when the LLM needs to identify important entities
 * that appear frequently across different meetings or topics.
 */
export const discoverKeyEntitiesTool = tool({
  description:
    "Discover key entities that appear frequently across meetings or topics",
  parameters: z.object({
    entityTypes: z
      .array(z.string())
      .optional()
      .describe(
        "Optional array of entity types to filter by (e.g., 'Person', 'Project', 'Decision')",
      ),
    meetingIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of meeting IDs to limit the search to"),
    topicIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of topic IDs to limit the search to"),
    profileIds: z
      .array(z.string())
      .optional()
      .describe("Optional array of profile IDs to limit the search to"),
    maxEntities: z
      .number()
      .positive()
      .optional()
      .describe("Maximum number of entities to return"),
  }),
  execute: async (params) => {
    try {
      const {
        entityTypes,
        meetingIds,
        topicIds,
        profileIds,
        maxEntities = 10,
      } = params;

      // We'll use a generic search query that should bring important entities
      const resultsA = await searchEntities("important entities", {
        entityTypes,
        meetingIds,
        topicIds,
        profileIds,
        topK: maxEntities * 2,
      });

      const resultsB = await searchEntities(
        "key people projects and decisions",
        {
          entityTypes,
          meetingIds,
          topicIds,
          profileIds,
          topK: maxEntities * 2,
        },
      );

      // Combine entities from both searches and deduplicate
      const entityMap = new Map<
        string,
        {
          name: string;
          type: string;
          description: string;
          score: number;
          mentionCount: number;
        }
      >();

      // Process entities from first search
      for (const entity of resultsA.entities) {
        if (!entity.metadata.entity_name) continue;

        const key = `${entity.metadata.entity_name}:${entity.metadata.entity_type || "unknown"}`;

        if (entityMap.has(key)) {
          const existing = entityMap.get(key)!;
          existing.score = Math.max(existing.score, entity.score);
          existing.mentionCount += 1;
        } else {
          entityMap.set(key, {
            name: entity.metadata.entity_name,
            type: entity.metadata.entity_type || "unknown",
            description: entity.metadata.content || "",
            score: entity.score,
            mentionCount: 1,
          });
        }
      }

      // Process entities from second search
      for (const entity of resultsB.entities) {
        if (!entity.metadata.entity_name) continue;

        const key = `${entity.metadata.entity_name}:${entity.metadata.entity_type || "unknown"}`;

        if (entityMap.has(key)) {
          const existing = entityMap.get(key)!;
          existing.score = Math.max(existing.score, entity.score);
          existing.mentionCount += 1;
        } else {
          entityMap.set(key, {
            name: entity.metadata.entity_name,
            type: entity.metadata.entity_type || "unknown",
            description: entity.metadata.content || "",
            score: entity.score,
            mentionCount: 1,
          });
        }
      }

      // Convert to array, sort by score and mention count, and limit to maxEntities
      const entities = Array.from(entityMap.values())
        .sort((a, b) => {
          // Sort by mention count first, then by score
          if (a.mentionCount !== b.mentionCount) {
            return b.mentionCount - a.mentionCount;
          }
          return b.score - a.score;
        })
        .slice(0, maxEntities);

      return {
        success: true,
        totalEntitiesFound: entities.length,
        entities,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred during key entity discovery",
        suggestion: "Try different filter parameters",
      };
    }
  },
});

/**
 * Export all AI search tools in a bundle
 */
export const aiSearchTools = {
  entitySemanticSearchTool,
  entityLookupTool,
  findRelatedTopicsTool,
  findEntityRelationshipsTool,
  discoverKeyEntitiesTool,
};
