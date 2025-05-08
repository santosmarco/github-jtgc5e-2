import { Column, Img, Row, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

import { BASE_URL } from "../constants";

export type ReportHeaderProps = {
  /**
   * Main headline to display in the report header
   */
  headline: ReactNode;
  /**
   * User's nickname for personalization
   */
  nickname?: string;
  /**
   * Total meeting minutes analyzed for the report
   */
  meetingMinutes?: number;
  /**
   * Start date of the report period
   */
  startDate?: string;
  /**
   * End date of the report period
   */
  endDate?: string;
  /**
   * Additional CSS classes to apply to the hero section
   */
  className?: string;
};

export function ReportHeader({
  headline,
  nickname,
  meetingMinutes,
  startDate,
  endDate,
  className,
}: ReportHeaderProps): JSX.Element {
  const hasUserContext = Boolean(nickname && meetingMinutes !== undefined);

  return (
    <>
      <HeaderBar startDate={startDate} endDate={endDate} />
      <HeroSection
        headline={headline}
        nickname={nickname}
        meetingMinutes={meetingMinutes}
        className={className}
        hasUserContext={hasUserContext}
      />
    </>
  );
}

type HeaderBarProps = {
  startDate?: string;
  endDate?: string;
};

function HeaderBar({ startDate, endDate }: HeaderBarProps): JSX.Element {
  const dateRangeText = getDateRangeText(startDate, endDate);

  return (
    <Section className="bg-black px-6 py-5 sm:px-8 sm:py-6">
      <Row className="flex-col items-center justify-between sm:flex-row">
        <Column className="mb-2 sm:mb-0">
          <LogoImage />
        </Column>
        <Column className="text-right">
          <Text className="m-0 text-xs tracking-wider text-white">
            {dateRangeText}
          </Text>
        </Column>
      </Row>
    </Section>
  );
}

function LogoImage(): JSX.Element {
  return (
    <Img
      src={`${BASE_URL}/titan-logo-text.png`}
      width="auto"
      height="24"
      alt="Titan Logo"
      className="inline h-6"
    />
  );
}

type HeroSectionProps = {
  headline: ReactNode;
  nickname?: string;
  meetingMinutes?: number;
  className?: string;
  hasUserContext: boolean;
};

function HeroSection({
  headline,
  nickname,
  meetingMinutes,
  className,
  hasUserContext,
}: HeroSectionProps): JSX.Element {
  return (
    <Section
      className={cn(
        "bg-gray-900 px-6 pb-6 pt-4 text-center text-white sm:px-10 sm:pb-6 sm:pt-4",
        className,
      )}
    >
      <Text className="mb-4 text-xl font-bold leading-tight text-white sm:mb-5 sm:text-2xl">
        {headline}
      </Text>
      {hasUserContext && (
        <UserContextMessage
          nickname={nickname}
          meetingMinutes={meetingMinutes}
        />
      )}
    </Section>
  );
}

type UserContextMessageProps = {
  nickname?: string;
  meetingMinutes?: number;
};

function UserContextMessage({
  nickname,
  meetingMinutes,
}: UserContextMessageProps): JSX.Element {
  return (
    <Text className="m-0 text-sm leading-relaxed text-gray-200 sm:text-base">
      <span className="font-semibold text-indigo-300">{nickname},</span>{" "}
      we&apos;ve{" "}
      {!meetingMinutes ? (
        "analyzed your recent meetings"
      ) : (
        <>
          analyzed{" "}
          <span className="font-semibold text-indigo-300">
            {meetingMinutes} minutes
          </span>{" "}
          of your recent meetings
        </>
      )}{" "}
      and uncovered valuable insights tailored specifically for you.
    </Text>
  );
}

function getDateRangeText(startDate?: string, endDate?: string): string {
  return startDate && endDate
    ? `${startDate} - ${endDate}`
    : "LEADERSHIP REPORT";
}
