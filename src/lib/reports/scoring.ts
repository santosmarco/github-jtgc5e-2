import _ from "lodash";

import type { Tables } from "~/lib/supabase/database.types";

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
  metrics: ReportMetric[];
  negativeScore: number;
  positiveScore: number;
  finalScore: number;
};

/**
 * Calculates comprehensive scores for a report based on skill scales and moment tags
 *
 * @param report - The report containing skill scales and moments to analyze
 * @returns A complete ReportScore object with metrics and aggregated scores
 */
export function getReportScores(report: {
  skill: {
    scales: Pick<
      Tables<"skill_scales">,
      "positive_tag_title" | "negative_tag_title"
    >[];
  } | null;
  report_moments: (Pick<
    Tables<"report_moments">,
    "is_visible" | "omission_reason"
  > & {
    moment: Pick<Tables<"moments">, "_internal_thumbs_down"> & {
      subtags: Pick<Tables<"moment_subtags">, "tag">[];
    };
  })[];
}): ReportScore {
  // Initialize empty score object with default values
  const score: ReportScore = {
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
  const validMoments = report.report_moments.filter(
    (moment) =>
      moment.is_visible &&
      !moment.omission_reason &&
      (moment.moment._internal_thumbs_down ?? 0) <= 0,
  );

  // Process each scale to generate individual metrics
  for (const scale of sortedScales) {
    const leftLabel = scale.negative_tag_title;
    const rightLabel = scale.positive_tag_title;

    // Count moments with negative tags matching this scale
    const negativeCount = countMomentsWithMatchingTag(
      validMoments,
      leftLabel.trim().toLowerCase(),
    );

    // Count moments with positive tags matching this scale
    const positiveCount = countMomentsWithMatchingTag(
      validMoments,
      rightLabel.trim().toLowerCase(),
    );

    // Calculate total with fallback to prevent division by zero
    const total = Math.max(positiveCount + negativeCount, 1);

    // Create metric for this scale
    const metric: ReportMetric = {
      id: `${leftLabel}-${rightLabel}`,
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
    total > 0 ? 0.5 + 0.5 * (score.positiveScore / total) : 0.5;

  return score;
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
    moment: {
      subtags: { tag: string | null }[];
    };
  }[],
  tagToMatch: string,
): number {
  return moments.filter((moment) =>
    moment.moment.subtags.some((subtag) =>
      (subtag.tag ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .includes(tagToMatch),
    ),
  ).length;
}
