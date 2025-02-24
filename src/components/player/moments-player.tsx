"use client";

import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  VideoOff,
} from "lucide-react";
import Image from "next/image";
import { memo, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
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
  currentMomentIndex: number;
  setCurrentMomentIndex: (index: number | ((prev: number) => number)) => void;
  className?: string;
  onMomentEnd?: () => void;
  hasJustUpdatedCurrentMomentIndex: boolean;
  setHasJustUpdatedCurrentMomentIndex: (value: boolean) => void;
};

type ApiVideo = NonNullable<RouterOutputs["videos"]["getFromApiVideo"]>;

// Add buffer constants for contextual playback
const CONTEXT_BUFFER_BEFORE = 30; // 30 seconds before
const CONTEXT_BUFFER_AFTER = 30; // 30 seconds after

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
          // Set initial time to the start of the core moment
          videoElement.currentTime =
            currentMoment.moment.segment_ideal_timestamp_in_seconds ??
            currentMoment.moment.segment_start_timestamp_in_seconds;
          videoElement.play().catch(() => {
            console.log("Autoplay blocked by browser");
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    video.videoSrc,
    currentMoment.moment.segment_ideal_timestamp_in_seconds,
    currentMoment.moment.segment_start_timestamp_in_seconds,
  ]);

  // Calculate buffered start and end times
  const bufferedStartTime = Math.max(
    0,
    currentMoment.moment.segment_start_timestamp_in_seconds -
      CONTEXT_BUFFER_BEFORE,
  );
  const bufferedEndTime =
    currentMoment.moment.segment_end_timestamp_in_seconds +
    CONTEXT_BUFFER_AFTER;

  return (
    <PlayerProvider>
      <VideoPlayer
        video={video}
        momentsShown={[currentMoment.moment]}
        start_time={bufferedStartTime}
        end_time={bufferedEndTime}
        ideal_time={currentMoment.moment.segment_ideal_timestamp_in_seconds}
        initialPlayTime={
          currentMoment.moment.segment_ideal_timestamp_in_seconds ??
          currentMoment.moment.segment_start_timestamp_in_seconds
        }
        onVideoEnd={onMomentEnd}
      />
    </PlayerProvider>
  );
});

const ReactionControls = memo(function ReactionControls({
  momentId,
  className,
}: {
  momentId: string;
  className?: string;
}) {
  const utils = api.useUtils();
  const { data: user } = api.auth.getUser.useQuery();
  const { data: reactions, isLoading: reactionsLoading } =
    api.moments.getReactions.useQuery({
      momentId,
    });

  const { mutate: addReaction } = api.moments.addReaction.useMutation({
    onMutate: async ({ type }) => {
      await utils.moments.getReactions.cancel({ momentId });

      const previousReactions = utils.moments.getReactions.getData({
        momentId,
      });

      utils.moments.getReactions.setData({ momentId }, (old): any => {
        const filtered = old?.filter((r) => r.user_id !== user?.id) ?? [];
        return [
          ...filtered,
          {
            id: "temp-id",
            moment_id: momentId,
            user_id: user?.id ?? "",
            reaction_type: type,
            created_at: new Date().toISOString(),
            user,
          },
        ];
      });

      return { previousReactions };
    },
    onError: (err, newReaction, context) => {
      utils.moments.getReactions.setData(
        { momentId },
        context?.previousReactions,
      );
      toast.error("Failed to add reaction. Please try again.");
    },
  });

  const handleReaction = (type: "thumbs_up" | "thumbs_down") => {
    if (!user) {
      toast.error("Please sign in to react to moments.");
      return;
    }
    addReaction({ momentId, type });
  };

  const thumbsUpCount =
    reactions?.filter((r) => r.reaction_type === "thumbs_up").length ?? 0;
  const thumbsDownCount =
    reactions?.filter((r) => r.reaction_type === "thumbs_down").length ?? 0;
  const userReaction = reactions?.find(
    (r) => r.user_id === user?.id,
  )?.reaction_type;

  if (reactionsLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 text-foreground hover:text-primary hover:no-underline",
              userReaction === "thumbs_up" && "text-primary",
            )}
            onClick={() => handleReaction("thumbs_up")}
          >
            <ThumbsUp className="h-4 w-4" />
            <span className="text-xs">{thumbsUpCount}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Relevant</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2 text-foreground hover:text-destructive hover:no-underline",
              userReaction === "thumbs_down" && "text-destructive",
            )}
            onClick={() => handleReaction("thumbs_down")}
          >
            <ThumbsDown className="h-4 w-4" />
            <span className="text-xs">{thumbsDownCount}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Not Relevant</TooltipContent>
      </Tooltip>
    </div>
  );
});

const NavigationControls = memo(function NavigationControls({
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  currentIndex,
  totalMoments,
  currentMoment,
}: {
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  currentIndex: number;
  totalMoments: number;
  currentMoment: NonNullable<MomentsPlayerProps["reportMoments"][0]>;
}) {
  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowLeft" && canGoPrevious) {
        onPrevious();
      } else if (e.key === "ArrowRight" && canGoNext) {
        onNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoPrevious, canGoNext, onPrevious, onNext]);

  return (
    <div className="grid grid-cols-3 border-t border-border bg-background">
      {/* Reactions */}
      <div className="col-span-3 flex items-center justify-center border-b border-border px-4 py-2">
        <ReactionControls momentId={currentMoment.moment.id} />
      </div>

      {/* Navigation */}
      <div className="col-span-3 grid grid-cols-3 items-center gap-4 px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          aria-label="Previous video"
          className="justify-self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>

        <div className="justify-self-center text-sm text-muted-foreground">
          {currentIndex + 1} of {totalMoments}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Next video"
          className="justify-self-end"
        >
          <span>Next</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

const listItemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
  }),
};

export function MomentsPlayer({
  reportMoments,
  currentMomentIndex,
  setCurrentMomentIndex,
  className,
  onMomentEnd,
  hasJustUpdatedCurrentMomentIndex,
  setHasJustUpdatedCurrentMomentIndex,
}: MomentsPlayerProps) {
  const currentMoment = reportMoments[currentMomentIndex];
  const nextMoments = reportMoments.slice(
    currentMomentIndex + 1,
    currentMomentIndex + 3,
  );

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

  // Navigation handlers
  const handlePrevious = () => {
    if (currentMomentIndex > 0) {
      setCurrentMomentIndex((prev) => prev - 1);
      setHasJustUpdatedCurrentMomentIndex(true);
    }
  };

  const handleNext = () => {
    if (currentMomentIndex < reportMoments.length - 1) {
      setCurrentMomentIndex((prev) => prev + 1);
      setHasJustUpdatedCurrentMomentIndex(true);
    } else {
      onMomentEnd?.();
    }
  };

  // Handle moment completion
  const handleMomentEnd = () => {
    if (hasJustUpdatedCurrentMomentIndex) {
      setTimeout(() => {
        setHasJustUpdatedCurrentMomentIndex(false);
      }, 1000);
      return;
    }

    if (currentMomentIndex < reportMoments.length - 1) {
      setCurrentMomentIndex((prev) => prev + 1);
      setHasJustUpdatedCurrentMomentIndex(true);
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
    return (
      <motion.div
        className="flex min-h-[400px] w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/10 p-8 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <VideoOff className="h-12 w-12 text-muted-foreground/50" />
        </motion.div>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <h3 className="text-lg font-medium text-foreground">
            No Moments Found
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            We weren&apos;t able to find any moments for the section you
            selected.
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className={cn("flex w-full flex-col bg-background", className)}>
      {/* Video Player */}
      <VideoPlayerSection
        video={video}
        currentMoment={currentMoment}
        onMomentEnd={handleMomentEnd}
      />

      {/* Navigation Controls */}
      <NavigationControls
        onPrevious={handlePrevious}
        onNext={handleNext}
        canGoPrevious={currentMomentIndex > 0}
        canGoNext={currentMomentIndex < reportMoments.length - 1}
        currentIndex={currentMomentIndex}
        totalMoments={reportMoments.length}
        currentMoment={currentMoment}
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
                    setHasJustUpdatedCurrentMomentIndex(true);
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
