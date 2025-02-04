"use client";

import { motion } from "framer-motion";
import { initial } from "lodash";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CircleCheck,
  CircleFadingArrowUpIcon,
  EyeOffIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GoalCard } from "~/components/goals/goal-card";
import { MomentCard } from "~/components/moment-card";
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

type GroupReports = RouterOutputs["reports"]["getGroupReports"];

type Report = GroupReports["reports"][number];
type ReportGoalSignal = NonNullable<Report["report_goal_signals"]>[number];

export type ReportPageClientProps = GroupReports;

type MomentWithSignal = {
  id: string;
  moment_id: string;
  report_id: string;
  report_goal_signal_id: string;
  moment: VideoMoment;
};

export function ReportPageClient({ group, reports }: ReportPageClientProps) {
  const [hiddenMoments, setHiddenMoments] = useState<Record<string, string>>(
    {},
  );
  const [showHideReasonDialog, setShowHideReasonDialog] = useState(false);
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [showAllPositive, setShowAllPositive] = useState(false);
  const [showAllNegative, setShowAllNegative] = useState(false);

  const handleHideMoment = (momentId: string) => {
    setSelectedMomentId(momentId);
    setShowHideReasonDialog(true);
  };

  const handleConfirmHide = () => {
    if (selectedMomentId) {
      setHiddenMoments((prev) => ({
        ...prev,
        [selectedMomentId]: hideReason,
      }));
      setHideReason("");
      setShowHideReasonDialog(false);
      setSelectedMomentId(null);
      toast.success("Moment hidden successfully");
    }
  };

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
          const goalSignals = (report.report_goal_signals ?? []).map(
            (signal) => ({
              id: signal.id,
              goal_id: goal?.id ?? "",
              text: signal.text ?? "",
              hidden_text: signal.hidden_text,
              direction:
                signal.direction === "positive"
                  ? ("positive" as const)
                  : ("negative" as const),
              created_at: signal.created_at,
              is_current: true,
              previous_goal_signal_id: null,
            }),
          );

          // Group moments by goal signal for this report
          const momentsBySignal = {
            positive: {
              signal: null as ReportGoalSignal | null,
              moments: [] as MomentWithSignal[],
            },
            negative: {
              signal: null as ReportGoalSignal | null,
              moments: [] as MomentWithSignal[],
            },
          };

          for (const [index, moment] of Object.entries(
            report.report_moments ?? [],
          )) {
            if (
              moment.moment &&
              moment.moment_id &&
              moment.report_goal_signal_id
            ) {
              const signal = report.report_goal_signals?.find(
                (s) => s.id === moment.report_goal_signal_id,
              );
              if (signal) {
                const momentWithSignal: MomentWithSignal = {
                  id: moment.id,
                  moment_id: moment.moment_id,
                  report_id: moment.report_id ?? "",
                  report_goal_signal_id: moment.report_goal_signal_id,
                  moment: {
                    id: moment.moment_id,
                    index: `${moment.moment.video_api_id}_${moment.moment.activity}_${index}`,
                    sequence_id: Number(index) ?? 0,
                    segment_id_sequence_start:
                      moment.moment.segment_id_sequence_start ?? 0,
                    segment_id_sequence_end:
                      moment.moment.segment_id_sequence_end ?? 0,
                    title: (moment.moment.title ?? "").replace(/^"|"$/g, ""),
                    summary: (moment.moment.summary ?? "").replace(
                      /^"|"$/g,
                      "",
                    ),
                    segment_start_timestamp:
                      moment.moment.segment_start_timestamp ?? "",
                    segment_end_timestamp:
                      moment.moment.segment_end_timestamp ?? "",
                    segment_start_timestamp_in_seconds:
                      moment.moment.segment_start_timestamp_in_seconds ?? 0,
                    segment_end_timestamp_in_seconds:
                      moment.moment.segment_end_timestamp_in_seconds ?? 0,
                    video_id: moment.moment.video_api_id ?? "",
                    activity_type: moment.moment.activity_type ?? "",
                    activity_reasoning: (
                      moment.moment.activity_reasoning ?? ""
                    ).replace(/^"|"$/g, ""),
                    target_person_type: moment.moment.target_person_type ?? "",
                    target_person_reasoning: null,
                    activity: moment.moment.activity ?? "",
                    relevant: moment.moment.relevant,
                    reactions: [],
                  },
                };

                if (signal.direction === "positive") {
                  momentsBySignal.positive.moments.push(momentWithSignal);
                  momentsBySignal.positive.signal = signal;
                } else {
                  momentsBySignal.negative.moments.push(momentWithSignal);
                  momentsBySignal.negative.signal = signal;
                }
              }
            }
          }

          if (!goal) return null;

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

                  <div className="space-y-4">
                    {momentsBySignal.positive.moments
                      ?.slice(0, showAllPositive ? undefined : 3)
                      .map((reportMoment, index) => {
                        const signal = report.report_goal_signals?.find(
                          (s) => s.id === reportMoment.report_goal_signal_id,
                        );
                        return (
                          <motion.div
                            key={reportMoment.moment_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="space-y-2">
                              <div className="-mx-0.5 flex items-center gap-3 rounded-md border border-border/80 bg-background/50 px-3 py-2 shadow-sm">
                                <span className="text-sm text-foreground/80">
                                  Because you have defined &ldquo;{signal?.text}
                                  &rdquo; as a positive
                                  <ArrowUpRightIcon className="inline h-4 w-4 text-xs text-emerald-700 dark:text-emerald-400" />{" "}
                                  signal
                                </span>
                              </div>
                              <div className="group relative">
                                <MomentCard
                                  moment={reportMoment.moment}
                                  index={index}
                                  noShare
                                  hideRelevance
                                  hideTimestamp
                                  className={
                                    hiddenMoments[reportMoment.moment_id]
                                      ? "h-20 overflow-hidden"
                                      : ""
                                  }
                                />
                                {!hiddenMoments[reportMoment.moment_id] && (
                                  <div className="absolute right-2 top-2 overflow-hidden">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleHideMoment(reportMoment.moment_id)
                                      }
                                      className="group relative h-8 w-8 overflow-hidden rounded-full bg-background/80 p-0 backdrop-blur-sm transition-all duration-200 hover:w-40"
                                    >
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2">
                                        <EyeOffIcon className="h-4 w-4" />
                                      </span>
                                      <span className="absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs">
                                        Hide as non-relevant
                                      </span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    {momentsBySignal.positive.moments?.length > 3 && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowAllPositive(!showAllPositive)}
                      >
                        {showAllPositive
                          ? "Show Less"
                          : `Show More Good Examples (${momentsBySignal.positive.moments.length - 3} remaining)`}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Areas for Improvement */}
                <div className="space-y-4">
                  <div className="prose prose-sm min-w-full">
                    <h4 className="flex items-center gap-x-1 leading-none text-accent-foreground">
                      <CircleFadingArrowUpIcon className="inline h-7 w-7 pr-1 text-xs text-amber-600 dark:text-amber-400" />{" "}
                      Areas for Improvement
                    </h4>
                  </div>

                  <div className="space-y-4">
                    {momentsBySignal.negative.moments
                      ?.slice(0, showAllNegative ? undefined : 3)
                      .map((reportMoment, index) => {
                        const signal = report.report_goal_signals?.find(
                          (s) => s.id === reportMoment.report_goal_signal_id,
                        );
                        return (
                          <motion.div
                            key={reportMoment.moment_id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 rounded-md border border-border/80 bg-background/50 px-3 py-2 shadow-sm">
                                <span className="text-sm text-foreground/80">
                                  Because you have defined &ldquo;{signal?.text}
                                  &rdquo; as a negative
                                  <ArrowDownRightIcon className="inline h-4 w-4 text-xs text-red-700 dark:text-red-400" />{" "}
                                  signal
                                </span>
                              </div>
                              <div className="group relative">
                                <MomentCard
                                  moment={reportMoment.moment}
                                  index={index}
                                  noShare
                                  hideRelevance
                                  hideTimestamp
                                  className={
                                    hiddenMoments[reportMoment.moment_id]
                                      ? "h-20 overflow-hidden"
                                      : ""
                                  }
                                />
                                {!hiddenMoments[reportMoment.moment_id] && (
                                  <div className="absolute right-2 top-2 overflow-hidden">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleHideMoment(reportMoment.moment_id)
                                      }
                                      className="group relative h-8 w-8 overflow-hidden rounded-full bg-background/80 p-0 backdrop-blur-sm transition-all duration-200 hover:w-[140px]"
                                    >
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2">
                                        <EyeOffIcon className="h-4 w-4" />
                                      </span>
                                      <span className="absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs">
                                        Hide as non-relevant
                                      </span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    {momentsBySignal.negative.moments?.length > 3 && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowAllNegative(!showAllNegative)}
                      >
                        {showAllNegative
                          ? "Show Less"
                          : `Show More Areas for Improvement (${momentsBySignal.negative.moments.length - 3} remaining)`}
                      </Button>
                    )}
                  </div>
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
