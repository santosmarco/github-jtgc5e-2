import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
} from "@react-email/components";

import type { Enums, Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";

import dayjs from "dayjs";
import _ from "lodash";
import type { HistoricalSkillScore, ReportScore } from "~/lib/reports/scoring";
import type { Select } from "~/lib/utils/types";
import { CTAButtonSection } from "./_components/cta-button-section";
import { MetricsSection } from "./_components/reports/metrics-section";
import { ReportFooter } from "./_components/reports/report-footer";
import { ReportHeader } from "./_components/reports/report-header";
import { ReportInsightsSection } from "./_components/reports/report-insights-section";
import { ReportKeyMomentsSection } from "./_components/reports/report-key-moments-section";
import { ReportSectionHeading } from "./_components/reports/report-section-heading";
import { ReportTeaserSection } from "./_components/reports/report-teaser-section";
import { Sparkline } from "./_components/sparkline";
import { createUtmUrl } from "./_components/text-processing";
import tailwindEmailConfig from "./tailwind.config";

export type ReportInsightSection = {
  id: string;
  title: string;
  summary: string;
  shortenedSummary: string;
};

export type ReportKeyMoment = ReportInsightSection & {
  people?: string[];
};

export type SkillReportReadyEmailSections = {
  strengthSections: ReportInsightSection[];
  growthSections: ReportInsightSection[];
  keyMoments: ReportKeyMoment[];
};

export type SkillReportReadyEmailProps = {
  variant: Extract<
    Enums<"email_template_type">,
    "skill-report-ready-founder" | "skill-report-ready-manager"
  >;
  previewText: string;
  baseReportUrl: string;
  report: Select<"reports", "start_date" | "end_date"> & {
    skill: Select<"skills", "internal_title"> & {
      scales: Tables<"skill_scales">[];
    };
    profile: Select<"profiles", "nickname">;
    scores: ReportScore;
  };
  historicalScores: HistoricalSkillScore["scores"];
  teaser: string;
  sections: SkillReportReadyEmailSections;
  meetingMinutes: number;
};

export function SkillReportReadyEmail({
  variant,
  previewText,
  baseReportUrl,
  report,
  historicalScores,
  teaser,
  sections,
  meetingMinutes,
}: SkillReportReadyEmailProps) {
  const skillTitle = report.skill.internal_title;

  // Format date range
  const startDate = dayjs(report.start_date).format("MMM DD");
  const endDate = dayjs(report.end_date).format("MMM DD");

  // Prepare the historical scores for the sparkline
  const historicalScoresData = historicalScores.map((score) => ({
    x: dayjs(score.date).toDate(),
    y: score.finalScore ?? 0,
  }));

  // Create UTM params for tracking different CTAs
  const reportUrl = createUtmUrl(baseReportUrl, "report");
  const wellDoneUrl = createUtmUrl(baseReportUrl, "doing_well");
  const growthUrl = createUtmUrl(baseReportUrl, "growth_areas");
  const momentsUrl = createUtmUrl(baseReportUrl, "key_moments");

  // Define metrics for leadership dimensions (only used for founder)
  const leadershipMetrics = report.scores.metrics?.map((metric) => ({
    leftLabel: metric.leftLabel,
    rightLabel: metric.rightLabel,
    value: 100 - metric.value,
  }));

  const isFounder = variant === "skill-report-ready-founder";
  const isManager = variant === "skill-report-ready-manager";

  return (
    <Html>
      <Preview>{previewText}</Preview>
      <Tailwind config={tailwindEmailConfig}>
        <Head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
        </Head>
        <Body className="m-0 bg-gray-50 p-0 font-sans">
          <Container className="mx-auto w-full max-w-[600px] bg-white/50">
            {/* Header */}
            <ReportHeader
              headline={
                <>
                  Your{" "}
                  <span className="font-extrabold text-indigo-300">
                    {skillTitle}
                  </span>
                  <br />
                  Performance{" "}
                  <small>
                    ({startDate} to {endDate})
                  </small>
                </>
              }
              nickname={report.profile.nickname || ""}
              meetingMinutes={Math.round(meetingMinutes)}
              startDate={startDate}
              endDate={endDate}
            />

            {/* Report Card */}
            <Section className="mx-auto bg-white px-10">
              {/* Score Visualization */}
              <div className={cn("w-full pt-6", isManager && "pb-6")}>
                <div className="mt-8 w-full text-center">
                  <ReportSectionHeading title="PERFORMANCE TREND" />
                  <div className="mt-4 w-full">
                    <Sparkline
                      data={historicalScoresData}
                      height={120}
                      areaColor="#E5E7EB"
                    />
                  </div>
                </div>
              </div>

              {/* Email-friendly Report Metrics - Founder only */}
              {isFounder && leadershipMetrics && (
                <MetricsSection
                  title="REPORT METRICS"
                  metrics={_.sortBy(
                    leadershipMetrics,
                    "value" as keyof (typeof leadershipMetrics)[number],
                  )}
                  showNotches={true}
                />
              )}

              {/* After-Metrics CTA Section - Founder only */}
              {isFounder && (
                <CTAButtonSection
                  href={reportUrl}
                  buttonText="View Full Report"
                />
              )}

              {/* Teaser Section - Manager only */}
              {isManager && <ReportTeaserSection teaser={teaser} />}

              {/* Areas of Strength and Growth Sections - Founder only */}
              {isFounder && sections.growthSections.length > 0 && (
                <ReportInsightsSection
                  title="GROWTH OPPORTUNITIES"
                  type="growth"
                  items={sections.growthSections.map((section) => ({
                    id: section.id,
                    summary: section.shortenedSummary,
                  }))}
                  buttonHref={growthUrl}
                  buttonText="Review Growth Areas →"
                />
              )}

              {isFounder && sections.strengthSections.length > 0 && (
                <ReportInsightsSection
                  title="AREAS OF STRENGTH"
                  type="strength"
                  items={sections.strengthSections.map((section) => ({
                    id: section.id,
                    summary: section.shortenedSummary,
                  }))}
                  buttonHref={wellDoneUrl}
                  buttonText="Review Strengths →"
                />
              )}

              {/* Key Moments Section - Founder only */}
              {isFounder && (
                <ReportKeyMomentsSection
                  moments={sections.keyMoments.map((moment) => ({
                    ...moment,
                    people: (moment.people || []).filter(
                      (person) =>
                        person.trim().toLowerCase() !==
                        report.profile.nickname?.trim().toLowerCase(),
                    ),
                  }))}
                  buttonHref={momentsUrl}
                  highlightTitle={false}
                  highlightSummary={false}
                />
              )}

              {isFounder && <Hr className="my-3" />}

              {/* Final CTA */}
              <CTAButtonSection
                href={reportUrl}
                buttonText={
                  isFounder
                    ? "View Full Report Data →"
                    : "View Complete Analysis →"
                }
                className="my-3"
                buttonClassName={
                  isFounder ? undefined : "px-6 py-3 text-base font-medium"
                }
              />
            </Section>

            {/* Footer */}
            <ReportFooter />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

// Mock data for preview in email clients
SkillReportReadyEmail.PreviewProps = {
  // variant: "founder",
  variant: "manager",
  teaser:
    "In this report, your delegation with Ralf on the <highlight:moment>Germany market expansion</highlight:moment> highlights your <highlight:strength>clear, authoritative delegation style</highlight:strength>—but your <highlight:growth>quick instructions to Agnieszka and Sarah sometimes lack crucial context</highlight:growth>, risking ambiguity as you build cross-cultural management systems. Uncover how refining your detail and follow-up can elevate your team's execution.",
  profile: {
    nickname: "Alex",
    email: "alex@example.com",
    coach_id: "coach-123",
  },
  report: {
    id: "report-123",
    start_date: "2023-12-01",
    end_date: "2023-12-31",
    created_at: "2024-01-05",
    skill: {
      id: "skill-123",
      title: "Strategic Communication",
      description: "Effectively conveying ideas to drive outcomes",
    },
    report_goals: [],
    report_moments: [
      {
        id: "moment-1",
        score: 0.85,
        report_section_id: "section-1",
        report_section_reasoning:
          "You demonstrated clear task delegation to Marco",
        moment: {
          id: "moment-123",
          title: "Delegation to Marco for build",
          summary:
            "Dave assigns Marco the responsibility to reallocate development efforts toward addressing vulnerabilities in Zoom recording.",
          activity: "Delegation_v5",
          created_at: "2023-12-15T12:00:00Z",
        },
      },
      {
        id: "moment-2",
        score: 0.78,
        report_section_id: "section-2",
        report_section_reasoning: "You provided detailed instructions to Tim",
        moment: {
          id: "moment-124",
          title: "Weekly Meeting with Tim",
          summary:
            "Discussion about pipeline priorities and assignment of key tasks to Tim for the upcoming sprint.",
          activity: "Delegation_v5",
          created_at: "2023-12-10T14:30:00Z",
        },
      },
    ],
    report_sections: [
      {
        id: "section-1",
        title: "Clear and decisive task assignment",
        summary:
          "You consistently delegate tasks with clear instructions and deadlines.",
        direction: "positive",
      },
      {
        id: "section-2",
        title: "Detailed instructions with clear expectations",
        summary:
          "You offer detailed steps and concrete expectations when delegating work.",
        direction: "positive",
      },
      {
        id: "section-3",
        title: "Empowering team through balanced delegation",
        summary:
          "You empower others by delegating tasks and allowing room for initiative.",
        direction: "positive",
      },
      {
        id: "section-4",
        title: "Ambiguous task details",
        summary:
          "You delegate tasks quickly but sometimes leave out key details.",
        direction: "negative",
      },
      {
        id: "section-5",
        title: "Inconsistent communication style",
        summary: "Your communication style in delegation can be inconsistent.",
        direction: "negative",
      },
    ],
    score: 78,
    previous_score: 72,
    historical_scores: [
      { score: 0.65, reportId: "report-1", startDate: "2023-09-01" },
      { score: 0.68, reportId: "report-2", startDate: "2023-10-01" },
      { score: 0.72, reportId: "report-3", startDate: "2023-11-01" },
      { score: 0.78, reportId: "report-123", startDate: "2023-12-01" },
    ],
  },
  generatedSections: {
    strengthSections: [
      {
        id: "strength1",
        title: "Consistent Clarity in Task Delegation",
        summary:
          "You consistently assign tasks with clear instructions, deadlines, and responsibility. For example, you directed Marco to address Zoom vulnerabilities with a set deadline and assigned Divya to test the application with explicit steps. This <highlight>keeps your team focused and aligned</highlight>, ensuring roles are well understood and projects move forward efficiently.",
        shortenedSummary:
          "You assign tasks with <highlight>clear instructions and deadlines</highlight>, keeping your team focused and aligned.",
      },
      {
        id: "strength2",
        title: "Setting Detailed Expectations for Team Members",
        summary:
          "You provide your team with detailed steps and expectations when delegating work. When asking Tim to build a new daily metrics report or instructing the team to prepare pre-meeting questions, you made sure requirements and outcomes were clear. This approach helps your team work confidently and maintain high accountability.",
        shortenedSummary:
          "You give <highlight>clear steps and expectations</highlight> when delegating, helping your team work confidently and stay accountable.",
      },
      {
        id: "strength3",
        title: "Empowering Others Through Delegation and Input",
        summary:
          "You empower your team by inviting their ideas and granting ownership. When you asked Marvin to propose three new role ideas or delegated the coaching program to Alex, you showed trust in their initiative. This balance of direction and autonomy <highlight>fosters a proactive, engaged team</highlight>.",
        shortenedSummary:
          "You foster a <highlight>proactive, engaged team</highlight> by balancing direction with autonomy when delegating.",
      },
    ],
    growthSections: [
      {
        id: "growth1",
        title: "Clarify Task Details and Success Criteria",
        summary:
          "Some delegated tasks lack specific timelines or clear criteria for completion, which may lead to uncertainty. For example, when assigning Marco to support calendar updates, key details were omitted. To improve, <highlight>add explicit timelines and desired outcomes</highlight> to every assignment.",
        shortenedSummary:
          "You should <highlight>add explicit timelines and desired outcomes</highlight> when delegating tasks to avoid uncertainty.",
      },
      {
        id: "growth2",
        title: "Increase Consistency in Communication Style",
        summary:
          "Your tone sometimes shifts from formal to overly casual, as seen when directing Marvin to 'speed run' his update. This can create confusion about priorities. To strengthen team understanding, ensure your communication style is <highlight>consistently clear and professional</highlight> in all delegations.",
        shortenedSummary:
          "Ensure your communication is <highlight>consistently clear and professional</highlight> when delegating tasks to avoid confusion.",
      },
      {
        id: "growth3",
        title: "Ensure Ownership Is Always Clearly Defined",
        summary:
          "In a few moments, such as delegating follow-up monitoring tasks, ownership or next steps were ambiguous. Strengthen accountability by <highlight>explicitly naming who is responsible</highlight> for every task and confirming their understanding.",
        shortenedSummary:
          "Clarify <highlight>ownership and next steps</highlight> when delegating to ensure accountability.",
      },
    ],
    keyMoments: [
      {
        id: "moment1",
        title: "Empowering Marvin to Redefine His Role",
        summary:
          "You asked Marvin to propose three new ideas for his role, inviting his input and planning a follow-up discussion. This moment highlights your commitment to empowering team members and fostering innovation.",
        people: ["Marvin"],
        shortenedSummary:
          "You empower team members and foster innovation by inviting their input and following up on their ideas.",
      },
      {
        id: "moment2",
        title: "Clear Assignment of Zoom Recording Vulnerability Task to Marco",
        summary:
          "You assigned Marco the responsibility to address Zoom recording vulnerabilities with a specific deadline, demonstrating decisive delegation and clarity in expectations.",
        people: ["Marco"],
        shortenedSummary:
          "You delegated the task to address Zoom recording vulnerabilities to Marco with <highlight>clear expectations and a deadline</highlight>.",
      },
      {
        id: "moment3",
        title: "Delegating Daily Metrics Report to Tim",
        summary:
          "You tasked Tim with building a daily metrics report, specifying the metrics required and transferring clear responsibility, which helped set a strong standard for detailed delegation.",
        people: ["Tim"],
        shortenedSummary:
          "You set a strong standard for <highlight>detailed delegation</highlight> by clearly specifying requirements and responsibilities.",
      },
    ],
  },
  meetingMinutes: 120,
};

export default SkillReportReadyEmail;
