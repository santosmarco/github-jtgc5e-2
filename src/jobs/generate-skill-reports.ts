import { logger, schedules } from "@trigger.dev/sdk/v3";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import _ from "lodash";

import { client as apiClient } from "~/lib/api/client";
import { __dangerouslyCreateAdminClient__ } from "~/lib/supabase/admin";
import type { Tables } from "~/lib/supabase/database.types";

dayjs.extend(isSameOrBefore);

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

async function runTask() {
  // Get the date 14 days ago at midnight
  const twoWeeksAgoMidnight = dayjs().subtract(14, "day").startOf("day");

  const supabase = await __dangerouslyCreateAdminClient__();

  const { data, error } = await supabase
    .from("skills")
    .select("goals(*, profile:profiles(*)), reports(*, report_goals(*))")
    .eq("goals.is_default", true)
    .eq("goals.is_current", true)
    .is("goals.deleted_at", null)
    .is("goals.completed_at", null);

  if (error) {
    logger.error("Failed to fetch goals, reports", { error });
    throw new Error(`Failed to fetch goals, reports: ${error.message}`);
  }

  const goals = _.sortBy(
    data.flatMap((datum) => datum.goals),
    [(goal) => goal.created_at],
    ["desc"],
  );

  const goalsFromNonAdminOrCoachProfiles = goals.filter(
    (goal) =>
      !goal.profile.is_admin &&
      goal.profile.role !== "admin" &&
      goal.profile.role !== "coach",
  );

  const reports = data.flatMap((datum) => datum.reports);

  // First group goals by profile
  const goalsByProfileId = _.groupBy(
    goalsFromNonAdminOrCoachProfiles,
    (goal) => goal.profile_id,
  );

  // Process each profile's goals
  const processableGoalsByProfileId: Record<
    string,
    Array<
      Tables<"goals"> & {
        profile: Tables<"profiles">;
        latestReport:
          | (Tables<"reports"> & {
              report_goals: Tables<"report_goals">[];
            })
          | undefined;
      }
    >
  > = {};

  for (const [profileId, profileGoals] of Object.entries(goalsByProfileId)) {
    // For each profile, group goals by skill_id
    const goalsBySkillId = _.groupBy(profileGoals, (goal) => goal.skill_id);

    // For each skill, only keep the latest goal
    const latestGoalsBySkill = Object.values(goalsBySkillId)
      .map((skillGoals) =>
        _.maxBy(skillGoals, (goal) => dayjs(goal.created_at)),
      )
      .filter((x): x is NonNullable<typeof x> => !!x);

    // Add report information to each goal
    const goalsWithTheirLatestReport = latestGoalsBySkill.map((goal) => {
      const latestReport = _.maxBy(
        reports.filter((report) =>
          report.report_goals.some(
            (reportGoal) => reportGoal.goal_id === goal.id,
          ),
        ),
        (report) => dayjs(report.end_date),
      );

      return {
        ...goal,
        latestReport,
      };
    });

    // Filter for processable goals
    const profileProcessableGoals = goalsWithTheirLatestReport.filter((datum) =>
      dayjs(
        datum.latestReport ? datum.latestReport.end_date : datum.created_at,
      ).isSameOrBefore(twoWeeksAgoMidnight),
    );

    if (profileProcessableGoals.length > 0) {
      processableGoalsByProfileId[profileId] = profileProcessableGoals;
    }
  }

  // Generate assessments for each profile with processable goals
  const results = [];
  for (const [profileId, profileGoals] of Object.entries(
    processableGoalsByProfileId,
  )) {
    const goalIds = profileGoals.map((goal) => goal.id);
    logger.info(
      `Generating assessment for profile ${profileId} with ${goalIds.length} goals`,
    );

    const result = await generateAssessment(profileId, goalIds);
    results.push({
      profileId,
      result,
      goalCount: goalIds.length,
    });

    if (!result.success) {
      logger.error(`Failed to generate assessment for profile ${profileId}`, {
        error: result.error,
      });
    } else {
      logger.info(
        `Successfully generated assessment for profile ${profileId}`,
        { jobId: result.job_id },
      );
    }
  }

  return {
    totalProfiles: Object.keys(processableGoalsByProfileId).length,
    successCount: results.filter((r) => r.result.success).length,
    failureCount: results.filter((r) => !r.result.success).length,
    results,
  };
}

export const generateSkillReports = schedules.task({
  id: "generate-skill-reports",
  cron: "0 8 * * *", // every day at 8am EST (12pm UTC)
  run: async () => {
    await runTask();
  },
});
