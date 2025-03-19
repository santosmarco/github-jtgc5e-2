import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { dedent as s } from "ts-dedent";
import { z } from "zod";
import _ from "lodash";

import { createClient } from "../supabase/client";
import type { Tables } from "../supabase/database.types";
import type { ProcessingContext } from "./steps";
import type { TopicSegment } from "./topic-segmentation";
import { cleanVtt, extractVttSegments } from "./vtt-utils";
import { embedTopicEntities } from "./entity-embeddings";
import { aiSearchTools } from "./ai-search-tools";
import zodToJsonSchema from "zod-to-json-schema";

/**
 * Represents a span for tracing and logging operations
 */
export type Span = Parameters<
  Parameters<ProcessingContext["logger"]["trace"]>[1]
>[0];

/**
 * Topic segment with a unique identifier
 */
export type TopicSegmentWithId = TopicSegment & { id: string };

/**
 * Meeting data with related topics and events
 */
export type MeetingWithTopicsAndTopicEvents = Tables<"meetings"> & {
  topics: (Tables<"meeting_topics_v2"> & {
    events: Tables<"meeting_topic_events_v2">[];
  })[];
};

/**
 * Input variables for entity extraction prompt
 */
export type EntityExtractionPromptVariables = {
  currentTopic: TopicSegment;
  topicVtt: string;
  previousTopic?: TopicSegment;
  nextTopic?: TopicSegment;
};

/**
 * Schema for an entity extracted from meeting content
 */
export const Entity = z.object({
  name: z.string().describe("Name of the entity."),
  type: z.string().describe("Type of the entity."),
  description: z
    .string()
    .describe("Brief description or context of the entity."),
  observations: z
    .array(z.string())
    .describe("Specific observations about this entity."),
});
export type Entity = z.infer<typeof Entity>;

/**
 * Schema for a relationship between two entities
 */
export const EntityRelation = z.object({
  entity1: z.string().describe("First entity in the relationship."),
  entity2: z.string().describe("Second entity in the relationship."),
  relationship: z.string().describe("Nature of the relationship"),
  observations: z
    .array(z.string())
    .describe("Specific observations about this relationship."),
});
export type EntityRelation = z.infer<typeof EntityRelation>;

/**
 * Schema for the complete output of entity extraction
 */
export const EntityExtractionOutput = z.object({
  entities: z
    .array(Entity)
    .describe("List of identified entities from the meeting segment."),
  relationships: z
    .array(EntityRelation)
    .describe(
      "List of relationships identified between the extracted entities.",
    ),
  observations: z
    .array(z.string())
    .describe("List of general observations regarding the overall context."),
});
export type EntityExtractionOutput = z.infer<typeof EntityExtractionOutput>;

/**
 * Performs entity extraction on meeting content using AI
 *
 * @param variables - Input variables containing topic and VTT content
 * @param ctx - Processing context for logging and tracing
 * @returns Structured entity extraction results
 */
export async function entityExtraction(
  variables: EntityExtractionPromptVariables,
  ctx: ProcessingContext,
): Promise<EntityExtractionOutput> {
  const { currentTopic, topicVtt, previousTopic, nextTopic } = variables;
  const cleanedTopicVtt = cleanVtt(topicVtt);

  return await ctx.logger.trace("🧠 AI entity extraction", async (span) => {
    span.setAttribute("topic.title", currentTopic.title);
    span.setAttribute("topic.start_id", currentTopic.start_segment_id);
    span.setAttribute("topic.end_id", currentTopic.end_segment_id);
    span.setAttribute("vtt.length", cleanedTopicVtt.length);
    span.setAttribute("model.name", "openai/o3-mini");

    ctx.logger.info("Starting AI entity extraction", {
      topicTitle: currentTopic.title,
      vttLength: cleanedTopicVtt.length,
      modelName: "openai/o3-mini",
    });

    const systemMessage = getEntityExtractionSystemMessage();
    const prompt = getEntityExtractionPrompt({
      currentTopic,
      topicVtt: cleanedTopicVtt,
      previousTopic,
      nextTopic,
    });

    const generation = await generateObject({
      model: openai("o3-mini"),
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      schema: EntityExtractionOutput,
    });

    const { entities, relationships, observations } = generation.object;

    span.setAttribute("entities.count", entities.length);
    span.setAttribute("relationships.count", relationships.length);
    span.setAttribute("observations.count", observations.length);

    ctx.logger.info("AI entity extraction completed", {
      entitiesExtracted: entities.length,
      relationshipsIdentified: relationships.length,
      observationsMade: observations.length,
    });

    return generation.object;
  });
}

/**
 * Main entry point for the entity extraction process
 *
 * @param param0 - Object containing video API ID
 * @param ctx - Processing context for logging and tracing
 */
export async function runEntityExtraction(
  { video_api_id }: { video_api_id: string },
  ctx: ProcessingContext,
): Promise<void> {
  return await ctx.logger.trace(
    "🔍 Entity extraction process",
    async (span) => {
      span.setAttribute("video_api_id", video_api_id);
      span.setAttribute("step", "entity-extraction");

      ctx.logger.info("Starting entity extraction process", {
        video_api_id,
        step: "entity-extraction",
      });

      try {
        // Fetch meeting data
        const meeting = await fetchMeetingData(video_api_id, ctx, span);

        // Process meeting topics
        const meetingTopics = prepareMeetingTopics(meeting, span, ctx);

        // Process each topic in parallel
        await processAllTopics(meetingTopics, meeting, video_api_id, ctx);

        ctx.logger.info("Entity extraction process completed successfully", {
          video_api_id,
          topicsProcessed: meetingTopics.length,
        });
      } catch (error) {
        span.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : String(error),
        });

        ctx.logger.error("Error in entity extraction process", {
          video_api_id,
          error,
        });
        throw error;
      }
    },
  );
}

/**
 * Fetches meeting data from the database
 *
 * @param video_api_id - Video API identifier
 * @param ctx - Processing context
 * @param span - Tracing span
 * @returns Meeting data with topics and events
 */
async function fetchMeetingData(
  video_api_id: string,
  ctx: ProcessingContext,
  span: Span,
): Promise<MeetingWithTopicsAndTopicEvents> {
  const supabase = createClient();

  ctx.logger.info("Fetching meeting data", { video_api_id });
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("*, topics:meeting_topics_v2(*, events:meeting_topic_events_v2(*))")
    .eq("video_api_id", video_api_id)
    .single();

  if (meetingError) {
    span.setAttribute("error", true);
    span.setAttribute("error.message", meetingError.message);
    span.setStatus({
      code: 2,
      message: meetingError.message,
    });

    ctx.logger.error("Error fetching meeting data", {
      video_api_id,
      error: meetingError,
    });
    throw meetingError;
  }

  if (!meeting.clean_vtt_file) {
    const errorMessage = "Meeting has no clean VTT file";
    span.setStatus({
      code: 2,
      message: errorMessage,
    });

    ctx.logger.error(errorMessage, { video_api_id });
    throw new Error(errorMessage);
  }

  meeting.clean_vtt_file = cleanVtt(meeting.clean_vtt_file);
  span.setAttribute("vtt.length", meeting.clean_vtt_file.length);
  span.setAttribute("profile_id", meeting.profile_id ?? "");

  return meeting;
}

/**
 * Prepares meeting topics for processing
 *
 * @param meeting - Meeting data with topics
 * @param span - Tracing span
 * @param ctx - Processing context
 * @returns Sorted and filtered meeting topics
 */
function prepareMeetingTopics(
  meeting: MeetingWithTopicsAndTopicEvents,
  span: Span,
  ctx: ProcessingContext,
) {
  const meetingTopics = _.sortBy(
    meeting.topics
      .filter((topic) => topic.latest)
      .map(({ summary, ...topic }) => ({
        ...topic,
        detailed_summary: summary,
        timeline: _.sortBy(
          topic.events.filter((event) => event.latest),
          (event) => event.timestamp,
        ),
      })),
    (topic) => topic.start_segment_id,
  );

  span.setAttribute("topics.count", meetingTopics.length);
  ctx.logger.info("Processing meeting topics", {
    topicsCount: meetingTopics.length,
  });

  return meetingTopics;
}

/**
 * Processes all topics in parallel
 *
 * @param meetingTopics - Prepared meeting topics
 * @param meeting - Meeting data
 * @param video_api_id - Video API identifier
 * @param ctx - Processing context
 */
async function processAllTopics(
  meetingTopics: ReturnType<typeof prepareMeetingTopics>,
  meeting: MeetingWithTopicsAndTopicEvents,
  video_api_id: string,
  ctx: ProcessingContext,
): Promise<void> {
  await Promise.all(
    meetingTopics.map(async (topic, index) => {
      return processSingleTopic(
        topic,
        index,
        meetingTopics,
        meeting,
        video_api_id,
        ctx,
      );
    }),
  );
}

/**
 * Processes a single topic for entity extraction
 *
 * @param topic - Topic to process
 * @param index - Index of the topic in the array
 * @param meetingTopics - All meeting topics
 * @param meeting - Meeting data
 * @param video_api_id - Video API identifier
 * @param ctx - Processing context
 */
async function processSingleTopic(
  topic: TopicSegmentWithId,
  index: number,
  meetingTopics: ReturnType<typeof prepareMeetingTopics>,
  meeting: MeetingWithTopicsAndTopicEvents,
  video_api_id: string,
  ctx: ProcessingContext,
): Promise<void> {
  return await ctx.logger.trace(
    `🧩 Processing topic ${index + 1}/${meetingTopics.length}`,
    async (topicSpan) => {
      topicSpan.setAttribute("topic.id", topic.id);
      topicSpan.setAttribute("topic.title", topic.title);
      topicSpan.setAttribute("topic.index", index);

      // Extract VTT for this topic
      const topicVtt = extractVttSegments(
        meeting.clean_vtt_file ?? "",
        topic.start_segment_id,
        topic.end_segment_id,
      );
      topicSpan.setAttribute("topic.vtt.length", topicVtt.length);

      // Get adjacent topics for context
      const previousTopic = index > 0 ? meetingTopics[index - 1] : undefined;
      const nextTopic =
        index < meetingTopics.length - 1 ? meetingTopics[index + 1] : undefined;

      // Handle existing entities
      await handleExistingEntities(topic, ctx, topicSpan);

      // Perform entity extraction
      const extractionResults = await performEntityExtraction(
        topic,
        topicVtt,
        previousTopic,
        nextTopic,
        ctx,
        topicSpan,
      );

      // Save extraction results
      await saveExtractionResults(
        extractionResults,
        topic,
        meeting,
        video_api_id,
        ctx,
        topicSpan,
      );

      ctx.logger.info("Topic processing completed successfully", {
        topic_id: topic.id,
        topicTitle: topic.title,
        entitiesProcessed: extractionResults.entities.length,
        relationshipsProcessed: extractionResults.relationships.length,
        observationsProcessed: extractionResults.observations.length,
      });
    },
  );
}

/**
 * Handles existing entities for a topic
 *
 * @param topic - Topic to process
 * @param ctx - Processing context
 * @param topicSpan - Tracing span
 */
async function handleExistingEntities(
  topic: TopicSegmentWithId,
  ctx: ProcessingContext,
  topicSpan: Span,
): Promise<void> {
  const supabase = createClient();

  ctx.logger.info("Checking for existing entities", {
    topic_id: topic.id,
    topicTitle: topic.title,
  });

  const { data: existingEntities, error: fetchEntitiesError } = await supabase
    .from("meeting_entities_v2")
    .select("id")
    .eq("meeting_topic_id", topic.id)
    .eq("latest", true);

  if (fetchEntitiesError) {
    topicSpan.setStatus({
      code: 2,
      message: fetchEntitiesError.message,
    });

    ctx.logger.error("Error fetching existing entities", {
      topic_id: topic.id,
      topicTitle: topic.title,
      error: fetchEntitiesError,
    });
    throw fetchEntitiesError;
  }

  topicSpan.setAttribute("existing_entities.count", existingEntities.length);
  ctx.logger.info("Found existing entities", {
    topic_id: topic.id,
    topicTitle: topic.title,
    count: existingEntities.length,
  });

  // Update existing records if they exist
  if (existingEntities.length > 0) {
    await updateExistingRecords(topic, existingEntities, ctx);
  }
}

/**
 * Updates existing records to latest=false
 *
 * @param topic - Topic being processed
 * @param existingEntities - Existing entities to update
 * @param ctx - Processing context
 */
async function updateExistingRecords(
  topic: TopicSegmentWithId,
  existingEntities: { id: string }[],
  ctx: ProcessingContext,
): Promise<void> {
  const supabase = createClient();

  return await ctx.logger.trace(
    "📝 Updating existing records",
    async (updateSpan) => {
      const entityIds = existingEntities.map((entity) => entity.id);
      updateSpan.setAttribute("entity_ids.count", entityIds.length);

      ctx.logger.info("Updating existing entities to latest=false", {
        topic_id: topic.id,
        topicTitle: topic.title,
        entitiesCount: existingEntities.length,
      });

      // Update entities
      const { error: updateEntitiesError } = await supabase
        .from("meeting_entities_v2")
        .update({ latest: false })
        .in("id", entityIds);

      if (updateEntitiesError) {
        updateSpan.setStatus({
          code: 2,
          message: updateEntitiesError.message,
        });

        ctx.logger.error("Error updating existing entities", {
          topic_id: topic.id,
          topicTitle: topic.title,
          error: updateEntitiesError,
        });
        throw updateEntitiesError;
      }

      // Update relationships
      ctx.logger.info("Updating existing relationships to latest=false", {
        topic_id: topic.id,
        topicTitle: topic.title,
      });

      const { error: updateRelationshipsError } = await supabase
        .from("meeting_entity_relationships_v2")
        .update({ latest: false })
        .eq("meeting_topic_id", topic.id);

      if (updateRelationshipsError) {
        updateSpan.setStatus({
          code: 2,
          message: updateRelationshipsError.message,
        });

        ctx.logger.error("Error updating existing relationships", {
          topic_id: topic.id,
          topicTitle: topic.title,
          error: updateRelationshipsError,
        });
        throw updateRelationshipsError;
      }

      // Update observations
      ctx.logger.info("Updating existing observations to latest=false", {
        topic_id: topic.id,
        topicTitle: topic.title,
      });

      const { error: updateObservationsError } = await supabase
        .from("meeting_observations_v2")
        .update({ latest: false })
        .eq("meeting_topic_id", topic.id);

      if (updateObservationsError) {
        updateSpan.setStatus({
          code: 2,
          message: updateObservationsError.message,
        });

        ctx.logger.error("Error updating existing observations", {
          topic_id: topic.id,
          topicTitle: topic.title,
          error: updateObservationsError,
        });
        throw updateObservationsError;
      }

      ctx.logger.info("Successfully updated existing records", {
        topic_id: topic.id,
        topicTitle: topic.title,
      });
    },
  );
}

/**
 * Performs entity extraction for a specific topic
 *
 * @param topic - Topic to process
 * @param topicVtt - VTT content for the topic
 * @param previousTopic - Previous topic for context
 * @param nextTopic - Next topic for context
 * @param ctx - Processing context
 * @param topicSpan - Tracing span
 * @returns Entity extraction results
 */
async function performEntityExtraction(
  topic: TopicSegmentWithId,
  topicVtt: string,
  previousTopic: TopicSegmentWithId | undefined,
  nextTopic: TopicSegmentWithId | undefined,
  ctx: ProcessingContext,
  topicSpan: Span,
): Promise<EntityExtractionOutput> {
  ctx.logger.info("Calling AI entity extraction", {
    topic_id: topic.id,
    topicTitle: topic.title,
    vttLength: topicVtt.length,
  });

  const entityExtractionResult = await entityExtraction(
    { currentTopic: topic, topicVtt, previousTopic, nextTopic },
    ctx,
  );

  const { entities, relationships, observations } = entityExtractionResult;

  topicSpan.setAttribute("entities.count", entities.length);
  topicSpan.setAttribute("relationships.count", relationships.length);
  topicSpan.setAttribute("observations.count", observations.length);

  ctx.logger.info("Entity extraction completed", {
    topic_id: topic.id,
    entitiesCount: entities.length,
    relationshipsCount: relationships.length,
    observationsCount: observations.length,
  });

  return entityExtractionResult;
}

/**
 * Saves extraction results to the database
 *
 * @param extractionResults - Entity extraction results
 * @param topic - Topic being processed
 * @param meeting - Meeting data
 * @param video_api_id - Video API identifier
 * @param ctx - Processing context
 * @param topicSpan - Tracing span
 */
async function saveExtractionResults(
  extractionResults: EntityExtractionOutput,
  topic: TopicSegmentWithId,
  meeting: MeetingWithTopicsAndTopicEvents,
  video_api_id: string,
  ctx: ProcessingContext,
  topicSpan: Span,
): Promise<void> {
  const { entities, relationships, observations } = extractionResults;

  ctx.logger.info("Saving extraction results to database", {
    topic_id: topic.id,
    topicTitle: topic.title,
    entitiesCount: entities.length,
    relationshipsCount: relationships.length,
    observationsCount: observations.length,
  });

  // Save entities and their observations
  await saveEntitiesAndObservations(
    entities,
    topic,
    meeting,
    video_api_id,
    ctx,
  );

  // Save relationships and their observations
  await saveRelationships(relationships, topic, meeting, video_api_id, ctx);

  // Save general observations
  if (observations.length > 0) {
    await saveGeneralObservations(
      observations,
      topic,
      meeting,
      video_api_id,
      ctx,
    );
  }

  // Vector embed all extraction results for semantic search
  await ctx.logger.trace(
    "🔍 Vector embedding entity data",
    async (embedSpan) => {
      embedSpan.setAttribute("topic.id", topic.id);
      embedSpan.setAttribute("topic.title", topic.title);
      embedSpan.setAttribute("entities.count", entities.length);
      embedSpan.setAttribute("relationships.count", relationships.length);
      embedSpan.setAttribute("observations.count", observations.length);

      ctx.logger.info("Vector embedding entity extraction results", {
        topic_id: topic.id,
        topicTitle: topic.title,
        entitiesCount: entities.length,
        relationshipsCount: relationships.length,
        observationsCount: observations.length,
      });

      try {
        await embedTopicEntities(
          extractionResults,
          meeting,
          topic.id,
          topic.title,
        );

        ctx.logger.info("Successfully embedded entity data for vector search", {
          topic_id: topic.id,
          topicTitle: topic.title,
        });
      } catch (error) {
        embedSpan.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : String(error),
        });

        ctx.logger.error("Error embedding entity data", {
          topic_id: topic.id,
          topicTitle: topic.title,
          error,
        });

        // Non-critical error - we can continue even if embedding fails
        ctx.logger.warn("Continuing process despite embedding failure", {
          topic_id: topic.id,
        });
      }
    },
  );
}

/**
 * Saves entities and their observations to the database
 *
 * @param entities - Entities to save
 * @param topic - Topic being processed
 * @param meeting - Meeting data
 * @param video_api_id - Video API identifier
 * @param ctx - Processing context
 */
async function saveEntitiesAndObservations(
  entities: Entity[],
  topic: TopicSegmentWithId,
  meeting: Tables<"meetings">,
  video_api_id: string,
  ctx: ProcessingContext,
): Promise<void> {
  const supabase = createClient();

  return await ctx.logger.trace(
    "💾 Saving entities and observations",
    async (saveSpan) => {
      saveSpan.setAttribute("entities.count", entities.length);

      await Promise.all(
        entities.map(async (entity, entityIndex) => {
          ctx.logger.debug(
            `Saving entity ${entityIndex + 1}/${entities.length}`,
            {
              topic_id: topic.id,
              entityName: entity.name,
              entityType: entity.type,
            },
          );

          const { data: entityData, error: entityInsertError } = await supabase
            .from("meeting_entities_v2")
            .insert({
              meeting_topic_id: topic.id,
              api_video_id: video_api_id,
              profile_id: meeting.profile_id ?? "",
              name: entity.name,
              type: entity.type,
              description: entity.description,
              latest: true,
            })
            .select("*")
            .single();

          if (entityInsertError) {
            saveSpan.setStatus({
              code: 2,
              message: entityInsertError.message,
            });

            ctx.logger.error("Error saving entity", {
              topic_id: topic.id,
              topicTitle: topic.title,
              entityName: entity.name,
              error: entityInsertError,
            });
            throw entityInsertError;
          }

          // Save entity observations
          if (entity.observations.length > 0) {
            await saveEntityObservations(
              entity,
              entityData.id,
              topic,
              meeting,
              video_api_id,
              ctx,
              saveSpan,
            );
          }
        }),
      );
    },
  );
}

/**
 * Saves observations for a specific entity
 *
 * @param entity - Entity with observations
 * @param entityId - Database ID of the entity
 * @param topic - Topic being processed
 * @param meeting - Meeting data
 * @param video_api_id - Video API identifier
 * @param ctx - Processing context
 * @param saveSpan - Tracing span
 */
async function saveEntityObservations(
  entity: Entity,
  entityId: string,
  topic: TopicSegmentWithId,
  meeting: Tables<"meetings">,
  video_api_id: string,
  ctx: ProcessingContext,
  saveSpan: Span,
): Promise<void> {
  const supabase = createClient();

  ctx.logger.debug(
    `Saving ${entity.observations.length} observations for entity ${entity.name}`,
    {
      topic_id: topic.id,
    },
  );

  await Promise.all(
    entity.observations.map(async (observation: string) => {
      const { error: observationInsertError } = await supabase
        .from("meeting_entity_observations_v2")
        .insert({
          meeting_topic_id: topic.id,
          api_video_id: video_api_id,
          profile_id: meeting.profile_id ?? "",
          meeting_entity_id: entityId,
          observation,
          latest: true,
        });

      if (observationInsertError) {
        saveSpan.setStatus({
          code: 2,
          message: observationInsertError.message,
        });

        ctx.logger.error("Error saving entity observation", {
          topic_id: topic.id,
          topicTitle: topic.title,
          entityName: entity.name,
          error: observationInsertError,
        });
        throw observationInsertError;
      }
    }),
  );
}

/**
 * Saves entity relationships and their observations
 *
 * @param relationships - Relationships to save
 * @param topic - Topic being processed
 * @param meeting - Meeting data
 * @param video_api_id - Video API identifier
 * @param ctx - Processing context
 */
async function saveRelationships(
  relationships: EntityRelation[],
  topic: TopicSegmentWithId,
  meeting: Tables<"meetings">,
  video_api_id: string,
  ctx: ProcessingContext,
): Promise<void> {
  const supabase = createClient();

  return await ctx.logger.trace("🔗 Saving relationships", async (relSpan) => {
    relSpan.setAttribute("relationships.count", relationships.length);

    await Promise.all(
      relationships.map(async (relationship, relIndex) => {
        ctx.logger.debug(
          `Saving relationship ${relIndex + 1}/${relationships.length}`,
          {
            topic_id: topic.id,
            entity1: relationship.entity1,
            entity2: relationship.entity2,
            relationshipType: relationship.relationship,
          },
        );

        const { data: relationshipData, error: relationshipInsertError } =
          await supabase
            .from("meeting_entity_relationships_v2")
            .insert({
              meeting_topic_id: topic.id,
              api_video_id: video_api_id,
              profile_id: meeting.profile_id ?? "",
              subject_entity_name: relationship.entity1,
              object_entity_name: relationship.entity2,
              relationship_type: relationship.relationship,
              latest: true,
            })
            .select("*")
            .single();

        if (relationshipInsertError) {
          relSpan.setStatus({
            code: 2,
            message: relationshipInsertError.message,
          });

          ctx.logger.error("Error saving relationship", {
            topic_id: topic.id,
            topicTitle: topic.title,
            entity1: relationship.entity1,
            entity2: relationship.entity2,
            error: relationshipInsertError,
          });
          throw relationshipInsertError;
        }

        // Save relationship observations
        if (relationship.observations.length > 0) {
          await saveRelationshipObservations(
            relationship,
            relationshipData.id,
            topic,
            meeting,
            video_api_id,
            ctx,
            relSpan,
          );
        }
      }),
    );
  });
}

/**
 * Saves observations for a specific relationship
 *
 * @param relationship - Relationship with observations
 * @param relationshipId - Database ID of the relationship
 * @param topic - Topic being processed
 * @param meeting - Meeting data
 * @param video_api_id - Video API identifier
 * @param ctx - Processing context
 * @param relSpan - Tracing span
 */
async function saveRelationshipObservations(
  relationship: EntityRelation,
  relationshipId: string,
  topic: TopicSegmentWithId,
  meeting: Tables<"meetings">,
  video_api_id: string,
  ctx: ProcessingContext,
  relSpan: Span,
): Promise<void> {
  const supabase = createClient();

  ctx.logger.debug(
    `Saving ${relationship.observations.length} observations for relationship`,
    {
      topic_id: topic.id,
      entity1: relationship.entity1,
      entity2: relationship.entity2,
    },
  );

  await Promise.all(
    relationship.observations.map(async (observation: string) => {
      const { error: observationInsertError } = await supabase
        .from("meeting_entity_relationship_observations_v2")
        .insert({
          meeting_topic_id: topic.id,
          api_video_id: video_api_id,
          profile_id: meeting.profile_id ?? "",
          meeting_entity_relationship_id: relationshipId,
          observation,
          latest: true,
        });

      if (observationInsertError) {
        relSpan.setStatus({
          code: 2,
          message: observationInsertError.message,
        });

        ctx.logger.error("Error saving relationship observation", {
          topic_id: topic.id,
          topicTitle: topic.title,
          entity1: relationship.entity1,
          entity2: relationship.entity2,
          error: observationInsertError,
        });
        throw observationInsertError;
      }
    }),
  );
}

/**
 * Saves general observations about the topic
 *
 * @param observations - General observations to save
 * @param topic - Topic being processed
 * @param meeting - Meeting data
 * @param video_api_id - Video API identifier
 * @param ctx - Processing context
 */
async function saveGeneralObservations(
  observations: string[],
  topic: TopicSegmentWithId,
  meeting: Tables<"meetings">,
  video_api_id: string,
  ctx: ProcessingContext,
): Promise<void> {
  const supabase = createClient();

  return await ctx.logger.trace(
    "📝 Saving general observations",
    async (obsSpan) => {
      obsSpan.setAttribute("observations.count", observations.length);

      ctx.logger.info(`Saving ${observations.length} general observations`, {
        topic_id: topic.id,
        topicTitle: topic.title,
      });

      await Promise.all(
        observations.map(async (observation, obsIndex) => {
          ctx.logger.debug(
            `Saving observation ${obsIndex + 1}/${observations.length}`,
            {
              topic_id: topic.id,
            },
          );

          const { error: observationInsertError } = await supabase
            .from("meeting_observations_v2")
            .insert({
              meeting_topic_id: topic.id,
              api_video_id: video_api_id,
              profile_id: meeting.profile_id ?? "",
              observation,
              latest: true,
            });

          if (observationInsertError) {
            obsSpan.setStatus({
              code: 2,
              message: observationInsertError.message,
            });

            ctx.logger.error("Error saving general observation", {
              topic_id: topic.id,
              topicTitle: topic.title,
              error: observationInsertError,
            });
            throw observationInsertError;
          }
        }),
      );
    },
  );
}

export function getEntityExtractionSystemMessage() {
  return s`
    You are a specialized AI system that analyzes meeting segments to extract entities, identify relationships, and make observations for knowledge graph creation - delivering results in clean JSON format optimized for knowledge representation and insight discovery.
  `;
}

export function getEntityExtractionPrompt({
  currentTopic,
  topicVtt,
  previousTopic,
  nextTopic,
}: EntityExtractionPromptVariables) {
  return s`
    You are a specialized AI system designed to analyze meeting transcripts and extract valuable information for knowledge graph creation. Your task is to transform conversational data into structured knowledge that reveals organizational patterns, dependencies, and actionable intelligence.

    Here is the main meeting segment you need to analyze:
    <meeting_segment>
    ${JSON.stringify(currentTopic, null, 2)}
    </meeting_segment>

    For additional context, here is the VTT content of the above meeting segment:
    <vtt_content>
    ${topicVtt}
    </vtt_content>

    To ensure continuity, consider these adjacent segments:

    Previous segment:
    <previous_segment>
    ${previousTopic ? JSON.stringify(previousTopic, null, 2) : "None"}
    </previous_segment>

    Next segment:
    <next_segment>
    ${nextTopic ? JSON.stringify(nextTopic, null, 2) : "None"}
    </next_segment>

    Your analysis should follow these steps:

    1. Entity Identification: Extract all relevant entities from the meeting segment, including but not limited to:
      - People (team members, stakeholders, customers)
      - Projects (initiatives, campaigns, workstreams)
      - Artifacts (documents, lists, reports, presentations)
      - Systems (technologies, platforms, tools, software)
      - Processes (workflows, procedures, methodologies)
      - Metrics (KPIs, goals, targets, deadlines)
      - Organizations (companies, departments, teams)
      - Decisions (choices made, approvals, rejections)
      - Problems (issues, challenges, blockers)
      - Solutions (resolutions, workarounds, fixes)
      - ...

    2. Relationship Mapping: Identify all meaningful connections between entities, capturing:
      - Direction (clear source and target entities)
      - Nature (precise relationship type)
      - Strength (importance or criticality of the relationship)
      - Temporality (current, planned, or historical relationship)
      - Conditionality (any dependencies or contingencies)

    3. Insight Extraction: Derive high-value observations that reveal:
      - Dependencies (critical path relationships and bottlenecks)
      - Patterns (recurring themes, approaches, or challenges)
      - Priorities (explicit or implicit importance rankings)
      - Tensions (competing interests, resource conflicts, or trade-offs)
      - Gaps (missing information, unresolved questions, or needed follow-ups)
      - Next Steps (planned actions, assignments, or decisions)

    Before providing your final output, break down your thought process for each main step inside <knowledge_graph_analysis> tags in your thinking block:

    1. Entity Identification: List entities by type, numbering them (e.g., 1. People: a) John Doe, b) Jane Smith, 2. Projects: a) Website Redesign, b) Marketing Campaign, etc.)

    2. Relationship Mapping: Create a table with columns for entity1, entity2, and relationship (e.g., | Entity1 | Entity2 | Relationship |)

    3. Insight Extraction: List insights under categories (e.g., Dependencies: 1..., 2..., Patterns: 1..., 2..., etc.)

    This will ensure a thorough interpretation of the data. It's OK for this section to be quite long.

    Your final output should be in the following JSON structure:

    \`\`\`json
    {
      "entities": [
        {
          "name": "Entity Name",
          "type": "Person|Project|Artifact|System|Process|Metric|Organization|Decision|Problem|Solution|...",
          "description": "Comprehensive description with full context and significance",
          "observations": [
            "Specific insight about this entity's role/importance",
            "Another observation about status/impact"
          ]
        }
      ],
      "relationships": [
        {
          "entity1": "Source Entity Name",
          "entity2": "Target Entity Name",
          "relationship": "Precise relationship descriptor",
          "observations": [
            "Insight about this relationship's significance",
            "Observation about dependencies/implications"
          ]
        }
      ],
      "observations": [
        "Strategic insight revealing organizational patterns or priorities",
        "Critical dependency or bottleneck identification",
        "Key decision context or rationale",
        "Important timeline or deadline implication",
        "Resource allocation or ownership clarification"
      ]
    }
    \`\`\`

    Ensure your analysis meets these quality standards:
    1. Precision: Extract only entities with clear evidence in the transcript
    2. Comprehensiveness: Capture all significant entities and relationships
    3. Context-awareness: Incorporate relevant background from adjacent segments
    4. Insight-driven: Prioritize observations with strategic or operational value
    5. Disambiguation: Clearly distinguish between similar entities
    6. Consistency: Maintain uniform naming and typing conventions
    7. Completeness: Ensure all entity references resolve to defined entities

    Your analysis should demonstrate expert-level understanding of organizational dynamics, project management, and business operations. Produce output that would satisfy the most demanding knowledge management professional.

    Your final output should consist only of the JSON structure and should not duplicate or rehash any of the work you did in the thinking block.
  `;
}
