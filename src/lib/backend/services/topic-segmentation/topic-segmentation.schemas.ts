import { z } from "zod";

export const TopicSegment = z
  .object({
    title: z.string().describe("The title of the topic segment."),
    start_segment_id: z
      .number()
      .describe("The starting VTT segment ID of the topic segment."),
    end_segment_id: z
      .number()
      .describe("The ending VTT segment ID of the topic segment."),
    detailed_summary: z
      .string()
      .describe("A detailed summary of the topic segment."),
    timeline: z
      .array(
        z
          .object({
            timestamp: z.string().describe("The timestamp of the event."),
            event: z
              .string()
              .describe("Detailed description of the event that occurred."),
          })
          .describe("An event in the timeline."),
      )
      .describe("List of timeline events within the topic segment."),
  })
  .describe("A topic segment of the analyzed content.");
export type TopicSegment = z.infer<typeof TopicSegment>;
