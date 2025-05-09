import { TRPCError } from "@trpc/server";
import { generateObject } from "ai";
import { dedent } from "ts-dedent";
import { z } from "zod";

import { four_oh_mini } from "~/lib/ai/models/openai";
import { getAllRelevantMeetingDataQuery } from "~/lib/meetings/queries";
import { transformJsonIntoXml } from "~/lib/suggested-topics/utils";
import { createClient } from "~/lib/supabase/server";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const aiRouter = createTRPCRouter({
  getMeetingConversationSuggestions: publicProcedure
    .input(z.object({ apiVideoId: z.string() }))
    .query(async ({ input }) => {
      const supabase = await createClient();

      const query = getAllRelevantMeetingDataQuery(input.apiVideoId, supabase);

      const { data: meeting, error: meetingError } = await query.single();

      if (meetingError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: meetingError.message,
          cause: meetingError,
        });
      }

      const {
        object: { suggestions },
      } = await generateObject({
        model: four_oh_mini,
        schemaName: "MeetingConversationSuggestions",
        schemaDescription:
          "A structured response containing an array of short, contextually relevant conversation starters derived from meeting content.",
        schema: z.object({
          suggestions: z.array(
            z
              .string()
              .describe(
                "A brief, specific conversation starter that directly references meeting content",
              ),
          ),
        }),
        prompt: dedent`
          You are an expert meeting assistant AI designed to help users engage effectively with meeting content. Your task is to generate three very short, diverse, and specific conversation starters based on the provided meeting data.

          First, carefully review the following meeting data:

          ${transformJsonIntoXml(meeting, "meeting_data")}

          Now, follow these steps to generate high-quality conversation starters:

          1. Analyze the meeting data and identify key elements such as:
            - Main topics discussed
            - Important decisions made
            - Action items assigned
            - Significant challenges or opportunities mentioned
            - Notable participant contributions

          2. Generate diverse conversation starters that address different aspects of the meeting. Each starter should:
            - Be extremely concise (5-10 words maximum)
            - Be specific to the meeting content, not generic
            - Focus on key decisions, action items, or main topics
            - Use simple, direct language
            - Preferably use phrases rather than complete sentences

          3. Ensure that your conversation starters are engaging and likely to stimulate productive discussions among meeting participants.

          Before providing your final output, wrap your thought process in <analysis> tags. Follow these steps:

          a. List the key elements identified from the meeting data
          b. Generate 5-6 potential conversation starters
          c. Evaluate each starter against the criteria (rate on a scale of 1-5 for conciseness, specificity, relevance, simplicity, and engagement)
          d. Select the best three starters based on your evaluation

          After your analysis, provide exactly three very short conversation starters as an array of strings. Use this format:

          [
            "First conversation starter (5-10 words)",
            "Second conversation starter (5-10 words)",
            "Third conversation starter (5-10 words)"
          ]

          Ensure that each conversation starter is unique, specific to the meeting content, and adheres to the 5-10 word limit.
        `,
      });

      return suggestions;
    }),
});
