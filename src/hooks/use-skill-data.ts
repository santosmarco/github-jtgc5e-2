import dayjs from "dayjs";
import _ from "lodash";
import { useMemo } from "react";

import { getReportScores } from "~/lib/reports/scoring";
import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

export type SkillAssessment =
  RouterOutputs["skills"]["getAllSkills"][number]["reports"][number];

export function useSkillData(
  skill: RouterOutputs["skills"]["getAllSkills"][number],
  profileId: string,
) {
  // 1. Derive base assessment objects
  const skillAssessments = useMemo(() => skill.reports || [], [skill.reports]);

  const latestAssessment = useMemo(() => {
    if (skillAssessments.length === 0) return null;
    return (
      _.orderBy(
        skillAssessments,
        [(r) => dayjs(r.created_at).toDate()],
        ["desc"],
      )[0] ?? null
    );
  }, [skillAssessments]);

  const { data: nextReportDate } = api.reports.getNextReportDate.useQuery({
    profileId: profileId,
    skillId: skill.id,
  });

  const latestValidAssessment = useMemo(() => {
    if (skillAssessments.length === 0) return null;
    return (
      _.orderBy(
        skillAssessments.filter((r) => {
          const score = getReportScores(r);
          return score.status === "success";
        }),
        [(r) => dayjs(r.created_at).toDate()],
        ["desc"],
      )[0] ?? null
    );
  }, [skillAssessments]);

  // 2. Derive skill assessment goal (dependent on latestValidAssessment)
  const skillAssessmentGoal = useMemo(() => {
    return (
      latestValidAssessment?.report_goals.find((reportGoal) =>
        skill.goals.some((goal) => goal.id === reportGoal.goal_id),
      ) ?? null
    );
  }, [latestValidAssessment, skill.goals]);

  // 3. Memoize report scores
  const skillScore = useMemo(() => {
    if (!latestAssessment) return null;
    return getReportScores(latestAssessment);
  }, [latestAssessment]);

  const validSkillScore = useMemo(() => {
    if (!latestValidAssessment) return null;
    return getReportScores(latestValidAssessment);
  }, [latestValidAssessment]);

  // 4. Memoize report URL (dependent on latestValidAssessment and skillAssessmentGoal)
  const reportUrl = useMemo(() => {
    if (!latestValidAssessment) return null;
    return `/goals/reports/${latestValidAssessment.id}${
      skillAssessmentGoal?.goal_id
        ? `?goalId=${skillAssessmentGoal.goal_id}`
        : ""
    }`;
  }, [latestValidAssessment, skillAssessmentGoal]);

  // 5. Define fallback logic
  const hasValidFallbackScore =
    skillScore?.status !== "success" && validSkillScore?.status === "success";
  const scoreToShow = hasValidFallbackScore ? validSkillScore : skillScore;

  // 6. Check if skill is enabled
  const isEnabled = skill.goals.some((goal) => goal.is_default);

  return {
    latestAssessment,
    nextReportDate,
    latestValidAssessment,
    skillAssessmentGoal,
    skillScore,
    validSkillScore,
    reportUrl,
    hasValidFallbackScore,
    scoreToShow,
    isEnabled,
  };
}
