import {
  Body,
  Column,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import type { Tables } from "~/lib/supabase/database.types";

import { BASE_URL } from "./_components/constants";
import tailwindEmailConfig from "./tailwind.config";

export type SkillReportReadyEmailProps = {
  profile: Pick<Tables<"profiles">, "nickname" | "email" | "coach_id">;
  report: Pick<
    Tables<"reports">,
    "id" | "start_date" | "end_date" | "created_at"
  > & {
    skill?: Pick<Tables<"skills">, "id" | "description" | "title"> | null;
    report_goals: Array<Tables<"report_goals">>;
    report_moments: Array<
      Tables<"report_moments"> & {
        moment: Tables<"moments">;
      }
    >;
    score?: number;
    previous_score?: number;
  };
};

export function SkillReportReadyEmail({
  profile,
  report,
}: SkillReportReadyEmailProps) {
  const previewText = "📊 Your leadership insights report is ready to view";
  const reportUrl = `https://app.withtitan.com/goals/reports/${report.id}`;

  // Format date range
  const startDate = report.start_date
    ? new Date(report.start_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Recent";
  const endDate = report.end_date
    ? new Date(report.end_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Now";

  // Calculate metrics
  const hasScoreData =
    report.score !== undefined && report.previous_score !== undefined;
  const scoreChanged = hasScoreData
    ? report.score !== report.previous_score
    : false;
  const scoreImproved =
    hasScoreData &&
    report.score !== undefined &&
    report.previous_score !== undefined
      ? report.score > report.previous_score
      : false;
  const momentCount = report.report_moments?.length || 0;
  const scoreDifference =
    hasScoreData && report.score && report.previous_score
      ? report.score - report.previous_score
      : 0;

  // Generate score display
  const scoreDisplay =
    hasScoreData && report.score ? Math.round(report.score) : null;
  const previousScoreDisplay =
    hasScoreData && report.previous_score
      ? Math.round(report.previous_score)
      : null;

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
          <Container className="mx-auto w-full max-w-[600px] bg-white">
            {/* Header */}
            <Section className="bg-black px-4 py-4 sm:px-8 sm:py-6">
              <Row className="flex-col items-center justify-between sm:flex-row">
                <Column className="mb-2 sm:mb-0">
                  <Img
                    src={`${BASE_URL}/titan-logo-text.png`}
                    width="auto"
                    height="24"
                    alt="Titan Logo"
                    className="inline h-6"
                  />
                </Column>
                <Column className="text-right">
                  <Text className="m-0 text-xs tracking-wider text-white">
                    LEADERSHIP REPORT
                  </Text>
                </Column>
              </Row>
            </Section>

            {/* Hero Section */}
            <Section className="bg-gray-900 px-4 py-6 text-center text-white sm:px-8 sm:py-10">
              <Text className="mb-3 text-xl font-bold text-white sm:mb-4 sm:text-2xl">
                Your Leadership Insights Are Ready
              </Text>
              <Text className="m-0 text-sm leading-5 text-gray-200 sm:text-base sm:leading-6">
                {profile.nickname}, we&apos;ve analyzed your recent interactions
                and uncovered key patterns.
              </Text>
            </Section>

            {/* Report Card */}
            <Section className="relative -top-3 mx-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:-top-5 sm:mx-4 sm:p-8">
              {/* Report Meta */}
              <Row className="space-y-4 px-2 align-top sm:space-y-0 sm:px-0">
                <Column className="w-1/2 align-top">
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                    REPORT PERIOD
                  </Text>
                  <Text className="m-0 text-sm font-medium text-gray-900 sm:text-base">
                    {startDate} - {endDate}
                  </Text>
                </Column>
                <Column className="w-1/2 align-top">
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                    SKILL FOCUS
                  </Text>
                  <Text className="m-0 text-sm font-medium text-gray-900 sm:text-base">
                    {report.skill?.title || "Strategic Communication"}
                  </Text>
                </Column>
              </Row>

              {/* Score Visualization */}
              {scoreDisplay && (
                <div className="mt-5 border-y border-gray-200 py-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="text-center">
                      <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                        CURRENT SCORE
                      </Text>
                      <Text className="m-0 text-3xl font-bold text-gray-900 sm:text-4xl">
                        {scoreDisplay}
                      </Text>
                    </div>
                    {previousScoreDisplay && (
                      <div className="text-center">
                        <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                          PREVIOUS
                        </Text>
                        <Text className="m-0 text-3xl font-bold text-gray-500 sm:text-4xl">
                          {previousScoreDisplay}
                        </Text>
                      </div>
                    )}
                    {scoreChanged && (
                      <div className="text-center">
                        <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                          TREND
                        </Text>
                        <div className="flex justify-center">
                          {scoreImproved ? (
                            <div className="flex flex-col items-center">
                              <Text className="m-0 text-3xl font-bold text-green-500 sm:text-2xl">
                                +{scoreDifference.toFixed(0)}
                              </Text>
                              <div className="mt-1 h-0 w-0 border-b-[12px] border-l-[8px] border-r-[8px] border-b-green-500 border-l-transparent border-r-transparent sm:border-b-[16px] sm:border-l-[10px] sm:border-r-[10px]" />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <Text className="m-0 text-3xl font-bold text-red-500 sm:text-2xl">
                                {scoreDifference.toFixed(0)}
                              </Text>
                              <div className="mt-1 h-0 w-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-red-500 sm:border-l-[10px] sm:border-r-[10px] sm:border-t-[16px]" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Score Progress Bar */}
                  <div className="relative mt-4 hidden h-2 w-full overflow-hidden rounded bg-gray-100 sm:block">
                    <div
                      className="absolute left-0 top-0 h-2 bg-gray-400"
                      style={{
                        width: `${previousScoreDisplay ? previousScoreDisplay : 0}%`,
                      }}
                    />
                    <div
                      className="absolute h-2 bg-indigo-600"
                      style={{
                        width: `${scoreImproved && scoreDifference ? scoreDifference : 0}%`,
                        left: `${previousScoreDisplay ? previousScoreDisplay : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Teaser Insights */}
              <div className="px-2 py-4 sm:px-0 sm:py-6">
                <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-900 sm:mb-4 sm:text-sm">
                  KEY FINDINGS
                </Text>

                <Row className="mb-2 rounded-md border-l-2 border-l-indigo-600 bg-gray-50 p-3 sm:border-l-4 sm:p-4">
                  <Column>
                    <Row>
                      <Column className="flex-shrink-0 pr-2 text-lg sm:pr-0 sm:text-xl">
                        🔍
                      </Column>
                      <Column>
                        <Text className="m-0 text-xs leading-relaxed text-gray-700 sm:text-sm">
                          {momentCount} critical moments identified that reveal
                          your leadership patterns
                        </Text>
                      </Column>
                    </Row>
                  </Column>
                </Row>

                <Row className="mb-2 rounded-md border-l-2 border-l-indigo-600 bg-gray-50 p-3 sm:border-l-4 sm:p-4">
                  <Column>
                    <Row>
                      <Column className="flex-shrink-0 pr-2 text-lg sm:pr-0 sm:text-xl">
                        💡
                      </Column>
                      <Column>
                        <Text className="m-0 text-xs leading-relaxed text-gray-700 sm:text-sm">
                          Specific behavioral trends detected in your
                          communication style
                        </Text>
                      </Column>
                    </Row>
                  </Column>
                </Row>

                <Row className="mb-2 rounded-md border-l-2 border-l-indigo-600 bg-gray-50 p-3 sm:border-l-4 sm:p-4">
                  <Column>
                    <Row>
                      <Column className="flex-shrink-0 pr-2 text-lg sm:pr-0 sm:text-xl">
                        📊
                      </Column>
                      <Column>
                        <Text className="m-0 text-xs leading-relaxed text-gray-700 sm:text-sm">
                          Comparative analysis against your previous performance
                        </Text>
                      </Column>
                    </Row>
                  </Column>
                </Row>
              </div>
            </Section>

            {/* CTA Button */}
            <Section className="mb-4 px-4 py-5 text-center sm:px-8 sm:py-8">
              <Link
                href={reportUrl}
                className="inline-block rounded bg-indigo-600 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white no-underline shadow-md transition-colors hover:bg-indigo-700 sm:w-auto sm:px-8 sm:py-4 sm:text-sm"
              >
                VIEW FULL REPORT →
              </Link>
            </Section>

            {/* Footer */}
            <Section className="border-t border-gray-200 bg-gray-100 px-4 py-4 sm:px-8 sm:py-6">
              <Text className="mb-3 text-xs leading-relaxed text-gray-500 sm:mb-4">
                This report contains confidential insights based on your recent
                leadership activities. For your eyes only.
              </Text>
              <Text className="m-0 text-xs font-medium text-gray-700">
                © 2024 Titan Leadership Analytics
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

// Mock data for preview in email clients
SkillReportReadyEmail.PreviewProps = {
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
    report_moments: Array(5).fill({
      moment: { id: "moment-123" },
    }),
    score: 78,
    previous_score: 72,
  },
} satisfies SkillReportReadyEmailProps;

export default SkillReportReadyEmail;
