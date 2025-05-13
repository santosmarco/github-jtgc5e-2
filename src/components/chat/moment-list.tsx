"use client";

import { motion } from "framer-motion";
import { Clock, MessageSquare, Tag, Timer, User } from "lucide-react";

import type { SearchMomentsToolOutput } from "~/lib/ai/tools";
import { cn } from "~/lib/utils";

interface ChatMomentListProps {
  moments: SearchMomentsToolOutput["results"];
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2 },
  },
};

export function ChatMomentList({ moments, className }: ChatMomentListProps) {
  if (!moments?.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <MessageSquare className="h-4 w-4" />
        <span>No moments found</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-2", className)}
    >
      {moments.map((result, index) => (
        <motion.div
          key={`${result.moment.id}-${index}`}
          variants={itemVariants}
          onClick={() => {
            window.open(
              `/videos/${result.moment.video_id}?startAt=${result.moment.segment_ideal_timestamp_in_seconds ?? result.moment.segment_start_timestamp_in_seconds}`,
              "_blank",
            );
          }}
          className="group flex cursor-pointer flex-col gap-2 rounded-md border border-border/50 bg-background/50 p-3 transition-colors hover:border-primary/20"
        >
          {/* Title and Score */}
          <div className="flex items-start gap-2">
            <h4 className="line-clamp-2 flex-1 font-medium group-hover:text-primary">
              {result.moment.title}
            </h4>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {/* Activity Type */}
            {result.metadata && "activity_type" in result.metadata && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {result.metadata.activity_type}
              </div>
            )}

            {/* Speaker */}
            {result.moment.target_person_type && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {result.moment.target_person_type}
              </div>
            )}

            {/* Duration */}
            <div className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {formatDuration(
                result.moment.segment_end_timestamp_in_seconds -
                  result.moment.segment_start_timestamp_in_seconds,
              )}
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {result.moment.segment_start_timestamp}
            </div>
          </div>

          {/* Summary */}
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {result.moment.summary}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
