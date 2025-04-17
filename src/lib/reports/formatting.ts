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

/**
 * Extracts the full coaching payload—every skill, goal, signal, moment, etc.—so
 * your LLM has all the fuel it needs.
 */
export function extractOnlyUsefulReportData(
  payload: RouterOutputs["reports"]["getGroupReports"]["reports"][number],
) {
  return {
    summary: payload.summary,
    profileId: payload.profile_id,
    startDate: payload.start_date,
    endDate: payload.end_date,

    personality: {
      text: payload.personality_text,
      description: payload.personality_description,
      badges: payload.personality_badges,
      color: payload.personality_color,
      icon: payload.personality_icon,
    },

    ...(payload.skill && {
      skill: {
        id: payload.skill.id,
        title: payload.skill.title,
        description: payload.skill.description,

        goals: payload.skill.goals.map((g) => ({
          id: g.id,
          text: g.text,
          progress: g.progress,
          is_current: g.is_current,
          is_default: g.is_default,
          hidden_text: g.hidden_text,
          user_provided_context: g.user_provided_context,
          completed_at: g.completed_at,
          previous_goal_id: g.previous_goal_id,
        })),

        scales: payload.skill.scales.map((s) => ({
          id: s.id,
          negative_tag_title: s.negative_tag_title,
          positive_tag_title: s.positive_tag_title,
          negative_tag_description: s.negative_tag_description,
          positive_tag_description: s.positive_tag_description,
        })),

        statuses: payload.skill.statuses.map((st) => ({
          id: st.id,
          status: st.status,
          goal_ids: st.goal_ids,
        })),

        goalTemplates: payload.skill.goal_templates.map((t) => ({
          id: t.id,
          text: t.text,
          context: t.context,
          is_current: t.is_current,
        })),
      },
    }),

    report: {
      sections: payload.report_sections.map((sec) => ({
        id: sec.id,
        index: sec.index,
        title: sec.title,
        summary: sec.summary,
        direction: sec.direction,
      })),

      goals: payload.report_goals.map((rg) => ({
        id: rg.id,
        text: rg.text,
        hidden_text: rg.hidden_text,
        is_reviewed: rg.is_reviewed,
        user_provided_context: rg.user_provided_context,
        signals: rg.goal.signals.map((sig) => ({
          id: sig.id,
          tag: sig.tag,
          text: sig.text,
          activity: sig.activity,
          direction: sig.direction,
          activity_type: sig.activity_type,
          target_person_type: sig.target_person_type,
          hidden_text: sig.hidden_text,
        })),
      })),

      moments: payload.report_moments.map((rm) => ({
        id: rm.id,
        VTT: rm.VTT,
        score: rm.score,
        report_section_id: rm.report_section_id,
        report_goal_signal_id: rm.report_goal_signal_id,
        report_section_reasoning: rm.report_section_reasoning,
        report_section_confidence: rm.report_section_confidence,
        report_section_above_threshold: rm.report_section_above_threshold,
        moment: {
          id: rm.moment.id,
          vtt: rm.moment.vtt,
          title: rm.moment.title,
          summary: rm.moment.summary,
          version: rm.moment.version,
          activity: rm.moment.activity,
          relevant: rm.moment.relevant,
          topic_id: rm.moment.topic_id,
          intensity: rm.moment.intensity,
          created_at: rm.moment.created_at,
          moment_url: rm.moment.moment_url,
          subtags: rm.moment.subtags.map((st) => ({
            id: st.id,
            tag: st.tag,
            reasoning: st.reasoning,
            confidence: st.confidence,
          })),
        },
      })),

      comments: payload.report_comments,
    },
  };
}
