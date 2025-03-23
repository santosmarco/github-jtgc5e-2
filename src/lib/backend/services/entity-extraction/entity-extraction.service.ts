import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import dayjs from "dayjs";
import _ from "lodash";

import { embedTopicEntities } from "~/lib/processing/entity-embeddings";
import type { ProcessingContext } from "~/lib/processing/steps";
import type { Tables } from "~/lib/supabase/database.types";

import { BackendService } from "../backend.service";
import type { TopicSegment } from "../topic-segmentation/topic-segmentation.schemas";
import { Vtt } from "../vtt/vtt.service";

import {
  type EntityExtractionPromptVariables,
  getEntityExtractionPrompt,
  getEntityExtractionSystemMessage,
} from "./entity-extraction.prompts";
import {
  type Entity,
  EntityExtractionOutput,
  type EntityRelation,
} from "./entity-extraction.schemas";

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
 * Represents a span for tracing and logging operations
 */
export type Span = Parameters<
  Parameters<ProcessingContext["logger"]["trace"]>[1]
>[0];

/**
 * Service for extracting entities, relationships and observations from meeting transcripts
 */
export class EntityExtractionService extends BackendService {
  /**
   * Performs entity extraction on meeting content using AI
   *
   * @param variables - Input variables containing topic and VTT content
   * @param ctx - Processing context for logging and tracing
   * @returns Structured entity extraction results
   */
  async entityExtraction(
    variables: EntityExtractionPromptVariables,
    ctx: ProcessingContext,
  ): Promise<EntityExtractionOutput> {
    const { currentTopic, topicVtt, previousTopic, nextTopic } = variables;

    // Handle string or Vtt object
    const cleanedTopicVtt =
      typeof topicVtt === "string" ? topicVtt : topicVtt.clean().toString();

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
        model: openai("o3-mini", { reasoningEffort: "high" }),
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt },
        ],
        schema: EntityExtractionOutput,
        experimental_telemetry: {
          isEnabled: true,
          functionId: "entity-extraction",
        },
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
  async runEntityExtraction(
    { api_video_id }: { api_video_id: string },
    ctx: ProcessingContext,
  ): Promise<void> {
    return await ctx.logger.trace(
      "🔍 Entity extraction process",
      async (span) => {
        span.setAttribute("api_video_id", api_video_id);
        span.setAttribute("step", "entity-extraction");

        ctx.logger.info("Starting entity extraction process", {
          api_video_id,
          step: "entity-extraction",
        });

        try {
          // Fetch meeting data with topics and events
          const meeting = await this.fetchMeetingData(api_video_id, ctx, span);

          // Prepare meeting topics for processing
          const meetingTopics = this.prepareMeetingTopics(meeting, span, ctx);

          // Process all topics
          await this.processAllTopics(
            meetingTopics,
            meeting,
            api_video_id,
            ctx,
          );

          ctx.logger.info("Entity extraction process completed successfully", {
            api_video_id,
            topicsProcessed: meetingTopics.topics.length,
          });
        } catch (error) {
          span.setStatus({
            code: 2,
            message: error instanceof Error ? error.message : String(error),
          });

          ctx.logger.error("Error in entity extraction process", {
            api_video_id,
            error,
          });
          throw error;
        }
      },
    );
  }

  /**
   * Fetches meeting data including topics and events
   *
   * @param api_video_id - Video API ID
   * @param ctx - Processing context
   * @param span - Span for tracing
   * @returns Meeting data with topics and events
   */
  private async fetchMeetingData(
    api_video_id: string,
    ctx: ProcessingContext,
    span: Span,
  ): Promise<MeetingWithTopicsAndTopicEvents> {
    ctx.logger.info("Fetching meeting data", { api_video_id });

    const { data: meeting, error: meetingError } = await this.supabase
      .from("meetings")
      .select("*")
      .eq("video_api_id", api_video_id)
      .single();

    if (meetingError) {
      span.setAttribute("error", true);
      span.setAttribute("error.message", meetingError.message);
      span.setStatus({ code: 2, message: meetingError.message });

      ctx.logger.error("Error fetching meeting data", {
        api_video_id,
        error: meetingError,
      });
      throw meetingError;
    }

    ctx.logger.info("Fetching meeting topics", { api_video_id });

    const { data: topics, error: topicsError } = await this.supabase
      .from("meeting_topics_v2")
      .select("*, events:meeting_topic_events_v2(*)")
      .eq("api_video_id", api_video_id)
      .eq("latest", true)
      .order("index");

    if (topicsError) {
      span.setAttribute("error", true);
      span.setAttribute("error.message", topicsError.message);
      span.setStatus({ code: 2, message: topicsError.message });

      ctx.logger.error("Error fetching meeting topics", {
        api_video_id,
        error: topicsError,
      });
      throw topicsError;
    }

    span.setAttribute("topics.count", topics.length);
    span.setAttribute("meeting.has_vtt", !!meeting.clean_vtt_file);

    ctx.logger.info("Meeting data fetched successfully", {
      api_video_id,
      topicsCount: topics.length,
      hasVtt: !!meeting.clean_vtt_file,
    });

    return { ...meeting, topics };
  }

  /**
   * Prepares meeting topics for processing
   *
   * @param meeting - Meeting data with topics
   * @param span - Span for tracing
   * @param ctx - Processing context
   * @returns Prepared meeting topics
   */
  private prepareMeetingTopics(
    meeting: MeetingWithTopicsAndTopicEvents,
    span: Span,
    ctx: ProcessingContext,
  ) {
    if (!meeting.clean_vtt_file) {
      const errorMessage = "Meeting has no clean VTT file";
      span.setStatus({ code: 2, message: errorMessage });
      ctx.logger.error(errorMessage, { api_video_id: meeting.video_api_id });
      throw new Error(errorMessage);
    }

    if (meeting.topics.length === 0) {
      const errorMessage = "Meeting has no topics";
      span.setStatus({ code: 2, message: errorMessage });
      ctx.logger.error(errorMessage, { api_video_id: meeting.video_api_id });
      throw new Error(errorMessage);
    }

    ctx.logger.info("Preparing meeting topics for processing", {
      api_video_id: meeting.video_api_id,
      topicsCount: meeting.topics.length,
    });

    const vtt = meeting.clean_vtt_file;

    // Sort topics by index to ensure proper order
    const sortedTopics = _.sortBy(
      meeting.topics.map((t) => ({
        ...t,
        events: _.sortBy(t.events, (e) => dayjs(e.timestamp).valueOf()),
      })),
      (t) => t.index,
    );

    return {
      vtt,
      topics: sortedTopics,
    };
  }

  /**
   * Processes all topics for entity extraction
   *
   * @param meetingTopics - Prepared meeting topics
   * @param meeting - Meeting data
   * @param api_video_id - Video API ID
   * @param ctx - Processing context
   */
  private async processAllTopics(
    meetingTopics: ReturnType<typeof this.prepareMeetingTopics>,
    meeting: MeetingWithTopicsAndTopicEvents,
    api_video_id: string,
    ctx: ProcessingContext,
  ): Promise<void> {
    const { topics } = meetingTopics;

    ctx.logger.info("Processing topics for entity extraction", {
      api_video_id,
      topicsCount: topics.length,
    });

    // Process each topic sequentially to avoid race conditions
    for (const topic of topics) {
      const topicSegment: TopicSegmentWithId = {
        id: topic.id,
        title: topic.title,
        detailed_summary: topic.summary,
        start_segment_id: topic.start_segment_id,
        end_segment_id: topic.end_segment_id,
        timeline: topic.events.map((event) => ({
          timestamp: event.timestamp,
          event: event.event,
        })),
      };

      await this.processSingleTopic(
        topicSegment,
        topic.index,
        meetingTopics,
        meeting,
        api_video_id,
        ctx,
      );
    }
  }

  /**
   * Processes a single topic for entity extraction
   *
   * @param topic - Topic segment with ID
   * @param index - Topic index
   * @param meetingTopics - Prepared meeting topics
   * @param meeting - Meeting data
   * @param api_video_id - Video API ID
   * @param ctx - Processing context
   */
  private async processSingleTopic(
    topic: TopicSegmentWithId,
    index: number,
    meetingTopics: ReturnType<typeof this.prepareMeetingTopics>,
    meeting: MeetingWithTopicsAndTopicEvents,
    api_video_id: string,
    ctx: ProcessingContext,
  ): Promise<void> {
    const { topics, vtt } = meetingTopics;

    return await ctx.logger.trace(
      `🧠 Processing topic ${index + 1}/${topics.length}`,
      async (topicSpan) => {
        topicSpan.setAttribute("topic.index", index);
        topicSpan.setAttribute("topic.id", topic.id);
        topicSpan.setAttribute("topic.title", topic.title);

        ctx.logger.info("Processing topic for entity extraction", {
          topicIndex: index,
          topicId: topic.id,
          topicTitle: topic.title,
        });

        // Handle existing entities
        await this.handleExistingEntities(topic, ctx, topicSpan);

        // Extract VTT segment for this topic
        const topicVtt = new Vtt(vtt).slice(
          topic.start_segment_id,
          topic.end_segment_id,
        );

        // Get previous and next topics if available
        const previousTopic = index > 0 ? topics[index - 1] : undefined;
        const nextTopic =
          index < topics.length - 1 ? topics[index + 1] : undefined;

        // Convert to TopicSegment format if needed
        const previousTopicSegment = previousTopic
          ? {
              title: previousTopic.title,
              detailed_summary: previousTopic.summary,
              start_segment_id: previousTopic.start_segment_id,
              end_segment_id: previousTopic.end_segment_id,
              timeline: previousTopic.events.map((event) => ({
                timestamp: event.timestamp,
                event: event.event,
              })),
            }
          : undefined;

        const nextTopicSegment = nextTopic
          ? {
              title: nextTopic.title,
              detailed_summary: nextTopic.summary,
              start_segment_id: nextTopic.start_segment_id,
              end_segment_id: nextTopic.end_segment_id,
              timeline: nextTopic.events.map((event) => ({
                timestamp: event.timestamp,
                event: event.event,
              })),
            }
          : undefined;

        // Perform entity extraction
        const extractionResults = await this.performEntityExtraction(
          topic,
          topicVtt,
          previousTopicSegment,
          nextTopicSegment,
          ctx,
          topicSpan,
        );

        // Save extraction results
        await this.saveExtractionResults(
          extractionResults,
          topic,
          meeting,
          api_video_id,
          ctx,
          topicSpan,
        );

        topicSpan.setAttribute(
          "entities.count",
          extractionResults.entities.length,
        );
        topicSpan.setAttribute(
          "relationships.count",
          extractionResults.relationships.length,
        );
        topicSpan.setAttribute(
          "observations.count",
          extractionResults.observations.length,
        );

        ctx.logger.info("Topic entity extraction completed", {
          topicId: topic.id,
          entitiesExtracted: extractionResults.entities.length,
          relationshipsIdentified: extractionResults.relationships.length,
          observationsGenerated: extractionResults.observations.length,
        });
      },
    );
  }

  /**
   * Handles existing entities for a topic
   *
   * @param topic - Topic segment with ID
   * @param ctx - Processing context
   * @param topicSpan - Span for tracing
   */
  private async handleExistingEntities(
    topic: TopicSegmentWithId,
    ctx: ProcessingContext,
    topicSpan: Span,
  ): Promise<void> {
    ctx.logger.info("Checking for existing entities", {
      topicId: topic.id,
    });

    const { data: existingEntities, error: fetchEntitiesError } =
      await this.supabase
        .from("meeting_entities_v2")
        .select("id")
        .eq("meeting_topic_id", topic.id);

    if (fetchEntitiesError) {
      topicSpan.setStatus({
        code: 2,
        message: fetchEntitiesError.message,
      });

      ctx.logger.error("Error fetching existing entities", {
        topicId: topic.id,
        error: fetchEntitiesError,
      });
      throw fetchEntitiesError;
    }

    topicSpan.setAttribute("existing_entities.count", existingEntities.length);

    ctx.logger.info("Found existing entities", {
      topicId: topic.id,
      count: existingEntities.length,
    });

    if (existingEntities.length > 0) {
      await this.updateExistingRecords(topic, existingEntities, ctx);
    }
  }

  /**
   * Updates existing records to set latest=false
   *
   * @param topic - Topic segment with ID
   * @param existingEntities - Existing entities
   * @param ctx - Processing context
   */
  private async updateExistingRecords(
    topic: TopicSegmentWithId,
    existingEntities: { id: string }[],
    ctx: ProcessingContext,
  ): Promise<void> {
    const entityIds = existingEntities.map((entity) => entity.id);

    ctx.logger.info("Updating existing entities to latest=false", {
      topicId: topic.id,
      entitiesCount: existingEntities.length,
    });

    const { error: updateEntitiesError } = await this.supabase
      .from("meeting_entities_v2")
      .update({ latest: false })
      .in("id", entityIds);

    if (updateEntitiesError) {
      ctx.logger.error("Error updating existing entities", {
        topicId: topic.id,
        error: updateEntitiesError,
      });
      throw updateEntitiesError;
    }

    ctx.logger.info("Updating existing entity observations to latest=false", {
      topicId: topic.id,
    });

    const { error: updateObservationsError } = await this.supabase
      .from("meeting_entity_observations_v2")
      .update({ latest: false })
      .in("meeting_entity_id", entityIds);

    if (updateObservationsError) {
      ctx.logger.error("Error updating existing entity observations", {
        topicId: topic.id,
        error: updateObservationsError,
      });
      throw updateObservationsError;
    }

    ctx.logger.info("Fetching existing relationships", {
      topicId: topic.id,
    });

    const { data: existingRelationships, error: fetchRelationshipsError } =
      await this.supabase
        .from("meeting_entity_relationships_v2")
        .select("id")
        .eq("meeting_entity_id", entityIds);

    if (fetchRelationshipsError) {
      ctx.logger.error("Error fetching existing relationships", {
        topicId: topic.id,
        error: fetchRelationshipsError,
      });
      throw fetchRelationshipsError;
    }

    if (existingRelationships.length > 0) {
      const relationshipIds = existingRelationships.map((rel) => rel.id);

      ctx.logger.info("Updating existing relationships to latest=false", {
        topicId: topic.id,
        relationshipsCount: existingRelationships.length,
      });

      const { error: updateRelationshipsError } = await this.supabase
        .from("meeting_entity_relationships_v2")
        .update({ latest: false })
        .in("id", relationshipIds);

      if (updateRelationshipsError) {
        ctx.logger.error("Error updating existing relationships", {
          topicId: topic.id,
          error: updateRelationshipsError,
        });
        throw updateRelationshipsError;
      }

      ctx.logger.info(
        "Updating existing relationship observations to latest=false",
      );

      const { error: updateRelObservationsError } = await this.supabase
        .from("meeting_entity_relationship_observations_v2")
        .update({ latest: false })
        .in("meeting_entity_relationship_id", relationshipIds);

      if (updateRelObservationsError) {
        ctx.logger.error("Error updating existing relationship observations", {
          topicId: topic.id,
          error: updateRelObservationsError,
        });
        throw updateRelObservationsError;
      }
    }

    ctx.logger.info("Fetching existing general observations", {
      topicId: topic.id,
    });

    const { data: existingObservations, error: fetchObservationsError } =
      await this.supabase
        .from("meeting_observations_v2")
        .select("id")
        .eq("meeting_topic_id", topic.id);

    if (fetchObservationsError) {
      ctx.logger.error("Error fetching existing general observations", {
        topicId: topic.id,
        error: fetchObservationsError,
      });
      throw fetchObservationsError;
    }

    if (existingObservations.length > 0) {
      const observationIds = existingObservations.map((obs) => obs.id);

      ctx.logger.info(
        "Updating existing general observations to latest=false",
        {
          topicId: topic.id,
          observationsCount: existingObservations.length,
        },
      );

      const { error: updateObsError } = await this.supabase
        .from("meeting_observations_v2")
        .update({ latest: false })
        .in("id", observationIds);

      if (updateObsError) {
        ctx.logger.error("Error updating existing general observations", {
          topicId: topic.id,
          error: updateObsError,
        });
        throw updateObsError;
      }
    }
  }

  /**
   * Performs entity extraction on a topic
   *
   * @param topic - Topic segment with ID
   * @param topicVtt - VTT content for the topic
   * @param previousTopic - Previous topic segment
   * @param nextTopic - Next topic segment
   * @param ctx - Processing context
   * @param topicSpan - Span for tracing
   * @returns Entity extraction output
   */
  private async performEntityExtraction(
    topic: TopicSegmentWithId,
    topicVtt: Vtt,
    previousTopic: TopicSegment | undefined,
    nextTopic: TopicSegment | undefined,
    ctx: ProcessingContext,
    topicSpan: Span,
  ): Promise<EntityExtractionOutput> {
    ctx.logger.info("Performing AI entity extraction", {
      topicId: topic.id,
      topicTitle: topic.title,
      vttLength: topicVtt.cues.length,
    });

    topicSpan.setAttribute("extraction.started", true);

    const extractionResult = await this.entityExtraction(
      {
        currentTopic: topic,
        topicVtt,
        previousTopic,
        nextTopic,
      },
      ctx,
    );

    topicSpan.setAttribute("extraction.completed", true);
    topicSpan.setAttribute("entities.count", extractionResult.entities.length);
    topicSpan.setAttribute(
      "relationships.count",
      extractionResult.relationships.length,
    );
    topicSpan.setAttribute(
      "observations.count",
      extractionResult.observations.length,
    );

    ctx.logger.info("AI entity extraction completed", {
      topicId: topic.id,
      entitiesCount: extractionResult.entities.length,
      relationshipsCount: extractionResult.relationships.length,
      observationsCount: extractionResult.observations.length,
    });

    return extractionResult;
  }

  /**
   * Saves extraction results to the database
   *
   * @param extractionResults - Entity extraction output
   * @param topic - Topic segment with ID
   * @param meeting - Meeting data
   * @param api_video_id - Video API ID
   * @param ctx - Processing context
   * @param topicSpan - Span for tracing
   */
  private async saveExtractionResults(
    extractionResults: EntityExtractionOutput,
    topic: TopicSegmentWithId,
    meeting: MeetingWithTopicsAndTopicEvents,
    api_video_id: string,
    ctx: ProcessingContext,
    topicSpan: Span,
  ): Promise<void> {
    const { entities, relationships, observations } = extractionResults;

    return await ctx.logger.trace(
      "💾 Saving extraction results",
      async (saveSpan) => {
        saveSpan.setAttribute("topic.id", topic.id);
        saveSpan.setAttribute("entities.count", entities.length);
        saveSpan.setAttribute("relationships.count", relationships.length);
        saveSpan.setAttribute("observations.count", observations.length);

        ctx.logger.info("Saving extraction results to database", {
          topicId: topic.id,
          entitiesCount: entities.length,
          relationshipsCount: relationships.length,
          observationsCount: observations.length,
        });

        // Save entities and their observations
        await this.saveEntitiesAndObservations(
          entities,
          topic,
          meeting,
          api_video_id,
          ctx,
        );

        // Save relationships
        await this.saveRelationships(
          relationships,
          topic,
          meeting,
          api_video_id,
          ctx,
        );

        // Save general observations
        await this.saveGeneralObservations(
          observations,
          topic,
          meeting,
          api_video_id,
          ctx,
        );

        // Create entity embeddings for search
        try {
          await embedTopicEntities(
            extractionResults,
            meeting,
            topic.id,
            topic.title,
          );
        } catch (error) {
          ctx.logger.error("Error creating entity embeddings", {
            topicId: topic.id,
            error,
          });
          // Don't fail the whole process for embedding errors
        }

        ctx.logger.info("Extraction results saved successfully", {
          topicId: topic.id,
        });
      },
    );
  }

  /**
   * Saves entities and their observations to the database
   *
   * @param entities - Entities to save
   * @param topic - Topic segment with ID
   * @param meeting - Meeting data
   * @param api_video_id - Video API ID
   * @param ctx - Processing context
   */
  private async saveEntitiesAndObservations(
    entities: Entity[],
    topic: TopicSegmentWithId,
    meeting: Tables<"meetings">,
    api_video_id: string,
    ctx: ProcessingContext,
  ): Promise<void> {
    await Promise.all(
      entities.map(async (entity, entityIndex) => {
        return await ctx.logger.trace(
          `💾 Saving entity ${entityIndex + 1}/${entities.length}`,
          async (saveSpan) => {
            saveSpan.setAttribute("entity.index", entityIndex);
            saveSpan.setAttribute("entity.name", entity.name);
            saveSpan.setAttribute("entity.type", entity.type);
            saveSpan.setAttribute(
              "entity.observations",
              entity.observations.length,
            );

            ctx.logger.info("Saving entity to database", {
              entityName: entity.name,
              entityType: entity.type,
              observationsCount: entity.observations.length,
            });

            // Insert entity
            const { data: entityData, error: entityInsertionError } =
              await this.supabase
                .from("meeting_entities_v2")
                .insert({
                  meeting_topic_id: topic.id,
                  name: entity.name,
                  type: entity.type,
                  description: entity.description,
                  api_video_id: api_video_id,
                  profile_id: meeting.profile_id ?? "",
                  latest: true,
                })
                .select("id")
                .single();

            if (entityInsertionError) {
              saveSpan.setStatus({
                code: 2,
                message: entityInsertionError.message,
              });

              ctx.logger.error("Error saving entity", {
                entityName: entity.name,
                error: entityInsertionError,
              });
              throw entityInsertionError;
            }

            saveSpan.setAttribute("entity.id", entityData.id);

            // Save entity observations
            await this.saveEntityObservations(
              entity,
              entityData.id,
              topic,
              meeting,
              api_video_id,
              ctx,
              saveSpan,
            );

            return entityData.id;
          },
        );
      }),
    );
  }

  /**
   * Saves entity observations to the database
   *
   * @param entity - Entity
   * @param entityId - Entity ID
   * @param topic - Topic segment with ID
   * @param meeting - Meeting data
   * @param api_video_id - Video API ID
   * @param ctx - Processing context
   * @param saveSpan - Span for tracing
   */
  private async saveEntityObservations(
    entity: Entity,
    entityId: string,
    topic: TopicSegmentWithId,
    meeting: Tables<"meetings">,
    api_video_id: string,
    ctx: ProcessingContext,
    saveSpan: Span,
  ): Promise<void> {
    if (entity.observations.length === 0) {
      return;
    }

    saveSpan.setAttribute("observations.count", entity.observations.length);

    ctx.logger.info("Saving entity observations", {
      entityId,
      entityName: entity.name,
      observationsCount: entity.observations.length,
    });

    await Promise.all(
      entity.observations.map(async (observation, observationIndex) => {
        const { error: observationInsertionError } = await this.supabase
          .from("meeting_entity_observations_v2")
          .insert({
            meeting_entity_id: entityId,
            meeting_topic_id: topic.id,
            observation,
            api_video_id: api_video_id,
            profile_id: meeting.profile_id ?? "",
            latest: true,
          });

        if (observationInsertionError) {
          saveSpan.setStatus({
            code: 2,
            message: observationInsertionError.message,
          });

          saveSpan.setAttribute("observation.index", observationIndex);

          ctx.logger.error("Error saving entity observation", {
            entityId,
            entityName: entity.name,
            observation,
            error: observationInsertionError,
          });
          throw observationInsertionError;
        }
      }),
    );
  }

  /**
   * Saves relationships and their observations to the database
   *
   * @param relationships - Relationships to save
   * @param topic - Topic segment with ID
   * @param meeting - Meeting data
   * @param api_video_id - Video API ID
   * @param ctx - Processing context
   */
  private async saveRelationships(
    relationships: EntityRelation[],
    topic: TopicSegmentWithId,
    meeting: Tables<"meetings">,
    api_video_id: string,
    ctx: ProcessingContext,
  ): Promise<void> {
    await Promise.all(
      relationships.map(async (relationship, relationshipIndex) => {
        return await ctx.logger.trace(
          `💾 Saving relationship ${relationshipIndex + 1}/${
            relationships.length
          }`,
          async (relSpan) => {
            relSpan.setAttribute("relationship.index", relationshipIndex);
            relSpan.setAttribute("relationship.entity1", relationship.entity1);
            relSpan.setAttribute("relationship.entity2", relationship.entity2);
            relSpan.setAttribute(
              "relationship.type",
              relationship.relationship,
            );
            relSpan.setAttribute(
              "relationship.observations",
              relationship.observations.length,
            );

            ctx.logger.info("Saving relationship to database", {
              entity1: relationship.entity1,
              entity2: relationship.entity2,
              relationshipType: relationship.relationship,
              observationsCount: relationship.observations.length,
            });

            // Insert relationship
            const {
              data: relationshipData,
              error: relationshipInsertionError,
            } = await this.supabase
              .from("meeting_entity_relationships_v2")
              .insert({
                meeting_topic_id: topic.id,
                object_entity_name: relationship.entity1,
                subject_entity_name: relationship.entity2,
                relationship_type: relationship.relationship,
                api_video_id: api_video_id,
                profile_id: meeting.profile_id ?? "",
                latest: true,
              })
              .select("id")
              .single();

            if (relationshipInsertionError) {
              relSpan.setStatus({
                code: 2,
                message: relationshipInsertionError.message,
              });

              ctx.logger.error("Error saving relationship", {
                entity1: relationship.entity1,
                entity2: relationship.entity2,
                error: relationshipInsertionError,
              });
              throw relationshipInsertionError;
            }

            relSpan.setAttribute("relationship.id", relationshipData.id);

            // Save relationship observations
            await this.saveRelationshipObservations(
              relationship,
              relationshipData.id,
              topic,
              meeting,
              api_video_id,
              ctx,
              relSpan,
            );

            return relationshipData.id;
          },
        );
      }),
    );
  }

  /**
   * Saves relationship observations to the database
   *
   * @param relationship - Relationship
   * @param relationshipId - Relationship ID
   * @param topic - Topic segment with ID
   * @param meeting - Meeting data
   * @param api_video_id - Video API ID
   * @param ctx - Processing context
   * @param relSpan - Span for tracing
   */
  private async saveRelationshipObservations(
    relationship: EntityRelation,
    relationshipId: string,
    topic: TopicSegmentWithId,
    meeting: Tables<"meetings">,
    api_video_id: string,
    ctx: ProcessingContext,
    relSpan: Span,
  ): Promise<void> {
    if (relationship.observations.length === 0) {
      return;
    }

    relSpan.setAttribute(
      "observations.count",
      relationship.observations.length,
    );

    ctx.logger.info("Saving relationship observations", {
      relationshipId,
      entity1: relationship.entity1,
      entity2: relationship.entity2,
      observationsCount: relationship.observations.length,
    });

    await Promise.all(
      relationship.observations.map(async (observation, observationIndex) => {
        const { error: observationInsertionError } = await this.supabase
          .from("meeting_entity_relationship_observations_v2")
          .insert({
            meeting_entity_relationship_id: relationshipId,
            meeting_topic_id: topic.id,
            observation,
            api_video_id: api_video_id,
            profile_id: meeting.profile_id ?? "",
            latest: true,
          });

        if (observationInsertionError) {
          relSpan.setStatus({
            code: 2,
            message: observationInsertionError.message,
          });

          relSpan.setAttribute("observation.index", observationIndex);

          ctx.logger.error("Error saving relationship observation", {
            relationshipId,
            entity1: relationship.entity1,
            entity2: relationship.entity2,
            observation,
            error: observationInsertionError,
          });
          throw observationInsertionError;
        }
      }),
    );
  }

  /**
   * Saves general observations to the database
   *
   * @param observations - Observations to save
   * @param topic - Topic segment with ID
   * @param meeting - Meeting data
   * @param api_video_id - Video API ID
   * @param ctx - Processing context
   */
  private async saveGeneralObservations(
    observations: string[],
    topic: TopicSegmentWithId,
    meeting: Tables<"meetings">,
    api_video_id: string,
    ctx: ProcessingContext,
  ): Promise<void> {
    if (observations.length === 0) {
      return;
    }

    ctx.logger.info("Saving general observations", {
      topicId: topic.id,
      observationsCount: observations.length,
    });

    await Promise.all(
      observations.map(async (observation, observationIndex) => {
        return await ctx.logger.trace(
          `💾 Saving observation ${observationIndex + 1}/${observations.length}`,
          async (obsSpan) => {
            obsSpan.setAttribute("observation.index", observationIndex);

            const { error: observationInsertionError } = await this.supabase
              .from("meeting_observations_v2")
              .insert({
                meeting_topic_id: topic.id,
                observation,
                api_video_id: api_video_id,
                profile_id: meeting.profile_id ?? "",
                latest: true,
              });

            if (observationInsertionError) {
              obsSpan.setStatus({
                code: 2,
                message: observationInsertionError.message,
              });

              ctx.logger.error("Error saving general observation", {
                topicId: topic.id,
                observation,
                error: observationInsertionError,
              });
              throw observationInsertionError;
            }
          },
        );
      }),
    );
  }
}
