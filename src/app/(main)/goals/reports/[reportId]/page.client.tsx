"use client";

import { motion } from "framer-motion";
import {
  ArrowDownRightIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  CircleFadingArrowUpIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Merge } from "type-fest";

import { GoalCard } from "~/components/goals/goal-card";
import { ReportSignalGroup } from "~/components/reports/report-signal-group";
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
import { Separator } from "~/components/ui/separator";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";

import { ReportNavigation } from "./report-navigation";

type GroupReport = RouterOutputs["reports"]["getGroupReports"]["group"];
type Report = RouterOutputs["reports"]["getGroupReports"]["reports"][number];
type ReportSignal = Report["report_goal_signals"][number];
type ReportMoment = Report["report_moments"][number];

type SignalGroup = {
  signal: ReportSignal;
  moments: Array<
    Merge<ReportMoment, { moment: Merge<ReportMoment["moment"], VideoMoment> }>
  >;
};

type GroupedMoments = {
  positive: Record<string, SignalGroup>;
  negative: Record<string, SignalGroup>;
};

export type ReportPageClientProps = RouterOutputs["reports"]["getGroupReports"];

export function ReportPageClient({ group, reports }: ReportPageClientProps) {
  const [showHideReasonDialog, setShowHideReasonDialog] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<{
    id: string;
    reportId: string;
  } | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [hiddenMoments, setHiddenMoments] = useState<string[]>([]);
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

  const handleHideMoment = (momentId: string) => {
    setHiddenMoments((prev) => [...prev, momentId]);
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
    subtags: reportMoment.moment.subtags,
  });

  // Group moments by signal
  const groupedMoments = reports.reduce<GroupedMoments>(
    (acc, report) => {
      for (const signal of report.report_goal_signals) {
        const direction = signal.direction;
        const signalId = signal.id;

        // Initialize the signal group if it doesn't exist
        if (!acc[direction][signalId]) {
          acc[direction][signalId] = { signal, moments: [] };
        }

        const reportMoments = report.report_moments.filter(
          (m: ReportMoment) => m.report_goal_signal_id === signalId,
        );

        for (const reportMoment of reportMoments) {
          acc[direction][signalId].moments.push({
            ...reportMoment,
            moment: {
              ...reportMoment.moment,
              ...transformMoment(
                reportMoment,
                acc[direction][signalId].moments.length,
              ),
            },
          });
        }
      }

      return acc;
    },
    { positive: {}, negative: {} },
  );

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

              return (
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
                      goal={goal as any}
                      onGoalComplete={async () => void 0}
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
                    <Separator />

                    <h3 className="text-xl font-semibold">Moments</h3>

                    {/* Good Moments */}
                    <div className="space-y-6">
                      <h4 className="flex items-center gap-x-1 leading-none text-accent-foreground">
                        <ArrowUpRightIcon className="inline h-7 w-7 pr-1 text-emerald-700 dark:text-emerald-400" />{" "}
                        Good Examples
                      </h4>

                      {Object.entries(groupedMoments.positive).map(
                        ([signalId, signalGroup]) => (
                          <ReportSignalGroup
                            key={signalId}
                            signal={signalGroup.signal}
                            moments={signalGroup.moments}
                            signalDirection="positive"
                            onHideMoment={handleHideMoment}
                          />
                        ),
                      )}
                    </div>

                    {/* Areas for Improvement */}
                    <div className="space-y-6">
                      <h4 className="flex items-center gap-x-1 leading-none text-accent-foreground">
                        <ArrowUpIcon className="inline h-7 w-7 pr-1 text-yellow-500 dark:text-yellow-400" />{" "}
                        Areas for Improvement
                      </h4>

                      {Object.entries(groupedMoments.negative).map(
                        ([signalId, signalGroup]) => (
                          <ReportSignalGroup
                            key={signalId}
                            signal={signalGroup.signal}
                            moments={signalGroup.moments}
                            signalDirection="negative"
                            onHideMoment={handleHideMoment}
                          />
                        ),
                      )}
                    </div>
                  </div>

                  {reportIndex !== reports.length - 1 && (
                    <div className="flex justify-center space-x-2 pt-8">
                      <span className="text-2xl text-muted-foreground">•</span>
                      <span className="text-2xl text-muted-foreground">•</span>
                      <span className="text-2xl text-muted-foreground">•</span>
                    </div>
                  )}
                </motion.div>
              );
            })}

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
        </div>
      </main>
    </div>
  );
}
