import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import _ from "lodash";
import { dedent as s } from "ts-dedent";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { createClient } from "../supabase/client";
import type { Tables } from "../supabase/database.types";
import type { ProcessingContext } from "./steps";
import type { TopicSegment } from "./topic-segmentation";
import {
  cleanVtt,
  extractVttSegments,
  getVttSegmentTimestamps,
  vttTimestampToSeconds,
} from "./vtt-utils";

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

export type TopicWithEntitiesAndRelationships = Omit<
  Tables<"meeting_topics_v2">,
  "summary"
> & {
  detailed_summary: string;
  timeline: Array<{ timestamp: string; event: string }>;
  entities?: Array<Tables<"meeting_entities_v2">>;
  relationships?: Array<Tables<"meeting_entity_relationships_v2">>;
};

/**
 * Meeting data with related topics, events, entities, and relationships
 */
export type MeetingWithTopicsAndEntities = Tables<"meetings"> & {
  topics: Array<
    Tables<"meeting_topics_v2"> & {
      events: Array<Tables<"meeting_topic_events_v2">>;
      entities: Array<Tables<"meeting_entities_v2">>;
      relationships: Array<Tables<"meeting_entity_relationships_v2">>;
      observations: Array<Tables<"meeting_observations_v2">>;
    }
  >;
};

/**
 * Input variables for moment identification prompt
 */
export type MomentIdentificationPromptVariables = {
  currentTopic: TopicSegment;
  topicVtt: string;
  previousTopic?: TopicSegment;
  nextTopic?: TopicSegment;
  entitiesAndRelationships: {
    entities: Array<Tables<"meeting_entities_v2">>;
    relationships: Array<Tables<"meeting_entity_relationships_v2">>;
  };
};

/**
 * Schema for a moment identified in a meeting
 */
export const Moment = z.object({
  title: z.string().describe("Brief descriptive title of the moment."),
  most_impactful_timestamp: z
    .string()
    .describe("Timestamp when the moment reached its peak impact."),
  start_segment_id: z
    .number()
    .describe("The starting VTT segment ID of the moment."),
  end_segment_id: z
    .number()
    .describe("The ending VTT segment ID of the moment."),
  description: z
    .string()
    .describe("Detailed description of what happened in this moment."),
  importance: z
    .number()
    .min(1)
    .max(10)
    .describe("Importance score from 1-10, with 10 being most important."),
  type: z
    .string()
    .describe(
      "Type of moment (e.g., decision, action item, insight, question, concern, etc.)",
    ),
  entities_involved: z
    .array(z.string())
    .describe("Names of entities involved in this moment."),
  key_quotes: z
    .array(z.string())
    .describe("Important quotes from this moment."),
  context: z
    .string()
    .describe("Broader context explaining why this moment matters."),
});
export type Moment = z.infer<typeof Moment>;

/**
 * Schema for the complete output of moment identification
 */
export const MomentIdentificationOutput = z.object({
  moments: z
    .array(Moment)
    .describe("List of important moments identified in the meeting segment."),
});
export type MomentIdentificationOutput = z.infer<
  typeof MomentIdentificationOutput
>;

/**
 * Identifies important moments in meeting content using AI
 *
 * @param variables - Input variables containing topic, VTT content, and entity data
 * @param ctx - Processing context for logging and tracing
 * @returns Structured moment identification results
 */
export async function momentIdentification(
  variables: MomentIdentificationPromptVariables,
  ctx: ProcessingContext,
): Promise<MomentIdentificationOutput> {
  const {
    currentTopic,
    topicVtt,
    previousTopic,
    nextTopic,
    entitiesAndRelationships,
  } = variables;
  const cleanedTopicVtt = cleanVtt(topicVtt);

  return await ctx.logger.trace("🧠 AI moment identification", async (span) => {
    span.setAttribute("topic.title", currentTopic.title);
    span.setAttribute("topic.start_id", currentTopic.start_segment_id);
    span.setAttribute("topic.end_id", currentTopic.end_segment_id);
    span.setAttribute("vtt.length", cleanedTopicVtt.length);
    span.setAttribute(
      "entities.count",
      entitiesAndRelationships.entities.length,
    );
    span.setAttribute(
      "relationships.count",
      entitiesAndRelationships.relationships.length,
    );
    span.setAttribute("model.name", "openai/o3-mini");

    ctx.logger.info("Starting AI moment identification", {
      topicTitle: currentTopic.title,
      vttLength: cleanedTopicVtt.length,
      entitiesCount: entitiesAndRelationships.entities.length,
      relationshipsCount: entitiesAndRelationships.relationships.length,
      modelName: "openai/o3-mini",
    });

    const systemMessage = getMomentIdentificationSystemMessage();
    const prompt = getMomentIdentificationPrompt({
      currentTopic,
      topicVtt: cleanedTopicVtt,
      previousTopic,
      nextTopic,
      entitiesAndRelationships,
    });

    const generation = await generateObject({
      model: openai("o3-mini"),
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      schema: MomentIdentificationOutput,
    });

    const { moments } = generation.object;

    span.setAttribute("moments.count", moments.length);

    ctx.logger.info("AI moment identification completed", {
      momentsIdentified: moments.length,
    });

    return generation.object;
  });
}

/**
 * Main entry point for the moment identification process
 *
 * @param param0 - Object containing video API ID
 * @param ctx - Processing context for logging and tracing
 */
export async function runMomentIdentification(
  { video_api_id }: { video_api_id: string },
  ctx: ProcessingContext,
): Promise<void> {
  return await ctx.logger.trace(
    "⏱️ Moment identification process",
    async (span) => {
      span.setAttribute("video_api_id", video_api_id);
      span.setAttribute("step", "moment-identification");

      ctx.logger.info("Starting moment identification process", {
        video_api_id,
        step: "moment-identification",
      });

      try {
        // Fetch meeting data with topics, entities, and relationships
        const meeting = await fetchMeetingData(video_api_id, ctx, span);

        // Process meeting topics
        const meetingTopics = prepareMeetingTopics(meeting, span, ctx);

        // Process each topic in parallel
        await processAllTopics(meetingTopics, meeting, video_api_id, ctx);

        ctx.logger.info(
          "Moment identification process completed successfully",
          {
            video_api_id,
            topicsProcessed: meetingTopics.length,
          },
        );
      } catch (error) {
        span.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : String(error),
        });

        ctx.logger.error("Error in moment identification process", {
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
 * @returns Meeting data with topics, events, entities, and relationships
 */
async function fetchMeetingData(
  video_api_id: string,
  ctx: ProcessingContext,
  span: Span,
) {
  const supabase = createClient();

  ctx.logger.info("Fetching meeting data", { video_api_id });
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select(
      "*, topics:meeting_topics_v2(*, events:meeting_topic_events_v2(*), entities:meeting_entities_v2(*, entity_observations:meeting_entity_observations_v2(*)), relationships:meeting_entity_relationships_v2(*, relationship_observations:meeting_entity_relationship_observations_v2(*)), observations:meeting_observations_v2(*))",
    )
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
  meeting: Awaited<ReturnType<typeof fetchMeetingData>>,
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
  meeting: Awaited<ReturnType<typeof fetchMeetingData>>,
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
 * Processes a single topic for moment identification
 *
 * @param topic - Topic to process
 * @param index - Index of the topic in the array
 * @param meetingTopics - All meeting topics
 * @param meeting - Meeting data
 * @param video_api_id - Video API identifier
 * @param ctx - Processing context
 */
async function processSingleTopic(
  topic: TopicWithEntitiesAndRelationships,
  index: number,
  meetingTopics: ReturnType<typeof prepareMeetingTopics>,
  meeting: Awaited<ReturnType<typeof fetchMeetingData>>,
  video_api_id: string,
  ctx: ProcessingContext,
): Promise<void> {
  return await ctx.logger.trace(
    `⏱️ Processing topic ${index + 1}/${meetingTopics.length} for moments`,
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

      // Extract entities and relationships for this topic
      const entitiesAndRelationships = {
        entities: (topic.entities ?? []).filter((entity) => entity.latest),
        relationships: (topic.relationships ?? []).filter((rel) => rel.latest),
      };

      // Handle existing moments
      await handleExistingMoments(meeting, ctx, topicSpan);

      // Perform moment identification
      const momentResults = await performMomentIdentification(
        topic,
        topicVtt,
        previousTopic,
        nextTopic,
        entitiesAndRelationships,
        ctx,
        topicSpan,
      );

      // Save moment results
      await saveMomentResults(
        momentResults,
        topic,
        meeting,
        video_api_id,
        ctx,
        topicSpan,
      );

      ctx.logger.info("Topic moment processing completed successfully", {
        topic_id: topic.id,
        topicTitle: topic.title,
        momentsIdentified: momentResults.moments.length,
      });
    },
  );
}

/**
 * Handles existing moments for a topic
 *
 * @param meeting - Meeting data
 * @param ctx - Processing context
 * @param topicSpan - Tracing span
 */
async function handleExistingMoments(
  meeting: Awaited<ReturnType<typeof fetchMeetingData>>,
  ctx: ProcessingContext,
  topicSpan: Span,
): Promise<void> {
  const supabase = createClient();

  ctx.logger.info("Checking for existing moments", {
    meeting_id: meeting.video_api_id,
    meetingTitle: meeting.name,
  });

  const { data: existingMoments, error: fetchMomentsError } = await supabase
    .from("moments")
    .select("*")
    .eq("video_api_id", meeting.video_api_id)
    .eq("latest", true)
    .eq("version", 2);

  if (fetchMomentsError) {
    topicSpan.setStatus({
      code: 2,
      message: fetchMomentsError.message,
    });

    ctx.logger.error("Error fetching existing moments", {
      meeting_id: meeting.video_api_id,
      meetingTitle: meeting.name,
      error: fetchMomentsError,
    });
    throw fetchMomentsError;
  }

  topicSpan.setAttribute("existing_moments.count", existingMoments.length);
  ctx.logger.info("Found existing moments", {
    meeting_id: meeting.video_api_id,
    meetingTitle: meeting.name,
    count: existingMoments.length,
  });

  // Update existing records if they exist
  if (existingMoments.length > 0) {
    await updateExistingMoments(meeting, existingMoments, ctx);
  }
}

/**
 * Updates existing moments to latest=false
 *
 * @param meeting - Meeting being processed
 * @param existingMoments - Existing moments to update
 * @param ctx - Processing context
 */
async function updateExistingMoments(
  meeting: Awaited<ReturnType<typeof fetchMeetingData>>,
  existingMoments: Array<{ id: string }>,
  ctx: ProcessingContext,
): Promise<void> {
  const supabase = createClient();

  return await ctx.logger.trace(
    "📝 Updating existing moments",
    async (updateSpan) => {
      const momentIds = existingMoments.map((moment) => moment.id);
      updateSpan.setAttribute("moment_ids.count", momentIds.length);

      ctx.logger.info("Updating existing moments to latest=false", {
        meeting_id: meeting.video_api_id,
        meetingTitle: meeting.name,
        momentsCount: existingMoments.length,
      });

      // Update moments
      const { error: updateMomentsError } = await supabase
        .from("moments")
        .update({ latest: false })
        .in("id", momentIds);

      if (updateMomentsError) {
        updateSpan.setStatus({
          code: 2,
          message: updateMomentsError.message,
        });

        ctx.logger.error("Error updating existing moments", {
          meeting_id: meeting.video_api_id,
          meetingTitle: meeting.name,
          error: updateMomentsError,
        });
        throw updateMomentsError;
      }

      ctx.logger.info("Successfully updated existing moments", {
        meeting_id: meeting.video_api_id,
        meetingTitle: meeting.name,
      });
    },
  );
}

/**
 * Performs moment identification for a specific topic
 *
 * @param topic - Topic to process
 * @param topicVtt - VTT content for the topic
 * @param previousTopic - Previous topic for context
 * @param nextTopic - Next topic for context
 * @param entitiesAndRelationships - Entities and relationships for the topic
 * @param ctx - Processing context
 * @param topicSpan - Tracing span
 * @returns Moment identification results
 */
async function performMomentIdentification(
  topic: TopicWithEntitiesAndRelationships,
  topicVtt: string,
  previousTopic: TopicSegmentWithId | undefined,
  nextTopic: TopicSegmentWithId | undefined,
  entitiesAndRelationships: {
    entities: Array<Tables<"meeting_entities_v2">>;
    relationships: Array<Tables<"meeting_entity_relationships_v2">>;
  },
  ctx: ProcessingContext,
  topicSpan: Span,
): Promise<MomentIdentificationOutput> {
  ctx.logger.info("Calling AI moment identification", {
    topic_id: topic.id,
    topicTitle: topic.title,
    vttLength: topicVtt.length,
    entitiesCount: entitiesAndRelationships.entities.length,
    relationshipsCount: entitiesAndRelationships.relationships.length,
  });

  const momentIdentificationResult = await momentIdentification(
    {
      currentTopic: topic,
      topicVtt,
      previousTopic,
      nextTopic,
      entitiesAndRelationships,
    },
    ctx,
  );

  const { moments } = momentIdentificationResult;

  topicSpan.setAttribute("moments.count", moments.length);

  ctx.logger.info("Moment identification completed", {
    topic_id: topic.id,
    momentsCount: moments.length,
  });

  return momentIdentificationResult;
}

/**
 * Saves moment results to the database
 *
 * @param momentResults - Moment identification results
 * @param topic - Topic being processed
 * @param meeting - Meeting data
 * @param video_api_id - Video API identifier
 * @param ctx - Processing context
 * @param topicSpan - Tracing span
 */
async function saveMomentResults(
  momentResults: MomentIdentificationOutput,
  topic: TopicSegmentWithId,
  meeting: Tables<"meetings">,
  video_api_id: string,
  ctx: ProcessingContext,
  topicSpan: Span,
): Promise<void> {
  const { moments } = momentResults;

  ctx.logger.info("Saving moment results to database", {
    topic_id: topic.id,
    topicTitle: topic.title,
    momentsCount: moments.length,
  });

  const supabase = createClient();

  return await ctx.logger.trace("💾 Saving moments", async (saveSpan) => {
    saveSpan.setAttribute("moments.count", moments.length);

    await Promise.all(
      moments.map(async (moment, momentIndex) => {
        ctx.logger.debug(`Saving moment ${momentIndex + 1}/${moments.length}`, {
          topic_id: topic.id,
          momentTitle: moment.title,
          momentType: moment.type,
        });

        const vttSegmentTimestamps = getVttSegmentTimestamps(
          extractVttSegments(
            meeting.clean_vtt_file ?? "",
            moment.start_segment_id,
            moment.end_segment_id,
          ),
          moment.start_segment_id,
          moment.end_segment_id,
        );

        if (!vttSegmentTimestamps) {
          throw new Error("Segment start timestamp not found");
        }

        const { start: segmentStartTimestamp, end: segmentEndTimestamp } =
          vttSegmentTimestamps;

        const { error: momentInsertError } = await supabase
          .from("moments")
          .insert({
            id: uuidv4(),
            title: moment.title,
            summary: moment.description,
            video_api_id,
            segment_id_sequence_start: moment.start_segment_id,
            segment_id_sequence_end: moment.end_segment_id,
            segment_start_timestamp: segmentStartTimestamp,
            segment_start_timestamp_in_seconds: vttTimestampToSeconds(
              segmentStartTimestamp,
            ),
            segment_end_timestamp: segmentEndTimestamp,
            segment_end_timestamp_in_seconds:
              vttTimestampToSeconds(segmentEndTimestamp),
            profile_id: meeting.profile_id,
            segment_start_timestamp_in_seconds_ideal: vttTimestampToSeconds(
              moment.most_impactful_timestamp,
            ),
            latest: true,
            relevant: true,
            version: 2,
          });

        if (momentInsertError) {
          saveSpan.setStatus({
            code: 2,
            message: momentInsertError.message,
          });

          ctx.logger.error("Error saving moment", {
            topic_id: topic.id,
            topicTitle: topic.title,
            momentTitle: moment.title,
            error: momentInsertError,
          });
          throw momentInsertError;
        }
      }),
    );

    ctx.logger.info("Successfully saved all moments", {
      topic_id: topic.id,
      topicTitle: topic.title,
      momentsCount: moments.length,
    });
  });
}

export function getMomentIdentificationSystemMessage(): string {
  return s`
    You are a specialized AI system that analyzes meeting segments to identify key moments, turning conversational data into structured insights about important decisions, actions, and discussions.
  `;
}

export function getMomentIdentificationPrompt({
  currentTopic,
  topicVtt,
  previousTopic,
  nextTopic,
  entitiesAndRelationships,
}: MomentIdentificationPromptVariables): string {
  return s`
    You are an expert at identifying the most important and meaningful moments from meeting transcripts. Your goal is to extract key moments that reveal decisions, actions, insights, and significant turning points in discussions.

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

    Here are the entities and relationships that have been identified in this meeting segment:
    <entities_and_relationships>
    ${JSON.stringify(entitiesAndRelationships, null, 2)}
    </entities_and_relationships>

    Your task is to identify the most significant moments in this meeting segment. These should be specific points in the discussion that are particularly important, revealing, or consequential. Focus on moments such as:

    1. **Decisions**: When a clear decision is made or confirmed
    2. **Action Items**: When specific tasks are assigned or commitments made
    3. **Key Insights**: When important realizations or discoveries emerge
    4. **Agreements/Disagreements**: When team members align or diverge on important topics
    5. **Problem Identification**: When critical issues are recognized
    6. **Solution Proposals**: When possible solutions are offered
    7. **Pivotal Questions**: When questions redirect or deepen the conversation
    8. **Clarifications**: When misunderstandings are addressed
    9. **Concerns/Risks**: When potential problems are raised
    10. **Celebrations/Acknowledgments**: When achievements or contributions are recognized

    For each moment, provide:
    - A concise but descriptive title
    - The timestamp when it occurred
    - The segment ID where it occurred
    - A detailed description of what happened
    - An importance score (1-10)
    - The type of moment (from the categories above or other appropriate label)
    - Entities involved (from the entity list provided)
    - Key quotes that capture the essence of the moment
    - Broader context explaining why this moment matters

    Quality criteria for your analysis:
    - Focus on truly significant moments (typically 3-7 per topic, but use your judgment)
    - Ensure moments are specific, not general summaries
    - Prioritize moments with clear business impact
    - Include direct quotes whenever possible
    - Connect moments to the identified entities
    - Consider the broader context from adjacent segments

    Your output should be structured as follows:

    \`\`\`json
    {
      "moments": [
        {
          "title": "Brief descriptive title",
          "timestamp": "HH:MM:SS",
          "segment_id": 123,
          "description": "Detailed description of what happened",
          "importance": 8,
          "type": "Decision|Action Item|Insight|Agreement|Problem|Solution|Question|Clarification|Concern|Celebration",
          "entities_involved": ["Entity1", "Entity2"],
          "key_quotes": ["Direct quote from transcript", "Another relevant quote"],
          "context": "Explanation of why this moment matters in the broader discussion"
        }
      ]
    }
    \`\`\`

    Remember to focus on precision and value, identifying only the moments that would be truly meaningful to someone who needs to understand what happened in this meeting.
  `;
}
