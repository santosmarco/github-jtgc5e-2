import { z } from "zod";
import { tool } from "~/lib/ai/tools";
import { createClient as createSupabaseClient } from "~/lib/supabase/server";
import {
  type EntitySearchOptions,
  formatEntitySearchResults,
  getEntityByName,
  searchEntities,
} from "../graph/entity-search";

/**
 * Helper function to check if profile owns any videos
 */
async function getValidProfileMeetingIds(
  profileId: string,
  apiVideoIds: string[] | undefined,
): Promise<string[]> {
  if (!apiVideoIds?.length) {
    return [];
  }

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase
    .from("meetings")
    .select("id")
    .in("video_api_id", apiVideoIds)
    .eq("profile_id", profileId);

  if (error) {
    throw new Error("Failed to check profile videos");
  }

  return data;
}

/**
 * Tool that allows the LLM to perform semantic search over entities
 */
export const entitySemanticSearchTool = (profileId: string) =>
  tool({
    description:
      "Search for entities, relationships, and observations using natural language. Useful when you need to find relevant information across meetings without knowing exact entity names or when exploring connections between different concepts.",
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
    output: z.object({
      success: z.boolean(),
      query: z.string(),
      totalResults: z
        .object({
          entities: z.number(),
          relationships: z.number(),
          observations: z.number(),
        })
        .optional(),
      results: z
        .object({
          entities: z.array(
            z.object({
              name: z.string(),
              type: z.string(),
              description: z.string(),
              observations: z.array(z.string()),
              topicTitle: z.string(),
              confidence: z.number(),
            }),
          ),
          relationships: z.array(
            z.object({
              subject: z.string(),
              relationship: z.string(),
              object: z.string(),
              observations: z.array(z.string()),
              topicTitle: z.string(),
              confidence: z.number(),
            }),
          ),
          observations: z.array(
            z.object({
              observation: z.string(),
              topicTitle: z.string(),
              confidence: z.number(),
            }),
          ),
        })
        .optional(),
      error: z.string().optional(),
      suggestion: z.string().optional(),
    }),
    execute: async (params) => {
      try {
        const {
          query,
          meetingIds: meetingIds_,
          topicIds,
          entityTypes,
          minScore = 0.2,
          topK = 10,
        } = params;

        const meetingIds =
          meetingIds_ &&
          (await getValidProfileMeetingIds(profileId, meetingIds_));

        const options: EntitySearchOptions = {
          meetingIds,
          topicIds,
          profileIds: [profileId],
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
 */
export const entityLookupTool = (profileId: string) =>
  tool({
    description:
      "Look up comprehensive information about a specific entity by name. Useful when you need detailed context about a known entity, including its description, relationships, and all related observations across meetings.",
    parameters: z.object({
      entityName: z
        .string()
        .describe("The exact name of the entity to look up"),
      meetingIds: z
        .array(z.string())
        .optional()
        .describe("Optional array of meeting IDs to limit the search to"),
      topicIds: z
        .array(z.string())
        .optional()
        .describe("Optional array of topic IDs to limit the search to"),
    }),
    output: z.object({
      success: z.boolean(),
      entityName: z.string(),
      entity: z
        .object({
          name: z.string(),
          type: z.string(),
          description: z.string(),
        })
        .optional(),
      observations: z.array(z.string()).optional(),
      relationships: z
        .array(
          z.object({
            relationship: z.string(),
            isSubject: z.boolean(),
            otherEntity: z.string(),
          }),
        )
        .optional(),
      relatedTopics: z
        .array(
          z.object({
            topicId: z.string(),
            title: z.string(),
          }),
        )
        .optional(),
      error: z.string().optional(),
      suggestion: z.string().optional(),
    }),
    execute: async (params) => {
      try {
        const { entityName, meetingIds: meetingIds_, topicIds } = params;

        const meetingIds =
          meetingIds_ &&
          (await getValidProfileMeetingIds(profileId, meetingIds_));

        const options: Omit<EntitySearchOptions, "entityName"> = {
          meetingIds,
          topicIds,
          profileIds: [profileId],
        };

        // Get comprehensive entity information
        const entityInfo = await getEntityByName(entityName, options);

        if (!entityInfo.entity) {
          return {
            success: false,
            entityName,
            error: `Entity '${entityName}' not found`,
            suggestion:
              "Check the entity name or try a semantic search instead",
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
 */
export const findRelatedTopicsTool = (profileId: string) =>
  tool({
    description:
      "Find meeting topics that are relevant to a specific query. Useful when you need to discover which conversations or discussions are most relevant to a particular subject or theme.",
    parameters: z.object({
      query: z.string().describe("The natural language search query"),
      meetingIds: z
        .array(z.string())
        .optional()
        .describe("Optional array of meeting IDs to limit the search to"),
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
    output: z.object({
      success: z.boolean(),
      query: z.string(),
      totalTopicsFound: z.number().optional(),
      topics: z
        .array(
          z.object({
            topicId: z.string(),
            title: z.string(),
            score: z.number(),
          }),
        )
        .optional(),
      error: z.string().optional(),
      suggestion: z.string().optional(),
    }),
    execute: async (params) => {
      try {
        const {
          query,
          meetingIds: meetingIds_,
          minScore = 0.7,
          maxTopics = 5,
        } = params;

        const meetingIds =
          meetingIds_ &&
          (await getValidProfileMeetingIds(profileId, meetingIds_));

        // Perform a search that targets topic titles and summaries
        const results = await searchEntities(query, {
          meetingIds,
          profileIds: [profileId],
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
 */
export const findEntityRelationshipsTool = (profileId: string) =>
  tool({
    description:
      "Find all relationships that a specific entity has with other entities. Useful when you need to understand how an entity connects to others, trace dependencies, or map out the network of interactions around a particular person, project, or concept.",
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
    output: z.object({
      success: z.boolean(),
      entityName: z.string(),
      totalRelationships: z.number().optional(),
      relationships: z
        .array(
          z.object({
            relationship: z.string(),
            otherEntity: z.string(),
            isSubject: z.boolean(),
            topicId: z.string(),
            topicTitle: z.string(),
            score: z.number(),
          }),
        )
        .optional(),
      error: z.string().optional(),
      suggestion: z.string().optional(),
    }),
    execute: async (params) => {
      try {
        const {
          entityName,
          meetingIds: meetingIds_,
          topicIds,
          relationshipTypes,
          maxRelationships = 20,
        } = params;

        const meetingIds =
          meetingIds_ &&
          (await getValidProfileMeetingIds(profileId, meetingIds_));

        const options: EntitySearchOptions = {
          meetingIds,
          topicIds,
          profileIds: [profileId],
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
 */
export const discoverKeyEntitiesTool = (profileId: string) =>
  tool({
    description:
      "Discover key entities that appear frequently across meetings or topics. Useful when you need to identify the most important or frequently discussed people, projects, decisions, or concepts across multiple conversations.",
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
      maxEntities: z
        .number()
        .positive()
        .optional()
        .describe("Maximum number of entities to return"),
    }),
    output: z.object({
      success: z.boolean(),
      totalEntitiesFound: z.number().optional(),
      entities: z
        .array(
          z.object({
            name: z.string(),
            type: z.string(),
            description: z.string(),
            score: z.number(),
            mentionCount: z.number(),
          }),
        )
        .optional(),
      error: z.string().optional(),
      suggestion: z.string().optional(),
    }),
    execute: async (params) => {
      try {
        const {
          entityTypes,
          meetingIds: meetingIds_,
          topicIds,
          maxEntities = 8, // Reduced from 10
        } = params;

        const meetingIds =
          meetingIds_ &&
          (await getValidProfileMeetingIds(profileId, meetingIds_));

        // Use a more efficient search approach - combine queries into one
        const results = await searchEntities("important people projects decisions entities", {
          entityTypes,
          meetingIds,
          topicIds,
          profileIds: [profileId],
          topK: maxEntities * 2,
          minScore: 0.5, // Add minimum score to improve quality and reduce processing
        });

        // More efficiently process entities
        const entityMap = new Map();
        
        // Process all entities in a single loop with early termination if we have enough
        for (const entity of results.entities) {
          if (!entity.metadata.entity_name) continue;

          const key = `${entity.metadata.entity_name}:${entity.metadata.entity_type || "unknown"}`;
          
          if (entityMap.has(key)) {
            entityMap.get(key).score = Math.max(entityMap.get(key).score, entity.score);
            entityMap.get(key).mentionCount += 1;
          } else {
            entityMap.set(key, {
              name: entity.metadata.entity_name,
              type: entity.metadata.entity_type || "unknown",
              description: entity.metadata.content || "",
              score: entity.score,
              mentionCount: 1,
            });
          }
          
          // Early termination if we have enough high-quality entities
          if (entityMap.size >= maxEntities * 2) break;
        }

        // Convert to array, sort, and limit to maxEntities more efficiently
        const entities = Array.from(entityMap.values())
          .sort((a, b) => (b.mentionCount * 2 + b.score) - (a.mentionCount * 2 + a.score))
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
