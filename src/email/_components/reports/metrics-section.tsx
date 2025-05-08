import { Section } from "@react-email/components";
import _ from "lodash";

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
    <Section className={cn("my-4 w-full", className)}>
      <ReportSectionHeading title={title} />

      {metrics.length > 0 && (
        <Section>
          {metrics.map((metric, index) => (
            <MetricsScale
              key={`${_.camelCase(metric.leftLabel)}_${_.camelCase(metric.rightLabel)}`}
              leftLabel={metric.leftLabel}
              rightLabel={metric.rightLabel}
              value={metric.value}
              showNotches={showNotches}
              className={cn(
                "mb-2",
                index === metrics.length - 1 && "mb-0",
                index === 0 && "mt-0",
              )}
            />
          ))}
        </Section>
      )}
    </Section>
  );
}
