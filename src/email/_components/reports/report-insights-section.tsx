import { Section } from "@react-email/components";

import { cn } from "~/lib/utils";

import { Button } from "../button";
import type { InsightType } from "./report-insight";
import { ReportInsight } from "./report-insight";
import { ReportSectionHeading } from "./report-section-heading";

export type ReportInsightItem = {
  id: string;
  summary: string;
};

export type ReportInsightsSectionProps = {
  title: string;
  type: InsightType;
  items: ReportInsightItem[];
  buttonHref: string;
  buttonText: string;
  className?: string;
  highlight?: boolean;
};

// Color configuration based on insight type
const COLOR_CONFIG = {
  strength: { color: "emerald", bgColor: "bg-emerald-600" },
  growth: { color: "amber", bgColor: "bg-amber-600" },
} as const satisfies Record<
  InsightType,
  {
    color: React.ComponentProps<typeof ReportSectionHeading>["color"];
    bgColor: string;
  }
>;

export function ReportInsightsSection({
  title,
  type,
  items,
  buttonHref,
  buttonText,
  className,
  highlight = true,
}: ReportInsightsSectionProps) {
  const { color, bgColor } = COLOR_CONFIG[type];

  return (
    <div className={cn("mb-12", className)}>
      <ReportSectionHeading title={title} color={color} />

      <Section className="space-y-3">
        {items.map((item, idx) => (
          <ReportInsight
            key={item.id}
            id={item.id}
            summary={item.summary}
            type={type}
            highlight={highlight}
            isLast={idx === items.length - 1}
          />
        ))}
      </Section>

      <div className="mt-6 text-center">
        <Button href={buttonHref} className={bgColor}>
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
