import { TRPCError } from "@trpc/server";
import { generateObject } from "ai";
import { dedent } from "ts-dedent";
import { z } from "zod";

import { four_oh_mini } from "~/lib/ai/models/openai";
import { getSystemDefinitions } from "~/lib/ai/prompts/system-definitions";
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

      const systemDefinitions = getSystemDefinitions();

      const {
        object: { suggestions },
      } = await generateObject({
        model: four_point_one_nano,
        schemaName: "MeetingConversationSuggestions",
        schemaDescription:
          "A structured response containing an array of coaching-focused conversation starters derived from meeting content.",
        schema: z.object({
          suggestions: z.array(
            z
              .string()
              .describe(
                "A brief, specific coaching-focused question that connects meeting content to leadership development",
              ),
          ),
        }),
        prompt: dedent`
          You are Titan, an AI-powered coaching enhancement system that helps coaches develop founders' leadership skills. Your task is to generate three concise, coaching-focused questions based on the provided meeting data.

          First, understand the Titan system and its coaching approach:
          ${systemDefinitions}

          Now, carefully review the following meeting data:
          ${transformJsonIntoXml(meeting, "meeting_data")}

          Here is the founder's profile:
          ${transformJsonIntoXml(
            { name: meeting.profile.nickname ?? "Founder" },
            "profile",
          )}

          Follow these steps to generate high-quality coaching questions:

          1. Analyze the meeting data to identify:
             - Leadership behaviors that connect to Skills, Goals, or Signals
             - Potential Moments that demonstrate coaching themes
             - Opportunities for leadership development
             - Patterns that could inform Skill Reports or Suggested Topics

          2. Generate coaching questions that:
             - Connect specific meeting behaviors to leadership development
             - Focus on one of the key Skills areas (Communication, Feedback, Decision Making, etc.)
             - Are concise (7-12 words maximum)
             - Prompt reflection on specific behaviors observed in the meeting
             - Could lead to actionable insights for the founder's growth
             - IMPORTANT: Use the first person to address the founder

          3. Ensure questions follow the data-driven coaching approach of Titan, using real meeting evidence.

          Before providing your final output, analyze your thought process:
          a. Identify 2-3 key leadership behaviors or patterns from the meeting
          b. Connect each to relevant Skills, Goals, or coaching themes
          c. Draft 5-6 potential coaching questions
          d. Select the three that best connect specific meeting behaviors to leadership development

          Provide exactly three coaching-focused questions as an array of strings:
          [
            "First coaching question about specific behavior (7-12 words)",
            "Second coaching question about different skill area (7-12 words)",
            "Third coaching question about growth opportunity (7-12 words)"
          ]

          Each question should be specific to the meeting content, leadership-focused, and designed to promote reflection and growth.
        `,
        experimental_telemetry: {
          isEnabled: true,
        },
      });

      return suggestions;
    }),
});
