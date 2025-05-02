import { openai } from "@ai-sdk/openai";
import { TRPCError } from "@trpc/server";
import { generateObject, generateText } from "ai";
import dayjs from "dayjs";
import _ from "lodash";
import dedent from "ts-dedent";
import { z } from "zod";

import { formatReportToMarkdown } from "~/lib/reports/formatting";
import { ReportsService } from "~/lib/reports/queries";
import { ReportPersonality } from "~/lib/reports/schemas";
import { createClient } from "~/lib/supabase/server";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const reportsRouter = createTRPCRouter({
  getOne: publicProcedure
    .input(
      z.object({
        reportId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { reportId } = input;

      const { data: report, error: reportError } = await supabase
        .from("reports")
        .select(
          `
            *,
            report_goals(*, goal:goals!inner(*, signals:goal_signals(*))),
            report_goal_signals(*, goal_signal:goal_signals!inner(*)),
            report_moments(*, moment:moments!inner(*, subtags:moment_subtags(*)))
          `,
        )
        .eq("id", reportId)
        .maybeSingle();

      if (reportError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: reportError.message,
          cause: reportError,
        });
      }

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Report not found",
        });
      }

      return report;
    }),

  listForUser: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().min(1).max(50).default(9),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();
      const { page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      // Get total count for pagination
      const { count, error: countError } = await supabase
        .from("group_report_processing_status")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", input.userId);

      if (countError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: countError.message,
          cause: countError,
        });
      }

      const {
        data: groupReportProcessingStatuses,
        error: groupReportProcessingStatusesError,
      } = await supabase
        .from("group_report_processing_status")
        .select("*, skill:skills(*)")
        .eq("profile_id", input.userId)
        .range(offset, offset + pageSize - 1)
        .order("created_at", { ascending: false });

      if (groupReportProcessingStatusesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: groupReportProcessingStatusesError.message,
          cause: groupReportProcessingStatusesError,
        });
      }

      const result = [];

      for (const groupReportProcessingStatus of groupReportProcessingStatuses) {
        const {
          data: reportProcessingStatuses,
          error: reportProcessingStatusesError,
        } = await supabase
          .from("report_processing_status")
          .select("*")
          .eq("group_processing_status_id", groupReportProcessingStatus.id);

        if (reportProcessingStatusesError) {
          continue;
        }

        const { data: reportGoals, error: reportGoalsError } = await supabase
          .from("report_goals")
          .select("*")
          .in(
            "report_id",
            reportProcessingStatuses
              .map((r) => r.report_id)
              .filter((r): r is NonNullable<typeof r> => r !== null),
          );

        if (reportGoalsError) {
          continue;
        }

        result.push({
          ...groupReportProcessingStatus,
          report_goals: reportGoals,
        });
      }

      return {
        reports: result,
        pagination: {
          page,
          pageSize,
          totalCount: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
      };
    }),

  getGroupReports: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { data: group, error: groupError } = await supabase
        .from("group_report_processing_status")
        .select("*")
        .eq("id", input.groupId)
        .single();

      if (groupError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: groupError.message,
          cause: groupError,
        });
      }

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group report not found",
        });
      }

      const {
        data: reportProcessingStatuses,
        error: reportProcessingStatusesError,
      } = await supabase
        .from("report_processing_status")
        .select("*")
        .eq("group_processing_status_id", group.id);

      if (reportProcessingStatusesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: reportProcessingStatusesError.message,
          cause: reportProcessingStatusesError,
        });
      }

      const { data: reports, error: reportsError } = await supabase
        .from("reports")
        .select(
          `
            *,
            skill:skills(*, goal_templates(*), goals(*), reports(*, report_goals(*), report_moments!inner(*, moment:moments!inner(*, subtags:moment_subtags(*)), report_goal_signal:report_goal_signals!inner(*))), statuses:group_report_processing_status(*), scales:skill_scales(*)),
            report_sections(*),
            report_goals(*, goal:goals!inner(*, signals:goal_signals(*))),
            report_goal_signals(*, goal_signal:goal_signals!inner(*)),
            report_moments!inner(*, moment:moments!inner(*, subtags:moment_subtags(*)), report_goal_signal:report_goal_signals!inner(*)),
            report_comments(*, user:profiles!inner(*))
          `,
        )
        .in(
          "id",
          reportProcessingStatuses
            .map((r) => r.report_id)
            .filter((r): r is NonNullable<typeof r> => r !== null),
        );

      if (reportsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: reportsError.message,
          cause: reportsError,
        });
      }

      const updatedReports = await Promise.all(
        reports.map(async (report) => {
          if (report.personality_text) return report;

          const reportData = formatReportToMarkdown(report);

          const { object } = await generateObject({
            model: openai("gpt-4o-mini"),
            prompt: dedent`
              You are tasked with generating a captivating header for a founder's performance report, similar to what 16personalities does. This header should include a personality designation, a description of that personality, badges to display, a representative icon, and a complementary color. Your analysis should be based on the report data provided, which includes areas where the founder is doing well and areas for potential growth.

              Here is the report data:
              <report_data>
              ${reportData}
              </report_data>

              Analyze the report data carefully, paying attention to:
              1. Positive signals (things the founder is doing well)
              2. Negative signals (areas for improvement) 
              3. The founder's goals and how well they're meeting them
              4. Any recurring themes or patterns in the founder's behavior

              Based on your analysis, generate the following:

              1. A personality text:
                - This should be 1-3 words that encapsulate the founder's leadership style
                - It should be catchy and memorable, but also accurate based on the data
                - Examples might include "The Decisive Delegator" or "The Visionary Taskmaster"

              2. A description of the personality:
                - Write 2-3 sentences that expand on the personality text
                - This should explain how the founder's personality manifests in their leadership
                - Include both strengths and areas for growth
                - Base this description on concrete examples from the report data
                - Use "you" when addressing the founder in this description

              3. Some badges to display:
                - Create 3-5 badge titles that highlight key strengths or notable characteristics
                - These should be short (1-3 words each) and easy to understand
                - Examples might include "Clear Communicator" or "Deadline Driven"
                - Ensure these badges are supported by evidence in the report data

              4. A representative Lucide icon:
                - Choose an icon from https://lucide.dev that best represents the founder's personality
                - Provide a brief explanation for your choice

              5. A complementary color:
                - Select one of the following colors that best fits the personality:
                  - bg-purple-600 (for innovative/creative personalities)
                  - bg-blue-600 (for analytical/strategic personalities) 
                  - bg-emerald-600 (for growth/adaptable personalities)
                  - bg-amber-600 (for practical/focused personalities)
                  - bg-teal-600 (for collaborative/supportive personalities)
                  - bg-indigo-600 (for technical/detail-oriented personalities)
                  - bg-fuchsia-600 (for visionary/ambitious personalities)
                - Include a brief explanation for your choice

              Your final output should be formatted as follows:

              {
                "personality_text": "[Insert 1-3 word personality text here]",
                "personality_description": "[Insert 2-3 sentence description here, using 'you' to address the founder]",
                "badges": [
                  "[Badge title 1]",
                  "[Badge title 2]",
                  "[Badge title 3]",
                  "[Badge title 4 (optional)]",
                  "[Badge title 5 (optional)]"
                ],
                "icon": {
                  "name": "[Insert name of chosen Lucide icon, e.g. 'UserRound']",
                  "reason": "[Brief explanation for choosing this icon]"
                },
                "color": {
                  "name": "[One of the predefined color classes]",
                  "reason": "[Brief explanation for choosing this color]"
                }
              }

              Remember, your goal is to create a captivating and accurate representation of the founder's leadership personality based on the provided report data. Be creative but ensure all elements are grounded in the information given.
            `,
            schema: ReportPersonality,
          });

          const { text: shortenedDescription } = await generateText({
            model: openai("gpt-4o-mini"),
            prompt: dedent`
              Example 1:
              - Input: "Mediators embody a unique blend of poetic sensitivity, kindness, and altruism, characteristics that define their very essence. They are individuals who not only possess a deep appreciation for the beauty of language and expression but also demonstrate an unwavering eagerness to assist noble causes. Their innate desire to foster harmony and understanding in various situations drives them to actively seek opportunities where they can make a meaningful difference in the lives of others. Whether through facilitating dialogue, offering support, or championing social initiatives, mediators are dedicated to uplifting those around them and contributing positively to their communities."
              - Output: "Mediators are poetic, kind, and altruistic people, always eager to help a good cause."

              Example 2:
              - Input: "Logicians are not just simple thinkers; they are innovative inventors driven by an insatiable and unquenchable thirst for knowledge. Their relentless curiosity propels them to explore the depths of logic, reasoning, and the intricate patterns that govern thought processes. This passion for understanding the complexities of the world around them allows them to develop groundbreaking ideas and theories that challenge conventional wisdom and push the boundaries of intellectual exploration."
              - Output: "Logicians are innovative inventors with an unquenchable thirst for knowledge."

              Input:
              """
              ${object.personality_description}
              """

              Output:
            `,
          });

          const { data: updatedReport, error: updateError } = await supabase
            .from("reports")
            .update({
              personality_text: object.personality_text
                .trim()
                .replace(/^(?:"The\s+|")|"$/g, ""),
              personality_description: shortenedDescription
                .trim()
                .replace(/^"|"$/g, ""),
              personality_badges: object.badges
                .map((badge) => badge.trim().replace(/^"|"$/g, ""))
                .filter((badge) => badge !== ""),
              personality_icon: _.startCase(
                _.snakeCase(object.icon.name.replace(/^"|"$/g, "")),
              ),
              personality_color: object.color.name,
            })
            .eq("id", report.id)
            .select("*")
            .single();

          if (updateError) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: updateError.message,
              cause: updateError,
            });
          }

          return {
            ...report,
            ...updatedReport,
            report_moments: report.report_moments.filter((rm) => rm.is_visible),
          };
        }),
      );

      return {
        group,
        reports: updatedReports.map((report) => ({
          ...report,
          report_sections: _.sortBy(
            report.report_sections,
            (rs) => rs.index ?? 0,
          ),
          report_moments: report.report_moments.filter((rm) => rm.is_visible),
        })),
      };
    }),

  getGroupReportStatus: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { data: group, error: groupError } = await supabase
        .from("group_report_processing_status")
        .select("*")
        .eq("id", input.groupId)
        .single();

      if (groupError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: groupError.message,
          cause: groupError,
        });
      }

      return group;
    }),

  hideMoment: publicProcedure
    .input(
      z.object({
        momentId: z.string(),
        reportId: z.string(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { error } = await supabase
        .from("report_moments")
        .update({
          is_visible: false,
          omission_reason: input.reason,
        })
        .eq("moment_id", input.momentId)
        .eq("report_id", input.reportId);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
          cause: error,
        });
      }

      return { success: true };
    }),

  createComment: protectedProcedure
    .input(
      z.object({
        reportId: z.string(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = await createClient();

      const { data: comment, error } = await supabase
        .from("report_comments")
        .insert({
          report_id: input.reportId,
          profile_id: ctx.user.id,
          content: input.content,
        })
        .select("*, user:profiles(*)")
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
          cause: error,
        });
      }

      return comment;
    }),

  reviewGoal: protectedProcedure
    .input(z.object({ goalId: z.string(), reportId: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { error } = await supabase
        .from("report_goals")
        .update({ is_reviewed: true })
        .eq("goal_id", input.goalId)
        .eq("report_id", input.reportId);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
          cause: error,
        });
      }

      return { success: true };
    }),

  getReportsTimelineDataForUser: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        skillId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();
      const reportsService = new ReportsService(supabase);

      const scores = await reportsService.calculateHistoricalSkillScoresBatched(
        input.userId,
        input.skillId,
      );

      return {
        timelineData: _.sortBy(scores, (s) => dayjs(s.endDate).unix()).map(
          (entry) => ({
            entry,
            x: dayjs(entry.endDate).format("YYYY-MM-DD"),
            y: entry.score,
          }),
        ),
      };
    }),
});
