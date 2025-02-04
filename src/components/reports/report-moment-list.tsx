"use client";

import { motion } from "framer-motion";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeOffIcon,
} from "lucide-react";
import { useState } from "react";

import { MomentCard } from "~/components/moment-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import type { Tables } from "~/lib/supabase/database.types";

type MomentWithSignal = Tables<"report_moments"> & { moment: VideoMoment };

type ReportMomentListProps = {
  moments: MomentWithSignal[];
  signalDirection: "positive" | "negative";
  reportGoalSignals: Tables<"report_goal_signals">[];
  onHideMoment: (momentId: string) => void;
  hideSignalExplanation?: boolean;
};

export function ReportMomentList({
  moments,
  signalDirection,
  reportGoalSignals,
  onHideMoment,
  hideSignalExplanation = false,
}: ReportMomentListProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedHiddenMoments, setExpandedHiddenMoments] = useState<
    Record<string, boolean>
  >({});

  const toggleHiddenMoment = (momentId: string) => {
    setExpandedHiddenMoments((prev) => ({
      ...prev,
      [momentId]: !prev[momentId],
    }));
  };

  const handleSkipToMoment = (moment: VideoMoment) => {
    void window.open(
      `/videos/${moment.video_id}?startAt=${moment.segment_start_timestamp_in_seconds}`,
      "_blank",
    );
  };

  const visibleMoments = moments.filter((m) => m.is_visible);
  const displayedMoments = showAll ? moments : moments.slice(0, 3);

  return (
    <div className="space-y-2">
      {displayedMoments.map((reportMoment, index) => {
        const signal = reportGoalSignals.find(
          (s) => s.id === reportMoment.report_goal_signal_id,
        );

        if (!reportMoment.is_visible) {
          return (
            <motion.div
              key={reportMoment.moment_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.1,
                ease: "easeOut",
              }}
              className="overflow-hidden rounded-md border border-border/10 bg-background/50 backdrop-blur-sm"
            >
              <Button
                variant="ghost"
                className="w-full justify-between bg-accent p-3"
                onClick={() => toggleHiddenMoment(reportMoment.moment_id)}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm text-foreground/90">
                    {reportMoment.moment.title}
                  </span>
                  <Badge
                    variant="secondary"
                    className="cursor-default bg-muted text-muted-foreground hover:bg-muted"
                  >
                    Hidden
                  </Badge>
                </span>
                <motion.span
                  animate={{
                    rotate: expandedHiddenMoments[reportMoment.moment_id]
                      ? 180
                      : 0,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                </motion.span>
              </Button>

              <motion.div
                initial="collapsed"
                animate={
                  expandedHiddenMoments[reportMoment.moment_id]
                    ? "expanded"
                    : "collapsed"
                }
                variants={{
                  expanded: { height: "auto", opacity: 1 },
                  collapsed: { height: 0, opacity: 0 },
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden px-3"
              >
                <div className="space-y-2 pt-2">
                  <div className="rounded-md bg-muted px-3 py-2">
                    <span className="text-sm text-muted-foreground">
                      Because you have defined{" "}
                      <span className="text-foreground">
                        &ldquo;{signal?.text}&rdquo;
                      </span>{" "}
                      as a {signalDirection}
                      {signalDirection === "positive" ? (
                        <ArrowUpRightIcon className="inline h-4 w-4 text-xs text-emerald-700/80 dark:text-emerald-400/80" />
                      ) : (
                        <ArrowDownRightIcon className="inline h-4 w-4 text-xs text-red-700/80 dark:text-red-400/80" />
                      )}{" "}
                      signal
                    </span>
                  </div>
                  <motion.div
                    className="group relative"
                    whileHover={{ scale: 1.005 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MomentCard
                      moment={reportMoment.moment}
                      index={index}
                      noShare
                      hideRelevance
                      hideTimestamp
                    />
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          );
        }

        return (
          <motion.div
            key={reportMoment.moment_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="space-y-2">
              {!hideSignalExplanation && (
                <div className="flex items-center gap-3 rounded-md border border-border/80 bg-background/50 px-3 py-2 shadow-sm">
                  <span className="text-sm text-foreground/80">
                    Because you have defined &ldquo;{signal?.text}&rdquo; as a{" "}
                    {signalDirection}
                    {signalDirection === "positive" ? (
                      <ArrowUpRightIcon className="inline h-4 w-4 text-xs text-emerald-700 dark:text-emerald-400" />
                    ) : (
                      <ArrowDownRightIcon className="inline h-4 w-4 text-xs text-red-700 dark:text-red-400" />
                    )}{" "}
                    signal
                  </span>
                </div>
              )}
              <div className="group relative">
                <MomentCard
                  moment={reportMoment.moment}
                  index={index}
                  noShare
                  hideRelevance
                  hideTimestamp
                  hideBottomBar
                  onSkipToMoment={() => handleSkipToMoment(reportMoment.moment)}
                  jumpToLabel="Watch"
                />
                {reportMoment.is_visible && (
                  <div className="absolute right-2 top-2 overflow-hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onHideMoment(reportMoment.moment_id)}
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
                {!reportMoment.is_visible && (
                  <div className="absolute right-2 top-2 overflow-hidden">
                    <Badge variant="secondary">Hidden</Badge>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {visibleMoments.length > 3 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll
            ? "Show Less"
            : `Show More (${visibleMoments.length - 3} total)`}
        </Button>
      )}
    </div>
  );
}
