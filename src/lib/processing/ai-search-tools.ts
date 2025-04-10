import { z } from "zod";

import { tool } from "ai";
import { createClient as createSupabaseClient } from "~/lib/supabase/server";

import dedent from "ts-dedent";
import { type SearchOptions, SearchService } from "../core/searchService";
import { searchEntities } from "../graph/entity-search";
import type { EntityVectorMetadata } from "./entity-embeddings";
import { logger } from "../logging/server";

// Initialize search service as a singleton for all tools to use
const searchService = new SearchService();

// Enable debug mode for detailed logging
const DEBUG = true;

/**
 * Debug logger that only logs when DEBUG is true
 */
function debugLog(toolName: string, message: string, data?: object): void {
  if (!DEBUG) return;

  logger.info(`[AI-TOOL:${toolName}] ${message}`, data);
}

/**
 * Type-safe metadata enrichment helper that handles optional fields properly
 */
function enhanceMetadata<T extends Record<string, unknown>>(
  metadata: EntityVectorMetadata,
  additionalProps: T = {} as T,
): EntityVectorMetadata & T & { meeting_title?: string } {
  const enhanced = { ...metadata } as EntityVectorMetadata &
    T & { meeting_title?: string };

  // Cross-reference topic_title as meeting_title when needed
  if (!enhanced.meeting_title && metadata.topic_title) {
    enhanced.meeting_title = metadata.topic_title;
  }

  return { ...enhanced, ...additionalProps };
}

/**
 * Helper function to validate profile's access to meeting IDs
 */
async function validateProfileMeetingAccess(
  profileId: string,
  meetingIds?: string[],
): Promise<string[] | undefined> {
  if (!meetingIds?.length) return undefined;

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("video_api_id")
    .in("video_api_id", meetingIds)
    .eq("profile_id", profileId);

  if (error) {
    console.error("Error validating profile meeting access:", error);
    return undefined;
  }

  // Return validated meeting IDs
  return data.map((m) => m.video_api_id);
}

/**
 * Creates search options with progressive relaxation of constraints
 * This allows us to try stricter filters first, then relax if no results
 */
function createSearchOptions(
  profileId: string,
  baseOptions: Partial<SearchOptions> = {},
  specificFilter: Record<string, unknown> = {},
  relaxed = false,
): SearchOptions {
  // Always include profile ID filter for security
  const profileFilter = { profile_id: { $eq: profileId } };

  // In relaxed mode, we keep only essential filters
  const combinedFilter = relaxed
    ? { ...profileFilter, ...specificFilter }
    : { ...baseOptions.filter, ...specificFilter, ...profileFilter };

  // Use a more aggressive retry configuration in relaxed mode
  const retryConfig = relaxed
    ? { retries: 3, baseDelay: 200, timeout: 15000 }
    : { retries: 2, baseDelay: 300, timeout: 10000 };

  // Use a lower min score in relaxed mode
  const minScore = relaxed
    ? Math.max(0.2, (baseOptions.minScore || 0.4) - 0.2)
    : baseOptions.minScore;

  return {
    ...baseOptions,
    profileIds: [profileId], // Always set profile ID for double security
    filter: combinedFilter,
    minScore,
    retryConfig,
  };
}

/**
 * Tool that allows the LLM to perform semantic search over entities
 */
export const entitySemanticSearchTool = (profileId: string) =>
  tool({
    description:
      "Performs powerful semantic search across entities, relationships, and observations using natural language queries. Ideal for discovering connections between concepts, finding relevant information without knowing exact entity names, or exploring how different ideas relate to each other across multiple meetings. Use this when you need to uncover insights or patterns that might not be immediately obvious. If you're unsure which specific entities exist, first use the listEntityNamesTool to discover available entities.",
    parameters: z.object({
      query: z
        .string()
        .describe(
          "(Required) The natural language search query to find entities, relationships, or observations.",
        ),
      meetingIds: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Restrict the relationship search to specific meetings by providing an array of meeting IDs. Useful when you want to analyze relationships within a particular context or timeframe.",
        ),
      topicIds: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Narrow down the search to specific discussion topics by providing an array of topic IDs. Helps focus on relationships that emerged within particular conversation segments.",
        ),
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
        debugLog(
          "entitySemanticSearchTool",
          "Starting search with params:",
          params,
        );

        const {
          query,
          meetingIds,
          topicIds,
          entityTypes,
          minScore = 0.4,
          topK = 10,
        } = params;

        // Validate meeting access before proceeding
        const validatedMeetingIds = await validateProfileMeetingAccess(
          profileId,
          meetingIds,
        );

        // Create search options using the helper function
        const searchOptions = createSearchOptions(profileId, {
          minScore,
          topK,
          meetingIds: validatedMeetingIds,
          topicIds,
          entityTypes,
          retryConfig: {
            retries: 2,
            baseDelay: 300,
            timeout: 10000,
          },
        });

        debugLog("entitySemanticSearchTool", "Search options:", searchOptions);

        // Perform the semantic search directly with the SearchService
        let results = await searchService.search(query, searchOptions);
        debugLog("entitySemanticSearchTool", "Initial search results count:", {
          entities: results.entities.length,
          relationships: results.relationships.length,
          observations: results.observations.length,
        });

        // If we got zero results, try a more relaxed search
        if (
          results.entities.length === 0 &&
          results.relationships.length === 0 &&
          results.observations.length === 0
        ) {
          debugLog(
            "entitySemanticSearchTool",
            "No results found, trying relaxed search",
          );

          // Create relaxed search options
          const relaxedOptions = createSearchOptions(
            profileId,
            {
              minScore: Math.max(0.2, minScore - 0.2),
              topK: topK * 2,
              meetingIds: validatedMeetingIds,
              topicIds,
              entityTypes,
            },
            {},
            true,
          );

          debugLog(
            "entitySemanticSearchTool",
            "Relaxed search options:",
            relaxedOptions,
          );
          results = await searchService.search(query, relaxedOptions);

          debugLog(
            "entitySemanticSearchTool",
            "Relaxed search results count:",
            {
              entities: results.entities.length,
              relationships: results.relationships.length,
              observations: results.observations.length,
            },
          );
        }

        // Process the results to enhance with contextual data
        const formattedResults = {
          entities: results.entities.map((result) => {
            const metadata = enhanceMetadata(result.metadata);
            return {
              name: metadata.entity_name || "",
              type: metadata.entity_type || "",
              description: metadata.content || "",
              observations: [] as string[], // Placeholder - could be populated in a follow-up query
              topicTitle: metadata.topic_title,
              confidence: result.score,
              meetingId: metadata.meeting_id,
              meetingTitle: metadata.meeting_title,
              timestamp: metadata.timestamp_start,
              speakerName: "Unknown", // Could potentially get this from additional metadata
              contextBefore: "", // Placeholder for transcript context
              contextAfter: "", // Placeholder for transcript context
            };
          }),

          relationships: results.relationships.map((result) => {
            const metadata = enhanceMetadata(result.metadata);
            return {
              subject: metadata.subject_entity || "",
              relationship: metadata.relationship_type || "",
              object: metadata.object_entity || "",
              observations: [] as string[], // Placeholder - could be populated in a follow-up query
              topicTitle: metadata.topic_title,
              confidence: result.score,
              meetingId: metadata.meeting_id,
              meetingTitle: metadata.meeting_title,
              timestamp: metadata.timestamp_start,
              speakerName: "Unknown", // Could potentially get this from additional metadata
              contextBefore: "", // Placeholder for transcript context
              contextAfter: "", // Placeholder for transcript context
            };
          }),

          observations: results.observations.map((result) => {
            const metadata = enhanceMetadata(result.metadata);
            return {
              observation: metadata.content || "",
              topicTitle: metadata.topic_title,
              confidence: result.score,
              meetingId: metadata.meeting_id,
              meetingTitle: metadata.meeting_title,
              timestamp: metadata.timestamp_start,
              speakerName: "Unknown", // Could potentially get this from additional metadata
              contextBefore: "", // Placeholder for transcript context
              contextAfter: "", // Placeholder for transcript context
            };
          }),
        };

        debugLog("entitySemanticSearchTool", "Returning formatted results");

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
        console.error("Entity semantic search error:", error);
        return {
          success: false,
          query: params.query,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during semantic search",
          suggestion:
            "Try refining your search query or check your filter parameters",
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
      "Retrieves comprehensive, in-depth information about a specific entity by exact name. This tool provides a complete profile including the entity's description, all relationships with other entities, every observation mentioning it, and all topics where it appears. Essential when you need to build a complete understanding of a person, project, concept, or decision across the entire conversation history. Use this for detailed analysis of key entities that have already been identified. If you don't know which entities exist, first use the listEntityNamesTool to discover available entity names.",
    parameters: z.object({
      entityName: z
        .string()
        .describe(
          "(Required) The exact name of the entity whose relationships you want to explore. Must match the entity name as it appears in the system. If you're unsure which entities exist, first use the listEntityNamesTool to discover available entity names.",
        ),
      meetingIds: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Restrict the relationship search to specific meetings by providing an array of meeting IDs. Useful when you want to analyze relationships within a particular context or timeframe.",
        ),
      topicIds: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Narrow down the search to specific discussion topics by providing an array of topic IDs. Helps focus on relationships that emerged within particular conversation segments.",
        ),
    }),
    execute: async (params, options) => {
      try {
        debugLog("entityLookupTool", "Starting lookup with params:", params);

        const { entityName, meetingIds, topicIds } = params;

        // Validate meeting access before proceeding
        const validatedMeetingIds = await validateProfileMeetingAccess(
          profileId,
          meetingIds,
        );

        // Create search options using the helper function
        const baseOptions = createSearchOptions(profileId, {
          meetingIds: validatedMeetingIds,
          topicIds,
          minScore: 0.3, // Lower threshold for exact name matches
          topK: 30, // Get more results for comprehensive lookup
          retryConfig: {
            retries: 2,
            baseDelay: 300,
            timeout: 10000,
          },
        });

        debugLog("entityLookupTool", "Search options:", baseOptions);

        // Attempt direct entity lookup
        // Use the direct searchByEntityName method for more efficient and accurate entity lookup
        let searchResults = await searchService.searchByEntityName(
          entityName,
          baseOptions,
        );

        debugLog("entityLookupTool", "Initial search results count:", {
          entities: searchResults.entities.length,
          relationships: searchResults.relationships.length,
          observations: searchResults.observations.length,
        });

        // If no entity found, try more relaxed search
        if (searchResults.entities.length === 0) {
          debugLog(
            "entityLookupTool",
            "No entity found, trying relaxed search",
          );

          // Try a relaxed search with lower thresholds and fuzzy matching
          const relaxedOptions = createSearchOptions(
            profileId,
            {
              meetingIds: validatedMeetingIds,
              topicIds,
              minScore: 0.15, // Very low threshold to catch potential matches
              topK: 50,
            },
            {},
            true,
          );

          debugLog(
            "entityLookupTool",
            "Relaxed search options:",
            relaxedOptions,
          );

          // Try a direct search by entity name first
          const relaxedResults = await searchService.searchByEntityName(
            entityName,
            relaxedOptions,
          );

          // If we found an entity, use those results
          if (relaxedResults.entities.length > 0) {
            searchResults = relaxedResults;
            debugLog(
              "entityLookupTool",
              "Found entity with relaxed direct search",
            );
          } else {
            // Try a more general search
            debugLog(
              "entityLookupTool",
              "Trying general search as last resort",
            );

            // Try a general semantic search as a last resort
            const generalResults = await searchService.search(
              entityName,
              relaxedOptions,
            );

            if (
              generalResults.entities.length > 0 ||
              generalResults.relationships.length > 0 ||
              generalResults.observations.length > 0
            ) {
              searchResults = generalResults;
              debugLog("entityLookupTool", "Found results with general search");
            }
          }

          debugLog("entityLookupTool", "Relaxed search results count:", {
            entities: searchResults.entities.length,
            relationships: searchResults.relationships.length,
            observations: searchResults.observations.length,
          });
        }

        // Get the entity from search results
        let entityResult = searchResults.entities[0]?.metadata;

        // If we still don't have an entity but have relationships, try to extract entity info from relationships
        if (!entityResult && searchResults.relationships.length > 0) {
          debugLog("entityLookupTool", "Extracting entity from relationships");

          const relationship = searchResults.relationships[0]?.metadata;

          // Make sure we have a relationship before accessing properties
          if (relationship) {
            // Check if the entity is either the subject or object
            if (relationship.subject_entity === entityName) {
              entityResult = {
                ...relationship,
                entity_name: relationship.subject_entity,
                entity_type: "Unknown", // We don't know the type from the relationship
              };
            } else if (relationship.object_entity === entityName) {
              entityResult = {
                ...relationship,
                entity_name: relationship.object_entity,
                entity_type: "Unknown", // We don't know the type from the relationship
              };
            }
          }
        }

        if (!entityResult) {
          return {
            success: false,
            entityName,
            error: `Entity '${entityName}' not found`,
            suggestion:
              "Check the entity name spelling or try a semantic search instead",
          };
        }

        // Create maps to store metadata
        const observationMetadataMap = new Map<
          string,
          {
            meeting_id?: string;
            meeting_title?: string;
            timestamp?: number;
            speaker_name?: string;
            context_before?: string;
            context_after?: string;
          }
        >();

        const relationshipMetadataMap = new Map<
          string,
          {
            meeting_id?: string;
            meeting_title?: string;
            timestamp?: number;
            speaker_name?: string;
          }
        >();

        const topicMetadataMap = new Map<
          string,
          {
            meeting_id?: string;
            meeting_title?: string;
          }
        >();

        // Process observations to extract metadata
        for (const obs of searchResults.observations) {
          if (obs.metadata.content) {
            observationMetadataMap.set(obs.metadata.content, {
              meeting_id: obs.metadata.meeting_id,
              meeting_title: obs.metadata.topic_title,
              timestamp: obs.metadata.timestamp_start,
              speaker_name: "Unknown",
              context_before: "",
              context_after: "",
            });
          }
        }

        // Process relationships to extract metadata
        for (const rel of searchResults.relationships) {
          const key = `${rel.metadata.relationship_type || ""}:${rel.metadata.subject_entity || ""}:${rel.metadata.object_entity || ""}`;
          relationshipMetadataMap.set(key, {
            meeting_id: rel.metadata.meeting_id,
            meeting_title: rel.metadata.topic_title,
            timestamp: rel.metadata.timestamp_start,
            speaker_name: "Unknown",
          });
        }

        // Process topics to extract metadata
        for (const item of [
          ...searchResults.entities,
          ...searchResults.relationships,
          ...searchResults.observations,
        ]) {
          if (item.metadata.topic_id) {
            topicMetadataMap.set(item.metadata.topic_id, {
              meeting_id: item.metadata.meeting_id,
              meeting_title: item.metadata.topic_title,
            });
          }
        }

        // Calculate entity mention statistics
        const timestamps = searchResults.entities
          .map((e) => e.metadata.timestamp_start)
          .filter(Boolean) as number[];

        const firstMentionedAt =
          timestamps.length > 0 ? Math.min(...timestamps) : undefined;
        const lastMentionedAt =
          timestamps.length > 0 ? Math.max(...timestamps) : undefined;
        const mentionCount = searchResults.entities.length;

        // Process relationships to determine subject/object relationships
        const relationships: Array<{
          relationship: string;
          otherEntity: string;
          isSubject: boolean;
          meetingId?: string;
          meetingTitle?: string;
          timestamp?: number;
          speakerName?: string;
        }> = [];

        for (const rel of searchResults.relationships) {
          const metadata = rel.metadata;
          const isSubject = metadata.subject_entity === entityName;
          const key = `${metadata.relationship_type || ""}:${metadata.subject_entity || ""}:${metadata.object_entity || ""}`;
          const relationMetadata = relationshipMetadataMap.get(key);

          relationships.push({
            relationship: metadata.relationship_type || "",
            otherEntity: isSubject
              ? metadata.object_entity || ""
              : metadata.subject_entity || "",
            isSubject,
            meetingId: relationMetadata?.meeting_id,
            meetingTitle: relationMetadata?.meeting_title,
            timestamp: relationMetadata?.timestamp,
            speakerName: relationMetadata?.speaker_name,
          });
        }

        // Enhance entity with additional metadata
        const enhancedEntity = {
          name: entityResult.entity_name || "",
          type: entityResult.entity_type || "",
          description: entityResult.content || "",
          firstMentionedAt,
          lastMentionedAt,
          mentionCount,
        };

        // Enhance observations with context metadata
        const enhancedObservations = searchResults.observations.map((obs) => {
          const content = obs.metadata.content || "";
          const metadata = observationMetadataMap.get(content) || {};
          return {
            text: content,
            meetingId: metadata.meeting_id,
            meetingTitle: metadata.meeting_title,
            timestamp: metadata.timestamp,
            speakerName: metadata.speaker_name,
            contextBefore: metadata.context_before,
            contextAfter: metadata.context_after,
          };
        });

        // Extract topic IDs for topics section
        const entityTopicIds = new Set<string>();
        for (const item of [
          ...searchResults.entities,
          ...searchResults.relationships,
          ...searchResults.observations,
        ]) {
          if (item.metadata.topic_id) {
            entityTopicIds.add(item.metadata.topic_id);
          }
        }

        // Enhance topics with meeting info
        const enhancedTopics = Array.from(entityTopicIds).map((id) => {
          const metadata = topicMetadataMap.get(id) || {};
          const title =
            searchResults.relationships.find((r) => r.metadata.topic_id === id)
              ?.metadata.topic_title ||
            searchResults.observations.find((o) => o.metadata.topic_id === id)
              ?.metadata.topic_title ||
            (entityResult?.topic_id === id ? entityResult.topic_title : "");

          return {
            topicId: id,
            title,
            meetingId: metadata.meeting_id,
            meetingTitle: metadata.meeting_title,
          };
        });

        // Find related topics
        const relatedTopicIds = new Set<string>();
        for (const rel of searchResults.relationships) {
          if (rel.metadata.topic_id) {
            relatedTopicIds.add(rel.metadata.topic_id);
          }
        }

        const relatedTopics = Array.from(relatedTopicIds).map((topicId) => {
          const relWithTopic = searchResults.relationships.find(
            (r) => r.metadata.topic_id === topicId,
          );
          const count = searchResults.relationships.filter(
            (r) => r.metadata.topic_id === topicId,
          ).length;

          return {
            topicId,
            title: relWithTopic?.metadata.topic_title || "",
            meetingId: relWithTopic?.metadata.meeting_id || "",
            relationshipCount: count,
          };
        });

        debugLog(
          "entityLookupTool",
          "Returning formatted entity lookup results",
        );

        return {
          success: true,
          entityName,
          entity: enhancedEntity,
          observations: enhancedObservations,
          relationships,
          relatedTopics,
        };
      } catch (error) {
        console.error("Entity lookup error:", error);
        return {
          success: false,
          entityName: params.entityName,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during entity lookup",
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
      "Discovers meeting topics and discussions that are most relevant to a specific query or theme. This tool analyzes the semantic meaning of your query to identify conversation segments where similar concepts were discussed, even if different terminology was used. Perfect for finding all instances where a particular subject was addressed, identifying recurring themes across meetings, or locating specific discussions without knowing exactly when they occurred. Use this to map the landscape of conversations around a particular subject. If you want to identify which entities exist first, use the listEntityNamesTool.",
    parameters: z.object({
      query: z
        .string()
        .describe(
          "(Required) The natural language search query to find topics related to a specific query or theme.",
        ),
      meetingIds: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Restrict the relationship search to specific meetings by providing an array of meeting IDs. Useful when you want to analyze relationships within a particular context or timeframe.",
        ),
      minScore: z
        .number()
        .min(0)
        .max(1)
        .default(0.4)
        .describe(
          "(Optional) Minimum similarity score (0-1) to include in results. Defaults to 0.4.",
        ),
      maxTopics: z
        .number()
        .positive()
        .default(5)
        .describe(
          "(Optional) Maximum number of topics to return. Defaults to 5.",
        ),
    }),
    execute: async (params) => {
      try {
        const { query, meetingIds, minScore, maxTopics } = params;

        // Validate meeting access before proceeding
        const validatedMeetingIds = await validateProfileMeetingAccess(
          profileId,
          meetingIds,
        );

        // Create search options using the helper function
        const searchOptions = createSearchOptions(profileId, {
          minScore,
          // Request more results initially to ensure we have enough unique topics
          topK: maxTopics * 3,
          meetingIds: validatedMeetingIds,
        });

        // Perform the search focused on topics
        const results = await searchEntities(query, searchOptions);

        // Efficiently track unique topics with a Map
        const topicMap = new Map<
          string,
          {
            topicId: string;
            title: string;
            score: number;
            meetingId?: string;
            meetingTitle?: string;
            timestamp?: number;
            duration?: number;
            participantCount?: number;
            keyEntities: Set<string>;
          }
        >();

        // Process all results in a single pass to extract topic information
        const processItem = (item: {
          score: number;
          metadata: EntityVectorMetadata;
        }) => {
          const metadata = enhanceMetadata(item.metadata, {
            topic_duration: undefined as number | undefined,
            participant_count: undefined as number | undefined,
          });

          if (!metadata.topic_id || !metadata.topic_title) return;

          // Either create or update topic entry
          if (!topicMap.has(metadata.topic_id)) {
            topicMap.set(metadata.topic_id, {
              topicId: metadata.topic_id,
              title: metadata.topic_title,
              score: item.score,
              meetingId: metadata.meeting_id,
              meetingTitle: metadata.meeting_title,
              timestamp: metadata.timestamp_start,
              duration: metadata.topic_duration,
              participantCount: metadata.participant_count,
              keyEntities: new Set<string>(),
            });
          } else {
            // Update score if higher
            const existingTopic = topicMap.get(metadata.topic_id);
            if (existingTopic && item.score > existingTopic.score) {
              existingTopic.score = item.score;
            }
          }

          // Add entity to key entities if it exists
          if (metadata.entity_name) {
            const topic = topicMap.get(metadata.topic_id);
            if (topic) {
              topic.keyEntities.add(metadata.entity_name);
            }
          }
        };

        // Process all result types at once
        [
          ...results.entities,
          ...results.relationships,
          ...results.observations,
        ].forEach(processItem);

        // Convert to array, sort by score, and format the results
        const topics = Array.from(topicMap.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, maxTopics)
          .map((topic) => ({
            ...topic,
            keyEntities: Array.from(topic.keyEntities).slice(0, 5), // Limit to top 5 entities
          }));

        return {
          success: true,
          query,
          totalTopicsFound: topics.length,
          topics,
        };
      } catch (error) {
        console.error("Related topics search error:", error);
        return {
          success: false,
          query: params.query,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during topic search",
          suggestion:
            "Try a broader search query or check your filter parameters",
        };
      }
    },
  });

/**
 * Tool that allows the LLM to find all relationships for a specific entity
 */
export const findEntityRelationshipsTool = (profileId: string) =>
  tool({
    description: dedent`
      Maps the complete network of relationships and connections for a specific entity.
      This tool reveals how an entity interacts with other entities across all meetings, showing both direct relationships (where the entity is actively involved) and indirect relationships (where the entity is being acted upon).
      Essential for understanding influence networks, tracing dependencies, visualizing organizational structures, or mapping the ecosystem around key individuals, projects, or concepts. Use this to build a comprehensive picture of how an entity fits into the broader context.
      If you're unsure which entities are available, first use the listEntityNames tool to discover entity names.
      If you want to filter by relationship types, first use the listRelationshipTypes tool to see available relationship types.
    `,
    parameters: z.object({
      entityName: z
        .string()
        .describe(
          "(Required) The exact name of the entity whose relationships you want to explore. Must match the entity name as it appears in the system. If you're unsure which entities exist, first use the listEntityNamesTool to discover available entity names.",
        ),
      meetingIds: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Restrict the relationship search to specific meetings by providing an array of meeting IDs. Useful when you want to analyze relationships within a particular context or timeframe.",
        ),
      topicIds: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Narrow down the search to specific discussion topics by providing an array of topic IDs. Helps focus on relationships that emerged within particular conversation segments.",
        ),
      relationshipTypes: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Filter by specific types of relationships (e.g., 'works with', 'reports to', 'manages'). Use this to focus on particular interaction patterns or organizational structures.",
        ),
      maxRelationships: z
        .number()
        .positive()
        .default(20)
        .describe(
          "(Optional) The maximum number of relationships to return in the results. Higher values provide more comprehensive network mapping but may include weaker connections. Defaults to 20.",
        ),
    }),
    execute: async (params) => {
      try {
        debugLog(
          "findEntityRelationshipsTool",
          "Starting relationship search with params:",
          params,
        );

        const {
          entityName,
          meetingIds,
          topicIds,
          relationshipTypes,
          maxRelationships,
        } = params;

        // Validate meeting access before proceeding
        const validatedMeetingIds = await validateProfileMeetingAccess(
          profileId,
          meetingIds,
        );

        // Create base search options using the helper function
        const baseOptions = createSearchOptions(profileId, {
          topK: maxRelationships * 2, // Get more than needed to ensure good coverage
          meetingIds: validatedMeetingIds,
          topicIds,
          relationshipTypes,
          minScore: 0.3, // Lower threshold for relationship search
          retryConfig: {
            retries: 2,
            baseDelay: 300,
            timeout: 12000, // Longer timeout for relationship queries
          },
        });

        debugLog("findEntityRelationshipsTool", "Search options:", baseOptions);

        // Use the specialized searchByEntityName function with the SearchService
        let searchResults = await searchService.searchByEntityName(
          entityName,
          baseOptions,
        );

        debugLog(
          "findEntityRelationshipsTool",
          "Initial search results count:",
          {
            entities: searchResults.entities.length,
            relationships: searchResults.relationships.length,
            observations: searchResults.observations.length,
          },
        );

        // If we got no relationships, try a more relaxed search
        if (searchResults.relationships.length === 0) {
          debugLog(
            "findEntityRelationshipsTool",
            "No relationships found, trying relaxed search",
          );

          const relaxedOptions = createSearchOptions(
            profileId,
            {
              topK: maxRelationships * 3,
              meetingIds: validatedMeetingIds,
              topicIds,
              relationshipTypes,
              minScore: 0.15,
            },
            {},
            true,
          );

          debugLog(
            "findEntityRelationshipsTool",
            "Relaxed search options:",
            relaxedOptions,
          );

          // Try both direct search and a more general search
          const relaxedResults = await searchService.searchByEntityName(
            entityName,
            relaxedOptions,
          );

          if (relaxedResults.relationships.length > 0) {
            searchResults = relaxedResults;
            debugLog(
              "findEntityRelationshipsTool",
              "Found relationships with relaxed search",
            );
          } else {
            // As a last resort, try a general search for the entity name
            debugLog(
              "findEntityRelationshipsTool",
              "Trying general search as last resort",
            );

            const generalOptions = {
              ...relaxedOptions,
              topK: maxRelationships * 4,
              minScore: 0.1,
            };

            const generalResults = await searchService.search(
              `Relationships with ${entityName}`,
              generalOptions,
            );

            if (generalResults.relationships.length > 0) {
              searchResults = generalResults;
              debugLog(
                "findEntityRelationshipsTool",
                "Found relationships with general search",
              );
            }
          }

          debugLog(
            "findEntityRelationshipsTool",
            "Relaxed search results count:",
            {
              entities: searchResults.entities.length,
              relationships: searchResults.relationships.length,
              observations: searchResults.observations.length,
            },
          );
        }

        // Process and format relationships
        const formattedRelationships = searchResults.relationships.map(
          (rel) => {
            const metadata = enhanceMetadata(rel.metadata);

            // Determine if entity is subject or object
            const isSubject = metadata.subject_entity === entityName;
            const otherEntity = isSubject
              ? metadata.object_entity
              : metadata.subject_entity;

            return {
              entityName: entityName,
              otherEntity: otherEntity || "Unknown",
              relationshipType: metadata.relationship_type || "related to",
              direction: isSubject ? "outgoing" : "incoming",
              relationshipString: isSubject
                ? `${entityName} ${metadata.relationship_type || "related to"} ${otherEntity || "Unknown"}`
                : `${otherEntity || "Unknown"} ${metadata.relationship_type || "related to"} ${entityName}`,
              confidence: rel.score,
              meetingId: metadata.meeting_id,
              meetingTitle:
                metadata.meeting_title || metadata.topic_title || "",
              topicId: metadata.topic_id || "",
              topicTitle: metadata.topic_title || "",
              timestamp: metadata.timestamp_start,
            };
          },
        );

        // Sort by confidence and limit to requested number
        const sortedRelationships = formattedRelationships
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, maxRelationships);

        // Organize by relationship direction
        const outgoingRelationships = sortedRelationships.filter(
          (r) => r.direction === "outgoing",
        );
        const incomingRelationships = sortedRelationships.filter(
          (r) => r.direction === "incoming",
        );

        // Find related topics
        const relatedTopicIds = new Set<string>();
        for (const rel of searchResults.relationships) {
          if (rel.metadata.topic_id) {
            relatedTopicIds.add(rel.metadata.topic_id);
          }
        }

        const relatedTopics = Array.from(relatedTopicIds).map((topicId) => {
          const relWithTopic = searchResults.relationships.find(
            (r) => r.metadata.topic_id === topicId,
          );
          const count = searchResults.relationships.filter(
            (r) => r.metadata.topic_id === topicId,
          ).length;

          return {
            topicId,
            title: relWithTopic?.metadata.topic_title || "",
            meetingId: relWithTopic?.metadata.meeting_id || "",
            relationshipCount: count,
          };
        });

        debugLog(
          "findEntityRelationshipsTool",
          "Returning formatted relationships",
        );

        return {
          success: true,
          entityName,
          totalRelationships: sortedRelationships.length,
          outgoingRelationships,
          incomingRelationships,
          relatedTopics,
          // Include the full list for convenience
          relationships: sortedRelationships,
        };
      } catch (error) {
        console.error("Entity relationships search error:", error);
        return {
          success: false,
          entityName: params.entityName,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during relationship search",
          suggestion:
            "Check that the entity name is correct or try a broader semantic search first",
        };
      }
    },
  });

/**
 * Tool that allows the LLM to discover key entities across meetings
 */
export const discoverKeyEntitiesTool = (profileId: string) =>
  tool({
    description: dedent`
      Identifies the most significant and frequently discussed entities across meetings or topics.
      This tool analyzes patterns of mentions to surface the most important people, projects, decisions, or concepts that appear consistently throughout conversations.
      It provides rich context including how often each entity is mentioned, when it first appeared, which meetings discuss it most, and what other entities it relates to.
      Essential for understanding the core elements driving discussions, identifying key stakeholders, or discovering recurring themes.
      Use this to get a high-level overview of what matters most across multiple conversations.
      For a simple list of entity names, use the listEntityNamesTool instead.
      To discover what entity types are available for filtering, use the listEntityTypesTool.
    `,
    parameters: z.object({
      entityTypes: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Filter results to specific entity types such as 'Person', 'Project', 'Decision', 'Concept', etc. Useful when you want to focus on particular categories of entities rather than all types. Leave empty to discover entities across all types.",
        ),
      meetingIds: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Restrict analysis to specific meetings by providing their unique identifiers. Particularly valuable when comparing key entities across a subset of related meetings or when focusing on recent discussions.",
        ),
      topicIds: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Narrow the search to specific topics by providing their unique identifiers. Helpful when analyzing key entities within particular discussion segments rather than entire meetings.",
        ),
      maxEntities: z
        .number()
        .positive()
        .optional()
        .describe(
          "(Optional) The maximum number of top entities to return in results. Higher values provide more comprehensive coverage but may include less significant entities. Defaults to 8 if not specified.",
        ),
    }),
    execute: async (params) => {
      try {
        const { entityTypes, meetingIds, topicIds, maxEntities = 8 } = params;

        // Validate meeting access before proceeding
        const validatedMeetingIds = await validateProfileMeetingAccess(
          profileId,
          meetingIds,
        );

        // Create search options using the helper function
        const searchOptions = createSearchOptions(profileId, {
          topK: maxEntities * 3, // Get more results to ensure good coverage
          minScore: 0.4,
          meetingIds: validatedMeetingIds,
          topicIds,
          entityTypes,
        });

        // Use a clearer but still comprehensive search query
        const results = await searchEntities(
          "important frequent key entities",
          searchOptions,
        );

        // Efficiently track and process entities
        const entityMap = new Map<
          string,
          {
            name: string;
            type: string;
            description: string;
            score: number;
            mentionCount: number;
            firstMentionedAt?: number;
            lastMentionedAt?: number;
            relatedEntities: Set<string>;
            meetingMentions: Map<
              string,
              {
                meetingId: string;
                meetingTitle: string;
                count: number;
              }
            >;
          }
        >();

        // Process entity results
        for (const entity of results.entities) {
          const metadata = enhanceMetadata(entity.metadata, {
            related_entities: "",
          });

          if (!metadata.entity_name) continue;

          // Create a unique key for each entity (name+type)
          const key = `${metadata.entity_name}:${metadata.entity_type || "unknown"}`;

          if (entityMap.has(key)) {
            // Update existing entity
            const existingEntity = entityMap.get(key);
            if (existingEntity) {
              existingEntity.score = Math.max(
                existingEntity.score,
                entity.score,
              );
              existingEntity.mentionCount += 1;

              // Update timestamp tracking
              const timestamp = metadata.timestamp_start;
              if (timestamp) {
                if (
                  !existingEntity.firstMentionedAt ||
                  timestamp < existingEntity.firstMentionedAt
                ) {
                  existingEntity.firstMentionedAt = timestamp;
                }
                if (
                  !existingEntity.lastMentionedAt ||
                  timestamp > existingEntity.lastMentionedAt
                ) {
                  existingEntity.lastMentionedAt = timestamp;
                }
              }

              // Add related entities if present
              if (metadata.related_entities) {
                for (const relatedEntity of metadata.related_entities.split(
                  ",",
                )) {
                  if (relatedEntity.trim()) {
                    existingEntity.relatedEntities.add(relatedEntity.trim());
                  }
                }
              }

              // Track meeting mentions
              if (metadata.meeting_id && metadata.topic_title) {
                const meetingKey = metadata.meeting_id;
                if (existingEntity.meetingMentions.has(meetingKey)) {
                  const meetingMention =
                    existingEntity.meetingMentions.get(meetingKey);
                  if (meetingMention) {
                    meetingMention.count += 1;
                  }
                } else {
                  existingEntity.meetingMentions.set(meetingKey, {
                    meetingId: metadata.meeting_id,
                    meetingTitle:
                      metadata.meeting_title || metadata.topic_title,
                    count: 1,
                  });
                }
              }
            }
          } else {
            // Create new entity entry
            const timestamp = metadata.timestamp_start;
            const meetingMentions = new Map<
              string,
              {
                meetingId: string;
                meetingTitle: string;
                count: number;
              }
            >();

            if (
              metadata.meeting_id &&
              (metadata.meeting_title || metadata.topic_title)
            ) {
              meetingMentions.set(metadata.meeting_id, {
                meetingId: metadata.meeting_id,
                meetingTitle: metadata.meeting_title || metadata.topic_title,
                count: 1,
              });
            }

            entityMap.set(key, {
              name: metadata.entity_name,
              type: metadata.entity_type || "unknown",
              description: metadata.content || "",
              score: entity.score,
              mentionCount: 1,
              firstMentionedAt: timestamp,
              lastMentionedAt: timestamp,
              relatedEntities: new Set<string>(
                metadata.related_entities
                  ? metadata.related_entities
                      .split(",")
                      .map((e) => e.trim())
                      .filter(Boolean)
                  : [],
              ),
              meetingMentions,
            });
          }
        }

        // Convert to array, sort by combined score, and format for output
        const entities = Array.from(entityMap.values())
          .sort((a, b) => {
            // Weighted scoring that combines frequency and semantic relevance
            return (
              b.mentionCount * 2 + b.score - (a.mentionCount * 2 + a.score)
            );
          })
          .slice(0, maxEntities)
          .map((entity) => ({
            name: entity.name,
            type: entity.type,
            description: entity.description,
            score: entity.score,
            mentionCount: entity.mentionCount,
            firstMentionedAt: entity.firstMentionedAt,
            lastMentionedAt: entity.lastMentionedAt,
            relatedEntities: Array.from(entity.relatedEntities).slice(0, 5), // Top 5 related entities
            topMeetings: Array.from(entity.meetingMentions.values())
              .sort((a, b) => b.count - a.count)
              .slice(0, 3) // Top 3 meetings where this entity appears
              .map((meeting) => ({
                meetingId: meeting.meetingId,
                meetingTitle: meeting.meetingTitle,
                mentionCount: meeting.count,
              })),
          }));

        return {
          success: true,
          totalEntitiesFound: entities.length,
          entities,
        };
      } catch (error) {
        console.error("Key entity discovery error:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error during key entity discovery",
          suggestion:
            "Try adjusting filters or using a semantic search first to explore available entities",
        };
      }
    },
  });

/**
 * Tool that allows the LLM to list available entity names for further exploration
 */
export const listEntityNamesTool = (profileId: string) =>
  tool({
    description: dedent`
      Retrieves a list of entity names available in the system, filtered by optional criteria.
      This tool is particularly useful when you need to discover what entities exist before using other tools that require specific entity names as input.
      Use this tool first when you're not sure which entities to query, then use tools like entityLookup tool or findEntityRelationships tool with the exact entity names retrieved.
      For discovering available entity types to use as filters, use the listEntityTypes tool.
      For relationship types, use the listRelationshipTypes tool.
    `,
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
      query: z
        .string()
        .optional()
        .describe(
          "Optional search query to find entities with names similar to this text",
        ),
      maxResults: z
        .number()
        .positive()
        .optional()
        .describe("Maximum number of entity names to return"),
    }),
    execute: async (params, options) => {
      try {
        const {
          entityTypes,
          meetingIds,
          topicIds,
          query = "",
          maxResults = 25,
        } = params;

        // Validate meeting access before proceeding
        const validatedMeetingIds = await validateProfileMeetingAccess(
          profileId,
          meetingIds,
        );

        // Create search options using the helper function
        const searchOptions = createSearchOptions(profileId, {
          topK: maxResults * 2, // Request more to ensure we have enough after filtering
          entityTypes,
          meetingIds: validatedMeetingIds,
          topicIds,
        });

        // Perform the search - if query is empty, it will still return results based on filters
        const results = await searchEntities(query, searchOptions);

        // Extract unique entity names and types
        const entitiesMap = new Map<
          string,
          { name: string; type: string; score: number }
        >();

        // Process entity results to extract unique names
        for (const entity of results.entities) {
          const metadata = entity.metadata;

          if (!metadata.entity_name) continue;

          const key = `${metadata.entity_name}:${metadata.entity_type || "unknown"}`;

          if (
            !entitiesMap.has(key) ||
            (entitiesMap.has(key) &&
              entity.score > (entitiesMap.get(key)?.score ?? 0))
          ) {
            entitiesMap.set(key, {
              name: metadata.entity_name,
              type: metadata.entity_type || "unknown",
              score: entity.score,
            });
          }
        }

        // Also check relationships for additional entity names
        for (const rel of results.relationships) {
          const metadata = enhanceMetadata(rel.metadata, {
            subject_entity_type: undefined as string | undefined,
            object_entity_type: undefined as string | undefined,
          });

          if (metadata.subject_entity) {
            const entityType = metadata.subject_entity_type || "unknown";
            const key = `${metadata.subject_entity}:${entityType}`;

            if (!entitiesMap.has(key)) {
              entitiesMap.set(key, {
                name: metadata.subject_entity,
                type: entityType,
                score: rel.score,
              });
            }
          }

          if (metadata.object_entity) {
            const entityType = metadata.object_entity_type || "unknown";
            const key = `${metadata.object_entity}:${entityType}`;

            if (!entitiesMap.has(key)) {
              entitiesMap.set(key, {
                name: metadata.object_entity,
                type: entityType,
                score: rel.score,
              });
            }
          }
        }

        // Convert to array, sort by score, and format for output
        const entities = Array.from(entitiesMap.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, maxResults);

        // Group entities by type for better organization
        const entitiesByType: Record<string, string[]> = {};

        for (const entity of entities) {
          const entityType = entity.type || "unknown";
          if (!entitiesByType[entityType]) {
            entitiesByType[entityType] = [];
          }
          entitiesByType[entityType]?.push(entity.name);
        }

        return {
          success: true,
          totalEntitiesFound: entities.length,
          entities: entities.map((e) => ({ name: e.name, type: e.type })),
          entitiesByType,
        };
      } catch (error) {
        console.error("List entity names error:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error retrieving entity names",
          suggestion: "Try with broader filters or check your parameters",
        };
      }
    },
  });

/**
 * Tool that allows the LLM to list available relationship types in the system
 */
export const listRelationshipTypesTool = (profileId: string) =>
  tool({
    description: dedent`
      Retrieves a list of relationship types available in the system, such as 'works with', 'reports to', or 'is responsible for'.
      Use this tool to discover what types of relationships exist between entities before using tools like findEntityRelationships tool with specific relationship type filters.
      This helps narrow down relationship searches to specific types of connections.
    `,
    parameters: z.object({
      meetingIds: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Restrict the search to specific meetings by providing an array of meeting IDs. Useful when you want to analyze relationships within a particular context or timeframe.",
        ),
      topicIds: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Narrow down the search to specific discussion topics by providing an array of topic IDs. Helps focus on relationships that emerged within particular conversation segments.",
        ),
      query: z
        .string()
        .optional()
        .describe(
          "(Optional) Search query to find relationship types similar to this text.",
        ),
      maxResults: z
        .number()
        .positive()
        .default(20)
        .describe(
          "(Optional) Maximum number of relationship types to return. Defaults to 20.",
        ),
    }),
    execute: async (params) => {
      try {
        const { meetingIds, topicIds, query = "", maxResults } = params;

        // Validate meeting access before proceeding
        const validatedMeetingIds = await validateProfileMeetingAccess(
          profileId,
          meetingIds,
        );

        // Create search options using the helper function
        const searchOptions = createSearchOptions(profileId, {
          topK: maxResults * 2, // Request more to ensure we have enough unique results
          meetingIds: validatedMeetingIds,
          topicIds,
        });

        // Perform search to get relationships
        const results = await searchEntities(query, searchOptions);

        // Extract unique relationship types
        const relationshipTypesSet = new Set<string>();

        for (const rel of results.relationships) {
          if (rel.metadata.relationship_type) {
            relationshipTypesSet.add(rel.metadata.relationship_type);
          }
        }

        // Convert to array and sort alphabetically
        const relationshipTypes = Array.from(relationshipTypesSet)
          .sort()
          .slice(0, maxResults);

        // Group by categories if possible (optional enhancement)
        const groupedTypes: Record<string, string[]> = {};

        // Initialize categories
        groupedTypes.common = [];
        groupedTypes.organizational = [];
        groupedTypes.temporal = [];
        groupedTypes.causal = [];
        groupedTypes.other = [];

        // Simple categorization logic - can be enhanced
        for (const relType of relationshipTypes) {
          const lowerType = relType.toLowerCase();
          if (
            lowerType.includes("work") ||
            lowerType.includes("with") ||
            lowerType.includes("collaborat")
          ) {
            groupedTypes.common?.push(relType);
          } else if (
            lowerType.includes("report") ||
            lowerType.includes("manage") ||
            lowerType.includes("lead")
          ) {
            groupedTypes.organizational?.push(relType);
          } else if (
            lowerType.includes("before") ||
            lowerType.includes("after") ||
            lowerType.includes("during")
          ) {
            groupedTypes.temporal?.push(relType);
          } else if (
            lowerType.includes("cause") ||
            lowerType.includes("result") ||
            lowerType.includes("impact")
          ) {
            groupedTypes.causal?.push(relType);
          } else {
            groupedTypes.other?.push(relType);
          }
        }

        // Remove empty categories
        for (const key of Object.keys(groupedTypes)) {
          const category = groupedTypes[key];
          if (!category || category.length === 0) {
            delete groupedTypes[key];
          }
        }

        return {
          success: true,
          totalTypesFound: relationshipTypes.length,
          relationshipTypes,
          groupedTypes:
            Object.keys(groupedTypes).length > 0 ? groupedTypes : undefined,
        };
      } catch (error) {}
    },
  });

/**
 * Tool that allows the LLM to list available entity types in the system
 */
export const listEntityTypesTool = (profileId: string) =>
  tool({
    description: dedent`
      Retrieves a list of entity types available in the system, such as 'Person', 'Project', 'Decision', or 'Concept'.
      Use this tool to discover what types of entities exist before using tools like discoverKeyEntities tool or listEntityNames tool with specific entity type filters.
      This helps narrow searches to specific categories of entities.
    `,
    parameters: z.object({
      meetingIds: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Restrict the search to specific meetings by providing an array of meeting IDs. Useful when you want to analyze entity types within a particular context or timeframe.",
        ),
      topicIds: z
        .array(z.string())
        .optional()
        .describe(
          "(Optional) Narrow down the search to specific discussion topics by providing an array of topic IDs. Helps focus on entity types that emerged within particular conversation segments.",
        ),
      query: z
        .string()
        .optional()
        .describe(
          "(Optional) Search query to find entity types similar to this text.",
        ),
      maxResults: z
        .number()
        .positive()
        .default(15)
        .describe(
          "(Optional) Maximum number of entity types to return. Defaults to 15.",
        ),
    }),
    execute: async (params) => {
      try {
        const { meetingIds, topicIds, query = "", maxResults } = params;

        // Validate meeting access before proceeding
        const validatedMeetingIds = await validateProfileMeetingAccess(
          profileId,
          meetingIds,
        );

        // Create search options using the helper function
        const searchOptions = createSearchOptions(profileId, {
          topK: maxResults * 3, // Request more to ensure we have enough unique results
          meetingIds: validatedMeetingIds,
          topicIds,
        });

        // Perform search to get entities
        const results = await searchEntities(query, searchOptions);

        // Extract unique entity types
        const entityTypesSet = new Set<string>();

        for (const entity of results.entities) {
          if (entity.metadata.entity_type) {
            entityTypesSet.add(entity.metadata.entity_type);
          }
        }

        // Also check relationships for entity types
        for (const rel of results.relationships) {
          const metadata = enhanceMetadata(rel.metadata, {
            subject_entity_type: undefined as string | undefined,
            object_entity_type: undefined as string | undefined,
          });

          if (metadata.subject_entity_type) {
            entityTypesSet.add(metadata.subject_entity_type);
          }

          if (metadata.object_entity_type) {
            entityTypesSet.add(metadata.object_entity_type);
          }
        }

        // Convert to array and sort alphabetically
        const entityTypes = Array.from(entityTypesSet)
          .sort()
          .slice(0, maxResults);

        // Group by common categories
        const groupedTypes: Record<string, string[]> = {};

        // Initialize categories
        groupedTypes.people = [];
        groupedTypes.organizations = [];
        groupedTypes.projects = [];
        groupedTypes.concepts = [];
        groupedTypes.decisions = [];
        groupedTypes.other = [];

        // Simple categorization logic
        for (const type of entityTypes) {
          const lowerType = type.toLowerCase();
          if (
            lowerType.includes("person") ||
            lowerType.includes("people") ||
            lowerType === "individual"
          ) {
            groupedTypes.people?.push(type);
          } else if (
            lowerType.includes("org") ||
            lowerType.includes("company") ||
            lowerType.includes("team")
          ) {
            groupedTypes.organizations?.push(type);
          } else if (
            lowerType.includes("project") ||
            lowerType.includes("initiative") ||
            lowerType.includes("task")
          ) {
            groupedTypes.projects?.push(type);
          } else if (
            lowerType.includes("concept") ||
            lowerType.includes("idea") ||
            lowerType.includes("topic")
          ) {
            groupedTypes.concepts?.push(type);
          } else if (
            lowerType.includes("decision") ||
            lowerType.includes("action") ||
            lowerType.includes("resolution")
          ) {
            groupedTypes.decisions?.push(type);
          } else {
            groupedTypes.other?.push(type);
          }
        }

        // Remove empty categories
        for (const key of Object.keys(groupedTypes)) {
          const category = groupedTypes[key];
          if (!category || category.length === 0) {
            delete groupedTypes[key];
          }
        }

        return {
          success: true,
          totalTypesFound: entityTypes.length,
          entityTypes,
          groupedTypes:
            Object.keys(groupedTypes).length > 0 ? groupedTypes : undefined,
        };
      } catch (error) {
        console.error("List entity types error:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unknown error retrieving entity types",
          suggestion: "Try with broader filters or check your parameters",
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
  listEntityNamesTool,
  listRelationshipTypesTool,
  listEntityTypesTool,
};
