import type { RouterOutputs } from "~/trpc/shared";

type Report = RouterOutputs["reports"]["getGroupReports"]["reports"][number];

export function formatReportToMarkdown(report: Report): string {
  const formatMoment = (moment: Report["report_moments"][number]): string[] => {
    const lines: string[] = [
      `**Moment:** ${moment.moment.title}`,
      `  - Moment Summary: ${moment.moment.summary}`,
    ];

    if (moment.moment.subtags?.length) {
      lines.push(
        `  - Tags: ${moment.moment.subtags.map((t) => t.tag).join(", ")}`,
      );
    }

    if (moment.moment.activity) {
      lines.push(`  - Activity: ${moment.moment.activity}`);
    }

    lines.push(
      `  - Moment Score: ${moment.score} / 1.00`,
      `  - Why This Matters: ${moment.report_section_reasoning}`,
      "",
    );

    return lines;
  };

  const formatSection = (
    section: Report["report_sections"][number],
    index: number,
  ): string[] => {
    const sectionMoments = report.report_moments
      .filter((rm) => rm.report_section_id === section.id)
      .flatMap(formatMoment);

    const lines = [`#### ${index + 1}. ${section.title}`];

    if (section.summary || section.direction) {
      lines.push("");
    }

    if (section.summary) {
      lines.push(`**Summary:** ${section.summary}`);
    }

    if (section.direction) {
      lines.push(
        `**Direction:** ${
          section.direction === "positive" ? "Doing Well" : "Growth Opportunity"
        }`,
      );
    }

    lines.push("", "##### Report Section Moments", ...sectionMoments);

    return lines;
  };

  const formatGoalSignal = (
    signal: Report["report_goal_signals"][number],
  ): string => {
    const { goal_signal: goalSignal, direction } = signal;
    const signalText = `[${direction === "positive" ? "+" : "-"}] ${
      goalSignal.text
    } (${goalSignal.activity})`;

    if (!goalSignal.tag) {
      return signalText;
    }

    const tags = goalSignal.tag
      .split(",")
      .map((tag) => tag.trim())
      .join(", ");

    return `${signalText}\n  - Matched Against Tag: ${tags}`;
  };

  const sections = report.report_sections.map(formatSection);

  const goals = report.report_goals.map((goal, index) => {
    const goalSignals = report.report_goal_signals
      .filter((rgs) => rgs.goal_signal.goal_id === goal.id)
      .map(formatGoalSignal)
      .join("\n");

    const lines = [`## Goal ${index + 1}: ${goal.text}`, ""];

    if (goal.user_provided_context) {
      lines.push(`**Context:** ${goal.user_provided_context}`);
    }

    if (goal.created_at) {
      lines.push(`**Goal Created At:** ${goal.created_at}`);
    }

    lines.push(
      "**Goal Signals:**",
      goalSignals,
      "",
      "### Report Sections",
      ...sections.flat(),
    );

    return lines;
  });

  const header = [
    "# Founder Performance Report",
    "",
    `**Report ID:** ${report.id}`,
    `**Created At:** ${report.created_at}`,
    `**Updated At:** ${report.updated_at}`,
    "",
    "## Goals",
  ];

  const footer = [
    "## Report Sections",
    ...report.report_sections.map((section) => `### ${section.title}`),
  ];

  return [...header, ...goals.flat(), ...footer]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}
