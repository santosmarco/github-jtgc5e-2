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

      // const { data } = await supabase.from("group_report_processing_status");
    }),
});
