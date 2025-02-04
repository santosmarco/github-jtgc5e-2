import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createClient } from "~/lib/supabase/server";

import { createTRPCRouter, publicProcedure } from "../trpc";

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
            report_goals(
              *,
              goal:goals!inner(
                *,
                signals:goal_signals(*)
              )
            ),
            report_goal_signals(
              *,
              goal_signal:goal_signals!inner(*)
            ),
            report_moments(
              *,
              moment:moments!inner(*)
            )
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
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      const {
        data: groupReportProcessingStatuses,
        error: groupReportProcessingStatusesError,
      } = await supabase
        .from("group_report_processing_status")
        .select("*")
        .eq("profile_id", input.userId);

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
            reportProcessingStatuses.map((r) => r.report_id),
          );

        if (reportGoalsError) {
          continue;
        }

        result.push({
          ...groupReportProcessingStatus,
          report_goals: reportGoals,
        });
      }

      return result;
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

      const { data: reportGoals, error: reportGoalsError } = await supabase
        .from("report_goals")
        .select(
          `
            *,
            report:reports!inner(
              *,
              report_goals(
                *,
                goal:goals!inner(
                  *,
                  signals:goal_signals(*)
                )
              ),
              report_goal_signals(
                *,
                goal_signal:goal_signals!inner(*)
              ),
              report_moments(
                *,
                moment:moments!inner(*)
              )
            )
          `,
        )
        .in(
          "report_id",
          reportProcessingStatuses.map((r) => r.report_id),
        );

      if (reportGoalsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: reportGoalsError.message,
          cause: reportGoalsError,
        });
      }

      return {
        group,
        reports: reportGoals.map((reportGoal) => reportGoal.report),
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
});
