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
    <div className="flex flex-col gap-4 rounded-xl bg-card p-4 sm:p-6">
      {metrics.map((metric) => {
        const isHighlighted =
          selectedTab === "positive"
            ? metric.value < 50
            : selectedTab === "negative"
              ? metric.value >= 50
              : false;

        return (
          <div
            key={metric.id}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="flex w-full justify-between sm:block sm:w-auto sm:justify-start">
              <div
                className={cn(
                  "text-left text-sm transition-colors duration-200 sm:w-32 sm:text-right",
                  selectedTab === "negative"
                    ? isHighlighted
                      ? "font-medium text-amber-500"
                      : "text-amber-500/40"
                    : "text-muted-foreground/40",
                )}
              >
                {metric.leftLabel}
              </div>

              <div
                className={cn(
                  "text-right text-sm transition-colors duration-200 sm:hidden",
                  selectedTab === "positive"
                    ? isHighlighted
                      ? "font-medium text-primary"
                      : "text-primary/40"
                    : "text-muted-foreground/40",
                )}
              >
                {metric.rightLabel}
              </div>
            </div>

            <div className="relative h-2 flex-1 rounded-full bg-muted">
              <div
                className={cn(
                  "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500 ease-out sm:h-4 sm:w-4",
                  isHighlighted && selectedTab === "positive"
                    ? "scale-125 bg-primary"
                    : isHighlighted && selectedTab === "negative"
                      ? "scale-125 bg-amber-500"
                      : metric.value < 50
                        ? "bg-amber-500/60"
                        : "bg-primary/60",
                )}
                style={{ left: `${100 - metric.value}%` }}
              />
            </div>

            <div
              className={cn(
                "hidden text-left text-sm transition-colors duration-200 sm:block sm:w-32",
                selectedTab === "positive"
                  ? isHighlighted
                    ? "font-medium text-primary"
                    : "text-primary/40"
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
