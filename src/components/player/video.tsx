"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import {
  Gauge,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Slider } from "~/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

import { usePlayer } from "./provider";

export type VideoPlayerProps = {
  video: RouterOutputs["videos"]["getFromApiVideo"];
  momentsShown?: Pick<
    VideoMoment,
    | "index"
    | "segment_end_timestamp_in_seconds"
    | "segment_start_timestamp_in_seconds"
    | "title"
  >[];
  startAt?: number;
  onVideoEnd?: () => void;
  start_time?: number;
  end_time?: number;
  ideal_time?: number | null;
  initialPlayTime?: number;
  isQAMode?: boolean;
};

const PLAYBACK_SPEEDS = [0.8, 1, 1.2, 1.5, 1.7, 2, 2.5];

export function VideoPlayer({
  video,
  momentsShown,
  startAt,
  onVideoEnd,
  start_time,
  end_time,
  ideal_time,
  initialPlayTime,
  isQAMode,
}: VideoPlayerProps) {
  const {
    videoRef,
    isPlaying,
    togglePlay,
    currentTime,
    duration,
    seek,
    play,
    volume,
    changeVolume,
    isMuted,
    toggleMute,
    isFullscreen,
    toggleFullscreen,
    isControlsVisible,
    skip,
  } = usePlayer();

  // Determine if we are trimming and set our timeline duration.
  const isTrimmed = start_time !== undefined && end_time !== undefined;
  const timelineDuration = isTrimmed
    ? end_time - start_time
    : (duration ?? 100);

  const [currentMoment, setCurrentMoment] = useState<
    NonNullable<typeof momentsShown>[number] | undefined
  >(undefined);
  const [hoveredMoment, setHoveredMoment] = useState<
    NonNullable<typeof momentsShown>[number] | null
  >(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [hasInitialSeek, setHasInitialSeek] = useState(false);

  // Filter moments within the trimmed range (if any)
  const filteredMoments = momentsShown?.filter((moment) => {
    if (!isTrimmed) return true;
    return (
      moment.segment_start_timestamp_in_seconds >= start_time &&
      moment.segment_end_timestamp_in_seconds <= end_time
    );
  });

  // Only seek on load if we have an initial play time or start time
  useEffect(() => {
    if (!videoRef.current || hasInitialSeek) return;

    const seekTime = ideal_time ?? initialPlayTime ?? start_time ?? startAt;
    if (seekTime !== undefined) {
      videoRef.current.currentTime = seekTime;
      setHasInitialSeek(true);
    }
  }, [
    videoRef,
    initialPlayTime,
    ideal_time,
    start_time,
    startAt,
    hasInitialSeek,
  ]);

  // Auto-play when video source changes
  useEffect(() => {
    if (!videoRef.current || !hasInitialSeek) return;

    videoRef.current.play().catch((error) => {
      console.log("Autoplay failed:", error);
    });

    // Reset playback speed to default when video source changes
    setPlaybackSpeed(1);
    if (videoRef.current) {
      videoRef.current.playbackRate = 1;
    }
  }, [videoRef, hasInitialSeek, video.videoSrc]);

  // useEffect(() => {
  //   toggleMute(true);
  //   play();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  useEffect(() => {
    // If we are trimmed and the video is not at the start, seek to the start
    if (
      isTrimmed &&
      currentTime &&
      currentTime < start_time &&
      videoRef.current
    ) {
      videoRef.current.currentTime = ideal_time ?? start_time;
    }

    // Check if we need to end the video playback
    if (
      isTrimmed &&
      currentTime &&
      currentTime - start_time >= timelineDuration
    ) {
      onVideoEnd?.();
      return;
    }

    if (filteredMoments && currentTime) {
      // Note: if trimmed, the video's timeline is shifted to 0
      const newCurrentMoment = filteredMoments.find(
        (moment) =>
          currentTime >=
            (isTrimmed
              ? moment.segment_start_timestamp_in_seconds - start_time
              : moment.segment_start_timestamp_in_seconds) &&
          currentTime <
            (isTrimmed
              ? moment.segment_end_timestamp_in_seconds - start_time
              : moment.segment_end_timestamp_in_seconds),
      );

      // If a moment ended, trigger onVideoEnd if needed.
      if (
        isTrimmed &&
        currentMoment &&
        currentTime >= currentMoment.segment_end_timestamp_in_seconds
      ) {
        onVideoEnd?.();
      }
      setCurrentMoment(newCurrentMoment);
    }
  }, [
    currentTime,
    filteredMoments,
    currentMoment,
    onVideoEnd,
    isTrimmed,
    start_time,
    timelineDuration,
    ideal_time,
  ]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackSpeed]);

  const formatTime = (time: number) => {
    if (time < 0) return null;
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Calculate the display times
  const currentDisplayTime = currentTime - (isTrimmed ? start_time : 0);
  const formattedCurrentTime = formatTime(currentDisplayTime);
  const formattedDuration = formatTime(timelineDuration);

  return (
    <TooltipProvider>
      <div className="group relative w-full rounded-lg">
        {isVideoLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-accent">
            <p className="text-sm text-muted-foreground">Loading video...</p>
          </div>
        )}

        <video
          ref={videoRef}
          src={video.videoSrc}
          className={cn(
            "aspect-video w-full cursor-pointer rounded-lg",
            isVideoLoading && "invisible",
          )}
          crossOrigin="anonymous"
          playsInline={true}
          preload="auto"
          autoPlay={false}
          onClick={togglePlay}
          onLoadedData={() => {
            setIsVideoLoading(false);
            // Ensure we're at the right position after load
            if (videoRef.current && !hasInitialSeek) {
              const seekTime =
                ideal_time ?? initialPlayTime ?? start_time ?? startAt;
              if (seekTime !== undefined) {
                videoRef.current.currentTime = seekTime;
                setHasInitialSeek(true);
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              togglePlay();
            }
          }}
          tabIndex={0}
        >
          <track kind="captions" />
        </video>

        {isControlsVisible && (
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-accent/50" />
        )}

        {isControlsVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1 }}
            className="absolute left-0 right-0 top-0 flex flex-row items-start justify-between rounded-b rounded-t-lg bg-gradient-to-b from-accent to-transparent p-4 px-6 pb-12 text-lg font-normal text-foreground"
          >
            <div className="flex flex-col items-start">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.25 }}
              >
                {video.title}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.2 }}
                className="text-sm text-foreground/70"
              >
                {dayjs(video.publishedAt).format("dddd, MMMM D")}
              </motion.div>
            </div>

            {currentMoment && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.2 }}
                className="mt-2 max-w-[40%] text-right text-sm font-semibold text-foreground"
              >
                {currentMoment.title}
              </motion.div>
            )}
          </motion.div>
        )}

        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 rounded-b-lg rounded-t-sm bg-gradient-to-t from-accent to-transparent p-4 transition-all duration-300",
            isControlsVisible ? "opacity-100" : "opacity-0",
          )}
        >
          <Tooltip open={!!hoveredMoment}>
            <div className="relative -mb-1 h-1 w-full rounded-full bg-accent">
              {momentsShown?.map((moment, index) => (
                <Tooltip key={moment.index}>
                  <TooltipTrigger
                    className={cn(
                      "absolute top-0 h-full rounded-full",
                      isQAMode && index % 2 === 0
                        ? "bg-primary"
                        : "bg-accent-foreground",
                    )}
                    style={{
                      // Adjust the marker positions by subtracting start_time if trimmed.
                      left: `${
                        ((moment.segment_start_timestamp_in_seconds -
                          (start_time ?? 0)) /
                          timelineDuration) *
                        100
                      }%`,
                      width: `${
                        ((moment.segment_end_timestamp_in_seconds -
                          (start_time ?? 0)) /
                          timelineDuration -
                          (moment.segment_start_timestamp_in_seconds -
                            (start_time ?? 0)) /
                            timelineDuration) *
                        100
                      }%`,
                      top: isQAMode ? (index % 2 === 0 ? "0%" : "50%") : "0%",
                      height: isQAMode ? "50%" : "100%",
                    }}
                  />
                  <TooltipContent className="bg-accent text-xs text-foreground">
                    <p>{moment.title}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            <TooltipTrigger asChild>
              <Slider
                min={0}
                max={timelineDuration}
                value={[currentTime - (isTrimmed ? start_time : 0)]}
                onValueChange={(value) => {
                  const seekTime = isTrimmed
                    ? (value[0] ?? 0) + (start_time ?? 0)
                    : (value[0] ?? 0);
                  seek(seekTime);
                }}
                aria-label="Seek"
                onMouseMove={(ev) => {
                  if (momentsShown) {
                    const rect = ev.currentTarget.getBoundingClientRect();
                    const mouseX = ev.clientX - rect.left;
                    const mouseTimePosition =
                      (mouseX / rect.width) * timelineDuration;

                    // Adjust the moment boundaries if trimmed.
                    const newHoveredMoment = momentsShown.find((moment) => {
                      const momentStart = isTrimmed
                        ? moment.segment_start_timestamp_in_seconds -
                          (start_time ?? 0)
                        : moment.segment_start_timestamp_in_seconds;
                      const momentEnd = isTrimmed
                        ? moment.segment_end_timestamp_in_seconds -
                          (start_time ?? 0)
                        : moment.segment_end_timestamp_in_seconds;
                      return (
                        mouseTimePosition >= momentStart &&
                        mouseTimePosition < momentEnd
                      );
                    });

                    setHoveredMoment(newHoveredMoment ?? null);
                  }
                }}
                onMouseLeave={() => setHoveredMoment(null)}
              />
            </TooltipTrigger>
            <TooltipContent
              sideOffset={24}
              className={cn(
                "bg-accent text-xs text-foreground shadow-xl",
                !hoveredMoment && "hidden",
              )}
            >
              {hoveredMoment?.title}
            </TooltipContent>
          </Tooltip>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-x-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-transparent hover:text-primary"
                    onClick={togglePlay}
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="start">
                  <p>{isPlaying ? "Pause" : "Play"}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-transparent hover:text-primary"
                    onClick={() => skip(-10)}
                    aria-label="Rewind 10 seconds"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rewind 10s</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-transparent hover:text-primary"
                    onClick={() => skip(10)}
                    aria-label="Forward 10 seconds"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Forward 10s</p>
                </TooltipContent>
              </Tooltip>
              <div className="flex items-center space-x-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hover:bg-transparent hover:text-primary"
                      onClick={() => changeVolume(isMuted ? 1 : 0)}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isMuted ? "Unmute" : "Mute"}</p>
                  </TooltipContent>
                </Tooltip>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={[volume ?? 0]}
                  onValueChange={(value) => changeVolume(value[0] ?? 0)}
                  className="w-16"
                  aria-label="Volume"
                />
              </div>
              {formattedCurrentTime && formattedDuration && (
                <span className="ml-2 text-xs">
                  {formattedCurrentTime} / {formattedDuration}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex h-5 w-auto max-w-14 justify-end gap-x-1 hover:bg-transparent hover:text-primary focus-visible:ring-0"
                  >
                    {playbackSpeed}x
                    <Gauge className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="end"
                  alignOffset={-25}
                  className="flex gap-x-1"
                >
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={cn(
                        "px-2 text-xs",
                        speed === playbackSpeed &&
                          "bg-primary/80 transition-colors hover:!bg-primary",
                      )}
                    >
                      {speed}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-transparent hover:text-primary"
                    onClick={toggleFullscreen}
                    aria-label={
                      isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                    }
                  >
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Maximize className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end">
                  <p>{isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
