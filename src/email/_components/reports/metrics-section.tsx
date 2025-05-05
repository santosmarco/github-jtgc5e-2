import { Section } from "@react-email/components";

import { cn } from "~/lib/utils";

import { MetricsScale } from "./metrics-scale";
import { ReportSectionHeading } from "./report-section-heading";

export type MetricsPair = {
  leftLabel: string;
  rightLabel: string;
  value: number;
};

export type MetricsSectionProps = {
  title?: string;
  metrics: MetricsPair[];
  showNotches?: boolean;
  className?: string;
};

export function MetricsSection({
  title = "LEADERSHIP DIMENSIONS",
  metrics,
  showNotches = false,
  className,
}: MetricsSectionProps) {
  return (
    <Section className={cn("mb-8 mt-8", className)}>
      <ReportSectionHeading title={title} />

      {metrics.length > 0 && (
        <Section>
          {metrics.map((metric, index) => (
            <MetricsScale
              key={index}
              leftLabel={metric.leftLabel}
              rightLabel={metric.rightLabel}
              value={metric.value}
              showNotches={showNotches}
            />
          ))}
        </Section>
      )}
    </Section>
  );
}
