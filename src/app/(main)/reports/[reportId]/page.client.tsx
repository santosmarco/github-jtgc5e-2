"use client";

import { motion } from "framer-motion";
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
import type { VideoMoment } from "~/lib/schemas/video-moment";
import type { RouterOutputs } from "~/trpc/react";

export type ReportPageClientProps = {
  report: NonNullable<RouterOutputs["reports"]["getOne"]>;
};

type ReportGoalSignal = NonNullable<
  ReportPageClientProps["report"]["report_goal_signals"]
>[number];

type MomentWithSignal = {
  id: string;
  moment_id: string;
  report_id: string;
  report_goal_signal_id: string;
  moment: VideoMoment;
};

type SignalGroup<T> = {
  signal: T;
  moments: MomentWithSignal[];
};

export function ReportPageClient({ report }: ReportPageClientProps) {
  const [hiddenMoments, setHiddenMoments] = useState<Record<string, string>>(
    {},
  );
  const [showHideReasonDialog, setShowHideReasonDialog] = useState(false);
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [hideReason, setHideReason] = useState("");

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

  const defaultSignal = {
    id: "",
    report_id: "",
    goal_signal_id: "",
    text: "",
    hidden_text: "",
    direction: "positive" as const,
    created_at: new Date().toISOString(),
  } as ReportGoalSignal;

  // Group moments by goal signal
  const momentsBySignal = report.report_goal_signals.reduce<{
    positive: SignalGroup<ReportGoalSignal>;
    negative: SignalGroup<ReportGoalSignal>;
  }>(
    (acc, signal) => {
      const signalMoments = report.report_moments
        .filter(
          (
            m,
          ): m is typeof m & {
            moment_id: string;
            moment: NonNullable<typeof m.moment>;
            report_id: string;
            report_goal_signal_id: string;
          } =>
            m.report_goal_signal_id === signal.id &&
            m.moment_id !== null &&
            m.moment !== null &&
            m.report_id !== null &&
            m.report_goal_signal_id !== null,
        )
        .map((m) => ({
          id: m.id,
          moment_id: m.moment_id,
          report_id: m.report_id,
          report_goal_signal_id: m.report_goal_signal_id,
          moment: {
            id: m.moment.id,
            index: m.moment.id,
            sequence_id: 0,
            segment_id_sequence_start: m.moment.segment_id_sequence_start ?? 0,
            segment_id_sequence_end: m.moment.segment_id_sequence_end ?? 0,
            title: m.moment.title ?? "",
            summary: m.moment.summary ?? "",
            segment_start_timestamp: m.moment.segment_start_timestamp ?? "",
            segment_end_timestamp: m.moment.segment_end_timestamp ?? "",
            segment_start_timestamp_in_seconds:
              m.moment.segment_start_timestamp_in_seconds ?? 0,
            segment_end_timestamp_in_seconds:
              m.moment.segment_end_timestamp_in_seconds ?? 0,
            video_id: m.moment.video_api_id ?? "",
            activity_type: m.moment.activity_type ?? "",
            activity_reasoning: m.moment.activity_reasoning ?? "",
            target_person_type: m.moment.target_person_type ?? "",
            target_person_reasoning: null,
            activity: m.moment.activity ?? "",
            relevant: m.moment.relevant ?? true,
            reactions: [],
          } satisfies VideoMoment,
        }));

      if (signal.direction === "positive") {
        acc.positive.moments = [...acc.positive.moments, ...signalMoments];
        acc.positive.signal = signal;
      } else {
        acc.negative.moments = [...acc.negative.moments, ...signalMoments];
        acc.negative.signal = signal;
      }

      return acc;
    },
    {
      positive: { signal: defaultSignal, moments: [] },
      negative: { signal: defaultSignal, moments: [] },
    },
  );

  const goal = report.report_goals[0]?.goal;
  const goalSignals = report.report_goal_signals.map((signal) => ({
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
  }));

  console.log(report);

  if (!goal) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-8 py-8">
      {/* Report Header */}
      <div className="prose prose-sm min-w-full">
        <h1>Progress Report</h1>
        <p className="text-muted-foreground">{report.summary}</p>
      </div>

      {/* Goal Section */}
      <div className="space-y-4">
        <GoalCard goal={goal} mode="view" onGoalComplete={() => void 0} />
      </div>

      {/* Memories Section */}
      <div className="space-y-8">
        <div className="prose prose-sm min-w-full">
          <h2>Moments</h2>
        </div>

        {/* Good Moments */}
        <div className="space-y-4">
          <div className="prose prose-sm min-w-full">
            <h3 className="flex items-center gap-x-1 leading-none text-accent-foreground">
              <CircleCheck className="inline h-7 w-7 pr-1 text-xs text-emerald-700 dark:text-emerald-400" />{" "}
              Good Examples
            </h3>
          </div>

          <div className="space-y-4">
            {momentsBySignal.positive.moments
              ?.slice(0, 3)
              .map((reportMoment, index) => {
                const signal = report.report_goal_signals.find(
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
                          Because you have defined &ldquo;{signal?.text}&rdquo;
                          as a positive
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
              <Button variant="outline" className="w-full">
                Show More Good Examples (
                {momentsBySignal.positive.moments.length - 3} remaining)
              </Button>
            )}
          </div>
        </div>

        {/* Areas for Improvement */}
        <div className="space-y-4">
          <div className="prose prose-sm min-w-full">
            <h3 className="flex items-center gap-x-1 leading-none text-accent-foreground">
              <CircleFadingArrowUpIcon className="inline h-7 w-7 pr-1 text-xs text-amber-600 dark:text-amber-400" />{" "}
              Areas for Improvement
            </h3>
          </div>

          <div className="space-y-4">
            {momentsBySignal.negative.moments
              ?.slice(0, 3)
              .map((reportMoment, index) => {
                const signal = report.report_goal_signals.find(
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
                          Because you have defined &ldquo;{signal?.text}&rdquo;
                          as a negative
                          <ArrowDownRightIcon className="inline h-4 w-4 text-xs text-red-700 dark:text-red-400" />{" "}
                          signal
                        </span>
                      </div>
                      <div className="group relative">
                        <MomentCard
                          moment={reportMoment.moment}
                          index={index}
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
              <Button variant="outline" className="w-full">
                Show More Areas for Improvement (
                {momentsBySignal.negative.moments.length - 3} remaining)
              </Button>
            )}
          </div>
        </div>
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
