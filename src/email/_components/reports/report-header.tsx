import { Column, Img, Row, Section, Text } from "@react-email/components";

import { BASE_URL } from "../constants";

export type ReportHeaderProps = {
  headline: React.ReactNode;
  nickname?: string;
  meetingMinutes?: number;
  startDate?: string;
  endDate?: string;
  className?: string;
};

export function ReportHeader({
  headline,
  nickname,
  meetingMinutes,
  startDate,
  endDate,
  className,
}: ReportHeaderProps) {
  return (
    <>
      {/* Header */}
      <Section className="bg-black px-6 py-5 sm:px-8 sm:py-6">
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
              {startDate && endDate
                ? `${startDate} - ${endDate}`
                : "LEADERSHIP REPORT"}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Hero Section */}
      <Section
        className={`bg-gray-900 px-6 pb-6 pt-4 text-center text-white sm:px-10 sm:pb-6 sm:pt-4 ${className || ""}`}
      >
        <Text className="mb-4 text-xl font-bold leading-tight text-white sm:mb-5 sm:text-2xl">
          {headline}
        </Text>
        {nickname && meetingMinutes && (
          <Text className="m-0 text-sm leading-relaxed text-gray-200 sm:text-base">
            {nickname}, we&apos;ve analyzed{" "}
            <span className="font-semibold text-indigo-300">
              {meetingMinutes} minutes
            </span>{" "}
            of your recent meetings and uncovered valuable insights tailored
            specifically for you.
          </Text>
        )}
      </Section>
    </>
  );
}
