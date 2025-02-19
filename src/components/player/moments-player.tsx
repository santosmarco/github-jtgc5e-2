"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import Image from "next/image";
import { memo, useEffect, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

import { PlayerProvider } from "./provider";
import { VideoPlayer } from "./video";

type MomentsPlayerProps = {
  reportMoments: (Tables<"report_moments"> & {
    moment: VideoMoment;
    report_goal_signal: Tables<"report_goal_signals">;
  })[];
  className?: string;
  onMomentEnd?: () => void;
};

type ApiVideo = NonNullable<RouterOutputs["videos"]["getFromApiVideo"]>;

const ReportMomentCard = memo(function ReportMomentCard({
  reportMoment,
  isUpNext = false,
  onClick,
}: {
  reportMoment: Tables<"report_moments"> & {
    moment: VideoMoment;
    report_goal_signal: Tables<"report_goal_signals">;
  };
  isUpNext?: boolean;
  onClick?: () => void;
}) {
  const { data: momentVideo } = api.videos.getFromApiVideo.useQuery(
    {
      videoId: reportMoment.moment.video_id ?? "",
    },
    {
      enabled: !!reportMoment.moment.video_id,
      refetchOnWindowFocus: false,
    },
  );

  const { data: user } = api.auth.getUser.useQuery();
  const isAdmin = user?.is_admin;

  return (
    <div
      className={cn(
        "relative flex items-center overflow-hidden rounded-lg border border-border transition-all duration-200",
        isUpNext && "cursor-pointer hover:bg-accent/50",
      )}
      onClick={onClick}
      role={isUpNext ? "button" : undefined}
      tabIndex={isUpNext ? 0 : undefined}
      onKeyDown={(e) => {
        if (isUpNext && onClick && (e.key === "Enter" || e.key === " ")) {
          onClick();
        }
      }}
    >
      {isUpNext && <div className="absolute inset-0 z-30 bg-background/50" />}
      {isAdmin && (
        <div className="absolute left-0 top-0 z-50 flex flex-col items-end gap-1 rounded rounded-tl-lg bg-background/80 px-2 py-1 text-right text-xs text-muted-foreground">
          <span>
            Conf: {reportMoment.report_section_confidence?.toFixed(2)}
          </span>
          <span>Score: {reportMoment.score?.toFixed(2)}</span>
        </div>
      )}
      <div
        className={cn(
          "relative h-[7.25rem] w-[7.25rem] shrink-0 overflow-hidden rounded-l-lg",
          isUpNext && "h-[6.5rem] w-[6.5rem]",
        )}
      >
        {momentVideo?.assets?.thumbnail ? (
          <Image
            src={momentVideo.assets.thumbnail}
            alt={reportMoment.moment.title}
            fill
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg bg-accent">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        )}
      </div>
      <div className="flex h-full flex-col justify-center px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <h3
              className={cn(
                "-mt-0.5 line-clamp-1 font-semibold",
                isUpNext && "text-sm",
              )}
            >
              {reportMoment.moment.title}
            </h3>
          </TooltipTrigger>
          <TooltipContent align="start" className="max-w-[300px]">
            {reportMoment.moment.title}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <p
              className={cn("my-2 line-clamp-2 text-sm", isUpNext && "text-xs")}
            >
              {reportMoment.report_section_reasoning}
            </p>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start" className="max-w-[300px]">
            {reportMoment.report_section_reasoning}
          </TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-x-1">
          {reportMoment.report_goal_signal.direction === "positive" ? (
            <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 shrink-0 text-rose-500" />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "line-clamp-1 text-sm text-muted-foreground",
                  isUpNext && "text-xs",
                )}
              >
                Related to{" "}
                <span className="text-foreground">
                  &quot;{reportMoment.report_goal_signal.text}&quot;
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent
              align="start"
              side="bottom"
              className="max-w-[300px]"
            >
              Related to &quot;{reportMoment.report_goal_signal.text}&quot;
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});

const VideoPlayerSection = memo(function VideoPlayerSection({
  video,
  currentMoment,
  onMomentEnd,
}: {
  video: ApiVideo;
  currentMoment: NonNullable<MomentsPlayerProps["reportMoments"][0]>;
  onMomentEnd: () => void;
}) {
  // Reset player state when video changes
  useEffect(() => {
    if (video.videoSrc) {
      const timer = setTimeout(() => {
        // Small delay to ensure DOM is ready
        const videoElement = document.querySelector("video");
        if (videoElement) {
          videoElement.play().catch(() => {
            console.log("Autoplay blocked by browser");
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [video.videoSrc]);

  return (
    <PlayerProvider>
      <VideoPlayer
        video={video}
        momentsShown={[currentMoment.moment]}
        start_time={currentMoment.moment.segment_start_timestamp_in_seconds}
        end_time={currentMoment.moment.segment_end_timestamp_in_seconds}
        ideal_time={currentMoment.moment.segment_ideal_timestamp_in_seconds}
        onVideoEnd={onMomentEnd}
      />
    </PlayerProvider>
  );
});

const listItemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
};

export function MomentsPlayer({
  reportMoments,
  className,
  onMomentEnd,
}: MomentsPlayerProps) {
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const currentMoment = reportMoments[currentMomentIndex];
  const nextMoments = reportMoments.slice(
    currentMomentIndex + 1,
    currentMomentIndex + 3,
  );
  const [hasJustClickedUpNext, setHasJustClickedUpNext] = useState(false);

  // Fetch video data for current moment
  const { data: video, isLoading: videoLoading } =
    api.videos.getFromApiVideo.useQuery(
      {
        videoId: currentMoment?.moment.video_id ?? "",
      },
      {
        enabled: !!currentMoment?.moment.video_id,
        refetchOnWindowFocus: false,
      },
    );

  // Handle moment completion
  const handleMomentEnd = () => {
    if (hasJustClickedUpNext) {
      setTimeout(() => {
        setHasJustClickedUpNext(false);
      }, 1000);
      return;
    }

    if (currentMomentIndex < reportMoments.length - 1) {
      setCurrentMomentIndex((prev) => prev + 1);
    } else {
      onMomentEnd?.();
    }
  };

  if (videoLoading) {
    return (
      <div className="mt-12 flex h-full w-full items-start justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!video || !currentMoment) {
    return null;
  }

  return (
    <div className={cn("flex w-full flex-col bg-background", className)}>
      {/* Video Player */}
      <VideoPlayerSection
        video={video}
        currentMoment={currentMoment}
        onMomentEnd={handleMomentEnd}
      />

      {/* Current Moment Info */}
      <motion.div
        className="bg-background px-4 py-4"
        initial="hidden"
        animate="visible"
        variants={listItemVariants}
        custom={0}
      >
        <h2 className="mb-4 text-xl font-semibold">Now Playing</h2>
        <div className="space-y-4">
          <motion.div
            key={currentMoment.id}
            variants={listItemVariants}
            custom={1}
          >
            <ReportMomentCard reportMoment={currentMoment} />
          </motion.div>
        </div>
      </motion.div>

      {/* Up Next */}
      {nextMoments.length > 0 && (
        <motion.div
          className="bg-background px-4 py-4"
          initial="hidden"
          animate="visible"
          variants={listItemVariants}
          custom={2}
        >
          <h2 className="mb-4 text-xl font-semibold">Up Next</h2>
          <div className="space-y-4">
            {nextMoments.map((moment, index) => (
              <motion.div
                key={moment.id}
                variants={listItemVariants}
                custom={index + 3}
              >
                <ReportMomentCard
                  reportMoment={moment}
                  isUpNext
                  onClick={() => {
                    setHasJustClickedUpNext(true);
                    setCurrentMomentIndex(currentMomentIndex + index + 1);
                  }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
