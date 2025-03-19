import fs from "node:fs";
import path from "node:path";
import { openai } from "@ai-sdk/openai";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { type CoreMessage, generateObject, generateText, tool } from "ai";
import { Langfuse, type LangfuseSpanClient } from "langfuse";
import { LangfuseExporter } from "langfuse-vercel";
import { dedent } from "ts-dedent";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { createClient } from "~/lib/supabase/client";
import type { Tables } from "~/lib/supabase/database.types";

const sdk = new NodeSDK({
  traceExporter: new LangfuseExporter({ debug: true }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

const langfuse = new Langfuse();

export const MomentIdentificationTaskInput = z.object({
  apiVideoId: z.string(),
  momentType: z.string(),
});
export type MomentIdentificationTaskInput = z.infer<
  typeof MomentIdentificationTaskInput
>;

export const MeetingModel = z.object({
  video_api_id: z.string(),
  profile_id: z.string().nullable(),
  name: z.string().nullable(),
  speaker: z.string().nullable(),
  date: z.string().nullable(),
  duration_in_ms: z.number().nullable(),
  summary: z.string().nullable(),
  tags: z.string().nullable(),
  original_vtt_file: z.string().nullable(),
  clean_vtt_file: z.string().nullable(),
  provider: z.enum(["meeting_baas", "recall"]).nullable(),
  vectorized: z.boolean(),
  thumbnail_url: z.string().nullable(),
  preprocessing_payload: z.record(z.any()).nullable(),
  meeting_baas_original_json: z.record(z.any()).nullable(),
  created_at: z.string(),
  db_created_at: z.string().nullable(),
}) satisfies z.ZodType<Omit<Tables<"meetings">, "searchable">>;
export type MeetingModel = z.infer<typeof MeetingModel>;

export const MeetingObservationModel = z.object({
  id: z.string(),
  api_video_id: z.string(),
  profile_id: z.string(),
  meeting_topic_id: z.string(),
  observation: z.string(),
  created_at: z.string(),
  latest: z.boolean(),
}) satisfies z.ZodType<Tables<"meeting_observations_v2">>;
export type MeetingObservationModel = z.infer<typeof MeetingObservationModel>;

export const MeetingTopicModel = z.object({
  id: z.string(),
  api_video_id: z.string(),
  profile_id: z.string(),
  title: z.string(),
  summary: z.string(),
  start_segment_id: z.number(),
  end_segment_id: z.number(),
  index: z.number(),
  latest: z.boolean(),
  created_at: z.string(),
}) satisfies z.ZodType<Tables<"meeting_topics_v2">>;
export type MeetingTopicModel = z.infer<typeof MeetingTopicModel>;

export const MeetingTopicEventModel = z.object({
  id: z.string(),
  api_video_id: z.string(),
  profile_id: z.string(),
  meeting_topic_id: z.string(),
  event: z.string(),
  timestamp: z.string(),
  latest: z.boolean(),
  created_at: z.string(),
}) satisfies z.ZodType<Tables<"meeting_topic_events_v2">>;
export type MeetingTopicEventModel = z.infer<typeof MeetingTopicEventModel>;

export const MeetingEntityModel = z.object({
  id: z.string(),
  api_video_id: z.string(),
  profile_id: z.string(),
  meeting_topic_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  latest: z.boolean(),
  created_at: z.string(),
}) satisfies z.ZodType<Tables<"meeting_entities_v2">>;
export type MeetingEntityModel = z.infer<typeof MeetingEntityModel>;

export const MeetingEntityObservationModel = z.object({
  api_video_id: z.string(),
  created_at: z.string(),
  id: z.string(),
  latest: z.boolean(),
  meeting_entity_id: z.string(),
  meeting_topic_id: z.string(),
  observation: z.string(),
  profile_id: z.string(),
}) satisfies z.ZodType<Tables<"meeting_entity_observations_v2">>;
export type MeetingEntityObservationModel = z.infer<
  typeof MeetingEntityObservationModel
>;

export const MeetingEntityRelationshipModel = z.object({
  id: z.string(),
  api_video_id: z.string(),
  profile_id: z.string(),
  meeting_topic_id: z.string(),
  subject_entity_name: z.string(),
  object_entity_name: z.string(),
  relationship_type: z.string(),
  latest: z.boolean(),
  created_at: z.string(),
}) satisfies z.ZodType<Tables<"meeting_entity_relationships_v2">>;
export type MeetingEntityRelationshipModel = z.infer<
  typeof MeetingEntityRelationshipModel
>;

export const MeetingEntityRelationshipObservationModel = z.object({
  api_video_id: z.string(),
  created_at: z.string(),
  id: z.string(),
  latest: z.boolean(),
  meeting_entity_relationship_id: z.string(),
  meeting_topic_id: z.string(),
  observation: z.string(),
  profile_id: z.string(),
}) satisfies z.ZodType<Tables<"meeting_entity_relationship_observations_v2">>;
export type MeetingEntityRelationshipObservationModel = z.infer<
  typeof MeetingEntityRelationshipObservationModel
>;

export const MomentLLM = z
  .object({
    title: z.string().describe("Short descriptive name of the moment"),
    summary: z
      .string()
      .describe("Concise overview of what was discussed in this moment"),
    transcript_start_index: z
      .number()
      .describe("Starting index of the moment in the transcript"),
    transcript_end_index: z
      .number()
      .describe("Ending index of the moment in the transcript"),
    observations: z
      .array(z.string())
      .describe("List of notes or comments about this moment"),
  })
  .describe("Representation of a moment in the meeting");
export type MomentLLM = z.infer<typeof MomentLLM>;

export const MeetingTopicLLM = z
  .object({
    index: z
      .number()
      .describe("Order of this topic within the meeting sequence"),
    title: z.string().describe("Short descriptive name of the topic"),
    summary: z
      .string()
      .describe("Concise overview of what was discussed in this topic"),
    transcript: z
      .array(
        z.object({
          index: z
            .number()
            .describe("Position of this segment in the transcript"),
          start_timestamp: z
            .string()
            .describe("Starting time of this segment in format 'HH:MM:SS.mmm'"),
          end_timestamp: z
            .string()
            .describe("Ending time of this segment in format 'HH:MM:SS.mmm'"),
          speaker: z
            .string()
            .describe("Name or identifier of the person speaking"),
          text: z
            .string()
            .describe("Actual transcribed content spoken by the speaker"),
        }),
      )
      .describe("Chronological segments of conversation within this topic"),
    meeting: z
      .object({
        title: z.string().describe("Title of the overall meeting"),
        summary: z.string().describe("Summary of the entire meeting"),
      })
      .describe("Information about the parent meeting"),
    timeline: z
      .array(
        z.object({
          timestamp: z.string().describe("Timestamp of the event"),
          event: z.string().describe("Description of the event"),
        }),
      )
      .describe("Timeline of relevant events within this topic"),
    entities: z
      .array(
        z.object({
          name: z.string().describe("Unique identifier for the entity"),
          description: z
            .string()
            .nullable()
            .describe("Detailed explanation of the entity"),
          type: z.string().describe("Classification category of the entity"),
          observations: z
            .array(z.string())
            .describe("List of notes or comments about this entity"),
        }),
      )
      .describe(
        "Key entities (people, projects, concepts) mentioned in this topic",
      ),
    entity_relationships: z
      .array(
        z.object({
          subject_entity_name: z
            .string()
            .describe("Name of the entity initiating the relationship"),
          object_entity_name: z
            .string()
            .describe("Name of the entity receiving the relationship"),
          relationship_type: z
            .string()
            .describe("Type of connection between the entities"),
          observations: z
            .array(z.string())
            .describe("List of notes about this relationship"),
        }),
      )
      .describe("Connections between entities identified in this topic"),
    observations: z
      .array(z.string())
      .describe("General notes or insights about this topic"),
  })
  .describe("Representation of a topic in the meeting");
export type MeetingTopicLLM = z.infer<typeof MeetingTopicLLM>;

// Add a timestamp parsing utility function at the outer scope
function parseTimestampToMs(timestampStr: string | null | undefined): number {
  if (!timestampStr) return 0;

  const parts = timestampStr.split(":");
  if (parts.length < 2) return 0;

  // Safely parse timestamp parts
  const hours = Number.parseInt(parts[0] || "0", 10) || 0;
  const minutes = Number.parseInt(parts[1] || "0", 10) || 0;
  const seconds =
    parts.length > 2 ? Number.parseInt(parts[2] || "0", 10) || 0 : 0;

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

function segmentVtt(vttContent: string | null) {
  if (!vttContent) return [];

  const segments: MeetingTopicLLM["transcript"] = [];

  // Simple regex pattern to match VTT cue blocks
  const cuePattern =
    /(\d+)\s*\n(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\s*\n<v\s+([^>]+)>\s*(.*?)(?=\n\n|\n\d+\n|$)/gs;

  // Define match variable with proper type
  let match: RegExpExecArray | null;

  // Execute regex separately from the while condition
  match = cuePattern.exec(vttContent);
  while (match !== null) {
    // Type check each captured group
    // Note: VTT cue numbers are 1-based
    const [
      ,
      cueNumber_ = "0",
      startTime = "",
      endTime = "",
      speaker = "",
      text = "",
    ] = match;
    const cueNumber = Number.parseInt(cueNumber_, 10);

    // Extract just the speaker name, removing any HTML-like tags
    const speakerName = speaker
      ? speaker.replace(/<\/?[^>]+(>|$)/g, "").trim()
      : "Unknown";

    segments.push({
      // Use the original cue number (1-based) if available, otherwise use array position + 1
      index: cueNumber || segments.length + 1,
      start_timestamp: startTime,
      end_timestamp: endTime,
      speaker: speakerName,
      text: text?.trim() ?? "",
    });

    // Get next match
    match = cuePattern.exec(vttContent);
  }

  // Combine consecutive segments from the same speaker
  const combinedSegments: MeetingTopicLLM["transcript"] = [];
  let currentSegment: MeetingTopicLLM["transcript"][number] | null = null;

  for (const segment of segments) {
    if (!currentSegment) {
      currentSegment = { ...segment };
    } else if (currentSegment.speaker === segment.speaker) {
      // Same speaker, combine the text and update end timestamp
      currentSegment.text = `${currentSegment.text} ${segment.text}`;
      currentSegment.end_timestamp = segment.end_timestamp;
    } else {
      // Different speaker, push the current segment and start a new one
      combinedSegments.push(currentSegment);
      currentSegment = { ...segment };
    }
  }

  // Don't forget to push the last segment
  if (currentSegment) {
    combinedSegments.push(currentSegment);
  }

  // Preserve the original combined segments with their 1-based indexes
  return combinedSegments;
}

function getVttSegmentTimestamp(
  segmentIndex: number,
  allSegments: MeetingTopicLLM["transcript"],
) {
  const segment = allSegments.find((s) => s.index === segmentIndex);
  if (!segment) return null;

  return segment.start_timestamp;
}

async function getMeeting(apiVideoId: string) {
  const supabase = createClient();

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select(
      "*, topics:meeting_topics_v2(*, timeline:meeting_topic_events_v2(*), entities:meeting_entities_v2(*, observations:meeting_entity_observations_v2(*)), entity_relationships:meeting_entity_relationships_v2(*, observations:meeting_entity_relationship_observations_v2(*)), observations:meeting_observations_v2(*))",
    )
    .eq("video_api_id", apiVideoId)
    .single();

  if (meetingError) {
    throw new Error(meetingError.message);
  }

  return meeting;
}

// Update the parseMeetingTopicsForLLM function to handle 1-based indexing properly
function parseMeetingTopicsForLLM(
  meeting: Awaited<ReturnType<typeof getMeeting>>,
) {
  // Process the VTT content to get segments
  const allSegments = segmentVtt(meeting.clean_vtt_file);

  return meeting.topics.map((topic) => {
    // Find segments that belong to this topic based on segment IDs (1-based)
    const topicSegments = allSegments.filter(
      (segment) =>
        segment.index >= topic.start_segment_id &&
        segment.index <= topic.end_segment_id,
    );

    return {
      index: topic.index,
      title: topic.title,
      summary: topic.summary,
      transcript: topicSegments,
      meeting: {
        title: meeting.name ?? "Untitled Meeting",
        summary: meeting.summary ?? "No summary available",
      },
      timeline: topic.timeline.map((t) => ({
        timestamp: t.timestamp,
        event: t.event,
      })),
      entities: topic.entities.map((e) => ({
        name: e.name,
        description: e.description,
        type: e.type,
        observations: e.observations.map((o) => o.observation),
      })),
      entity_relationships: topic.entity_relationships.map((r) => ({
        subject_entity_name: r.subject_entity_name,
        object_entity_name: r.object_entity_name,
        relationship_type: r.relationship_type,
        observations: r.observations.map((o) => o.observation),
      })),
      observations: topic.observations.map((o) => o.observation),
    } satisfies MeetingTopicLLM;
  });
}

function createTools(
  meeting: Awaited<ReturnType<typeof getMeeting>>,
  momentType: string,
) {
  const get_topics = tool({
    parameters: z.object({
      topic_indexes: z
        .array(z.number())
        .describe(
          "Array of topic indexes to retrieve. If empty, all topics will be returned.",
        ),
    }),
    description:
      "Retrieves topic segments from a meeting transcript based on an array of topic_indexes, or all topics if no indexes are provided",
    execute: async ({ topic_indexes }) => {
      if (!topic_indexes?.length) {
        return dedent`
          Here are all the topics in the meeting:
          ${JSON.stringify(meeting.topics, null, 2)}
        `;
      }

      const invalidIndexes = topic_indexes.filter(
        (i: number) =>
          !Number.isInteger(i) || i < 0 || i >= meeting.topics.length,
      );
      const validIndexes = topic_indexes.filter(
        (i: number) => !invalidIndexes.includes(i),
      );

      if (invalidIndexes.length) {
        return dedent`
          Invalid topic indexes: ${invalidIndexes.join(", ")}
        `;
      }

      const filteredTopics = meeting.topics.filter((t) =>
        validIndexes.includes(t.index),
      );

      if (filteredTopics.length) {
        return dedent`
          Here are the topics you requested:
          ${JSON.stringify(filteredTopics, null, 2)}
        `;
      }

      return dedent`
        Here are all the topics in the meeting:
        ${JSON.stringify(meeting.topics, null, 2)}
      `;
    },
  });

  const get_meeting_segment = tool({
    parameters: z.object({
      start_index: z
        .number()
        .describe(
          "Starting segment index (1-based) to retrieve from the transcript, or `0` if using timestamps",
        ),
      end_index: z
        .number()
        .describe(
          "Ending segment index (1-based) to retrieve from the transcript, or `0` if using timestamps",
        ),
      start_timestamp: z
        .string()
        .describe(
          "Starting timestamp in format 'HH:MM:SS.mmm' to retrieve segments from, or empty if using indexes",
        ),
      end_timestamp: z
        .string()
        .describe(
          "Ending timestamp in format 'HH:MM:SS.mmm' to retrieve segments to, or empty if using indexes",
        ),
    }),
    description:
      "Retrieves a specific portion of the full meeting transcript based on start_index and end_index parameters, or start_timestamp and end_timestamp parameters",
    execute: async ({
      start_index,
      end_index,
      start_timestamp,
      end_timestamp,
    }) => {
      // Process the VTT content to get segments
      const allSegments = segmentVtt(meeting.clean_vtt_file);

      // If using indexes
      if (start_index !== undefined && end_index !== undefined) {
        // Validate indexes (assuming 1-based indexing from user input)
        if (
          !Number.isInteger(start_index) ||
          !Number.isInteger(end_index) ||
          start_index < 1 ||
          end_index < 1 ||
          start_index > end_index
        ) {
          return dedent`
            Invalid segment indexes. Indexes must be positive integers, and start_index must be less than or equal to end_index.
          `;
        }

        // Get the requested segments by index range (using 1-based indexing)
        const requestedSegments = allSegments.filter(
          (segment) =>
            segment.index >= start_index && segment.index <= end_index,
        );

        if (requestedSegments.length === 0) {
          const maxIndex =
            allSegments.length > 0
              ? Math.max(...allSegments.map((segment) => segment.index))
              : 0;

          return dedent`
            No segments found in the index range ${start_index} to ${end_index}.
            Valid segment indexes range from 1 to ${maxIndex}.
          `;
        }

        // Return in the format matching MeetingTopicLLM.transcript
        return JSON.stringify(requestedSegments, null, 2);
      }

      // If using timestamps
      if (start_timestamp && end_timestamp) {
        const startMs = parseTimestampToMs(start_timestamp);
        const endMs = parseTimestampToMs(end_timestamp);

        if (startMs > endMs) {
          return dedent`
            Start timestamp must be before end timestamp.
          `;
        }

        // Find segments in the specified time range
        const timeRangeSegments = allSegments.filter((segment) => {
          const segmentStartMs = parseTimestampToMs(segment.start_timestamp);
          const segmentEndMs = parseTimestampToMs(segment.end_timestamp);

          // Include segment if it overlaps with the requested time range
          return segmentEndMs >= startMs && segmentStartMs <= endMs;
        });

        if (timeRangeSegments.length === 0) {
          return dedent`
            No segments found in the time range ${start_timestamp} to ${end_timestamp}.
          `;
        }

        // Return in the format matching MeetingTopicLLM.transcript
        return JSON.stringify(timeRangeSegments, null, 2);
      }

      return dedent`
        Invalid parameters. Please provide either (start_index and end_index) or (start_timestamp and end_timestamp).
      `;
    },
  });

  const ask_specialized_coach = tool({
    parameters: z.object({
      question: z
        .string()
        .describe(
          "Your question for the leadership coach about moment identification or analysis",
        ),
    }),
    description:
      "Allows you to ask a question to a specialized coach for clarification on moment identification guidelines or for expert assistance with analysis. You can phrase your question conversationally, as you would when talking to a human coach. The coach is a real person.",
    execute: async ({ question }) => {
      const systemPrompt = dedent`
        You are an expert AI leadership coach specializing in helping founders and executives develop their leadership skills. Your focus is on identifying and analyzing specific types of moments in meetings, which we'll refer to as:

        <moment_type>${momentType}</moment_type>

        Your task is to provide insightful, practical advice to founders and executives about these ${momentType} moments. When addressing questions or scenarios related to these moments, consider the following aspects:

        1. Unique characteristics and indicators of ${momentType} interactions
        2. Impact on team dynamics and organizational outcomes
        3. Best practices for handling ${momentType} situations
        4. Common pitfalls or challenges associated with these moments
        5. Strategies for improving leadership skills specifically related to ${momentType} moments

        When formulating your response, aim to:
        - Provide specific examples of how these moments might manifest in different meeting contexts
        - Offer tailored advice on how to identify, analyze, and learn from these interactions
        - Explain the potential long-term impact of effectively managing these moments on leadership development and organizational success
        - Suggest practical exercises or reflection questions that can help founders improve their skills in this area

        Your responses should be clear, concise, and directly applicable to real-world leadership situations. Always ground your advice in evidence-based practices and provide specific examples relevant to ${momentType} moments.

        Before providing your final response, conduct a thorough analysis inside <leadership_analysis> tags within your thinking block. This analysis should include:
        1. A brief overview of ${momentType} moments and their significance
        2. List and define 3-5 key characteristics of ${momentType} moments
        3. Brainstorm 3-5 specific examples of these moments in different meeting contexts
        4. Outline potential impacts on team dynamics and organizational outcomes
        5. Key considerations for leaders dealing with these moments
        6. Potential strategies or approaches to address the specific question or scenario
        7. Any relevant research or best practices that inform your advice

        After your analysis, provide your response outside of the thinking block. While there's no strict format requirement, consider including the following elements:
        - A direct answer or advice related to the question, focusing on ${momentType} moments
        - Practical strategies or techniques
        - An illustrative example or scenario
        - A reflection question or exercise for the founder to apply the insight

        Remember to keep your response clear, concise, and directly applicable to real-world leadership situations. Your final output should consist only of the response and should not duplicate or rehash any of the work you did in the thinking block.
      `;

      const { text } = await generateText({
        model: openai("o3-mini"),
        system: systemPrompt,
        prompt: question,
        experimental_telemetry: { isEnabled: true },
      });

      return text;
    },
  });

  return {
    get_topics,
    get_meeting_segment,
    ask_specialized_coach,
  };
}

async function generateMomentIdentificationGuidelines(momentType: string) {
  const prompt = dedent`
    You are an expert AI coach specializing in leadership development for high-achieving founders. Your task is to generate comprehensive guidelines for identifying specific moments of <moment_type>${momentType}</moment_type> within meeting transcripts. These guidelines will be used by an AI system to analyze meetings and provide valuable insights for leadership growth.

    Your focus is on a specific leadership behavior or interaction pattern - <moment_type>${momentType}</moment_type>. This represents a distinct type of exchange that occurs during meetings and significantly impacts team dynamics, decision-making processes, and organizational outcomes. Identifying these moments helps founders develop critical leadership skills.

    To create these guidelines, follow this framework:

    1. **Definition**: Provide a clear, concise definition of <moment_type>${momentType}</moment_type> in the context of leadership and meetings.

    2. **Key Characteristics**: List the primary features or indicators that signify a <moment_type>${momentType}</moment_type> moment is occurring.

    3. **Verbal Cues**: Describe specific phrases, questions, or statements that are commonly associated with <moment_type>${momentType}</moment_type>.

    4. **Non-verbal Indicators**: Explain any tone, pace, or other non-verbal aspects of communication that might indicate a <moment_type>${momentType}</moment_type> moment (to the extent these can be inferred from a transcript).

    5. **Participant Roles**: Outline the typical roles of participants involved in a <moment_type>${momentType}</moment_type> interaction (e.g., initiator, receiver, facilitator).

    6. **Context Considerations**: Describe how the surrounding context of the meeting might influence or shape a <moment_type>${momentType}</moment_type> moment.

    7. **Positive Examples**: Provide examples of effective or skillful <moment_type>${momentType}</moment_type> interactions.

    8. **Negative Examples**: Include examples of ineffective or problematic <moment_type>${momentType}</moment_type> interactions.

    9. **Impact Assessment**: Explain how to evaluate the effectiveness and impact of a <moment_type>${momentType}</moment_type> moment on team dynamics and organizational goals.

    10. **Common Pitfalls**: List potential mistakes or misinterpretations to avoid when identifying <moment_type>${momentType}</moment_type> moments.

    When generating these guidelines, consider the following:

    - Be specific and detailed, providing clear criteria for identifying <moment_type>${momentType}</moment_type> moments.
    - Include both obvious and subtle indicators of <moment_type>${momentType}</moment_type>.
    - Consider various scenarios and contexts where <moment_type>${momentType}</moment_type> might occur in meetings.
    - Incorporate best practices and research-based insights on effective <moment_type>${momentType}</moment_type> in leadership.
    - Ensure the guidelines are applicable across different industries and organizational structures.
    - Make the guidelines actionable and easy to apply when analyzing meeting transcripts.

    Present your guidelines in the following format:

    <moment_identification_guidelines moment_type="${momentType}">
    1. Definition:
       [Your content here]

    2. Key Characteristics:
       - [Characteristic 1]
       - [Characteristic 2]
       - [...]

    3. Verbal Cues:
       - [Cue 1]
       - [Cue 2]
       - [...]

    4. Non-verbal Indicators:
       - [Indicator 1]
       - [Indicator 2]
       - [...]

    5. Participant Roles:
       [Your content here]

    6. Context Considerations:
       [Your content here]

    7. Positive Examples:
       - [Example 1]
       - [Example 2]
       - [...]

    8. Negative Examples:
       - [Example 1]
       - [Example 2]
       - [...]

    9. Impact Assessment:
       [Your content here]

    10. Common Pitfalls:
        - [Pitfall 1]
        - [Pitfall 2]
        - [...]
    
    11. Additional Considerations:
        - Feel free to add any other relevant sections or insights that would help in identifying and analyzing this moment type
        - Include any specialized frameworks or methodologies that apply to this specific leadership behavior
        - Consider adding context-specific variations of this moment type
        - ...
    </moment_identification_guidelines>

    Your final output should consist only of the content within the \`moment_identification_guidelines\` tags. Do not include any additional commentary, explanations, or notes outside of these tags.
  `;

  const { text } = await generateText({
    model: openai("o3-mini"),
    prompt,
    experimental_continueSteps: true,
    experimental_telemetry: { isEnabled: true },
  });

  const regex = new RegExp(
    `<moment_identification_guidelines moment_type="${momentType}">(.*?)</moment_identification_guidelines>`,
    "s",
  );
  const match = text.match(regex);

  return match?.[1]?.trim() || text.trim();
}

function getMomentIdentificationPrompt(
  momentType: string,
  topic: MeetingTopicLLM,
  momentIdentificationGuidelines: string,
) {
  const prompt = dedent`
    You are an AI coach specializing in leadership development. Your task is to analyze meeting topics and identify specific moments that contribute to a founder's growth as a leader. This analysis is crucial for highly achieving founders with limited time who use meetings to find unique, valuable learning opportunities.

    Here is the context for your analysis:

    <meeting_topic>
    ${JSON.stringify(topic, null, 2)}
    </meeting_topic>

    Your goal is to identify instances of the following moment type:

    <moment_type>
    ${momentType}
    </moment_type>

    Use these guidelines for moment identification:

    <moment_identification_guidelines>
    ${momentIdentificationGuidelines}
    </moment_identification_guidelines>

    Before you begin your analysis, remember that you have access to the following tools:

    <available_tools>
    1. \`get_topics\` - Retrieves topic segments from a meeting transcript based on an array of \`topic_indexes\`, or all topics if no indexes are provided, giving you flexibility to access either specific segments or a comprehensive overview of the meeting structure.
    2. \`get_meeting_segment\` - Fetches a specific portion of the full meeting transcript based on \`start_index\` and \`end_index\` parameters (to retrieve segments by their position in the transcript) OR \`start_timestamp\` and \`end_timestamp\` parameters (to retrieve segments by their time position in the meeting).
    3. \`ask_specialized_coach\` - Allows you to ask a \`question\` to a specialized coach for clarification on moment identification guidelines or for expert assistance with analysis. You can phrase your question conversationally, as you would when talking to a human coach. The coach is a real person.
    </available_tools>

    Now, please follow these steps to conduct your analysis:

    1. Review the content of the previous topic, current meeting topic, and next topic to understand the full context.
    2. Identify all interactions that align with the <moment_type>${momentType}</moment_type> guidelines, including both exemplary and suboptimal examples.
    3. For each identified interaction, evaluate:
      - Effectiveness: Was this executed with skill and professionalism?
      - Reception: How was this received by other participants?
      - Learning Potential: What specific leadership insights could be derived?
      - Strategic Relevance: How does this impact organizational objectives?
    4. Document both exemplary practices and improvement opportunities.
    5. Consider the founder's perspective, prioritizing moments with significant leadership development implications.
    6. Note the precise location within the meeting transcript for future reference.

    Before providing your final report, work through your thought process inside <thought_process> tags in your thinking block:

    1. List key points from each topic (previous, current, next) to ensure comprehensive context understanding.
    2. For each guideline in the moment identification guidelines, write down specific things to look for in the meeting content.
    3. Plan out which tools you might need to use and why.
    4. Identify and analyze potential moments based on the guidelines and your observations.

    It's OK for this section to be quite long.

    After completing your analysis, present your findings in the following Markdown report format:

    \`\`\`markdown
    # Moment Analysis: ${momentType}

    ## Identified Moments

    ### Moment 1: [Descriptive Title]

    - **Type**: [Specific subcategory if applicable]
    - **Quality**: [Exemplary/Needs Improvement]
    - **Location**: [Specific part of the transcript, e.g., "2nd paragraph" or "Speaker A's 3rd response"]
    - **Description**: [Concise description of the interaction]
    - **Effectiveness Assessment**: [Professional evaluation of execution]
    - **Leadership Insight**: [Specific takeaway for founder development]
    - **Strategic Relevance**: [Connection to organizational objectives]

    ### Moment 2: [Descriptive Title]

    [Follow same structure]

    ## Summary Recommendations

    [Brief synthesis of key patterns and priority development areas]
    \`\`\`

    If no relevant moments are identified, provide a clear explanation of why the topic content did not contain interactions matching the <moment_type>${momentType}</moment_type> criteria, along with suggestions for what to look for in future meetings.

    Your final output should consist only of the markdown report as described above. Do not include any additional commentary, explanations, or notes outside of this report format, and do not duplicate or rehash any of the work you did in the thinking block.
  `;

  return prompt;
}

async function main(
  payload: MomentIdentificationTaskInput,
  parentSpan?: LangfuseSpanClient,
) {
  const trace =
    parentSpan?.span({
      name: `process_meeting_${payload.apiVideoId}_${payload.momentType}`,
      metadata: {
        apiVideoId: payload.apiVideoId,
        momentType: payload.momentType,
      },
    }) ||
    langfuse.span({
      name: `process_meeting_${payload.apiVideoId}_${payload.momentType}`,
      metadata: {
        apiVideoId: payload.apiVideoId,
        momentType: payload.momentType,
      },
    });

  try {
    const outputDir = path.join(process.cwd(), "data", "moments");
    const filename = path.join(
      outputDir,
      `${payload.apiVideoId}_${payload.momentType}_moments.json`,
    );

    const guidelinesSpan = trace.span({ name: "fetch_guidelines_and_meeting" });
    const [momentIdentificationGuidelines, meeting] = await Promise.all([
      generateMomentIdentificationGuidelines(payload.momentType),
      getMeeting(payload.apiVideoId),
    ]);
    guidelinesSpan.end();

    const parseTopicsSpan = trace.span({ name: "parse_meeting_topics" });
    const meetingTopics = parseMeetingTopicsForLLM(meeting);
    parseTopicsSpan.end();

    const tools = createTools(meeting, payload.momentType);

    const conversationHistory: CoreMessage[] = [
      {
        role: "system",
        content: dedent`
          You are an AI coach responsible for identifying specific moments within a meeting, taking into account the context of one specific topic segment at a time. This analysis is essential for a highly achieving founder with limited time, who uses meetings to find unique, valuable moments that contribute to their growth as a leader.

            First, review these important definitions:

            <definitions>
            1. Meeting Topic:
              The founder uses AI to transform meeting recordings into structured, topic-based segments. First, recordings are transcribed to VTT format. Then, an AI assistant analyzes the transcript to identify topic boundaries through semantic analysis and conversation dynamics. The AI generates a JSON output with segments containing titles, timestamps, summaries, and key event timelines. This approach makes lengthy meetings easily navigable by subject matter.
              In the messages that follow, you will be provided with one of those topics at a time, along with the one preceding it (if available) and the one following it (if available). You can also use the \`get_topics\` tool to retrieve topics or the \`get_meeting_segment\` tool to get a portion of the full meeting transcript as needed.

            2. Moment:
              A "moment" in meeting analysis refers to a significant sequence of interactions within a conversation that exemplifies a specific type of organizational behavior or communication pattern. Each moment is a bounded, non-overlapping sequence of VTT segments that share thematic coherence around a particular activity type, such as Feedback, Decision Making, Team Conflict, Accountability, Communication, and Delegation. Moments are evidence-based, containing clear behavioral indicators and sufficient context to understand the complete interaction. Each detected moment includes segment boundaries (start/end IDs), a concise descriptive title, and a summary explaining why it qualifies as the specified activity type. These moments provide valuable insights into team dynamics and organizational effectiveness.
              You will be provided with comprehension guidelines crafted by a highly esteemed coach who specializes in working with highly achieving founders. These guidelines will focus on helping you identify specific instances of a particular type of moment within meeting transcripts. You can use the \`ask_specialized_coach\` tool if you have questions or need further clarification for expert assistance.
            </definitions>

            To assist you in your analysis, you have access to the following tools:

            <available_tools>
            1. \`get_topics\` - Retrieves topic segments from a meeting transcript based on an array of \`topic_indexes\`, or all topics if no indexes are provided, giving you flexibility to access either specific segments or a comprehensive overview of the meeting structure.
            2. \`get_meeting_segment\` - Fetches a specific portion of the full meeting transcript based on \`start_index\` and \`end_index\` parameters (to retrieve segments by their position in the transcript) OR \`start_timestamp\` and \`end_timestamp\` parameters (to retrieve segments by their time position in the meeting).
            3. \`ask_specialized_coach\` - Allows you to ask a \`question\` to a specialized coach for clarification on moment identification guidelines or for expert assistance with analysis. You can phrase your question conversationally, as you would when talking to a human coach. The coach is a real person.
            </available_tools>

            Now, familiarize yourself with the schema for meeting topics:

            <meeting_topic_schema>
            ${JSON.stringify(zodToJsonSchema(MeetingTopicLLM), null, 2)}
            </meeting_topic_schema>

            Next, carefully study these guidelines for identifying <moment_type>${payload.momentType}</moment_type> moments within meeting transcripts:

            <moment_identification_guidelines moment_type="${payload.momentType}">
            ${momentIdentificationGuidelines}
            </moment_identification_guidelines>

            As a professional coach working with high-performing founders, your task is to analyze meeting topics and identify ALL instances of <moment_type>${payload.momentType}</moment_type> moments - both exemplary and suboptimal examples. These moments represent valuable learning opportunities for leadership development.

            ## Analytical Framework

            Follow this structured approach to identify and evaluate moments:

            1. Conduct a comprehensive review of the meeting topic content, including context, participants, and discussion flow
            2. Identify all interactions that align with the <moment_type>${payload.momentType}</moment_type> guidelines
            3. For each identified interaction, evaluate:
              - **Effectiveness**: Was this executed with skill and professionalism?
              - **Reception**: How was this received by other participants?
              - **Learning Potential**: What specific leadership insights could be derived?
              - **Strategic Relevance**: How does this impact organizational objectives?
              - ...
            4. Document both exemplary practices and improvement opportunities
            5. Consider the founder's perspective - prioritize moments with significant leadership development implications
            6. Note the precise location within the meeting transcript for future reference

            ## Reasoning Process

            During your analysis, employ this systematic reasoning approach:

            1. **Contextual Understanding**: Map the conversation flow and participant dynamics
              - Who are the key stakeholders?
              - What are their apparent objectives?
              - What organizational context surrounds this interaction?Ï
            2. **Pattern Recognition**: Identify interaction patterns that match <moment_type>${payload.momentType}</moment_type> criteria
              - Consider creating a mental model of the interaction flow:
              \`\`\`
              graph TD
                A[Initial Trigger] --> B[Response]
                B --> C[Subsequent Interaction]
                C --> D[Resolution/Outcome]
              \`\`\`
            3. **Qualitative Assessment**: Evaluate the effectiveness of each interaction
              - Compare against best practices
              - Consider alternative approaches
              - Identify specific strengths and improvement areas
            4. **Leadership Implications**: Determine actionable insights for founder development
              - Connect to broader leadership competencies
              - Identify patterns across multiple interactions
              - Prioritize based on strategic impact
            5. **Tool Use**: Determine which tools to use and in what sequence
              - Start with available topic information
              - Use \`get_topics\` if you need a broader context of the meeting
              - Use \`get_meeting_segment\` to dive deeper into specific parts of the transcript
              - Use \`ask_specialized_coach\` when you need expert guidance on moment identification or analysis

            After completing your analysis, present your findings in this markdown report format:

            # Moment Analysis: ${payload.momentType}

            ## Identified Moments

            ### Moment 1: [Descriptive Title]

            - **Type**: [Specific subcategory]
            - **Quality**: [Exemplary/Needs Improvement]
            - **Location**: Segments [X-Y]
            - **Description**: [Concise description of the interaction]
            - **Effectiveness Assessment**: [Professional evaluation of execution]
            - **Leadership Insight**: [Specific takeaway for founder development]
            - **Strategic Relevance**: [Connection to organizational objectives]

            ### Moment 2: [Descriptive Title]

            [Follow same structure]

            ## Summary Recommendations

            [Brief synthesis of key patterns and priority development areas]

            If no relevant moments are identified, provide a clear explanation of why the topic content did not contain interactions matching the <moment_type>${payload.momentType}</moment_type> criteria, along with suggestions for what to look for in future meetings.
          `,
      },
    ];

    let totalMomentsFound = 0;
    const processTopicsSpan = trace.span({ name: "process_topics" });

    try {
      for (const topic of meetingTopics) {
        const topicSpan = processTopicsSpan.span({
          name: "process_topic",
          metadata: {
            topicTitle: topic.title,
            topicIndex: topic.index,
          },
        });

        try {
          const topicPrompt = getMomentIdentificationPrompt(
            payload.momentType,
            topic,
            momentIdentificationGuidelines,
          );

          conversationHistory.push({
            role: "user",
            content: topicPrompt,
          });

          // Generate topic report with Langfuse observation
          const generateReportSpan = topicSpan.span({
            name: "generate_topic_report",
          });
          let topicReport: { text: string };

          try {
            topicReport = await generateText({
              model: openai("o3-mini"),
              messages: conversationHistory,
              tools,
              experimental_continueSteps: true,
              experimental_telemetry: { isEnabled: true },
            });

            // Log the generation as an observation in Langfuse
            generateReportSpan.generation({
              input: JSON.stringify(conversationHistory),
              output: topicReport.text,
              metadata: {
                model: "o3-mini",
                topicTitle: topic.title,
                momentType: payload.momentType,
              },
            });
          } finally {
            generateReportSpan.end();
          }

          conversationHistory.push({
            role: "assistant",
            content: topicReport.text,
          });

          // Extract moments with Langfuse observation
          const extractMomentsSpan = topicSpan.span({
            name: "extract_moments",
          });
          let extractResult: { object: { moments: MomentLLM[] } };

          try {
            extractResult = await generateObject({
              model: openai("o3-mini"),
              prompt: dedent`
                You will be given a report of moments identified in a meeting topic. Your job is to extract the moments from the report and return them in a structured format.

                Here is the report:

                <report>
                ${topicReport.text}
                </report>

                Here is the schema for the moments:

                <moment_schema>
                ${JSON.stringify(zodToJsonSchema(MomentLLM), null, 2)}
                </moment_schema>
              `,
              schema: z
                .object({
                  moments: z
                    .array(MomentLLM)
                    .describe("List of moments identified in the report"),
                })
                .describe("Object containing the moments"),
              experimental_telemetry: { isEnabled: true },
            });

            // Log the extraction as an observation in Langfuse
            extractMomentsSpan.generation({
              input: topicReport.text,
              output: JSON.stringify(extractResult.object),
              metadata: {
                model: "o3-mini",
                topicTitle: topic.title,
                momentType: payload.momentType,
              },
            });
          } finally {
            extractMomentsSpan.end();
          }

          const { object } = extractResult;

          // Save the identified moments from this topic
          if (object.moments && object.moments.length > 0) {
            totalMomentsFound += object.moments.length;
            console.log(
              `Found ${object.moments.length} moments in topic "${topic.title}"`,
            );

            // Store the moments with their topic context
            const momentsWithContext = object.moments.map((moment) => {
              const transcript_start_timestamp = getVttSegmentTimestamp(
                moment.transcript_start_index,
                topic.transcript,
              );
              const transcript_end_timestamp = getVttSegmentTimestamp(
                moment.transcript_end_index,
                topic.transcript,
              );
              const transcript_start_timestamp_in_seconds =
                parseTimestampToMs(transcript_start_timestamp) / 1000;
              const transcript_end_timestamp_in_seconds =
                parseTimestampToMs(transcript_end_timestamp) / 1000;
              const moment_url = `https://app.withtitan.com/videos/${payload.apiVideoId}?startAt=${transcript_start_timestamp_in_seconds}`;

              return {
                title: moment.title,
                summary: moment.summary,
                transcript_start_index: moment.transcript_start_index,
                transcript_end_index: moment.transcript_end_index,
                transcript_start_timestamp,
                transcript_end_timestamp,
                transcript_start_timestamp_in_seconds,
                transcript_end_timestamp_in_seconds,
                moment_url,
                observations: moment.observations.join(" | "),
                topicIndex: topic.index,
                topicTitle: topic.title,
                apiVideoId: payload.apiVideoId,
                momentType: payload.momentType,
              };
            });

            const saveMomentsSpan = topicSpan.span({ name: "save_moments" });
            try {
              // Create the directory if it doesn't exist
              if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
              }

              // Read existing file if it exists, or initialize with empty array
              let allMoments = [];
              if (fs.existsSync(filename)) {
                const fileContent = fs.readFileSync(filename, "utf8");
                allMoments = JSON.parse(fileContent);
              }

              // Add new moments to the array
              allMoments.push(...momentsWithContext);

              // Write the updated array back to the file
              fs.writeFileSync(filename, JSON.stringify(allMoments, null, 2));

              console.log(`Updated moments in ${filename}`);

              saveMomentsSpan.event({
                name: "moments_saved",
                input: null,
                output: null,
                metadata: {
                  count: momentsWithContext.length,
                  filename,
                },
              });
            } catch (error) {
              saveMomentsSpan.event({
                name: "moments_save_error",
                input: null,
                output: null,
                metadata: {
                  error: (error as Error).message,
                },
              });
              console.error("Error saving moments to file:", error);
            } finally {
              saveMomentsSpan.end();
            }
          } else {
            console.log(`No moments found in topic "${topic.title}"`);
            topicSpan.event({
              name: "no_moments_found",
              input: null,
              output: null,
              metadata: {
                topicTitle: topic.title,
              },
            });
          }
        } finally {
          topicSpan.end();
        }
      }
    } finally {
      processTopicsSpan.end();

      // Log summary statistics
      trace.event({
        name: "processing_complete",
        input: null,
        output: null,
        metadata: {
          totalTopics: meetingTopics.length,
          totalMomentsFound,
          apiVideoId: payload.apiVideoId,
          momentType: payload.momentType,
        },
      });
    }
  } finally {
    trace.end();
  }
}

const luciaMeetings = [
  { video_api_id: "vi6F32A9iAOppzJIZq9U5QE2" },
  { video_api_id: "vi4PpMAWhPqUHnkn83qH23DF" },
  { video_api_id: "vi2GBL2QCl0wU9mOJAGFXTHb" },
  { video_api_id: "vi7aB3l1lpGAGimiPShtEzJU" },
  { video_api_id: "vi2BMtvcf58M4AoM8PCd4PDr" },
  { video_api_id: "vihjQAZjkQJsgcij3Wjv67w" },
  { video_api_id: "vi7B3koU1UnKaRVUeHN3DF86" },
  { video_api_id: "vi5pYEF7kPzKXXgmsH58uRjC" },
  { video_api_id: "vi65dDciHgn65C7yRY8dxDct" },
  { video_api_id: "vi2KrmNG6sjyGTuR8qEvNTWK" },
  { video_api_id: "vi28OFDTgLQ3QqSm4olCepXn" },
  { video_api_id: "vi1EMTsLztiI88s2UHedlBAL" },
  { video_api_id: "vi2hohdL8xg7P6AtjDBVpiUs" },
  { video_api_id: "vi3NGqjYrpNYn6PDWvIg4vUz" },
  { video_api_id: "vi6z4ugKwgJJomcsfTeLtgqK" },
  { video_api_id: "vi1IeGO5sAr8uCzIZiTKlCR6" },
  { video_api_id: "vi1SWQZunNpWXZHKNDfO4TrF" },
];

const momentTypes = [
  "Feedback",
  "Decision Making",
  "Team Conflict",
  "Accountability",
  "Communication",
];

(async () => {
  const rootTrace = langfuse.trace({
    name: "moment-identification-batch",
    metadata: {
      meetingCount: luciaMeetings.length,
      momentTypeCount: momentTypes.length,
    },
  });

  for (const { video_api_id: apiVideoId } of luciaMeetings) {
    const meetingSpan = rootTrace.span({
      name: `Meeting_${apiVideoId}`,
      metadata: {
        apiVideoId,
      },
    });

    try {
      for (const momentType of momentTypes) {
        await main({ apiVideoId, momentType }, meetingSpan);
      }
    } finally {
      meetingSpan.end();
    }
  }

  await langfuse.flushAsync();
  await sdk.shutdown();
})();
