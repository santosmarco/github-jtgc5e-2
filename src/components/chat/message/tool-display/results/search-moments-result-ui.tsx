"use client";

import { motion } from "framer-motion";
import { ClockIcon, TagIcon, TimerIcon, UserIcon } from "lucide-react";

import { CollapsibleSection } from "~/components/chat/collapsible-section";
import type { SearchMomentsToolOutput } from "~/lib/ai/tools";
import type { VideoMoment } from "~/lib/schemas/video-moment";

export type MomentCardProps = {
  moment: VideoMoment;
  index: number;
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function MomentCard({ moment, index }: MomentCardProps) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: index * 0.08,
      },
    },
  };

  const activityType = moment.activity_type || "Moment";

  const duration =
    moment.segment_end_timestamp_in_seconds -
    moment.segment_start_timestamp_in_seconds;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
      onClick={() => {
        window.open(
          `/videos/${moment.video_id}?startAt=${moment.segment_start_timestamp_in_seconds}`,
          "_blank",
        );
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          window.open(
            `/videos/${moment.video_id}?startAt=${moment.segment_start_timestamp_in_seconds}`,
            "_blank",
          );
        }
      }}
    >
      <h5 className="mb-1.5 truncate text-sm font-semibold text-primary group-hover:text-primary/90">
        {moment.title}
      </h5>

      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <TagIcon className="h-3 w-3" />
          <span>{activityType}</span>
        </div>

        {moment.target_person_type && (
          <div className="flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            <span>{moment.target_person_type}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <TimerIcon className="h-3 w-3" />
          <span>{formatDuration(duration)}</span>
        </div>

        {moment.segment_start_timestamp && (
          <div className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            <span>{moment.segment_start_timestamp}</span>
          </div>
        )}
      </div>

      {moment.summary && (
        <p className="line-clamp-2 text-xs text-muted-foreground/90">
          {moment.summary}
        </p>
      )}
    </motion.div>
  );
}

export type SearchMomentsResultUIProps = {
  results: SearchMomentsToolOutput["results"];
  args?: Record<string, unknown>;
};

export function SearchMomentsResultUI({
  results,
  args,
}: SearchMomentsResultUIProps) {
  const momentsToDisplay = results?.map((r) => r.moment) || [];

  if (!momentsToDisplay?.length) {
    return (
      <CollapsibleSection
        title="Found Moments"
        icon={TagIcon}
        count={0}
        args={args}
        defaultOpen={true}
      >
        <p className="p-3 text-sm text-muted-foreground">
          No moments found matching your search.
        </p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title="Found Moments"
      icon={TagIcon}
      count={momentsToDisplay.length}
      args={args}
      defaultOpen={true}
    >
      <div className="grid gap-3 py-2 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {momentsToDisplay.map((moment, index) => (
          <MomentCard key={moment.id} moment={moment} index={index} />
        ))}
      </div>
    </CollapsibleSection>
  );
}
