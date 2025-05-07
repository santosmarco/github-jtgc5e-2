import dayjs from "dayjs";
import _ from "lodash";
import type { SimplifyDeep } from "type-fest";

import type { Database, Tables } from "~/lib/supabase/database.types";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Intersect, Select } from "../utils/types";
import { dedupeReports, shouldShowReportMoment } from "./utils";

export type ScorableReport = SimplifyDeep<
  Intersect<
    [
      Select<"reports", "id" | "start_date" | "end_date" | "created_at">,
      {
        skill: {
          scales: Select<
            "skill_scales",
            "positive_tag_title" | "negative_tag_title"
          >[];
        } | null;
        report_moments: (Parameters<typeof shouldShowReportMoment>[0] & {
          moment: {
            subtags: Select<"moment_subtags", "tag">[];
          };
        })[];
        processing_statuses: Select<
          "report_processing_status",
          "group_processing_status_id"
        >[];
      },
    ]
  >
>;

/**
 * Represents a single metric in a report with labels and a value
 */
export type ReportMetric = {
  id: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
};

/**
 * Represents the complete scoring data for a report
 */
export type ReportScore = {
  report: ScorableReport;
  date: string;
  metrics: ReportMetric[];
  negativeScore: number;
  positiveScore: number;
  finalScore: number;
};

/**
 * Represents the historical report scores for a skill
 */
export type HistoricalSkillScore = {
  skillId: string;
  scores: ReportScore[];
};

/**
 * Calculates comprehensive scores for a report based on skill scales and moment tags
 *
 * @param report - The report containing skill scales and moments to analyze
 * @returns A complete ReportScore object with metrics and aggregated scores
 */
export function getReportScores(report: ScorableReport): ReportScore {
  // Initialize empty score object with default values
  const score: ReportScore = {
    report,
    date: dayjs(report.end_date).format("YYYY-MM-DD"),
    metrics: [],
    negativeScore: 0,
    positiveScore: 0,
    finalScore: 0,
  };

  // Early return if no skill data is available
  if (!report.skill) return score;

  // Sort scales for consistent ordering in the UI
  const sortedScales = _.sortBy(
    report.skill.scales,
    (scale) => scale.negative_tag_title,
  );

  // Filter for valid moments that should be included in scoring
  const validReportMoments = report.report_moments.filter(
    shouldShowReportMoment,
  );
  const validMoments = validReportMoments.map(
    (reportMoment) => reportMoment.moment,
  );

  console.log({ validMoments, report });

  // Process each scale to generate individual metrics
  for (const scale of sortedScales) {
    const leftLabel = scale.negative_tag_title;
    const rightLabel = scale.positive_tag_title;

    // Count moments with negative tags matching this scale
    const negativeCount = countMomentsWithMatchingTag(validMoments, leftLabel);

    // Count moments with positive tags matching this scale
    const positiveCount = countMomentsWithMatchingTag(validMoments, rightLabel);

    // Calculate total with fallback to prevent division by zero
    const total = Math.max(positiveCount + negativeCount, 1);

    // Create metric for this scale
    const metric: ReportMetric = {
      id: `${_.camelCase(leftLabel)}_${_.camelCase(rightLabel)}`,
      leftLabel,
      rightLabel,
      value:
        positiveCount === 0 && negativeCount === 0
          ? 50 // Default to middle value when no data
          : 100 * (negativeCount / total),
    };

    score.metrics.push(metric);

    // Accumulate totals for final score calculation
    score.positiveScore += positiveCount;
    score.negativeScore += negativeCount;
  }

  // Calculate final score as a value between 0.5 and 1.0
  // Higher positive tag ratio yields a higher score
  const total = score.positiveScore + score.negativeScore;
  score.finalScore =
    (total > 0 ? 0.5 + 0.5 * (score.positiveScore / total) : 0.5) * 100;

  return score;
}

/**
 * Calculates historical scores for a skill across multiple reports
 *
 * @param skillId - The ID of the skill to calculate scores for
 * @param reports - Array of report objects to calculate scores from
 * @returns HistoricalSkillScore object containing skill ID and sorted scores
 */
export function getHistoricalReportScores(
  skillId: string,
  reports: ScorableReport[],
): HistoricalSkillScore {
  return {
    skillId,
    scores: _.sortBy(reports.map(getReportScores), (score) =>
      dayjs(score.date).unix(),
    ),
  };
}

export async function fetchReportsForHistoricalSkillScore(
  skillId: string,
  profileId: string,
  supabaseClient: SupabaseClient<Database>,
): Promise<ScorableReport[]> {
  // Get all completed reports for this profile and skill
  const { data: reports, error: reportsError } = await supabaseClient
    .from("reports")
    .select(
      `
        id,
        start_date,
        end_date,
        created_at,
        skill_id,
        profile_id,
        is_hidden,
        skill:skills!inner(
          id,
          scales:skill_scales(positive_tag_title, negative_tag_title)
        ),
        report_moments:report_moments!inner(
          is_visible,
          omission_reason,
          moment:moments!inner(
            _internal_thumbs_down,
            latest,
            relevant,
            subtags:moment_subtags(tag)
          )
        ),
        processing_statuses:report_processing_status(status, group_processing_status_id)
      `,
    )
    .eq("skill_id", skillId)
    .eq("profile_id", profileId)
    .eq("is_hidden", false)
    .eq("report_moments.is_visible", true)
    .is("report_moments.omission_reason", null)
    .eq("report_moments.moment.latest", true)
    .eq("report_moments.moment.relevant", true)
    .eq("processing_statuses.status", "completed")
    .order("start_date", { ascending: true });

  if (reportsError) {
    throw reportsError;
  }

  if (!reports?.length) return [];

  // Deduplicate reports by their date periods
  const dedupedReports = dedupeReports(
    reports.map((report) => ({
      ...report,
      report_moments: report.report_moments.filter(shouldShowReportMoment),
    })),
  );

  return dedupedReports;
}

/**
 * Counts moments that have subtags matching the specified tag
 *
 * @param moments - Array of moments to check
 * @param tagToMatch - Normalized tag string to match against
 * @returns Number of moments with matching tags
 */
function countMomentsWithMatchingTag(
  moments: {
    subtags: Pick<Tables<"moment_subtags">, "tag">[];
  }[],
  tagToMatch: string,
): number {
  return moments.filter((moment) =>
    moment.subtags.some((subtag) =>
      subtag.tag
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .includes(tagToMatch.trim().toLowerCase()),
    ),
  ).length;
}
