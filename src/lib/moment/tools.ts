import { cosineSimilarity, embed, generateText, tool } from "ai";
import _ from "lodash";
import { dedent } from "ts-dedent";
import { z } from "zod";
import { o3_mini_high, text_embedding_3_small } from "../ai/models/openai";
import { formatVttSegment, type getMeeting } from "../meeting/data";
import type { LLMNote } from "./models";
import { parseTimestampToMs, segmentVtt } from "./vtt-utils";
import type { LangfuseTraceClient } from "langfuse";

export const ToolsetId = z.enum(["moment_identification", "learning"]);
export type ToolsetId = z.infer<typeof ToolsetId>;

/**
 * Create AI tools for moment identification
 */
export function createMomentIdentificationTools(
  meeting: Awaited<ReturnType<typeof getMeeting>>,
  momentType: string,
  trace?: LangfuseTraceClient,
) {
  /**
   * Tool to retrieve meeting topics
   */
  const get_topics = tool({
    parameters: z.object({
      topic_indexes: z
        .array(z.number())
        .describe(
          "Array of topic indexes to retrieve. If empty, all topics will be returned.",
        ),
    }),
    description:
      "Retrieves topic segments from a meeting transcript based on an array of topic_indexes, or all topics if no indexes are provided, giving you flexibility to access either specific segments or a comprehensive overview of the meeting structure.",
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

  /**
   * Tool to retrieve specific segments of the meeting transcript
   */
  const get_meeting_segment = tool({
    parameters: z.object({
      start_index: z
        .number()
        .describe(
          "Starting segment index (1-based) to retrieve from the transcript, or `0` if using timestamps.",
        ),
      end_index: z
        .number()
        .describe(
          "Ending segment index (1-based) to retrieve from the transcript, or `0` if using timestamps.",
        ),
      start_timestamp: z
        .string()
        .describe(
          "Starting timestamp in format 'HH:MM:SS.mmm' to retrieve segments from, or empty if using indexes.",
        ),
      end_timestamp: z
        .string()
        .describe(
          "Ending timestamp in format 'HH:MM:SS.mmm' to retrieve segments to, or empty if using indexes.",
        ),
    }),
    description:
      "Fetches a specific portion of the full meeting transcript based on `start_index` and `end_index` parameters (to retrieve segments by their position in the transcript) OR `start_timestamp` and `end_timestamp` parameters (to retrieve segments by their time position in the meeting).",
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
            Invalid segment indexes. Indexes must be positive integers, and \`start_index\` must be less than or equal to \`end_index\`.
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
        return dedent`
          Here are the segments you requested:
          ${requestedSegments.map(formatVttSegment).join("\n")}
        `;
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
            Valid timestamps range from ${allSegments[0]?.start_timestamp} to ${allSegments[allSegments.length - 1]?.end_timestamp}.
          `;
        }

        // Return in the format matching MeetingTopicLLM.transcript
        return dedent`
          Here are the segments you requested:
          ${timeRangeSegments.map(formatVttSegment).join("\n")}
        `;
      }

      return dedent`
        Invalid parameters. Please provide either (start_index and end_index) or (start_timestamp and end_timestamp).
      `;
    },
  });

  /**
   * Tool to ask a specialized coach for guidance
   */
  const ask_specialized_coach = tool({
    parameters: z.object({
      question: z
        .string()
        .describe(
          "Your question for the leadership coach about moment identification or analysis.",
        ),
    }),
    description:
      "Allows you to ask a `question` to a specialized coach for clarification on moment identification guidelines or for expert assistance with analysis. You can phrase your question conversationally, as you would when talking to a human coach. The coach is a real person.",
    execute: async ({ question }) => {
      const systemPrompt = dedent`
        You are an expert AI leadership coach specializing in helping founders and executives develop their leadership skills. Your focus is on identifying and analyzing specific types of moments in meetings, which we'll refer to as:

        <moment_type>${momentType}</moment_type>

        Your task is to provide insightful, practical advice to founders and executives about these \`${momentType}\` moments. When addressing questions or scenarios related to these moments, consider the following aspects:

        1. Unique characteristics and indicators of \`${momentType}\` interactions
        2. Impact on team dynamics and organizational outcomes
        3. Best practices for handling \`${momentType}\` situations
        4. Common pitfalls or challenges associated with these moments
        5. Strategies for improving leadership skills specifically related to \`${momentType}\` moments

        When formulating your response, aim to:
        - Provide specific examples of how these moments might manifest in different meeting contexts
        - Offer tailored advice on how to identify, analyze, and learn from these interactions
        - Explain the potential long-term impact of effectively managing these moments on leadership development and organizational success
        - Suggest practical exercises or reflection questions that can help founders improve their skills in this area

        Your responses should be clear, concise, and directly applicable to real-world leadership situations. Always ground your advice in evidence-based practices and provide specific examples relevant to \`${momentType}\` moments.

        Before providing your final response, conduct a thorough analysis inside <leadership_analysis> tags within your thinking block. This analysis should include:
        1. A brief overview of \`${momentType}\` moments and their significance
        2. List and define 3-5 key characteristics of \`${momentType}\` moments
        3. Brainstorm 3-5 specific examples of these moments in different meeting contexts
        4. Outline potential impacts on team dynamics and organizational outcomes
        5. Key considerations for leaders dealing with these moments
        6. Potential strategies or approaches to address the specific question or scenario
        7. Any relevant research or best practices that inform your advice

        After your analysis, provide your response outside of the thinking block. While there's no strict format requirement, consider including the following elements:
        - A direct answer or advice related to the question, focusing on \`${momentType}\` moments
        - Practical strategies or techniques
        - An illustrative example or scenario
        - A reflection question or exercise for the founder to apply the insight

        Remember to keep your response clear, concise, and directly applicable to real-world leadership situations. Your final output should consist only of the response and should not duplicate or rehash any of the work you did in the thinking block.
      `;

      const { text } = await generateText({
        model: o3_mini_high,
        system: systemPrompt,
        prompt: question,
        experimental_telemetry: {
          isEnabled: true,
          functionId: "ask_specialized_coach",
          metadata: trace && {
            langfuseTraceId: trace.id,
            langfuseUpdateParent: false,
          },
        },
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

export type MomentIdentificationTools = ReturnType<
  typeof createMomentIdentificationTools
>;

export function createLearningTools(
  notes: LLMNote[],
  trace?: LangfuseTraceClient,
) {
  function formatNote(note: Pick<LLMNote, "note" | "metadata">) {
    return `- ${note.note}${note.metadata && Object.keys(note.metadata).length ? `\n  Metadata: ${JSON.stringify(note.metadata)}` : ""}`;
  }

  const create_note = tool({
    parameters: z.object({
      content: z.string().describe("The content of the note."),
      metadata: z.object({}).describe("Optional metadata about the note."),
    }),
    description: "Creates a note.",
    execute: async ({ content, metadata }) => {
      const { embedding } = await embed({
        model: text_embedding_3_small,
        value: content,
        experimental_telemetry: {
          isEnabled: true,
          functionId: "create_note/embed",
          metadata: trace && {
            langfuseTraceId: trace.id,
            langfuseUpdateParent: false,
          },
        },
      });

      const note = {
        note: content,
        embedding,
        metadata,
      } satisfies LLMNote;

      notes.push(note);

      return dedent`
        Note created successfully:
        ${note.note}
      `;
    },
  });

  const get_notes = tool({
    parameters: z.object({}),
    description: "Retrieves all notes.",
    execute: async () => {
      return dedent`
        Here are your notes:
        ${notes.map(formatNote).join("\n")}
      `;
    },
  });

  const search_notes = tool({
    parameters: z.object({
      query: z.string().describe("The query to search for."),
      max_results: z
        .number()
        .describe("The maximum number of results to return."),
    }),
    description: "Searches for notes.",
    execute: async ({ query, max_results = 5 }) => {
      const { embedding } = await embed({
        model: text_embedding_3_small,
        value: query,
        experimental_telemetry: {
          isEnabled: true,
          functionId: "search_notes/embed",
          metadata: trace && {
            langfuseTraceId: trace.id,
            langfuseUpdateParent: false,
          },
        },
      });

      const results = _.orderBy(
        notes.map((n) => ({
          note: n.note,
          metadata: n.metadata,
          similarity: cosineSimilarity(embedding, n.embedding),
        })),
        [(n) => n.similarity],
        ["desc"],
      ).slice(0, max_results);

      return dedent`
        Here are the results of the search:
        ${results.map(formatNote).join("\n")}
      `;
    },
  });

  return {
    create_note,
    get_notes,
    search_notes,
  };
}

export type LearningTools = ReturnType<typeof createLearningTools>;
