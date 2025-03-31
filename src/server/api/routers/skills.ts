import { TRPCError } from "@trpc/server";
import { AxiosError } from "axios";
import { z } from "zod";
import { client as apiClient } from "~/lib/api/client";
import { createClient } from "~/lib/supabase/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

async function generateAssessment(profileId: string, goalIds: string[]) {
  try {
    const response = await apiClient.post("/reports", {
      goalIds,
      profileId,
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
}

export const skillsRouter = createTRPCRouter({
  getAllSkills: publicProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { data: skills, error: skillsError } = await supabase
        .from("skills")
        .select(
          "*, goal_templates(*), goals(*), reports(*, report_goals(*), report_moments!inner(*, moment:moments!inner(*, subtags:moment_subtags(*)), report_goal_signal:report_goal_signals!inner(*))), statuses:group_report_processing_status(*), scales:skill_scales(*)",
        );

      if (skillsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: skillsError.message,
          cause: skillsError,
        });
      }

      const skillsFiltered = skills.map((skill) => ({
        ...skill,
        goals: skill.goals.filter(
          (goal) => goal.profile_id === input.profileId && !goal.deleted_at,
        ),
        reports: skill.reports.filter(
          (report) => report.profile_id === input.profileId,
        ),
        statuses: skill.statuses.filter(
          (status) => status.profile_id === input.profileId,
        ),
      }));

      if (skillsFiltered.length > 0) {
        const reportIds = skillsFiltered.flatMap((skill) =>
          skill.reports.map((report) => report.id),
        );

        const { data: reportGoals, error: reportGoalsError } = await supabase
          .from("report_goals")
          .select("*")
          .in("report_id", reportIds);

        if (reportGoalsError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: reportGoalsError.message,
            cause: reportGoalsError,
          });
        }

        const skillsWithReportGoals = skillsFiltered.map((skill) => ({
          ...skill,
          report_goals: reportGoals.filter((rg) =>
            skill.reports.some((report) => report.id === rg.report_id),
          ),
        }));

        return skillsWithReportGoals;
      }

      return skillsFiltered.map((skill) => ({
        ...skill,
        report_goals: [],
      }));
    }),

  getGoalsForSkillForProfile: publicProcedure
    .input(z.object({ skillId: z.string(), profileId: z.string() }))
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { data: goals, error: goalsError } = await supabase
        .from("goals")
        .select("*")
        .eq("skill_id", input.skillId)
        .eq("profile_id", input.profileId)
        .eq("is_current", true)
        .is("deleted_at", null);

      if (goalsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: goalsError.message,
          cause: goalsError,
        });
      }

      return goals;
    }),

  enableSkill: publicProcedure
    .input(z.object({ skillId: z.string(), profileId: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { data: goalTemplates, error: goalTemplatesError } = await supabase
        .from("goal_templates")
        .select("*, goal_signal_templates(*)")
        .eq("skill_id", input.skillId);

      if (goalTemplatesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: goalTemplatesError.message,
          cause: goalTemplatesError,
        });
      }

      const goalIds = await Promise.all(
        goalTemplates.map(async (goalTemplate) => {
          const { data: goal, error: goalInsertionError } = await supabase
            .from("goals")
            .insert({
              hidden_text: goalTemplate.text,
              is_current: true,
              is_default: true,
              profile_id: input.profileId,
              skill_id: input.skillId,
              text: goalTemplate.text,
            })
            .select("*")
            .single();

          if (goalInsertionError) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: goalInsertionError.message,
              cause: goalInsertionError,
            });
          }

          await Promise.all(
            goalTemplate.goal_signal_templates.map((goalSignalTemplate) =>
              supabase.from("goal_signals").insert({
                activity_type: goalSignalTemplate.activity_type,
                activity: goalSignalTemplate.activity,
                direction: goalSignalTemplate.direction,
                goal_id: goal.id,
                hidden_text: goalSignalTemplate.text,
                is_current: true,
                tag: goalSignalTemplate.tag,
                target_person_type: goalSignalTemplate.target_person_type,
                text: goalSignalTemplate.text,
              }),
            ),
          );

          return goal.id;
        }),
      );

      const { success, error } = await generateAssessment(
        input.profileId,
        goalIds,
      );

      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error,
        });
      }

      return { success: true };
    }),

  disableSkill: publicProcedure
    .input(z.object({ skillId: z.string(), profileId: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = await createClient();
      const now = new Date().toISOString();

      const { data: goals, error: goalsError } = await supabase
        .from("goals")
        .select("*")
        .eq("skill_id", input.skillId)
        .eq("profile_id", input.profileId)
        .eq("is_current", true)
        .is("deleted_at", null);

      if (goalsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: goalsError.message,
          cause: goalsError,
        });
      }

      await Promise.all(
        goals.map((goal) =>
          supabase
            .from("goals")
            .update({
              deleted_at: now,
            })
            .eq("id", goal.id)
            .eq("skill_id", input.skillId)
            .eq("profile_id", input.profileId)
            .eq("is_current", true),
        ),
      );

      return { success: true };
    }),
});
