/**
 * Founder Coaching Topics Generator
 *
 * This module generates AI-powered coaching topic suggestions for executive coaching sessions
 * by analyzing meeting data between coaching sessions and identifying patterns, challenges,
 * and opportunities for founder growth.
 *
 * The system integrates with the Titanic AI platform to extract insights from recorded meetings,
 * analyze founder behavior patterns across multiple meetings, and generate data-driven
 * coaching topics that highlight growth opportunities and blind spots.
 *
 * @module FounderCoachingTopicsGenerator
 * @author Titanic AI Engineering Team
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { type CoreMessage, generateObject } from "ai";
import dayjs from "dayjs";
import _ from "lodash";
import { dedent } from "ts-dedent";
import { z } from "zod";

import { gemini_1_5_pro } from "~/lib/ai/models/gemini";
import { four_oh_mini } from "~/lib/ai/models/openai";
// import { four_point_one } from "~/lib/ai/models/openai";
import { logger } from "~/lib/logging/server";
import type { Tables } from "~/lib/supabase/database.types";
import { createClient, type SupabaseServerClient } from "~/lib/supabase/server";

/**
 * Converts a JavaScript object into an XML-like string representation
 * to reduce LLM token usage compared to JSON.stringify
 *
 * @param obj - The object to convert
 * @param nodeName - The root node name for the object
 * @returns XML-like string representation of the object
 */
const objectToXml = (obj: unknown, nodeName = "root"): string => {
  if (obj == null) {
    return `<${nodeName}/>`;
  }

  // Handle non-object types directly
  if (typeof obj !== "object") {
    const stringValue =
      typeof obj === "string"
        ? obj
        : typeof obj === "number" || typeof obj === "boolean"
          ? String(obj)
          : `[${typeof obj}]`;
    return `<${nodeName}>${stringValue}</${nodeName}>`;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return `<${nodeName}></${nodeName}>`;
    }
    return obj
      .map((item, index) => objectToXml(item, `${nodeName}_item`))
      .join("");
  }

  // Handle regular objects
  const entries = Object.entries(obj as Record<string, unknown>);
  if (entries.length === 0) {
    return `<${nodeName}></${nodeName}>`;
  }

  const children = entries.map(([key, val]) => objectToXml(val, key)).join("");

  return `<${nodeName}>${children}</${nodeName}>`;
};

/**
 * Configuration constants for the application
 *
 * These values control critical aspects of the processing pipeline and should
 * be carefully configured based on the deployment environment and requirements.
 */

/**
 * Maximum number of meeting records to process in a single AI request
 * Larger values provide more context but may exceed token limits or cause performance issues
 * Adjust based on model capabilities and data characteristics
 */
const AI_CHUNK_SIZE = 20;

/**
 * Maximum number of database operations to execute in parallel
 * Controls concurrency to prevent database throttling or connection pool exhaustion
 * Adjust based on database capacity and connection limits
 */
const DB_CONCURRENCY_LIMIT = 3;

/**
 * Path to directory where output files will be written
 * Path is relative to the current module's location
 */
const OUTPUT_DIRECTORY_PATH = "../../output";

/**
 * Millisecond delay between database operations to prevent rate limiting
 * Higher values reduce database load but increase processing time
 */
const DB_THROTTLE_DELAY_MS = 100;

/**
 * Type definitions for deep meeting data structures with nested relationships
 * The hierarchical structure represents the complex data model of the Titan system,
 * where meetings contain topics, which contain entities and relationships,
 * which in turn contain observations and other metadata.
 */

/**
 * An entity (person, object, team, etc.) with its associated observations
 * Observations are insights about the entity's behavior, contributions, or characteristics
 */
interface EntityWithObservations extends Tables<"meeting_entities_v2"> {
  /** Insights or notes about the entity's behavior or contributions */
  observations: Tables<"meeting_entity_observations_v2">[];
}

/**
 * A relationship between two entities with observations about that relationship
 * These capture how entities interact with each other (collaboration, tension, etc.)
 */
interface RelationshipWithObservations
  extends Tables<"meeting_entity_relationships_v2"> {
  /** Insights about how the relationship manifests or evolves */
  observations: Tables<"meeting_entity_relationship_observations_v2">[];
}

/**
 * A topic from a meeting with all associated analytical elements
 * Topics are segmented portions of a meeting with consistent subject matter
 */
interface TopicWithDetails extends Tables<"meeting_topics_v2"> {
  /** Chronological events that occurred during this topic */
  events: Tables<"meeting_topic_events_v2">[];
  /** People, teams, or objects identified in this topic */
  entities: EntityWithObservations[];
  /** How entities interact with each other in this topic */
  relationships: RelationshipWithObservations[];
  /** Key coaching-relevant segments identified in this topic */
  moments: Tables<"moments">[];
  /** General insights about the topic that aren't tied to entities or relationships */
  observations: Tables<"meeting_observations_v2">[];
}

/**
 * A complete meeting with all nested analytical components
 * Contains the full hierarchical data structure for coaching analysis
 */
interface MeetingWithDetails extends Tables<"meetings"> {
  /** Sequential segments of the meeting with consistent subject matter */
  topics: TopicWithDetails[];
  /** Tasks or follow-up items created during the meeting */
  action_items: Array<
    Tables<"meeting_action_items"> & {
      /** People assigned to complete the action item */
      assignees: Tables<"meeting_action_item_assignees">[];
    }
  >;
  /** High-level summary topics discussed in the meeting */
  topics_discussed: Tables<"meeting_topics">[];
}

/**
 * A coaching session with associated calendar and meeting data
 */
interface SessionWithEvents extends Tables<"sessions"> {
  /** Calendar event data for when the coaching session occurred */
  event: Tables<"calendar_events_v2"> | null;
  /** Meeting data if the coaching session was recorded as a meeting */
  meeting: Tables<"meetings"> | null;
}

/**
 * Extended coaching session data with annotations and insights
 */
interface SessionWithAnnotations extends SessionWithEvents {
  /** Coaching topics discussed in the session */
  annotations: Array<
    Tables<"session_annotations"> & {
      /** Sources that evidence each coaching topic */
      sources: Tables<"session_annotation_sources">[];
    }
  >;
}

/**
 * Reference to evidence supporting a suggested coaching topic
 */
interface SuggestedTopicSource {
  /** Type of data element (moment, entity, relationship, etc.) */
  source_type: string;
  /** Database ID of the specific element referenced */
  source_id: string;
}

/**
 * A coaching topic suggested by the AI system based on meeting analysis
 */
interface SuggestedTopic {
  /** Description of the event, pattern, or interaction observed */
  what_happened: string;
  /** Explanation of why this topic is significant for the founder's development */
  why_this_matters: string;
  /** Questions designed to facilitate reflection and insight during coaching */
  thought_provoking_questions: string[];
  /** Whether this is a new topic or follows up on previous discussions */
  type: "past_session" | "new";
  /** References to data elements that evidence this topic */
  sources: SuggestedTopicSource[];
  /** ID of the previous topic if this is a follow-up topic */
  previous_topic_id?: string;
}

/**
 * Complete output of AI-generated coaching topics
 */
interface SuggestedTopicsOutput {
  /** Collection of coaching topics to discuss in the next session */
  suggested_topics: SuggestedTopic[];
}

/** Maps session IDs to the meetings that occurred before that session */
type SessionMeetingsMap = Record<string, MeetingWithDetails[]>;
/** Maps session IDs to simplified meeting data optimized for AI processing */
type SimplifiedSessionMeetingsMap = Record<string, unknown[]>;
/** Maps session IDs to the AI-generated coaching topics for that session */
type GeneratedTopicsMap = Record<string, SuggestedTopicsOutput>;

/**
 * A complete report with all nested analytical components
 * Contains detailed data about a founder's skill assessment
 */
interface ReportWithDetails extends Tables<"reports"> {
  /** Sections of the report categorizing different aspects of performance */
  report_sections: Tables<"report_sections">[];
  /** Goals being assessed in this report */
  report_goals: Array<
    Tables<"report_goals"> & {
      /** The goal being tracked */
      goal: Tables<"goals"> & {
        /** Signals associated with this goal */
        signals: Tables<"goal_signals">[];
      };
    }
  >;
  /** Signals (behaviors) being tracked across goals */
  report_goal_signals: Array<
    Tables<"report_goal_signals"> & {
      /** The goal signal being tracked */
      goal_signal: Tables<"goal_signals">;
    }
  >;
  /** Moments from meetings that evidence goal progress */
  report_moments: Array<
    Tables<"report_moments"> & {
      /** The moment from a meeting */
      moment: Tables<"moments"> & {
        /** Tags categorizing this moment */
        subtags: Tables<"moment_subtags">[];
      };
      /** The signal this moment is connected to */
      report_goal_signal: Tables<"report_goal_signals">;
    }
  >;
  /** Comments left on the report */
  report_comments: Array<
    Tables<"report_comments"> & {
      /** User who left the comment */
      user: Tables<"profiles">;
    }
  >;
  /** The skill being assessed */
  skill?: Tables<"skills"> | null;
}

/**
 * A complete group report with all nested reports
 */
interface GroupReportWithDetails
  extends Tables<"group_report_processing_status"> {
  /** The individual reports in this group */
  reports: ReportWithDetails[];
  /** The skill being assessed in this group report */
  skill?: Tables<"skills"> | null;
}

/**
 * Zod schema for validating and generating AI coaching topics
 * This schema ensures the AI model produces structured, well-formatted topic suggestions
 * that follow our required format for coaching insights.
 */
const suggestedTopicsSchema = z
  .object({
    suggested_topics: z
      .array(
        z.object({
          what_happened: z
            .string()
            .describe(
              "A clear, concise description of the key event, interaction, or pattern observed in the meeting data. Focus on factual observations rather than interpretations.",
            ),
          why_this_matters: z
            .string()
            .describe(
              "An insightful explanation of the significance of this topic to the founder's development, connecting it to broader leadership themes, business impact, or personal growth opportunities.",
            ),
          thought_provoking_questions: z
            .array(
              z
                .string()
                .describe(
                  "Open-ended, non-judgmental questions that encourage reflection, challenge assumptions, or explore new perspectives on this topic. Each question should be specific enough to guide meaningful discussion.",
                ),
            )
            .describe(
              "A collection of 3-5 powerful coaching questions that could spark meaningful conversation about this topic.",
            ),
          type: z
            .enum(["past_session", "new"])
            .describe(
              "The type of topic suggestion: `past_session` indicates that the topic is a follow-up to a previous session's topic(s), while `new` signifies that the topic is a new subject for discussion.",
            ),
          sources: z
            .array(
              z.object({
                source_type: z
                  .enum([
                    "moment",
                    "entity",
                    "relationship",
                    "entity_observation",
                    "relationship_observation",
                    "topic_observation",
                    "topic",
                    "action_item",
                    "topic_discussed",
                    "meeting",
                  ])
                  .describe(
                    "The category of data source that provides evidence for this suggested topic.",
                  ),
                source_id: z
                  .string()
                  .describe(
                    "The unique identifier of the specific data source that supports this topic suggestion, allowing for direct reference back to the original meeting data.",
                  ),
              }),
            )
            .describe(
              "References to specific elements in the meeting data that provide evidence for this suggested topic, ensuring traceability and context.",
            ),
          previous_topic_id: z
            .string()
            .optional()
            .describe(
              "If this is a follow-up topic (type='past_session'), this field should contain the session_annotation_id of the previous topic it follows up on, creating a clear continuity between coaching sessions.",
            ),
        }),
      )
      .describe(
        "A comprehensive list of coaching topics suggested based on patterns and insights from the analyzed meeting data.",
      ),
  })
  .describe(
    "The complete response structure containing all suggested coaching topics with their supporting details and evidence.",
  );

/**
 * Zod schema for validating and generating chunk summaries
 * Used when processing large datasets in chunks to maintain context between processing steps
 * by generating concise summaries of previously processed data.
 */
const summarySchema = z.object({
  summary: z
    .string()
    .describe(
      "A concise summary of the key information in this data chunk that captures essential patterns, insights, and context needed for processing subsequent chunks of data.",
    ),
});

/**
 * Utility function to pause execution for a specified duration
 * Used for rate limiting API calls and preventing database overload
 *
 * @param delayInMilliseconds - Time to pause execution in milliseconds
 * @returns Promise that resolves after the specified delay
 */
const sleep = (delayInMilliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, delayInMilliseconds));

/**
 * Transforms complex meeting data structures into a simplified format optimized for AI processing
 *
 * This function extracts only the essential fields needed for analysis and discards metadata,
 * timestamps, and other fields that add complexity without contributing to insight generation.
 * The resulting structure maintains the hierarchical relationships between meetings, topics,
 * entities, and other elements while reducing the overall data volume and complexity.
 *
 * @param sessionMeetingsMap - Record mapping session IDs to their associated meetings
 * @returns Simplified data structure with only fields relevant for AI analysis
 */
const createLLMFriendlyData = <T extends Record<string, MeetingWithDetails[]>>(
  sessionMeetingsMap: T,
): Record<string, unknown[]> => {
  const simplifiedDataMap: Record<string, unknown[]> = {};

  // Process each coaching session and its associated meetings
  for (const [sessionId, meetingsData] of Object.entries(sessionMeetingsMap)) {
    simplifiedDataMap[sessionId] = meetingsData.map((meetingRecord) => ({
      // Core meeting identification and metadata
      id: meetingRecord.video_api_id,
      name: meetingRecord.name,
      summary: meetingRecord.summary,
      date: meetingRecord.date,
      profile_id: meetingRecord.profile_id,
      video_api_id: meetingRecord.video_api_id,
      // Exclude transcript to reduce data size
      // vtt: meetingRecord.clean_vtt_file,

      // Transform action items to simpler structure
      action_items: meetingRecord.action_items.map((actionItem) => ({
        id: actionItem.id,
        text: actionItem.text,
        due_date: actionItem.due_date,
        completed_at: actionItem.completed_at,
        is_completed: Boolean(actionItem.completed_at),
        deleted_at: actionItem.deleted_at,
        is_deleted: Boolean(actionItem.deleted_at),
        assignees: actionItem.assignees.map((assigneeRecord) => ({
          entity_id: assigneeRecord.assignee_id,
        })),
      })),

      // High-level topics discussed in the meeting
      topics_discussed: meetingRecord.topics_discussed.map(
        (topicDiscussed) => ({
          id: topicDiscussed.id,
          title: topicDiscussed.title,
          summary: topicDiscussed.summary,
        }),
      ),

      // Detailed sequential topics with all analytical components
      topics: meetingRecord.topics?.map((topicDetail) => ({
        id: topicDetail.id,
        title: topicDetail.title,
        summary: topicDetail.summary,
        index: topicDetail.index,

        // Chronological events within the topic
        events: topicDetail.events?.map((eventRecord) => ({
          id: eventRecord.id,
          timestamp: eventRecord.timestamp,
          event: eventRecord.event,
        })),

        // Entities (people, teams, concepts) mentioned in the topic
        entities: topicDetail.entities?.map((entityRecord) => ({
          id: entityRecord.id,
          name: entityRecord.name,
          type: entityRecord.type,
          description: entityRecord.description,
          observations: entityRecord.observations?.map((observationRecord) => ({
            id: observationRecord.id,
            observation: observationRecord.observation,
          })),
        })),

        // Relationships between entities
        relationships: topicDetail.relationships?.map((relationshipRecord) => ({
          id: relationshipRecord.id,
          subject_entity_name: relationshipRecord.subject_entity_name,
          object_entity_name: relationshipRecord.object_entity_name,
          relationship_type: relationshipRecord.relationship_type,
          observations: relationshipRecord.observations?.map(
            (observationRecord) => ({
              id: observationRecord.id,
              observation: observationRecord.observation,
            }),
          ),
        })),

        // Coaching-relevant moments identified within the topic
        moments: topicDetail.moments?.map((momentRecord) => ({
          id: momentRecord.id,
          title: momentRecord.title,
          summary: momentRecord.summary,
          segment_start_timestamp: momentRecord.segment_start_timestamp,
          segment_end_timestamp: momentRecord.segment_end_timestamp,
          activity_type: momentRecord.activity_type,
          activity: momentRecord.activity,
          activity_reasoning: momentRecord.activity_reasoning,
          target_person_type: momentRecord.target_person_type,
          target_person_reasoning: momentRecord.target_person_reasoning,
          relevant: momentRecord.relevant,
          vtt: momentRecord.vtt,
          qa_score: momentRecord.qa_score,
          qa_reasoning: momentRecord.qa_reasoning,
          altitude_score: momentRecord.altitude_score,
          altitude_type: momentRecord.altitude_type,
          altitude_reasoning: momentRecord.altitude_reasoning,
          interestingness_score: momentRecord.interestingness_score,
          interestingness_reasoning: momentRecord.interestingness_reasoning,
          final_score: momentRecord.final_score,
        })),

        // General observations about the topic
        observations: topicDetail.observations?.map((observationRecord) => ({
          id: observationRecord.id,
          observation: observationRecord.observation,
        })),
      })),
    }));
  }

  return simplifiedDataMap;
};

/**
 * Ensures the output directory exists, creating it if necessary
 *
 * This function checks if the specified directory exists and creates it
 * recursively if needed. It provides appropriate logging and error handling
 * to make directory preparation a transparent and reliable operation.
 *
 * @param outputDirectoryPath - Full path to the directory that should exist
 * @throws Error if directory creation fails
 */
const ensureOutputDirExists = async (
  outputDirectoryPath: string,
): Promise<void> => {
  try {
    if (!existsSync(outputDirectoryPath)) {
      await mkdir(outputDirectoryPath, { recursive: true });
      logger.info(`Created output directory: ${outputDirectoryPath}`);
    } else {
      logger.info(`Output directory already exists: ${outputDirectoryPath}`);
    }
  } catch (error) {
    logger.error("Error creating output directory:", { error });
    throw new Error(
      `Failed to create output directory: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * Writes data to a file with robust error handling and logging
 *
 * This function serializes the provided data to JSON with pretty formatting
 * and writes it to the specified file path. It provides descriptive error
 * messages and logs both success and failure conditions.
 *
 * @param destinationFilePath - Path where the file should be written
 * @param dataToWrite - Any serializable data structure to write to the file
 * @throws Error if file writing fails
 */
const writeDataToFile = async <T>(
  destinationFilePath: string,
  dataToWrite: T,
): Promise<void> => {
  try {
    // Still use JSON.stringify for file output since we want human-readable files
    const formattedJsonData = JSON.stringify(dataToWrite, null, 2);
    await writeFile(destinationFilePath, formattedJsonData);
    logger.info(
      `Successfully wrote ${formattedJsonData.length} bytes to ${destinationFilePath}`,
    );
  } catch (error) {
    logger.error(`Error writing to file ${destinationFilePath}:`, { error });
    throw new Error(
      `Failed to write data to file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * Generates a concise summary of a data chunk using AI
 *
 * When processing large datasets in chunks, this function creates a summary
 * of previously processed chunks to maintain context for subsequent chunks.
 * This enables efficient processing of large datasets without exceeding
 * context limits while preserving essential information.
 *
 * @param conversationMessages - The conversation history to provide to the AI
 * @returns A concise summary of the key information in the data chunk
 */
const generateChunkSummary = async (
  conversationMessages: CoreMessage[],
): Promise<string> => {
  try {
    const summaryGenerationResult = await generateObject({
      model: gemini_1_5_pro,
      schema: summarySchema,
      messages: conversationMessages,
    });

    return summaryGenerationResult.object.summary;
  } catch (error) {
    logger.error("Error generating chunk summary:", { error });
    return `Error generating summary: ${error instanceof Error ? error.message : String(error)}`;
  }
};

/**
 * Generates AI-powered coaching topic suggestions for a session
 *
 * This function is the core analytical component that processes meeting data
 * and identifies patterns, growth opportunities, and coaching-relevant insights.
 * It analyzes the conversation history and generates structured coaching topics
 * according to the defined schema.
 *
 * @param conversationMessages - The full conversation history to provide to the AI
 * @returns Structured object containing suggested coaching topics
 * @throws Error if topic generation fails
 */
const generateTopicsForSession = async (
  conversationMessages: CoreMessage[],
): Promise<SuggestedTopicsOutput> => {
  try {
    const topicGenerationResult = await generateObject({
      model: gemini_1_5_pro,
      schema: suggestedTopicsSchema,
      messages: conversationMessages,
    });

    return topicGenerationResult.object;
  } catch (error) {
    logger.error("Error generating coaching topics:", { error });
    throw new Error(
      `Failed to generate coaching topics: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * Generates a concise, memorable title for a single session annotation (coaching topic)
 *
 * This function takes a session annotation with its sources and uses AI to generate
 * a brief, contextual title (10 words or less) that helps founders quickly recall
 * the specific meeting context when viewing a list of topics.
 *
 * @param annotation - The session annotation with its sources to summarize
 * @returns AI-generated concise, memorable title (10 words or less)
 */
const summarizeSessionTopic = async (
  annotation: Tables<"session_annotations"> & {
    sources: Omit<Tables<"session_annotation_sources">, "created_at" | "id">[];
  },
): Promise<string> => {
  try {
    const topicPrompt: CoreMessage[] = [
      {
        role: "system",
        content:
          "You are an expert at creating concise, memorable titles for coaching topics. Your goal is to help founders instantly recall the specific meeting context when they see your title in a list.",
      },
      {
        role: "user",
        content: dedent`
          Create a concise, memorable title (MAXIMUM 10 WORDS) for this coaching topic that:

          1. Helps the founder instantly recall the specific meeting context
          2. Uses concrete, specific language rather than abstract concepts
          3. References key people, decisions, or situations from the original context
          4. Avoids marketing language or generic coaching terminology

          Here are 5 examples of excellent titles:
          - Original: "During a leadership meeting, the founder made a difficult personnel decision involving the termination of an underperforming team member"
            Title: "Leadership team termination decision for underperforming member"

          - Original: "The founder struggled with delegating strategic planning tasks to their leadership team"
            Title: "Delegation bottleneck with leadership team planning tasks"

          - Original: "Communication breakdowns between engineering and product teams led to missed deadlines"
            Title: "Eng-Product communication gap caused missed sprint deadline"

          - Original: "The founder demonstrated effective conflict resolution during a tense board meeting"
            Title: "Board meeting conflict resolution with investor X"

          - Original: "Inconsistent decision-making processes are causing team confusion and delays"
            Title: "Inconsistent hiring decisions confusing marketing team"

          Topic data:

          ${objectToXml(annotation, "topic_data")}

          Remember: Your title MUST be 10 words or fewer and help recall the specific context.
        `,
      },
    ];

    const summaryResult = await generateObject({
      model: four_oh_mini,
      schema: z.object({
        title: z
          .string()
          .describe(
            "A concise, memorable title (10 words or less) that helps the founder instantly recall the specific meeting context.",
          ),
      }),
      messages: topicPrompt,
    });

    return summaryResult.object.title;
  } catch (error) {
    logger.error("Error generating topic title:", {
      error,
      annotationId: annotation.id,
    });
    // Fallback to original title if AI summarization fails
    return annotation.title || "No title available";
  }
};

/**
 * Persists AI-generated coaching topics to the database
 *
 * This function saves each generated coaching topic as a session annotation
 * in the database, along with its associated evidence sources. It provides
 * robust error handling at both the individual topic level and source level
 * to ensure partial success even if some records fail to save.
 *
 * @param supabaseClient - Database client for interacting with Supabase
 * @param coachingSessionId - ID of the coaching session these topics are for
 * @param coachingTopics - Array of AI-generated coaching topic suggestions
 */
const saveTopicsToDatabase = async (
  supabaseClient: SupabaseServerClient,
  coachingSessionId: string,
  coachingTopics: SuggestedTopic[],
): Promise<void> => {
  logger.info(
    `Saving ${coachingTopics.length} coaching topics to database for session: ${coachingSessionId}`,
  );

  // Process each topic individually to allow partial success
  for (const topicSuggestion of coachingTopics) {
    try {
      // Use the what_happened field as the annotation title
      const topicTitle = topicSuggestion.what_happened;

      // Use the why_this_matters field as the annotation description
      const topicDescription = topicSuggestion.why_this_matters;

      // Insert the session annotation record
      const { data: sessionAnnotationRecord, error: annotationError } =
        await supabaseClient
          .from("session_annotations")
          .insert({
            session_id: coachingSessionId,
            title: topicTitle,
            description: topicDescription,
            type: topicSuggestion.type,
          })
          .select()
          .single();

      if (annotationError) {
        logger.error(
          `Error inserting session annotation: ${annotationError.message}`,
        );
        continue; // Skip to next topic if this one fails
      }

      logger.info(
        `Created session annotation with ID: ${sessionAnnotationRecord.id}`,
      );

      let sourceRecords: Omit<
        Tables<"session_annotation_sources">,
        "created_at" | "id"
      >[] = [];

      // Insert the evidence sources as session_annotation_sources
      if (topicSuggestion.sources && topicSuggestion.sources.length > 0) {
        sourceRecords = topicSuggestion.sources.map((evidenceSource) => ({
          session_annotation_id: sessionAnnotationRecord.id,
          source_id: evidenceSource.source_id,
          source_type: evidenceSource.source_type,
        }));

        const { error: sourcesError } = await supabaseClient
          .from("session_annotation_sources")
          .insert(sourceRecords);

        if (sourcesError) {
          logger.error(
            `Error inserting session annotation sources: ${sourcesError.message}`,
          );
        } else {
          logger.info(
            `Added ${sourceRecords.length} evidence sources to session annotation ${sessionAnnotationRecord.id}`,
          );
        }
      }

      // If this is a follow-up topic, log the continuity
      if (
        topicSuggestion.type === "past_session" &&
        topicSuggestion.previous_topic_id
      ) {
        logger.info(
          `Established continuity: Topic ${sessionAnnotationRecord.id} follows up on previous topic ${topicSuggestion.previous_topic_id}`,
        );
      }

      // Generate a summarized title for the annotation
      try {
        const summarizedTitle = await summarizeSessionTopic({
          ...sessionAnnotationRecord,
          sources: sourceRecords || [],
        });

        // Update the annotation with the summarized title
        const { error: updateError } = await supabaseClient
          .from("session_annotations")
          .update({ title_summarized: summarizedTitle })
          .eq("id", sessionAnnotationRecord.id);

        if (updateError) {
          logger.error(
            `Error updating session annotation with summarized title: ${updateError.message}`,
          );
        } else {
          logger.info(
            `Updated session annotation ${sessionAnnotationRecord.id} with summarized title: "${summarizedTitle}"`,
          );
        }
      } catch (summaryError) {
        logger.error(
          `Error generating summarized title for annotation ${sessionAnnotationRecord.id}:`,
          { error: summaryError },
        );
      }
    } catch (error) {
      logger.error(
        `Error saving coaching topic to database: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
};

/**
 * Retrieves and assembles all analytical components for a meeting topic
 *
 * This function efficiently fetches all related data for a meeting topic in parallel,
 * including events, entities, relationships, moments, and observations. It assembles
 * these components into a complete topic structure with proper ordering and filtering.
 *
 * @param supabaseClient - Database client for interacting with Supabase
 * @param topicRecord - The base topic record to enrich with detailed data
 * @returns A complete topic structure with all related analytical components
 * @throws Error if any database query fails
 */
const fetchTopicDetails = async (
  supabaseClient: SupabaseServerClient,
  topicRecord: Tables<"meeting_topics_v2">,
): Promise<TopicWithDetails> => {
  logger.info(`Retrieving detailed data for topic: ${topicRecord.id}`);

  // Fetch all related data for this topic in parallel for efficiency
  const [
    { data: topicEventsData, error: eventsError },
    { data: topicEntitiesData, error: entitiesError },
    { data: topicRelationshipsData, error: relationshipsError },
    { data: topicMomentsData, error: momentsError },
    { data: topicObservationsData, error: observationsError },
  ] = await Promise.all([
    // Chronological events that occurred during this topic
    supabaseClient
      .from("meeting_topic_events_v2")
      .select("*")
      .eq("meeting_topic_id", topicRecord.id)
      .eq("latest", true),

    // Entities (people, teams, objects) mentioned in this topic
    supabaseClient
      .from("meeting_entities_v2")
      .select("*, observations:meeting_entity_observations_v2(*)")
      .eq("meeting_topic_id", topicRecord.id)
      .eq("latest", true),

    // Relationships between entities
    supabaseClient
      .from("meeting_entity_relationships_v2")
      .select("*, observations:meeting_entity_relationship_observations_v2(*)")
      .eq("meeting_topic_id", topicRecord.id)
      .eq("latest", true),

    // Important segments identified for coaching relevance
    supabaseClient
      .from("moments")
      .select("*")
      .eq("topic_id", topicRecord.id)
      .eq("latest", true)
      .eq("relevant", true), // Only include moments marked as relevant

    // General observations about the topic
    supabaseClient
      .from("meeting_observations_v2")
      .select("*")
      .eq("meeting_topic_id", topicRecord.id)
      .eq("latest", true),
  ]);

  // Handle any errors from parallel queries
  if (eventsError) throw eventsError;
  if (entitiesError) throw entitiesError;
  if (relationshipsError) throw relationshipsError;
  if (momentsError) throw momentsError;
  if (observationsError) throw observationsError;

  // Apply gentle rate limiting to avoid overwhelming the database
  await sleep(DB_THROTTLE_DELAY_MS);

  // Sort events chronologically by timestamp
  const chronologicalEvents = _.orderBy(
    topicEventsData ?? [],
    [(eventRecord) => dayjs(eventRecord.timestamp).unix()],
    ["asc"],
  );

  // Log the results for monitoring and debugging
  logger.debug("Topic component statistics", {
    topic_id: topicRecord.id,
    events_count: chronologicalEvents.length,
    entities_count: topicEntitiesData?.length || 0,
    relationships_count: topicRelationshipsData?.length || 0,
    moments_count: topicMomentsData?.length || 0,
    observations_count: topicObservationsData?.length || 0,
  });

  // Filter entity observations to only include the latest versions
  const entitiesWithLatestObservations = (topicEntitiesData ?? []).map(
    (entityRecord) => ({
      ...entityRecord,
      observations: entityRecord.observations.filter(
        (observationRecord) => observationRecord.latest,
      ),
    }),
  );

  // Filter relationship observations to only include the latest versions
  const relationshipsWithLatestObservations = (
    topicRelationshipsData ?? []
  ).map((relationshipRecord) => ({
    ...relationshipRecord,
    observations: relationshipRecord.observations.filter(
      (observationRecord) => observationRecord.latest,
    ),
  }));

  // Assemble the complete topic structure with all components
  return {
    ...topicRecord,
    events: chronologicalEvents,
    entities: entitiesWithLatestObservations,
    relationships: relationshipsWithLatestObservations,
    moments: topicMomentsData ?? [],
    observations: topicObservationsData ?? [],
  };
};

/**
 * Retrieves all meetings that occurred between two coaching sessions
 *
 * This function fetches all meetings that took place in the time period between
 * two coaching sessions, along with their associated action items and topics.
 * It then enriches each meeting with detailed topic data through controlled
 * parallel processing to balance efficiency with database load.
 *
 * @param supabaseClient - Database client for interacting with Supabase
 * @param founderProfileId - ID of the founder whose meetings should be retrieved
 * @param periodStartTime - ISO timestamp marking the start of the time period
 * @param periodEndTime - ISO timestamp marking the end of the time period
 * @returns Array of fully detailed meeting records with all nested components
 * @throws Error if any database query fails
 */
const fetchMeetingsBetweenSessions = async (
  supabaseClient: SupabaseServerClient,
  founderProfileId: string,
  periodStartTime: string,
  periodEndTime: string,
): Promise<MeetingWithDetails[]> => {
  // Retrieve base meeting records with their action items and high-level topics
  logger.info(
    `Retrieving meetings between ${periodStartTime} and ${periodEndTime}`,
  );
  const { data: meetingsData, error: meetingsError } = await supabaseClient
    .from("meetings")
    .select(
      "*, action_items:meeting_action_items(*, assignees:meeting_action_item_assignees(*)), topics_discussed:meeting_topics(*)",
    )
    .eq("profile_id", founderProfileId)
    .gte("created_at", periodStartTime)
    .lt("created_at", periodEndTime)
    .order("created_at", { ascending: true });

  if (meetingsError) {
    throw meetingsError;
  }

  // Filter out soft-deleted items to work only with active data
  const activeMeetings = (meetingsData ?? []).map((meetingRecord) => ({
    ...meetingRecord,
    action_items: meetingRecord.action_items.filter(
      (actionItem) => !actionItem.server_deleted_at,
    ),
    topics_discussed: meetingRecord.topics_discussed.filter(
      (topicDiscussed) => !topicDiscussed.server_deleted_at,
    ),
  }));

  // Process meetings with controlled concurrency to avoid database overload
  const enrichedMeetings: MeetingWithDetails[] = [];
  const concurrencyLimit = DB_CONCURRENCY_LIMIT; // Maximum number of simultaneous meeting requests

  // Process meetings in batches for controlled parallel execution
  for (
    let batchStartIndex = 0;
    batchStartIndex < activeMeetings.length;
    batchStartIndex += concurrencyLimit
  ) {
    const currentBatchMeetings = activeMeetings.slice(
      batchStartIndex,
      batchStartIndex + concurrencyLimit,
    );
    const currentBatchResults = await Promise.all(
      currentBatchMeetings.map(async (meetingRecord) => {
        logger.info(
          `Enriching meeting data for: ${meetingRecord.video_api_id}`,
        );

        // Retrieve sequential topic segments for this meeting
        const { data: topicsData, error: topicsError } = await supabaseClient
          .from("meeting_topics_v2")
          .select("*")
          .eq("api_video_id", meetingRecord.video_api_id)
          .eq("latest", true)
          .order("index", { ascending: true });

        if (topicsError) {
          throw topicsError;
        }

        logger.info(
          `Found ${topicsData?.length || 0} sequential topics for meeting ${meetingRecord.video_api_id}`,
        );

        // Process topics with their own concurrency control
        const enrichedTopics: TopicWithDetails[] = [];
        for (
          let topicBatchIndex = 0;
          topicBatchIndex < (topicsData?.length || 0);
          topicBatchIndex += concurrencyLimit
        ) {
          const currentTopicBatch =
            topicsData?.slice(
              topicBatchIndex,
              topicBatchIndex + concurrencyLimit,
            ) || [];
          const topicDetailResults = await Promise.all(
            currentTopicBatch.map((topicRecord) =>
              fetchTopicDetails(supabaseClient, topicRecord),
            ),
          );
          enrichedTopics.push(...topicDetailResults);
        }

        // Return the meeting with all its enriched topic data
        return {
          ...meetingRecord,
          topics: enrichedTopics,
        };
      }),
    );

    enrichedMeetings.push(...currentBatchResults);
  }

  return enrichedMeetings;
};

/**
 * Retrieves all coaching sessions and the meetings that occurred between them
 *
 * This function identifies all coaching sessions for a founder, orders them
 * chronologically, and then fetches all meetings that occurred in the time
 * periods between consecutive coaching sessions. This creates a complete map
 * of founder activity between coaching touchpoints.
 *
 * @param supabaseClient - Database client for interacting with Supabase
 * @param founderProfile - Profile record of the founder being analyzed
 * @returns Map of session IDs to the meetings that occurred before that session
 * @throws Error if session retrieval fails
 */
const processMeetingsBetweenSessions = async (
  supabaseClient: SupabaseServerClient,
  founderProfile: Tables<"profiles">,
): Promise<SessionMeetingsMap> => {
  logger.info("Retrieving coaching session history...");
  const { data: coachingSessionsData, error: sessionsError } =
    await supabaseClient
      .from("sessions")
      .select("*, event:calendar_events_v2(*), meeting:meetings(*)")
      .eq("user_id", founderProfile.id);

  if (sessionsError) {
    throw sessionsError;
  }

  // Sort sessions chronologically by their calendar event start times
  const chronologicalSessions = _.orderBy(
    coachingSessionsData as SessionWithEvents[],
    [(sessionRecord) => dayjs(sessionRecord.event?.start_time).unix()],
    ["asc"],
  );

  logger.info(
    `Found ${chronologicalSessions.length} coaching sessions in chronological order`,
  );

  const sessionToMeetingsMap: Record<string, MeetingWithDetails[]> = {};

  // Process sessions sequentially (chronological ordering is important for context)
  for (
    let sessionIndex = 0;
    sessionIndex < chronologicalSessions.length;
    sessionIndex++
  ) {
    const currentSession = chronologicalSessions[sessionIndex];
    if (!currentSession) {
      throw new Error("Current session is undefined");
    }

    const currentSessionId = currentSession.id;

    // Determine time boundaries for meetings relevant to this session
    const previousSession = chronologicalSessions[sessionIndex - 1];

    // If this is the first session, use a very old date as the start boundary
    const timePeriodStart =
      previousSession?.event?.end_time ?? dayjs("1970-01-01").toISOString();

    // Use the current session's start time as the end boundary
    const timePeriodEnd = dayjs(currentSession.event?.start_time).toISOString();

    // Retrieve all meetings that occurred in this time period
    const relevantMeetingsForSession = await fetchMeetingsBetweenSessions(
      supabaseClient,
      founderProfile.id,
      timePeriodStart,
      timePeriodEnd,
    );

    // Associate these meetings with the current session
    sessionToMeetingsMap[currentSessionId] = relevantMeetingsForSession;

    logger.info(
      `Associated ${relevantMeetingsForSession.length} meetings with session ${currentSessionId}`,
    );
  }

  return sessionToMeetingsMap;
};

/**
 * Retrieves past coaching sessions with their annotations for a founder
 *
 * This function fetches coaching sessions that occurred before the current session
 * along with the coaching topics (annotations) discussed in those sessions.
 * This historical context is critical for tracking topic continuity and progress.
 *
 * @param supabaseClient - Database client for interacting with Supabase
 * @param founderProfileId - ID of the founder whose past sessions should be retrieved
 * @param currentSessionStartTime - ISO timestamp of the current session start time
 * @param limit - Maximum number of past sessions to retrieve (default: 3)
 * @returns Array of past coaching session records with their annotations
 * @throws Error if any database query fails
 */
const fetchPreviousCoachingSessions = async (
  supabaseClient: SupabaseServerClient,
  founderProfileId: string,
  currentSessionStartTime: string,
  limit = 3,
): Promise<SessionWithAnnotations[]> => {
  logger.info(
    `Retrieving ${limit} most recent coaching sessions before ${currentSessionStartTime}`,
  );

  // First retrieve the coaching sessions themselves
  const { data: pastSessions, error: sessionsError } = await supabaseClient
    .from("sessions")
    .select("*, event:calendar_events_v2(*), meeting:meetings(*)")
    .eq("user_id", founderProfileId)
    .lt("created_at", currentSessionStartTime)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sessionsError) {
    throw sessionsError;
  }

  logger.info(`Found ${pastSessions?.length || 0} previous coaching sessions`);

  // For each session, retrieve the coaching topics (annotations) discussed
  const sessionsWithAnnotations: SessionWithAnnotations[] = [];

  for (const session of pastSessions || []) {
    try {
      // Retrieve coaching topics (annotations) for this session
      const { data: sessionAnnotations, error: annotationsError } =
        await supabaseClient
          .from("session_annotations")
          .select("*, sources:session_annotation_sources(*)")
          .eq("session_id", session.id);

      if (annotationsError) {
        throw annotationsError;
      }

      // Add annotations to the session record
      sessionsWithAnnotations.push({
        ...session,
        annotations: sessionAnnotations || [],
      });

      logger.debug(
        `Retrieved ${sessionAnnotations?.length || 0} annotations for session ${session.id}`,
      );
    } catch (error) {
      logger.error(`Error retrieving annotations for session ${session.id}:`, {
        error,
      });
      // Continue with other sessions even if one fails
      sessionsWithAnnotations.push({
        ...session,
        annotations: [],
      });
    }

    // Apply gentle rate limiting
    await sleep(DB_THROTTLE_DELAY_MS);
  }

  return sessionsWithAnnotations;
};

/**
 * Generates AI-powered coaching topics for all sessions
 *
 * This function processes the simplified meeting data for each session,
 * handling large datasets through chunking and progressive summarization.
 * It generates coaching topic suggestions for each session and persists
 * them to the database while maintaining context across large datasets.
 *
 * @param supabaseClient - Database client for interacting with Supabase
 * @param aiSystemPrompt - The system prompt containing instructions for the AI
 * @param sessionMeetingsData - Map of session IDs to their simplified meeting data
 * @param previousSessionsData - Map of session IDs to their previous sessions data
 * @returns Map of session IDs to their generated coaching topics
 */
const generateSessionTopics = async (
  supabaseClient: SupabaseServerClient,
  aiSystemPrompt: string,
  sessionMeetingsData: SimplifiedSessionMeetingsMap,
  previousSessionsData: Record<string, SessionWithAnnotations[]> = {},
  reportsData: unknown[] = [], // Add reports data parameter
): Promise<GeneratedTopicsMap> => {
  // Store generated topics for each session
  const sessionsTopicsMap: GeneratedTopicsMap = {};

  // Process each coaching session independently
  logger.info("Beginning topic generation for all coaching sessions...");

  for (const [sessionId, meetingsData] of Object.entries(sessionMeetingsData)) {
    // Skip sessions with no meetings
    if (meetingsData.length === 0) {
      logger.info(`Skipping session ${sessionId} as it has no meeting records`);
      continue;
    }

    // Check if session already has annotations saved
    const { data: existingAnnotations } = await supabaseClient
      .from("session_annotations")
      .select("id")
      .eq("session_id", sessionId)
      .limit(1);

    // Skip sessions that already have annotations
    if (existingAnnotations && existingAnnotations.length > 0) {
      logger.info(
        `Skipping session ${sessionId} as it already has topic annotations`,
      );
      continue;
    }

    logger.info(
      `Generating coaching topics for session ${sessionId} with ${meetingsData.length} meeting records`,
    );

    // Initialize fresh conversation history for each session to avoid context contamination
    const sessionConversationHistory: CoreMessage[] = [
      {
        role: "system",
        content: aiSystemPrompt,
      },
    ];

    // Add skill reports data to conversation history if available
    if (reportsData && reportsData.length > 0) {
      logger.info(
        `Including ${reportsData.length} skill reports in the analysis`,
      );

      // Add reports data to conversation
      sessionConversationHistory.push({
        role: "user",
        content: `
          Here is data from skill reports that should be considered when generating topic suggestions:
          
          ${objectToXml(reportsData, "skill_reports")}
          
          These reports include:
          1. Skills the founder is actively working on
          2. Goals they've set for each skill
          3. Positive and negative behavioral signals observed
          4. Meeting moments that evidence these behaviors
          5. Overall skills assessment and personality insights
          
          Use this information to identify growth patterns, skill development opportunities, behavioral trends, 
          and connections between meeting discussions and the founder's explicit development goals.
        `,
      });

      // Add assistant acknowledgment to maintain conversation flow
      sessionConversationHistory.push({
        role: "assistant",
        content:
          "I've reviewed the skill reports data and will incorporate these insights into my suggested topics. I'll look for connections between meeting content and development goals, behavioral patterns, and opportunities to address specific skills or signals observed in reports.",
      });
    } else {
      logger.info("No skill reports available for this coaching session");
    }

    // Add previous sessions data to conversation history if available
    const previousSessions = previousSessionsData[sessionId] || [];
    if (previousSessions.length > 0) {
      logger.info(
        `Including ${previousSessions.length} previous sessions in analysis`,
      );

      // Add previous sessions data to conversation
      sessionConversationHistory.push({
        role: "user",
        content: `
          Here is data from previous coaching sessions that should be considered when generating topic suggestions:
          
          ${objectToXml(previousSessions, "previous_sessions")}
          
          Pay special attention to:
          1. Topics that were discussed in previous sessions that might need follow-up
          2. Action items or commitments made in previous sessions
          3. Patterns or themes that span across multiple sessions
          4. Progress (or lack thereof) on topics discussed previously
          
          Use this historical context to inform your suggested topics for the upcoming session.
        `,
      });

      // Add assistant acknowledgment to maintain conversation flow
      sessionConversationHistory.push({
        role: "assistant",
        content:
          "I've reviewed the previous session data and will use it to inform my suggested topics. I'll look for continuity with past topics, follow-up opportunities, and evidence of progress or challenges on previously discussed areas.",
      });
    } else {
      logger.info(
        "No previous sessions data available for this coaching session",
      );
    }

    // Split data into manageable chunks to avoid exceeding AI context limits
    const dataChunks = _.chunk(meetingsData, AI_CHUNK_SIZE);
    logger.info(
      `Divided session data into ${dataChunks.length} processing chunks`,
    );

    // Track summaries between chunks to maintain context continuity
    let interChunkSummary = "";

    // Process each chunk sequentially to maintain proper context flow
    for (const [chunkIndex, currentChunk] of dataChunks.entries()) {
      logger.info(
        `Processing data chunk ${chunkIndex + 1}/${dataChunks.length} for session ${sessionId} (${currentChunk.length} items)`,
      );

      // Format the message differently based on whether this is a continuation chunk
      if (chunkIndex > 0 && interChunkSummary) {
        // For continuation chunks, include the summary of previous chunks
        sessionConversationHistory.push({
          role: "user",
          content: `
            This is what happened in previous chunks: ${interChunkSummary}
            
            Here is the next data chunk for session ${sessionId} (${chunkIndex + 1} of ${dataChunks.length}):
            
            ${objectToXml(currentChunk, "meeting_chunk")}
          `,
        });
      } else {
        // For the first chunk, no summary is needed
        sessionConversationHistory.push({
          role: "user",
          content: `
            Here is the data for coaching session ${sessionId} (${chunkIndex + 1} of ${dataChunks.length}):
            
            ${objectToXml(currentChunk, "meeting_chunk")}
          `,
        });
      }

      // For all chunks except the final one, generate a summary to carry context forward
      if (chunkIndex < dataChunks.length - 1) {
        logger.info(
          `Generating summary of chunk ${chunkIndex + 1} to maintain context for subsequent chunks`,
        );

        // Request a summary from the AI
        sessionConversationHistory.push({
          role: "user",
          content:
            "Please provide a factual, neutral summary of each meeting in this data chunk. For each meeting, include the meeting's video_api_id, name, date, summary, and all relevant data for topics discussed, topics, entities, relationships, action items, moments, and observations. Always include the exact IDs of all elements for reference in subsequent chunks. Maintain a neutral tone and focus on objective content without interpretation. Be thorough in capturing the complete structure of each meeting while remaining concise.",
        });

        // Generate the summary
        interChunkSummary = await generateChunkSummary(
          sessionConversationHistory,
        );

        // Add the AI's summary response to the conversation history
        sessionConversationHistory.push({
          role: "assistant",
          content: objectToXml({ summary: interChunkSummary }, "chunk_summary"),
        });

        logger.info(
          `Generated inter-chunk summary: ${interChunkSummary.substring(0, 100)}...`,
        );
      }
    }

    // After processing all data chunks, request topic generation with emphasis on continuity
    let topicGenerationPrompt =
      "Now, please generate a list of coaching topics that could be discussed during the upcoming session based on this data.";

    // Emphasize continuity if we have previous sessions
    if (previousSessions.length > 0) {
      topicGenerationPrompt +=
        " Be sure to include both new topics based on recent meetings and follow-up topics from previous coaching sessions where appropriate. For follow-up topics, use the type 'past_session' and for new topics use the type 'new'.";
    }

    logger.info("Adding topic generation request to conversation history");
    sessionConversationHistory.push({
      role: "user",
      content: topicGenerationPrompt,
    });

    // Generate the coaching topics with AI
    logger.info(`Generating coaching topics for session: ${sessionId}`);
    const topicsGenerationResult = await generateTopicsForSession(
      sessionConversationHistory,
    );

    const topicsCount = topicsGenerationResult.suggested_topics?.length || 0;
    logger.info(
      `Successfully generated ${topicsCount} coaching topics for session: ${sessionId}`,
    );

    // Store the generated topics in our result map
    sessionsTopicsMap[sessionId] = topicsGenerationResult;

    // Persist the topics to the database
    await saveTopicsToDatabase(
      supabaseClient,
      sessionId,
      topicsGenerationResult.suggested_topics || [],
    );
  }

  return sessionsTopicsMap;
};

/**
 * Main entry point for the Founder Coaching Topics Generator
 *
 * This function orchestrates the entire process of retrieving founder data,
 * analyzing meeting recordings between coaching sessions, and generating
 * AI-powered coaching topic suggestions. It handles the end-to-end workflow
 * from data retrieval to file output and database persistence.
 */
export const generateSuggestedTopics = async ({
  profileId,
}: {
  profileId: string;
}): Promise<void> => {
  try {
    // Initialize database connection
    const supabaseClient = await createClient();
    const currentTimestamp = new Date().toISOString();

    // ========= FOUNDER PROFILE RETRIEVAL =========
    logger.info("Retrieving founder profile data...");
    const { data: founderProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (profileError) {
      throw new Error(
        `Failed to retrieve founder profile: ${profileError.message}`,
      );
    }

    // ========= FOUNDER CONTEXT ENRICHMENT =========
    logger.info("Retrieving additional founder context...");
    const { data: founderEnrichments, error: enrichmentsError } =
      await supabaseClient
        .from("profile_enhancements")
        .select("*")
        .eq("profile_id", founderProfile.id)
        .order("created_at", { ascending: false })
        .limit(1);

    if (enrichmentsError) {
      throw new Error(
        `Failed to retrieve founder enrichments: ${enrichmentsError.message}`,
      );
    }

    const [latestEnrichment] = founderEnrichments || [];

    // ========= AI SYSTEM PROMPT CONSTRUCTION =========
    logger.info("Constructing AI system prompt...");
    let aiSystemPrompt = dedent`
      You work at Titanic AI, a company that specializes in AI-powered meeting intelligence for executive coaching.

      You are Titana, a data analyst at Titanic AI.

      First, here's how Titan—Titanic AI's flagship product—works:

      <explanation>
      Titan is an intelligent system that bridges the gap between founders and their coaches by capturing, analyzing, and extracting valuable insights from corporate meetings. This comprehensive platform serves as both a meeting intelligence system and a coaching enhancement tool, creating a continuous feedback loop between a founder's day-to-day leadership activities and their professional development journey.

      <definition>Titan: An AI-powered meeting intelligence and coaching enhancement system designed to record, analyze, and process meeting data to facilitate more effective coaching for founders. Titan identifies patterns, extracts insights, tracks progress over time, and connects real-world leadership behaviors with targeted skill development objectives.</definition>

      The system processes two distinct types of sessions, each serving a different purpose within the founder's development ecosystem:

      <definition>Meetings: Corporate gatherings recorded by Titan that serve as sources of raw behavioral data and evidence. These provide real-world examples of the founder's leadership in action, capturing authentic moments of decision-making, communication, team interaction, and other behaviors that can later be analyzed for coaching purposes. Meetings represent the "practice field" where skills are demonstrated and can be observed.</definition>
      <definition>Coaching Sessions: Structured discussions between founders and their coaches that are processed differently within Titan. Unlike regular meetings, coaching sessions serve to guide the founder's coaching journey rather than providing raw behavioral data. They represent the "training ground" where feedback is given, strategies are developed, and progress is discussed. These sessions help shape the founder's ongoing development priorities.</definition>

      The core process begins with meeting capture, which follows a systematic approach:

      <definition>Meeting Capture: The multi-step process through which Titan collects meeting data, including scheduling meeting bots to join calendar events, recording the audio/video of meetings, transcribing the content, and preparing it for analysis. This process respects the founder's privacy by only processing meetings where the bot's presence is explicitly permitted.</definition>
      <definition>Meeting Bots: Automated participants scheduled by Titan to join calendar events. These bots function as passive observers that record meetings and generate transcripts without disrupting the natural flow of conversation. They serve as the system's "eyes and ears" in the meeting environment.</definition>

      For each processed meeting, Titan generates several initial data products:

      <definition>Meeting Summary: A concise overview of what was discussed in a meeting, capturing the essential points, decisions made, and key interactions without requiring review of the entire transcript. This serves as a quick reference document that distills potentially hours of conversation into actionable highlights.</definition>
      <definition>Action Items: Tasks or follow-up commitments identified during meetings, including who is responsible (assignees) and when completion is expected (due dates). These represent concrete next steps that emerged from the meeting and help track accountability for meeting outcomes.</definition>
      <definition>Topics Discussed: An organized list of conversation themes from a meeting, each with a clear title and descriptive explanation. This categorization helps map the meeting's content landscape and provides structure to what might otherwise be a complex, meandering conversation.</definition>

      Titan then performs deeper analysis by dividing meetings into sequential topics and conducting multi-dimensional analysis:

      <definition>Meeting Topics: Connected segments of a meeting where context is maintained within a particular subject area or discussion thread. Unlike "Topics Discussed" which provides a high-level overview, Meeting Topics represent the actual sequential flow of conversation, preserving the natural progression and contextual relationships within the discussion. These serve as the foundation for more detailed analysis.</definition>
      <definition>Entity Analysis: The identification and examination of people, objects, places, or other elements mentioned within meeting topics. For each entity, Titan generates observations about their role, contributions, behaviors, and other relevant characteristics. For example, Titan might note that "Jane demonstrated strong strategic thinking when discussing Q3 plans" or "The new product feature received skeptical responses from the engineering team."</definition>
      <definition>Relationship Analysis: The mapping and assessment of connections between different entities within a meeting topic. This examines how people and concepts interact with each other, revealing dynamics such as collaboration patterns, points of tension, alignment of perspectives, or communication challenges. For instance, Titan might observe that "Jane and the Finance Team showed a collaborative relationship with some tension around budget priorities."</definition>
      <definition>General Observations: The identification of noteworthy patterns, themes, or insights about specific meeting topics that go beyond individual entities or relationships. These might include observations about decision-making processes, communication effectiveness, time management, meeting productivity, or other meta-level aspects of the interaction.</definition>

      Titan's most valuable feature is identifying significant "Moments" — the building blocks of coaching evidence:

      <definition>Moments: Important segments of meetings where high-value coaching themes emerge naturally in the founder's authentic workplace interactions. These represent instances where the founder demonstrates behaviors relevant to their development goals, whether positively or negatively. Moments are identified across themes such as goal setting, decision making, giving/receiving feedback, communication effectiveness, conflict resolution, delegation, strategic thinking, or accountability discussions. Each moment serves as a concrete, real-world example that can be referenced during coaching.</definition>
      <definition>Moment Refinement: The multi-step filtering and prioritization process that Titan applies to initially identified moments, ensuring that only the most insightful, relevant, and high-value examples are preserved for coaching purposes. This prevents information overload and focuses attention on moments with the greatest developmental significance.</definition>

      Coaching sessions receive similar but distinct processing from regular meetings:

      <definition>Coaching Session Summary: A concise overview of the discussion between founder and coach, capturing key themes, advice given, commitments made, and areas of focus. This serves as a record of the coaching conversation and helps track the evolution of the coaching relationship over time.</definition>
      <definition>Coaching Action Items: Tasks or commitments specifically focused on the founder's professional development and coaching objectives, as identified during coaching sessions. These differ from regular meeting action items in that they typically relate to skill building, behavior change, experimentation with new approaches, or reflection activities rather than business operations.</definition>
      <definition>Insights: Valuable guidance, observations, or advice provided by coaches during coaching sessions. Unlike the "topics discussed" in regular meetings, insights represent the coach's expertise and perspective being shared with the founder. These are extracted and cataloged by Titan for future reference and integration into the overall coaching journey.</definition>

      Titan's comprehensive data collection enables multiple powerful applications:

      <definition>Skills: Areas where the founder wants to grow professionally, such as decision-making, communication, delegation, strategic thinking, emotional intelligence, or accountability. Skills represent broad competency domains that can be activated or deactivated based on the founder's current development priorities. They serve as organizing frameworks for more specific goals and signals.</definition>
      <definition>Goals: Specific, measurable objectives within a skill area that focus the founder's development efforts. For example, within the broader Communication skill, a founder might have goals such as "improve public speaking," "enhance active listening," or "deliver more effective feedback." Goals translate broad skill areas into concrete targets for improvement.</definition>
      <definition>Signals: Specific, observable behaviors that indicate progress toward goals. These come in two varieties: positive signals (behaviors showing the founder is doing well, such as "speaks confidently" or "asks clarifying questions") and negative signals (behaviors indicating areas for improvement, such as "interrupts others" or "avoids addressing conflicts"). Signals transform subjective development areas into concrete, observable patterns that can be tracked over time.</definition>
      <definition>Skill Reports: Comprehensive assessments generated before coaching sessions that analyze moments from meetings between reports, matching them to active skills and their associated goals and signals. These reports organize evidence of both strengths and growth opportunities, providing a data-driven foundation for coaching conversations. They help focus coaching on specific behaviors rather than general impressions.</definition>
      <definition>Scoring System: A sophisticated quantitative method used in skill reports that measures the frequency and quality of positive and negative signals over time. This system quantifies the founder's development journey by tracking metrics such as: frequency of positive signal occurrences, reduction in negative signal instances, weighted importance of different signals, statistical significance of changes, and trend analysis across multiple reporting periods. This transforms subjective observations into objective measurements that can show tangible evidence of growth or identify areas needing additional focus.</definition>
      <definition>Suggested Topics: Data-driven discussion points generated before coaching sessions to guide productive conversations. These go beyond simple reminders and represent Titan's most sophisticated analytical output, integrating historical meeting data, past coaching sessions, entity relationships, behavioral patterns, and longitudinal trends to identify the most valuable areas for coaching focus.</definition>

      The Suggested Topics function demonstrates Titan's deepest analytical capabilities:

      <definition>Longitudinal Relationship Analysis: The tracking and assessment of how professional relationships evolve over time, identifying patterns of improvement or deterioration in how the founder interacts with specific team members, departments, or stakeholders across multiple meetings and weeks/months of interaction.</definition>
      <definition>Decision Pattern Recognition: The identification of recurring decision-making habits that appear across different contexts and time periods, revealing the founder's consistent strengths or challenges in areas such as risk assessment, information gathering, stakeholder consideration, or execution planning.</definition>
      <definition>Feedback Response Tracking: The analysis of how the founder responds to feedback over time, including patterns in receptivity, implementation of suggestions, follow-through on commitments, and integration of coaching advice into actual workplace behaviors.</definition>
      <definition>Contextual Correlation: The connection of seemingly unrelated moments across different meetings that reveal deeper patterns when viewed together, helping identify recurring themes that might not be obvious when looking at individual interactions in isolation.</definition>
      <definition>Progress Narrative Construction: The development of coherent narratives around specific skills by connecting moments across weeks or months, showing the arc of development and providing context for both successes and challenges in the founder's growth journey.</definition>
      <definition>Thematic Consistency Detection: The identification of themes that consistently appear across multiple meetings but might not be obvious when looking at meetings individually, revealing underlying patterns in the founder's leadership approach that may warrant deeper exploration.</definition>

      <definition>Blind Spot Identification: The recognition of areas where the founder may have consistent challenges but limited awareness, highlighting potential development opportunities that might otherwise go unaddressed due to lack of self-perception.</definition>
      <definition>Opportunity Mapping: The highlighting of upcoming situations (identified from calendar or mentioned future events) where previously identified growth areas could be actively practiced, creating a forward-looking approach to development rather than only analyzing past performance.</definition>

      This comprehensive system transforms raw meeting data into a structured framework for professional growth, making the coaching relationship more effective and development more measurable. The founder maintains control throughout the process by activating or deactivating skills based on current priorities, ensuring coaching focuses on what matters most at any given time.

      Titan represents a fundamental evolution in executive coaching by creating a continuous feedback loop between real workplace behaviors and targeted development efforts, replacing occasional subjective feedback with ongoing, evidence-based coaching grounded in authentic leadership moments.
      </explanation>

      You are now interfacing directly with the Titan system to generate high-value, data-driven suggested topics for an upcoming coaching session between a founder and their coach.

      Your task is to generate at least 10 insightful, evidence-based discussion topics that will maximize the effectiveness of the next coaching session by identifying patterns, opportunities, and growth areas that might otherwise be missed.

      Here's how you should approach this task:

      <task_plan>
      1. Titan (the system) will provide you with rich, analyzed data extracted from the founder's actual corporate meetings. These meetings occurred *between* their most recent coaching sessions and serve as the primary source of behavioral evidence. Due to context limits, this data may be provided sequentially in chunks.
      
      2. For the period between the last two coaching sessions, you will receive detailed, contextualized information derived from these meetings, including:
        - Meeting Summaries, Action Items, and Topics Discussed for high-level context.
        - Sequential Meeting Topics containing granular analysis: identified Entities (and observations about them), Relationships (and observations about them), general Topic Observations, and chronological Events.
        - Crucially, curated Moments: specific, high-value segments highlighting behaviors relevant to coaching (related to skills, goals, decision-making, communication, etc.).
        - Potentially relevant data regarding active Skills, Goals, Signals, and past Skill Reports showing progress or challenges.
      
      3. You will also receive data from previous coaching sessions, including topics discussed, insights, and any action items or commitments. This historical context is crucial for:
        - Identifying continuous threads across coaching sessions
        - Tracking progress on previously discussed topics
        - Following up on past action items or commitments
        - Recognizing recurring patterns that may indicate blind spots
        - Understanding the evolution of the founder's coaching journey
      
      4. Your core task is to synthesize insights *across* this potentially chunked data. Focus on:
        - Identifying longitudinal patterns: How do relationships, decision styles, or communication habits evolve or repeat across different meetings and topics?
        - Connecting the dots: Link specific Moments, Observations, Entity behaviors, and Relationship dynamics to the founder's active Skills, Goals, and Signals. Are they demonstrating progress, hitting obstacles, or showing inconsistencies?
        - Detecting thematic consistency: What underlying themes (e.g., delegation struggles, strategic alignment, feedback patterns) emerge when viewing disparate interactions together?
        - Surfacing blind spots: Recognize potential areas where the founder's actions might contradict their stated goals or where they might lack self-awareness, based *only* on the provided data.
        - Tracking feedback implementation: Analyze how feedback (potentially mentioned in observations or moments) is received and acted upon over time.
        - Recognizing significant shifts or events: Highlight major decisions, strategic changes, or critical interactions captured in the data.
        - Providing continuity: Connect current observations to previous coaching topics to create a coherent coaching narrative across sessions.
      
      5. For each suggested topic (aim for at least 10 insightful ones), provide the output strictly adhering to the defined schema:
        - what_happened: A factual, concise description of the observed event, pattern, or behavior.
        - why_this_matters: An insightful explanation connecting the observation to the founder's development, leadership effectiveness, or business impact.
        - thought_provoking_questions: 3-5 powerful, open-ended coaching questions to stimulate reflection and discussion.
        - type: Indicate if it's a 'new' topic or follows up on a 'past_session'.
        - sources: Accurate references (source_type and source_id) to the specific data points (moments, observations, entities, relationships, topics, meetings, action items etc.) that evidence your suggestion.
      </task_plan>

      Today, you will be generating suggested topics for:

      ${objectToXml(founderProfile, "founder_profile")}
    `;

    // Add founder's additional context if available
    if (latestEnrichment?.dossier) {
      aiSystemPrompt += dedent`
        And some additional context about the founder:

        <founder_context>
        ${latestEnrichment.dossier}
        </founder_context>
      `;
    }

    // Add current date and example output format
    aiSystemPrompt += dedent`
      Today is:

      <today>
      ${currentTimestamp}
      </today>

      Example of output:

      <example_output>
      {
        "suggested_topics": [
          {
            "what_happened": "During a leadership meeting, <founder_name_placeholder> made a difficult personnel decision involving the termination of an underperforming team member, using a structured feedback framework to ensure clarity and objectivity. They reflected on the challenges of delivering direct feedback and the need for clear, documented communication.",
            "why_this_matters": "This moment is pivotal for <founder_name_placeholder>'s growth as a leader, highlighting the importance of directness, accountability, and structured feedback in managing team members. It also surfaces the emotional and operational complexities of transitioning from a founder-led to a process-driven organization.",
            "thought_provoking_questions": [
              "How did you feel about the clarity and directness of your feedback during the termination process?",
              "What would you do differently next time to ensure both empathy and accountability?",
              "How can you build more comfort and consistency in delivering difficult feedback to team members?"
            ],
            "sources": [
              {
                "source_type": "moment",
                "source_id": "<uuid_of_moment>"
              },
              {
                "source_type": "entity_observation",
                "source_id": "<uuid_of_entity_observation>"
              },
              {
                "source_type": "topic_discussed",
                "source_id": "<uuid_of_topic_discussed>"
              }
            ]
          },
          {
            "what_happened": "The team is preparing for a major product launch, with <founder_name_placeholder> shifting from a phased approach to a full-scale production launch. This includes planning for inventory, cash flow, and aligning the team on aggressive sales and production targets.",
            "why_this_matters": "This is a critical inflection point for the company, requiring <founder_name_placeholder> to balance risk, operational readiness, and market opportunity. The decision to go 'all in' on the new version tests <founder_name_placeholder>'s ability to lead through uncertainty, manage cross-functional alignment, and communicate a bold vision.",
            "thought_provoking_questions": [
              "What risks and contingencies have you considered in moving to a full-scale launch versus a phased approach?",
              "How are you preparing the team for the operational and emotional demands of this transition?",
              "What signals will you watch to know if the launch strategy needs to be adjusted?"
            ],
            "sources": [
              {
                "source_type": "topic",
                "source_id": "<uuid_of_topic_discussed>"
              },
              {
                "source_type": "meeting",
                "source_id": "<video_api_id_of_meeting>"
              }
            ]
          },
          {
            "what_happened": "<founder_name_placeholder> and the team are navigating a complex funding environment, weighing options between venture debt, convertible notes, and timing a Series A round. There are cash flow pressures due to delayed grant reimbursements and the need to fund inventory for upcoming product releases.",
            "why_this_matters": "This topic is central to the company's ability to scale and survive. It tests <founder_name_placeholder>'s financial acumen, strategic patience, and ability to communicate trade-offs to investors and the team. The decision will have long-term implications for dilution, control, and growth trajectory.",
            "thought_provoking_questions": [
              "How are you balancing the urgency of cash needs with the desire to avoid unfavorable debt or premature dilution?",
              "What lessons from past fundraising rounds are informing your current approach?",
              "How are you preparing the team and board for possible scenarios if funding is delayed or terms are not ideal?"
            ],
            "sources": [
              {
                "source_type": "relationship_observation",
                "source_id": "<uuid_of_relationship_observation>"
              },
              {
                "source_type": "action_item",
                "source_id": "<uuid_of_action_item>"
              }
            ]
          },
          ...
        ]
      }
      </example_output>
    `;

    // ========= VERIFY REPORT PREREQUISITES =========
    logger.info("Verifying group report prerequisites...");
    const { data: groupReports, error: groupReportsError } =
      await supabaseClient
        .from("group_report_processing_status")
        .select("*")
        .eq("profile_id", founderProfile.id)
        .eq("status", "completed");

    if (groupReportsError) {
      throw new Error(
        `Failed to retrieve group reports: ${groupReportsError.message}`,
      );
    }

    if (!groupReports || groupReports.length === 0) {
      throw new Error(
        "Required group report not found - unable to proceed with analysis",
      );
    }

    // ========= MEETING DATA RETRIEVAL AND PROCESSING =========
    logger.info(
      "Retrieving and processing meeting data between coaching sessions...",
    );
    const sessionMeetingsData = await processMeetingsBetweenSessions(
      supabaseClient,
      founderProfile,
    );

    // ========= FETCH PREVIOUS COACHING SESSIONS =========
    logger.info("Retrieving previous coaching sessions for context...");
    const previousSessionsData: Record<string, SessionWithAnnotations[]> = {};

    // Get all coaching sessions in chronological order
    const { data: allSessions } = await supabaseClient
      .from("sessions")
      .select("*, event:calendar_events_v2(*)")
      .eq("user_id", founderProfile.id)
      .order("created_at", { ascending: true });

    // For each session, fetch its previous sessions
    for (const [index, session] of (allSessions || []).entries()) {
      // Skip the first few sessions as they won't have many previous sessions
      if (index < 2) continue;

      if (session.event?.start_time) {
        try {
          const previousSessions = await fetchPreviousCoachingSessions(
            supabaseClient,
            founderProfile.id,
            session.event.start_time,
            3, // Limit to 3 previous sessions
          );

          if (previousSessions.length > 0) {
            previousSessionsData[session.id] = previousSessions;
            logger.info(
              `Found ${previousSessions.length} previous sessions for session ${session.id}`,
            );
          }
        } catch (error) {
          logger.error(
            `Error fetching previous sessions for session ${session.id}:`,
            { error },
          );
        }

        // Apply gentle rate limiting
        await sleep(DB_THROTTLE_DELAY_MS);
      }
    }

    // ========= FETCH SKILL REPORTS DATA =========
    logger.info("Retrieving skill reports for founder...");
    let simplifiedReportsData: unknown[] = [];

    try {
      // Fetch detailed reports for the founder
      const founderReports = await fetchReportsForFounder(
        supabaseClient,
        founderProfile.id,
        5, // Limit to 5 most recent reports
      );

      logger.info(
        `Retrieved ${founderReports.length} group reports with details`,
      );

      // Simplify reports data for AI processing
      if (founderReports.length > 0) {
        simplifiedReportsData = simplifyReportsForAI(founderReports);
        logger.info("Successfully transformed reports data for AI processing");
      }
    } catch (error) {
      // Log error but continue with processing - reports are supplementary
      logger.error("Error fetching or processing reports data:", { error });
      logger.info("Continuing topic generation without reports data");
    }

    // ========= OUTPUT DIRECTORY PREPARATION =========
    logger.info("Preparing output directories...");
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentFilePath);
    const outputDir = join(currentDir, OUTPUT_DIRECTORY_PATH);
    await ensureOutputDirExists(outputDir);

    // Generate unique timestamp for filenames
    const filenameTimestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");

    // ========= WRITE DETAILED MEETING DATA =========
    logger.info("Writing detailed meeting data to file...");
    const detailedDataPath = join(
      outputDir,
      `meetings-between-sessions-${filenameTimestamp}.json`,
    );
    await writeDataToFile(detailedDataPath, sessionMeetingsData);

    // ========= WRITE PREVIOUS SESSIONS DATA =========
    logger.info("Writing previous coaching sessions data to file...");
    const previousSessionsPath = join(
      outputDir,
      `previous-coaching-sessions-${filenameTimestamp}.json`,
    );
    await writeDataToFile(previousSessionsPath, previousSessionsData);

    // ========= WRITE REPORTS DATA =========
    let reportsDataPath: string | undefined;
    if (simplifiedReportsData.length > 0) {
      logger.info("Writing reports data to file...");
      reportsDataPath = join(
        outputDir,
        `founder-skill-reports-${filenameTimestamp}.json`,
      );
      await writeDataToFile(reportsDataPath, simplifiedReportsData);
    }

    // ========= CREATE SIMPLIFIED DATA FOR AI ANALYSIS =========
    logger.info("Creating AI-optimized data representation...");
    const simplifiedSessionData = createLLMFriendlyData(sessionMeetingsData);

    // ========= GENERATE COACHING TOPICS WITH AI =========
    logger.info(
      "Generating AI-powered coaching topics with previous session and reports context...",
    );
    const generatedCoachingTopics = await generateSessionTopics(
      supabaseClient,
      aiSystemPrompt,
      simplifiedSessionData,
      previousSessionsData, // Pass the previous sessions data to include in analysis
      simplifiedReportsData, // Pass the simplified reports data to include in analysis
    );

    // ========= WRITE OUTPUT FILES =========
    // Save coaching topics
    logger.info("Writing generated coaching topics to file...");
    const topicsOutputPath = join(
      outputDir,
      `suggested-coaching-topics-${filenameTimestamp}.json`,
    );
    await writeDataToFile(topicsOutputPath, generatedCoachingTopics);

    // Save simplified data for reference
    logger.info("Writing simplified data to file for reference...");
    const simplifiedDataPath = join(
      outputDir,
      `meetings-between-sessions-simplified-${filenameTimestamp}.json`,
    );
    await writeDataToFile(simplifiedDataPath, simplifiedSessionData);

    // ========= PROCESSING COMPLETE =========
    logger.info("Processing completed successfully!");
    logger.info(`Detailed meetings data written to: ${detailedDataPath}`);
    logger.info(
      `Previous coaching sessions data written to: ${previousSessionsPath}`,
    );
    if (simplifiedReportsData.length > 0 && reportsDataPath) {
      logger.info(`Skill reports data written to: ${reportsDataPath}`);
    }
    logger.info(`Simplified meetings data written to: ${simplifiedDataPath}`);
    logger.info(`Generated coaching topics written to: ${topicsOutputPath}`);
  } catch (error) {
    logger.error("Fatal error in coaching topics generation:", { error });
    process.exit(1);
  }
};

/**
 * Retrieves all reports for a founder profile
 *
 * This function fetches all completed group reports for a founder,
 * along with their detailed report data including sections, goals,
 * signals, and moments that provide evidence of progress.
 *
 * @param supabaseClient - Database client for interacting with Supabase
 * @param profileId - ID of the founder whose reports should be retrieved
 * @param limit - Maximum number of recent reports to retrieve (default: 3)
 * @returns Array of group reports with nested report details
 * @throws Error if any database query fails
 */
const fetchReportsForFounder = async (
  supabaseClient: SupabaseServerClient,
  profileId: string,
  limit = 3,
): Promise<GroupReportWithDetails[]> => {
  logger.info(`Retrieving recent skill reports for founder: ${profileId}`);

  // Get recent completed group reports
  const { data: groupReports, error: groupReportsError } = await supabaseClient
    .from("group_report_processing_status")
    .select("*, skill:skills(*)")
    .eq("profile_id", profileId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (groupReportsError) {
    throw new Error(
      `Failed to retrieve group reports: ${groupReportsError.message}`,
    );
  }

  if (!groupReports || groupReports.length === 0) {
    logger.info(`No completed reports found for founder: ${profileId}`);
    return [];
  }

  logger.info(
    `Found ${groupReports.length} group reports for founder: ${profileId}`,
  );

  // Process each group report to fetch detailed report data
  const enrichedGroupReports: GroupReportWithDetails[] = [];

  for (const groupReport of groupReports) {
    try {
      // Get report processing statuses for this group
      const { data: reportProcessingStatuses, error: statusesError } =
        await supabaseClient
          .from("report_processing_status")
          .select("*")
          .eq("group_processing_status_id", groupReport.id);

      if (statusesError) {
        logger.error(
          `Error fetching report processing statuses: ${statusesError.message}`,
        );
        continue;
      }

      // Get the report IDs that completed processing
      const reportIds = reportProcessingStatuses
        .map((status) => status.report_id)
        .filter((id): id is string => id !== null);

      if (reportIds.length === 0) {
        logger.info(`No report IDs found for group report: ${groupReport.id}`);
        continue;
      }

      // Fetch detailed report data
      const { data: reports, error: reportsError } = await supabaseClient
        .from("reports")
        .select(
          `
            *,
            report_sections(*),
            report_goals(*, goal:goals!inner(*, signals:goal_signals(*))),
            report_goal_signals(*, goal_signal:goal_signals!inner(*)),
            report_moments(*, moment:moments!inner(*, subtags:moment_subtags(*)), report_goal_signal:report_goal_signals!inner(*)),
            report_comments(*, user:profiles(*))
          `,
        )
        .in("id", reportIds);

      if (reportsError) {
        logger.error(
          `Error fetching detailed reports: ${reportsError.message}`,
        );
        continue;
      }

      // Apply gentle rate limiting to avoid overwhelming the database
      await sleep(DB_THROTTLE_DELAY_MS);

      enrichedGroupReports.push({
        ...groupReport,
        reports: reports as ReportWithDetails[],
      });

      logger.info(
        `Successfully enriched group report ${groupReport.id} with ${reports.length} detailed reports`,
      );
    } catch (error) {
      logger.error(`Error processing group report ${groupReport.id}:`, {
        error,
      });
      // Continue with other group reports even if one fails
    }
  }

  return enrichedGroupReports;
};

/**
 * Transforms complex report data structures into a simplified format optimized for AI processing
 *
 * This function extracts essential fields from report data, reducing complexity
 * and volume while maintaining the key insights and evidence needed for analysis.
 * The resulting structure is more suitable for processing by AI models with
 * token limits.
 *
 * @param groupReports - Array of group reports with nested details
 * @returns Simplified data structure with relevant report information
 */
const simplifyReportsForAI = (
  groupReports: GroupReportWithDetails[],
): unknown[] => {
  return groupReports.map((groupReport) => ({
    id: groupReport.id,
    created_at: groupReport.created_at,
    skill: groupReport.skill
      ? {
          id: groupReport.skill.id,
          title: groupReport.skill.title,
          description: groupReport.skill.description,
        }
      : null,

    reports: groupReport.reports.map((report) => ({
      id: report.id,
      created_at: report.created_at,
      start_date: report.start_date,
      end_date: report.end_date,
      summary: report.summary,
      profile_id: report.profile_id,
      skill_id: report.skill_id,

      // Personality assessment from the report
      personality_text: report.personality_text,
      personality_description: report.personality_description,

      // Key sections of the report
      sections: report.report_sections.map((section) => ({
        id: section.id,
        title: section.title,
        summary: section.summary,
        direction: section.direction,
        index: section.index,

        // Add moments connected to this section
        moments: report.report_moments
          .filter((moment) => moment.report_section_id === section.id)
          .map((moment) => ({
            id: moment.id,
            title: moment.moment.title,
            summary: moment.moment.summary,
            reasoning: moment.report_section_reasoning,
            confidence: moment.report_section_confidence,
            score: moment.score,
            signal: {
              id: moment.report_goal_signal.id,
              text: moment.report_goal_signal.text,
              direction: moment.report_goal_signal.direction,
            },
          })),
      })),

      // Goals being assessed
      goals: report.report_goals.map((reportGoal) => ({
        id: reportGoal.id,
        text: reportGoal.text,
        is_reviewed: reportGoal.is_reviewed,
        goal: {
          id: reportGoal.goal.id,
          text: reportGoal.goal.text,
          signals: reportGoal.goal.signals.map((signal) => ({
            id: signal.id,
            text: signal.text,
            direction: signal.direction,
          })),
        },
      })),

      // Signals observed in the founder's behavior
      signals: report.report_goal_signals.map((reportSignal) => ({
        id: reportSignal.id,
        text: reportSignal.text,
        direction: reportSignal.direction,
        activity_type: reportSignal.activity_type,

        // Count moments associated with this signal for frequency
        moment_count: report.report_moments.filter(
          (moment) => moment.report_goal_signal_id === reportSignal.id,
        ).length,
      })),
    })),
  }));
};
