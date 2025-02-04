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
import _ from "lodash";
import { ReportNavigation } from "./report-navigation";

type GroupReports = RouterOutputs["reports"]["getGroupReports"];

type Report = GroupReports["reports"][number];

export type ReportPageClientProps = GroupReports;

export function ReportPageClient({ group, reports }: ReportPageClientProps) {
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
    <div className="grid grid-cols-[auto_1fr]">
      <ReportNavigation reports={reports} />

      <main className="min-h-[calc(100vh-4rem)] px-8 py-6 pl-[calc(16rem+2rem)]">
        <div className="mx-auto max-w-3xl">
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

          <div className="mt-12 space-y-16">
            {reports.map((report, reportIndex) => {
              const goal = report.report_goals[0]?.goal;

              if (!goal) return null;

              const positiveMoments = _.uniqBy(
                _.orderBy(
                  report.report_moments
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
                    })),
                  [(m) => m.is_visible, (m) => m.score ?? 0],
                  ["desc", "desc"],
                ),
                (m) => m.id,
              );

              const negativeMoments = _.uniqBy(
                _.orderBy(
                  report.report_moments
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
                    })),
                  [(m) => m.is_visible, (m) => m.score ?? 0],
                  ["desc", "desc"],
                ),
                (m) => m.id,
              );

              return (
                <>
                  <motion.div
                    id={`report-${report.id}`}
                    key={report.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reportIndex * 0.1 }}
                    className="space-y-8"
                  >
                    <div className="space-y-4">
                      <GoalCard
                        goal={goal}
                        mode="view"
                        onGoalComplete={() => void 0}
                      />
                    </div>

                    {/* Report Header */}
                    <div className="prose prose-sm min-w-full">
                      {report.summary && (
                        <div className="border-l-2 border-border/80 py-2 pl-4 text-muted-foreground">
                          <MarkdownRenderer className="min-w-full text-muted-foreground">
                            {report.summary.replace(
                              /```(?:\w+)?\s*([\s\S]*?)\s*```/g,
                              "$1",
                            )}
                          </MarkdownRenderer>
                        </div>
                      )}
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
                        />
                      </div>
                    </div>
                  </motion.div>
                  {reportIndex < reports.length - 1 && (
                    <div className="flex justify-center">
                      <div className="text-2xl text-muted-foreground">
                        • • •
                      </div>
                    </div>
                  )}
                </>
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
      </main>
    </div>
  );
}
