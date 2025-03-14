import { cn } from "~/lib/utils";

export type ReportMetric = {
  id: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
};

export type ReportMetricsProps = {
  metrics: ReportMetric[];
  selectedTab: "positive" | "negative";
};

export function ReportMetrics({ metrics, selectedTab }: ReportMetricsProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card p-6">
      {metrics.map((metric) => {
        const isHighlighted =
          selectedTab === "positive"
            ? metric.value < 50
            : selectedTab === "negative"
              ? metric.value >= 50
              : false;

        return (
          <div key={metric.id} className="flex items-center gap-4">
            <div
              className={cn(
                "w-32 text-right text-sm transition-colors duration-200",
                selectedTab === "positive"
                  ? isHighlighted
                    ? "font-medium text-primary"
                    : "text-primary/40"
                  : "text-muted-foreground/40",
              )}
            >
              {metric.leftLabel}
            </div>
            <div className="relative h-2 flex-1 rounded-full bg-muted">
              <div
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ease-out",
                  isHighlighted && selectedTab === "positive"
                    ? "scale-125 bg-primary"
                    : isHighlighted && selectedTab === "negative"
                      ? "scale-125 bg-amber-500"
                      : metric.value < 50
                        ? "bg-primary/60"
                        : "bg-amber-500/60",
                )}
                style={{ left: `${metric.value}%` }}
              />
            </div>
            <div
              className={cn(
                "w-32 text-left text-sm transition-colors duration-200",
                selectedTab === "negative"
                  ? isHighlighted
                    ? "font-medium text-amber-500"
                    : "text-amber-500/40"
                  : "text-muted-foreground/40",
              )}
            >
              {metric.rightLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}
