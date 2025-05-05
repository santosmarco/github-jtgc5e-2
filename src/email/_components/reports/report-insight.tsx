import { Column, Row, Text } from "@react-email/components";

import { cn } from "~/lib/utils";

import { HighlightableText } from "./highlightable-text";

export type InsightType = "strength" | "growth";

export type ReportInsightProps = {
  id: string;
  summary: string;
  type: InsightType;
  highlight?: boolean;
  isLast?: boolean;
};

// Icon and color configuration based on insight type
const ICON_CONFIG = {
  strength: { symbol: "✓", colorClass: "text-emerald-600" },
  growth: { symbol: "↗", colorClass: "text-amber-600" },
} as const satisfies Record<
  InsightType,
  { symbol: string; colorClass: string }
>;

export function ReportInsight({
  id,
  summary,
  type,
  highlight = true,
  isLast = false,
}: ReportInsightProps) {
  const { symbol, colorClass } = ICON_CONFIG[type];

  // Process summary with or without highlights
  const processedSummary = highlight ? (
    <HighlightableText highlightClassName={cn("font-semibold", colorClass)}>
      {summary}
    </HighlightableText>
  ) : (
    summary.replace(/<highlight>|<\/highlight>/g, "")
  );

  return (
    <Row key={id} className={cn("mb-4 align-top", { "mb-0": isLast })}>
      <Column
        className={cn("w-4 flex-shrink-0 pr-2 align-baseline", colorClass)}
      >
        <Text className="m-0 font-bold">{symbol}</Text>
      </Column>
      <Column>
        <Text className="m-0 text-sm leading-relaxed text-gray-600">
          {processedSummary}
        </Text>
      </Column>
    </Row>
  );
}
