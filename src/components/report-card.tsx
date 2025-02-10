"use client";

import dayjs from "dayjs";
import { motion, type MotionProps } from "framer-motion";
import { AlertTriangle, FileText, Goal, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";

type Report = RouterOutputs["reports"]["listForUser"][number];

type ReportCardProps = MotionProps & {
  report: Report;
  className?: string;
};

export function ReportCard({
  report: initialReport,
  className,
  ...props
}: ReportCardProps) {
  const [report, setReport] = useState(initialReport);
  const { data: updatedReport } = api.reports.getGroupReportStatus.useQuery(
    { groupId: report.id },
    {
      enabled: report.status !== "completed" && report.status !== "failed",
      refetchInterval: 2000, // Refetch every 2 seconds while processing
    },
  );

  useEffect(() => {
    if (updatedReport) {
      setReport((current) => ({
        ...current,
        status: updatedReport.status,
      }));
    }
  }, [updatedReport]);

  const isProcessing =
    report.status === "pending" || report.status === "partial";
  const isFailed = report.status === "failed";
  const isComplete = report.status === "completed";
  const goals = report.report_goals ?? [];
  const remainingGoals = Math.max(0, goals.length - 2);

  return (
    <motion.div
      className={cn(
        "group relative h-full overflow-hidden rounded-lg border bg-card p-4 text-card-foreground transition-all",
        !isFailed && !isProcessing && "hover:shadow-md",
        isFailed && "cursor-not-allowed border-destructive/20 bg-destructive/5",
        isProcessing && "cursor-not-allowed",
        className,
      )}
      whileHover={!isFailed && !isProcessing ? { scale: 1.01 } : undefined}
      {...props}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {isComplete && (
            <div className="flex h-3.5 items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs leading-none text-muted-foreground">
                Complete
              </span>
            </div>
          )}
          {isProcessing && (
            <div className="flex h-3.5 items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs leading-none text-muted-foreground">
                Processing
              </span>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium leading-none">
              Report {dayjs(report.created_at).format("MMM D, YYYY")}
            </h3>
          </div>
        </div>

        <div className="space-y-2">
          {goals.slice(0, 2).map((goal) => (
            <div
              key={goal.id}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <Goal className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate leading-none">{goal.text}</span>
            </div>
          ))}
          {remainingGoals > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Goal className="h-3.5 w-3.5" />
              <span className="leading-none">+{remainingGoals} more goals</span>
            </div>
          )}
        </div>
      </div>

      {isFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-xs font-medium text-destructive">Failed</p>
            <p className="text-xs text-muted-foreground">
              Please try again later
            </p>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-1.5">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">
              Processing report...
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
