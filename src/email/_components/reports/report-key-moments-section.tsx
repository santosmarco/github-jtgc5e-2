import { Section } from "@react-email/components";

import { Button } from "../button";
import { ReportKeyMoment } from "./report-key-moment";
import { ReportSectionHeading } from "./report-section-heading";

export type KeyMoment = {
  id: string;
  title: string;
  summary: string;
  people: string[];
};

export type ReportKeyMomentsSectionProps = {
  moments: KeyMoment[];
  buttonHref: string;
  className?: string;
  highlightTitle?: boolean;
  highlightSummary?: boolean;
};

export function ReportKeyMomentsSection({
  moments,
  buttonHref,
  className,
  highlightTitle = true,
  highlightSummary = false,
}: ReportKeyMomentsSectionProps) {
  if (moments.length === 0) return null;

  return (
    <Section className={className}>
      <ReportSectionHeading title="KEY LEADERSHIP MOMENTS" color="indigo" />

      <div className="space-y-4">
        {moments.map((moment) => (
          <ReportKeyMoment
            key={moment.id}
            id={moment.id}
            title={moment.title}
            summary={moment.summary}
            people={moment.people}
            highlightTitle={highlightTitle}
            highlightSummary={highlightSummary}
          />
        ))}
      </div>

      <div className="mt-6 text-center">
        <Button href={buttonHref} className="bg-indigo-600">
          Review Key Moments →
        </Button>
      </div>
    </Section>
  );
}
