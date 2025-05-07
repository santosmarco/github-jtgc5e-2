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
          "*, goal_templates(*), scales:skill_scales(*), goals!goals_skill_id_fkey(*)",
        )
        .eq("goals.profile_id", input.profileId)
        .is("goals.deleted_at", null)
        .is("goals.is_current", true);

      if (skillsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: skillsError.message,
          cause: skillsError,
        });
      }

      // Fetch reports and their related data in a single query
      const { data: reports, error: reportsError } = await supabase
        .from("reports")
        .select(
          `
            *,
            report_goals(*),
            report_moments!inner(
              *,
              moment:moments(
                id,
                vtt,
                title,
                summary,
                version,
                activity,
                relevant,
                topic_id,
                intensity,
                created_at,
                video_api_id,
                _internal_thumbs_down,
                segment_end_timestamp_in_seconds,
                segment_start_timestamp_in_seconds,
                segment_start_timestamp_in_seconds_ideal,
                subtags:moment_subtags(
                  id,
                  tag,
                  moment_id,
                  profile_id,
                  reasoning,
                  confidence,
                  created_at
                )
              ),
              report_goal_signal:report_goal_signals!inner(
                *,
                goal_signal:goal_signals(
                  *,
                  goal_id
                )
              )
            )
          `,
        )
        .eq("profile_id", input.profileId)
        .eq("is_hidden", false)
        .eq("report_moments.is_visible", true)
        .is("report_moments.omission_reason", null)
        .order("start_date", { ascending: true });

      if (reportsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: reportsError.message,
          cause: reportsError,
        });
      }

      // Fetch statuses in a single query
      const { data: statuses, error: statusesError } = await supabase
        .from("group_report_processing_status")
        .select("*")
        .eq("profile_id", input.profileId);

      if (statusesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: statusesError.message,
          cause: statusesError,
        });
      }

      // Assemble the final result
      const result = skills.map((skill) => ({
        ...skill,
        goals: skill.goals ?? [],
        reports: reports
          .filter((report) => report.skill_id === skill.id)
          .map((r) => ({
            ...r,
            report_moments: r.report_moments.filter((rm) => rm.is_visible),
          })),
        statuses: statuses.filter((status) => status.skill_id === skill.id),
        report_goals: reports
          .filter((report) => report.skill_id === skill.id)
          .flatMap((report) => report.report_goals ?? []),
      }));

      return result;
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
          !existingDeletedGoals.some((goal) => goal.text === template.text),
      );

      // Create new goals from templates that don't exist yet
      await Promise.all(
        goalsToCreate.map(async (goalTemplate) => {
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

          goalIds.push(goal.id);
        }),
      );

      if (input.generateAssessment) {
        void generateAssessment(input.profileId, goalIds);
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
