import { openai } from "@ai-sdk/openai";
import { TRPCError } from "@trpc/server";
import { generateObject } from "ai";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import _ from "lodash";
import dedent from "ts-dedent";
import { z } from "zod";

import { client } from "~/lib/api/client";
import {
  GoalContextQuestionsGenerationOutput,
  GoalSignalsGenerationOutput,
} from "~/lib/goals/schemas";
import { createClient } from "~/lib/supabase/server";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const goalsRouter = createTRPCRouter({
  getGoals: publicProcedure
    .input(
      z
        .object({
          user_id: z.string().optional(),
        })
        .default({}),
    )
    .query(async ({ input }) => {
      if (!input.user_id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User ID is required",
        });
      }

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("goals")
        .select(
          "*, signals:goal_signals(*), report_goals(*, report:reports!inner(*))",
        )
        .eq("profile_id", input.user_id)
        .eq("is_current", true)
        .is("deleted_at", null)
        .order("completed_at", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: false });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const finalData = data.map((goal) => ({
        ...goal,
        reports: _.orderBy(
          _.map(goal.report_goals, (gr) => gr.report),
          [(r) => dayjs(r.created_at)],
          ["desc"],
        ),
      }));

      const reportIds = finalData.flatMap((goal) =>
        goal.reports.map((r) => r.id),
      );

      const {
        data: reportProcessingStatuses,
        error: reportProcessingStatusesError,
      } = await supabase
        .from("report_processing_status")
        .select("*")
        .in("report_id", reportIds);

      if (reportProcessingStatusesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: reportProcessingStatusesError.message,
          cause: reportProcessingStatusesError,
        });
      }

      return finalData.map((goal) => ({
        ...goal,
        reportProcessingStatus: reportProcessingStatuses.find(
          (r) => r.report_id === goal.reports[0]?.id,
        ),
      }));
    }),

  generateGoalSignals: publicProcedure
    .input(z.object({ goal_text: z.string() }))
    .mutation(async ({ input }) => {
      const prompt = dedent`
        Given the following goal:

        <goal>
        ${input.goal_text}
        </goal>

        And the following definition of "signal":

        <signal_definition>
        A signal is a specific, observable behavior or interaction that occurs during meetings that indicates either:
        1. Progress toward the client's goal (positive signal)
        2. A challenge or setback related to the goal (negative signal)

        Signals are composed of:
        - \`text\`: A clear, observable behavior or interaction
        - \`direction\`: "positive" for progress indicators or "negative" for areas needing improvement
        </signal_definition>

        <examples>
          <example>
            <goal>
              I want to be less of an asshole.
            </goal>
            <signals>
              [
                {
                  "text": "I interrupt or talk over others during discussions",
                  "direction": "negative"
                },
                {
                  "text": "I actively listen and acknowledge team members' contributions",
                  "direction": "positive"
                }
              ]
            </signals>
          </example>
        </examples>

        TASK: [
          "Generate 3 specific, observable signals that indicate progress or challenges toward the goal.",
          "Each signal should be something that can be clearly identified during a meeting.",
          "Signals should focus on concrete behaviors rather than subjective interpretations.",
        ]
      `;

      const result = await generateObject({
        model: openai("gpt-4o-2024-08-06"),
        schema: GoalSignalsGenerationOutput,
        schemaName: "GoalSignals",
        schemaDescription:
          "Observable behavioral patterns and interactions during meetings that indicate progress or challenges related to a client's professional development goals.",
        prompt,
      });

      return result.object.signals;
    }),

  generateGoalContextQuestions: publicProcedure
    .input(z.object({ goal_text: z.string() }))
    .mutation(async ({ input }) => {
      const prompt = dedent`
        Given the following goal:

        <goal>
        ${input.goal_text}
        </goal>

        <examples>
          <example>
            <goal>
              I want to improve my public speaking skills.
            </goal>
            <context_questions>
              [
                "What specific types of presentations or speaking situations do you find most challenging?",
                "How often do you currently have opportunities to speak in front of groups?",
                "What feedback have you received about your public speaking in the past?"
              ]
            </context_questions>
          </example>
        </examples>

        TASK: [
          "Generate 3 specific questions that will help the user provide better context for their goal.",
          "Questions should help uncover important background information, specific scenarios, and clarifying details.",
          "Focus on questions that will lead to concrete, actionable insights.",
        ]
      `;

      const result = await generateObject({
        model: openai("gpt-4o-2024-08-06"),
        schema: GoalContextQuestionsGenerationOutput,
        schemaName: "GoalContextQuestions",
        schemaDescription:
          "Questions that help uncover important context and details about a professional development goal.",
        prompt,
      });

      return result.object.questions;
    }),

  generateReport: publicProcedure
    .input(
      z.object({
        goal_ids: z.array(z.string()),
        profile_id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const response = await client.post("/reports", {
          goalIds: input.goal_ids,
          profileId: input.profile_id,
        });

        if (response.data?.error) {
          return {
            success: false,
            job_id: undefined,
            error: String(response.data.error),
          };
        }

        return {
          success: true,
          job_id: String(response.data?.processing_id),
          error: undefined,
        };
      } catch (error) {
        return {
          success: false,
          job_id: undefined,
          error:
            error instanceof AxiosError
              ? String(error.response?.data?.error)
              : error instanceof Error
                ? error.message
                : String(error),
        };
      }
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        text: z.string(),
        userProvidedContext: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();
      const { error } = await supabase
        .from("goals")
        .update({
          text: input.text,
          hidden_text: input.text,
          user_provided_context: input.userProvidedContext,
        })
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { success: true };
    }),

  complete: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();
      const { error } = await supabase
        .from("goals")
        .update({
          progress: 100,
          completed_at: new Date().toISOString(),
        })
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { success: true };
    }),
});
