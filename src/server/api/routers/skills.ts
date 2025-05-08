import { TRPCError } from "@trpc/server";
import { AxiosError } from "axios";
import { z } from "zod";

import { client as apiClient } from "~/lib/api/client";
import { fetchReportsForHistoricalSkillScore } from "~/lib/reports/scoring";
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
          `
            *,
            goal_templates(*),
            scales:skill_scales(*),
            goals(*)
          `,
        )
        .eq("is_enabled", true)
        .eq("goals.profile_id", input.profileId)
        .eq("goals.is_default", true)
        .eq("goals.is_current", true)
        .is("goals.deleted_at", null);

      if (skillsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: skillsError.message,
          cause: skillsError,
        });
      }

      const result = await Promise.all(
        skills.map(async (skill) => {
          const reports = await fetchReportsForHistoricalSkillScore(
            skill.id,
            input.profileId,
            supabase,
            { includeEmptyReports: true },
          );

          const { data: reportGoals } = await supabase
            .from("report_goals")
            .select("*")
            .in(
              "report_id",
              reports.map((r) => r.id),
            );

          return {
            ...skill,
            reports: reports.map((report) => ({
              ...report,
              report_goals: (reportGoals ?? []).filter(
                (reportGoal) => reportGoal.report_id === report.id,
              ),
            })),
          };
        }),
      );

      return result;
    }),

  enableSkill: publicProcedure
    .input(
      z.object({
        skillId: z.string(),
        profileId: z.string(),
        generateAssessment: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      // First, check if there are any existing goals for this skill and profile
      const { data: existingDeletedGoals, error: existingDeletedGoalsError } =
        await supabase
          .from("goals")
          .select("*")
          .eq("skill_id", input.skillId)
          .eq("profile_id", input.profileId)
          .not("deleted_at", "is", null)
          .is("is_current", true);

      if (existingDeletedGoalsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: existingDeletedGoalsError.message,
          cause: existingDeletedGoalsError,
        });
      }

      // Get all goal templates for this skill
      const { data: goalTemplates, error: goalTemplatesError } = await supabase
        .from("goal_templates")
        .select("*, goal_signal_templates(*)")
        .eq("skill_id", input.skillId)
        .eq("is_current", true);

      if (goalTemplatesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: goalTemplatesError.message,
          cause: goalTemplatesError,
        });
      }

      const goalIds: string[] = [];

      // Turn on existing goals
      if (existingDeletedGoals.length > 0) {
        const { error: updateError } = await supabase
          .from("goals")
          .update({ deleted_at: null })
          .in(
            "id",
            existingDeletedGoals.map((goal) => goal.id),
          );

        if (updateError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: updateError.message,
            cause: updateError,
          });
        }

        for (const goal of existingDeletedGoals) {
          goalIds.push(goal.id);
        }
      }

      const goalsToCreate = goalTemplates.filter(
        (template) =>
          !existingDeletedGoals.some(
            (goal) =>
              goal.text.trim().toLowerCase() ===
              template.text.trim().toLowerCase(),
          ),
      );

      // Create goals sequentially to avoid race conditions
      for (const goalTemplate of goalsToCreate) {
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

        // Create signals sequentially to avoid race conditions
        for (const goalSignalTemplate of goalTemplate.goal_signal_templates) {
          const { error: signalError } = await supabase
            .from("goal_signals")
            .insert({
              activity_type: goalSignalTemplate.activity_type,
              activity: goalSignalTemplate.activity,
              direction: goalSignalTemplate.direction,
              goal_id: goal.id,
              hidden_text: goalSignalTemplate.text,
              is_current: true,
              tag: goalSignalTemplate.tag,
              target_person_type: goalSignalTemplate.target_person_type,
              text: goalSignalTemplate.text,
            });

          if (signalError) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: signalError.message,
              cause: signalError,
            });
          }
        }

        goalIds.push(goal.id);
      }

      if (input.generateAssessment && goalIds.length > 0) {
        const assessmentResult = await generateAssessment(
          input.profileId,
          goalIds,
        );
        if (!assessmentResult.success) {
          console.error(
            "Assessment generation failed:",
            assessmentResult.error,
          );
          // We don't throw here as the skill enabling was successful
        }
      }

      return { success: true };
    }),

  disableSkill: publicProcedure
    .input(z.object({ skillId: z.string(), profileId: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = await createClient();
      const now = new Date().toISOString();

      // Get all goals that need to be disabled
      const { data: goals, error: goalsError } = await supabase
        .from("goals")
        .select("*")
        .eq("skill_id", input.skillId)
        .eq("profile_id", input.profileId)
        .eq("is_default", true)
        .eq("is_current", true)
        .is("deleted_at", null);

      if (goalsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: goalsError.message,
          cause: goalsError,
        });
      }

      // Disable goals sequentially to ensure consistency
      for (const goal of goals) {
        const { error: updateError } = await supabase
          .from("goals")
          .update({
            deleted_at: now,
          })
          .eq("id", goal.id);

        if (updateError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: updateError.message,
            cause: updateError,
          });
        }
      }

      return { success: true };
    }),
});
