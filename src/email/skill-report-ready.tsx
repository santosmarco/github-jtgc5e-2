import { faker } from "@faker-js/faker";
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
import dayjs from "dayjs";
import _ from "lodash";

import type { HistoricalSkillScore, ReportScore } from "~/lib/reports/scoring";
import type { Enums, Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
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
  relatedThemes?: string[];
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
  const metricsUrl = createUtmUrl(baseReportUrl, "metrics");
  const wellDoneUrl = createUtmUrl(baseReportUrl, "doing_well");
  const growthUrl = createUtmUrl(baseReportUrl, "growth_areas");
  const momentsUrl = createUtmUrl(baseReportUrl, "key_moments");
  const reportUrl = createUtmUrl(baseReportUrl, "report");

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
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
        </Head>
        <Body className="m-0 bg-gray-50 font-sans">
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
                  href={metricsUrl}
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

              {isFounder && <Hr />}

              {/* Final CTA */}
              <CTAButtonSection
                href={reportUrl}
                buttonText={
                  isFounder
                    ? "View Full Report Data →"
                    : "View Complete Analysis →"
                }
                className="mb-3"
                buttonClassName={
                  isFounder ? "mt-1" : "px-6 py-3 text-base font-medium"
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

function generateMockReportScores(
  startDate: Date,
  endDate: Date,
  createdAt: Date,
) {
  return {
    status: "success",
    date: endDate.toISOString(),
    report: {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      created_at: createdAt.toISOString(),
      id: faker.string.uuid(),
      skill: {
        scales: [
          {
            negative_tag_title: "Ambiguous and unclear",
            positive_tag_title: "Clear and concise",
          },
        ],
      },
      report_moments: [
        {
          is_visible: true,
          omission_reason: null,
          moment: {
            latest: true,
            _internal_thumbs_down: 0,
            relevant: true,
            subtags: [],
          },
        },
      ],
      processing_statuses: [
        {
          group_processing_status_id: `status-${faker.number.int(100)}`,
        },
      ],
    },
    metrics: [
      {
        id: `metric-${faker.number.int(100)}`,
        leftLabel: "Clear and concise",
        rightLabel: "Ambiguous and unclear",
        value: faker.number.int({ min: 70, max: 90 }),
      },
      {
        id: `metric-${faker.number.int(100)}`,
        leftLabel: "Direct and assertive",
        rightLabel: "Indirect and passive",
        value: faker.number.int({ min: 70, max: 90 }),
      },
      {
        id: `metric-${faker.number.int(100)}`,
        leftLabel: "Empathetic and supportive",
        rightLabel: "Unsupportive and unempathetic",
        value: faker.number.int({ min: 70, max: 90 }),
      },
      {
        id: `metric-${faker.number.int(100)}`,
        leftLabel: "Supportive and empathetic",
        rightLabel: "Unsupportive and unempathetic",
        value: faker.number.int({ min: 70, max: 90 }),
      },
    ],
    negativeScore: faker.number.int({ min: 10, max: 30 }),
    positiveScore: faker.number.int({ min: 70, max: 90 }),
    finalScore: faker.number.int({ min: 70, max: 90 }),
  } satisfies SkillReportReadyEmailProps["report"]["scores"];
}

function generateMockReport(date: Date) {
  const endDate = new Date(date);
  const startDate = new Date(date);
  startDate.setDate(endDate.getDate() - 14); // 14 day window

  const createdAt = new Date(endDate);
  createdAt.setHours(23, 59, 59, 999); // End of the last day

  return {
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    skill: {
      internal_title: "Strategic Communication",
      scales: [
        {
          id: faker.string.uuid(),
          positive_tag_title: "Clear and concise",
          positive_tag_description: "You convey ideas clearly and concisely.",
          negative_tag_title: "Ambiguous and unclear",
          negative_tag_description:
            "You convey ideas ambiguously and unclearly.",
          skill_id: faker.string.uuid(),
        },
        {
          id: faker.string.uuid(),
          positive_tag_title: "Direct and assertive",
          positive_tag_description:
            "You convey ideas directly and assertively.",
          negative_tag_title: "Indirect and passive",
          negative_tag_description:
            "You convey ideas indirectly and passively.",
          skill_id: faker.string.uuid(),
        },
        {
          id: faker.string.uuid(),
          positive_tag_title: "Empathetic and supportive",
          positive_tag_description: "You show empathy and support.",
          negative_tag_title: "Unsupportive and unempathetic",
          negative_tag_description: "You show unsupportive and unempathetic.",
          skill_id: faker.string.uuid(),
        },
        {
          id: faker.string.uuid(),
          positive_tag_title: "Supportive and empathetic",
          positive_tag_description: "You show supportive and empathetic.",
          negative_tag_title: "Unsupportive and unempathetic",
          negative_tag_description: "You show unsupportive and unempathetic.",
          skill_id: faker.string.uuid(),
        },
      ],
    },
    profile: {
      nickname: faker.person.firstName(),
    },
    scores: generateMockReportScores(startDate, endDate, createdAt),
  } satisfies SkillReportReadyEmailProps["report"];
}

SkillReportReadyEmail.PreviewProps = {
  variant: "skill-report-ready-founder",
  previewText: "Your Strategic Communication skill report is ready to review",
  baseReportUrl: "https://example.com/reports/",
  teaser:
    "In this report, your interactions with Ralf on the <highlight:moment>Germany market action plan</highlight:moment> reveal your <highlight:strength>clear, direct delegation</highlight:strength> that empowers team members to take ownership—but your <highlight:growth>brief instructions to Piotr during the glove testing follow-up</highlight:growth> highlight a chance to verify understanding and strengthen communication. See how refining your approach can further build cross-cultural management systems for scale!",
  report: generateMockReport(new Date()),
  historicalScores: [
    generateMockReportScores(
      dayjs().subtract(8, "weeks").toDate(),
      dayjs().subtract(6, "weeks").toDate(),
      dayjs().subtract(6, "weeks").toDate(),
    ),
    generateMockReportScores(
      dayjs().subtract(6, "weeks").toDate(),
      dayjs().subtract(4, "weeks").toDate(),
      dayjs().subtract(4, "weeks").toDate(),
    ),
    generateMockReportScores(
      dayjs().subtract(4, "weeks").toDate(),
      dayjs().subtract(2, "weeks").toDate(),
      dayjs().subtract(2, "weeks").toDate(),
    ),
    generateMockReportScores(
      dayjs().subtract(2, "weeks").toDate(),
      dayjs().toDate(),
      dayjs().toDate(),
    ),
  ],
  sections: {
    strengthSections: [
      {
        id: "strength1",
        title: "Clear, Direct Delegation",
        summary:
          "You consistently provide clear, actionable instructions by delegating tasks such as advancing the Germany market, reassigning roles, and managing production details. You ensure that team members like Ralf, Filip, and Agnieszka understand their responsibilities. Your approach supports <highlight>Building Cross-Cultural Management Systems for Scale</highlight> by establishing transparent communication and clear accountability.",
        relatedThemes: [
          "Building Cross-Cultural Management Systems for Scale",
          "Strengthening Operational Rigor & Accountability at the Mid-Level",
        ],
        shortenedSummary:
          "You excel at <highlight>Building Cross-Cultural Management Systems for Scale</highlight> by providing clear, actionable instructions and ensuring transparent communication and accountability across your team.",
      },
      {
        id: "strength2",
        title: "Detailed Task Assignment",
        summary:
          "You clearly define tasks with specific details and context, as shown when you delegated follow-ups with Allianz and confirmed stock availability. Your detailed instructions ensure that responsibilities and rationale are understood, reinforcing accountability and precision in execution.",
        relatedThemes: [
          "Strengthening Operational Rigor & Accountability at the Mid-Level",
        ],
        shortenedSummary:
          "You provide <highlight>explicit task guidance</highlight>, ensuring team members understand both their responsibilities and the context behind them, which strengthens accountability and execution precision.",
      },
      {
        id: "strength3",
        title: "Structured Team Delegation",
        summary:
          "You methodically assign and confirm roles, building trust across your team. Your structured delegation process—evident in various task assignments—ensures responsibilities are clearly communicated and met, supporting scalable operations and efficient management across diverse regions.",
        relatedThemes: [
          "Building Cross-Cultural Management Systems for Scale",
          "Strengthening Operational Rigor & Accountability at the Mid-Level",
        ],
        shortenedSummary:
          "You foster team trust and operational efficiency through a <highlight>systematic role assignment process</highlight> that ensures clarity and accountability across diverse teams.",
      },
    ],
    growthSections: [
      {
        id: "growth1",
        title: "Enhance Context in Task Delegation",
        summary:
          "You sometimes issue brief instructions that lack sufficient context, as seen in the email notification setup task. An actionable next step is to include specific details and expected outcomes with your delegation. This improvement will help you build clearer cross-cultural management systems and reduce ambiguity.",
        relatedThemes: [
          "Building Cross-Cultural Management Systems for Scale",
          "Growing as a Self-Taught Executive Operator",
        ],
        shortenedSummary:
          "You can improve by providing <highlight>context-rich delegation</highlight>, ensuring instructions include specific details and expected outcomes to minimize ambiguity and enhance clarity.",
      },
      {
        id: "growth2",
        title: "Clarify Task Descriptions",
        summary:
          "You occasionally provide task instructions that remain vague, as demonstrated by the screen fill-in request to Sarah. A clear action is to specify detailed requirements and desired outcomes. Enhancing clarity in your task descriptions will bolster operational rigor and ensure team members understand their responsibilities.",
        relatedThemes: [
          "Strengthening Operational Rigor & Accountability at the Mid-Level",
          "Growing as a Self-Taught Executive Operator",
        ],
        shortenedSummary:
          "You can strengthen your leadership by providing <highlight>explicit task instructions</highlight>, ensuring team members have clear requirements and understand expected outcomes.",
      },
      {
        id: "growth3",
        title: "Verify Understanding Before Execution",
        summary:
          "You delegate tasks without always confirming that your instructions are fully understood, as seen with the follow-up assignment to Piotr. An effective next step is to ask for confirmation or feedback immediately after delegation. This practice will enhance accountability and streamline communication across culturally diverse teams.",
        relatedThemes: [
          "Growing as a Self-Taught Executive Operator",
          "Strengthening Operational Rigor & Accountability at the Mid-Level",
        ],
        shortenedSummary:
          "You can improve delegation by seeking immediate confirmation or feedback after assigning tasks, ensuring clarity and accountability, especially within diverse teams.",
      },
    ],
    keyMoments: [
      {
        id: "moment1",
        title: "Advance Germany Market Actions",
        summary:
          "You delegated responsibility to Ralf for advancing the Germany market by leading the mailing campaign and addressing exhibition challenges. You provided clear, direct instructions detailing next steps and assigning ownership, which empowered Ralf to execute his role confidently. You ensured that all instructions were unambiguous, highlighting your ability to drive operational accountability. This moment demonstrates your alignment with Building Cross-Cultural Management Systems for Scale and Strengthening Operational Rigor, as it underscores the importance of clear communication across diverse geographies.",
        people: ["Ralf"],
        relatedThemes: [
          "Building Cross-Cultural Management Systems for Scale",
          "Strengthening Operational Rigor & Accountability at the Mid-Level",
        ],
        shortenedSummary:
          "You demonstrated <highlight>clear, direct delegation</highlight> by assigning Ralf ownership of the Germany market initiatives, reinforcing operational accountability and effective cross-cultural communication.",
      },
      {
        id: "moment2",
        title: "Assign Follow-Up to Piotr",
        summary:
          "You delegated the follow-up for glove testing to Piotr by instructing him to contact the patient. You did not confirm if Piotr fully understood the task details, leaving room for ambiguity in execution. You can benefit from verifying comprehension with a quick check-in after delegation. This moment illustrates an opportunity to improve communication clarity and accountability, aligning with Growing as a Self-Taught Executive Operator and enhancing systematic follow-ups in cross-cultural team settings.",
        people: ["Piotr"],
        relatedThemes: [
          "Growing as a Self-Taught Executive Operator",
          "Strengthening Operational Rigor & Accountability at the Mid-Level",
        ],
        shortenedSummary:
          "You can strengthen your <highlight>delegation clarity and accountability</highlight> by verifying task comprehension after assigning responsibilities, ensuring effective execution and improved cross-cultural communication.",
      },
    ],
  },
  meetingMinutes: faker.number.int({ min: 0, max: 1000 }),
} satisfies SkillReportReadyEmailProps;

export default SkillReportReadyEmail;
