"use client";

import { motion } from "framer-motion";
import { CircleCheck, CircleFadingArrowUpIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GoalCard } from "~/components/goals/goal-card";
import { ReportMomentList } from "~/components/reports/report-moment-list";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import MarkdownRenderer from "~/components/ui/markdown-renderer";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import type { RouterOutputs } from "~/trpc/shared";
import { api } from "~/trpc/react";

type GroupReports = RouterOutputs["reports"]["getGroupReports"];

type Report = GroupReports["reports"][number];

export type ReportPageClientProps = GroupReports;

export function ReportPageClient({ group, reports }: ReportPageClientProps) {
  const [hiddenMoments, setHiddenMoments] = useState<
    Record<string, string | null>
  >(() => {
    const hiddenMoments: Record<string, string | null> = {};
    for (const reportMoment of reports.flatMap((r) => r.report_moments)) {
      if (!reportMoment.is_visible) {
        hiddenMoments[reportMoment.moment_id] = reportMoment.omission_reason;
      }
    }
    return hiddenMoments;
  });
  const [showHideReasonDialog, setShowHideReasonDialog] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<{
    id: string;
    reportId: string;
  } | null>(null);
  const [hideReason, setHideReason] = useState("");
  const apiUtils = api.useUtils();

  const hideMomentMutation = api.reports.hideMoment.useMutation({
    onSuccess: () => {
      toast.success("Moment hidden successfully");
      void apiUtils.reports.getGroupReports.invalidate({ groupId: group.id });
    },
    onError: (error) => {
      toast.error("Failed to hide moment", {
        description: error.message,
      });
    },
  });

  const handleHideMoment = (momentId: string, reportId: string) => {
    setSelectedMoment({ id: momentId, reportId });
    setShowHideReasonDialog(true);
  };

  const handleConfirmHide = () => {
    if (selectedMoment) {
      setHiddenMoments((prev) => ({
        ...prev,
        [selectedMoment.id]: hideReason,
      }));

      hideMomentMutation.mutate({
        momentId: selectedMoment.id,
        reportId: selectedMoment.reportId,
        reason: hideReason || "user",
      });

      setHideReason("");
      setShowHideReasonDialog(false);
      setSelectedMoment(null);
    }
  };

  const transformMoment = (
    reportMoment: Report["report_moments"][number],
    index: number,
  ): VideoMoment => ({
    id: reportMoment.moment_id,
    index: `${reportMoment.moment.video_api_id}_${reportMoment.moment.activity}_${index}`,
    sequence_id: Number(index) ?? 0,
    segment_id_sequence_start:
      reportMoment.moment.segment_id_sequence_start ?? 0,
    segment_id_sequence_end: reportMoment.moment.segment_id_sequence_end ?? 0,
    title: (reportMoment.moment.title ?? "").replace(/^"|"$/g, ""),
    summary: (reportMoment.moment.summary ?? "").replace(/^"|"$/g, ""),
    segment_start_timestamp: reportMoment.moment.segment_start_timestamp ?? "",
    segment_end_timestamp: reportMoment.moment.segment_end_timestamp ?? "",
    segment_start_timestamp_in_seconds:
      reportMoment.moment.segment_start_timestamp_in_seconds ?? 0,
    segment_end_timestamp_in_seconds:
      reportMoment.moment.segment_end_timestamp_in_seconds ?? 0,
    video_id: reportMoment.moment.video_api_id ?? "",
    activity_type: reportMoment.moment.activity_type ?? "",
    activity_reasoning: (reportMoment.moment.activity_reasoning ?? "").replace(
      /^"|"$/g,
      "",
    ),
    target_person_type: reportMoment.moment.target_person_type ?? "",
    target_person_reasoning: null,
    activity: reportMoment.moment.activity ?? "",
    relevant: reportMoment.moment.relevant ?? false,
    reactions: [],
  });

  return (
    <div className="mx-auto max-w-3xl space-y-12 py-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold">Group Report</h1>
        <p className="text-muted-foreground">
          Status: {group.status ?? "Unknown"}
        </p>
      </motion.div>

      <div className="space-y-16">
        {reports.map((report, reportIndex) => {
          const goal = report.report_goals[0]?.goal;

          if (!goal) return null;

          const positiveMoments = report.report_moments
            .map((m) => ({
              ...m,
              goal_signal: report.report_goal_signals.find(
                (s) => s.id === m.report_goal_signal_id,
              ),
            }))
            .filter((m) => m.goal_signal?.direction === "positive")
            .map((m, i) => ({
              ...m,
              moment: transformMoment(m, i),
            }))
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .sort((a, b) =>
              a.omission_reason === "user"
                ? -1
                : b.omission_reason === "user"
                  ? 1
                  : 0,
            );

          const negativeMoments = report.report_moments
            .map((m) => ({
              ...m,
              goal_signal: report.report_goal_signals.find(
                (s) => s.id === m.report_goal_signal_id,
              ),
            }))
            .filter((m) => m.goal_signal?.direction === "negative")
            .map((m, i) => ({
              ...m,
              moment: transformMoment(m, i),
            }))
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .sort((a, b) =>
              a.omission_reason === "user"
                ? -1
                : b.omission_reason === "user"
                  ? 1
                  : 0,
            );

          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reportIndex * 0.1 }}
              className="space-y-8"
            >
              {/* Report Header */}
              <div className="prose prose-sm min-w-full">
                <h2>Progress Report {report.id}</h2>
                {report.summary && (
                  <div className="border-l-2 border-border/80 pl-4 text-muted-foreground">
                    <MarkdownRenderer className="min-w-full text-muted-foreground">
                      {report.summary.replace(
                        /```(?:\w+)?\s*([\s\S]*?)\s*```/g,
                        "$1",
                      )}
                    </MarkdownRenderer>
                  </div>
                )}
              </div>

              {/* Goal Section */}
              <div className="space-y-4">
                <GoalCard
                  goal={goal}
                  mode="view"
                  onGoalComplete={() => void 0}
                />
              </div>

              {/* Memories Section */}
              <div className="space-y-8">
                <div className="prose prose-sm min-w-full">
                  <h3>Moments</h3>
                </div>

                {/* Good Moments */}
                <div className="space-y-4">
                  <div className="prose prose-sm min-w-full">
                    <h4 className="flex items-center gap-x-1 leading-none text-accent-foreground">
                      <CircleCheck className="inline h-7 w-7 pr-1 text-xs text-emerald-700 dark:text-emerald-400" />{" "}
                      Good Examples
                    </h4>
                  </div>

                  <ReportMomentList
                    moments={positiveMoments}
                    signalDirection="positive"
                    reportGoalSignals={report.report_goal_signals}
                    onHideMoment={(momentId) =>
                      handleHideMoment(momentId, report.id)
                    }
                    hiddenMoments={hiddenMoments}
                  />
                </div>

                {/* Areas for Improvement */}
                <div className="space-y-4">
                  <div className="prose prose-sm min-w-full">
                    <h4 className="flex items-center gap-x-1 leading-none text-accent-foreground">
                      <CircleFadingArrowUpIcon className="inline h-7 w-7 pr-1 text-xs text-amber-600 dark:text-amber-400" />{" "}
                      Areas for Improvement
                    </h4>
                  </div>

                  <ReportMomentList
                    moments={negativeMoments}
                    signalDirection="negative"
                    reportGoalSignals={report.report_goal_signals}
                    onHideMoment={(momentId) =>
                      handleHideMoment(momentId, report.id)
                    }
                    hiddenMoments={hiddenMoments}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Hide Reason Dialog */}
      <Dialog
        open={showHideReasonDialog}
        onOpenChange={setShowHideReasonDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide Moment</DialogTitle>
            <DialogDescription>
              Please provide a reason for hiding this moment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                placeholder="Enter your reason..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowHideReasonDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmHide}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
