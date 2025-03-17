import { motion } from "framer-motion";
import { Calendar, CheckIcon, Clock, PinIcon, Tag, Timer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { getMomentIcon } from "~/lib/moments";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import type { VideoOutput } from "~/lib/videos";
import type { RouterOutputs } from "~/trpc/react";

export interface ContentSelectorProps {
  moments?: NonNullable<RouterOutputs["moments"]["listForInsights"]>["moments"];
  videos?: VideoOutput[];
  selectedMoments: NonNullable<
    RouterOutputs["moments"]["listForInsights"]
  >["moments"];
  selectedVideos: VideoOutput[];
  onSelectMoment: (
    moment: NonNullable<
      RouterOutputs["moments"]["listForInsights"]
    >["moments"][number],
  ) => void;
  onUnselectMoment: (
    moment: NonNullable<
      RouterOutputs["moments"]["listForInsights"]
    >["moments"][number],
  ) => void;
  onSelectVideo: (video: VideoOutput) => void;
  onUnselectVideo: (video: VideoOutput) => void;
  disabled: boolean;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function ContentSelector({
  moments = [],
  videos = [],
  selectedMoments,
  selectedVideos,
  onSelectMoment,
  onUnselectMoment,
  onSelectVideo,
  onUnselectVideo,
  disabled,
}: ContentSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleMomentSelect = (moment: (typeof moments)[number]) => {
    if (selectedMoments.some((m) => m.id === moment.id)) {
      onUnselectMoment(moment);
    } else if (selectedMoments.length + selectedVideos.length < 5) {
      onSelectMoment(moment);
      if (selectedMoments.length + selectedVideos.length >= 4) {
        setOpen(false);
      }
    } else {
      toast.error("You can only pin up to 5 items");
    }
  };

  const handleVideoSelect = (video: (typeof videos)[number]) => {
    if (selectedVideos.some((v) => v.videoId === video.videoId)) {
      onUnselectVideo(video);
    } else if (selectedMoments.length + selectedVideos.length < 5) {
      onSelectVideo(video);
      if (selectedMoments.length + selectedVideos.length >= 4) {
        setOpen(false);
      }
    } else {
      toast.error("You can only pin up to 5 items");
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="relative h-8 w-8"
                aria-label="Select content"
                disabled={disabled}
              >
                <PinIcon className="h-4 w-4" />
                {selectedMoments.length + selectedVideos.length < 5 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
                  >
                    {5 - (selectedMoments.length + selectedVideos.length)}
                  </motion.div>
                )}
              </Button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent
            side="top"
            align="end"
            className="border border-border bg-background"
          >
            <p>Pin your favorite videos and moments</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent side="top" align="end" className="w-[700px] p-0">
        <div className="flex divide-x divide-border">
          {/* Moments Column */}
          <div className="w-1/2">
            {moments.length > 0 && (
              <>
                <DropdownMenuLabel className="border-b border-border px-3">
                  Moments
                </DropdownMenuLabel>
                <DropdownMenuGroup className="max-h-96 overflow-y-auto">
                  {moments.map((moment) => {
                    const Icon = getMomentIcon(moment);

                    return (
                      <div
                        key={moment.id}
                        className="flex cursor-pointer flex-col gap-1 border-b border-border/10 px-3 py-2 hover:bg-accent"
                        onClick={() => handleMomentSelect(moment)}
                      >
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-medium">{moment.title}</span>
                          {selectedMoments.some((m) => m.id === moment.id) && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: "spring", duration: 0.2 }}
                            >
                              <CheckIcon className="h-5 w-5 text-primary" />
                            </motion.div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-0.5 text-xs leading-none text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Icon className="h-3 w-3" />
                            {moment.activity}
                          </div>
                          <div className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {formatDuration(
                              moment.segment_end_timestamp_in_seconds -
                                moment.segment_start_timestamp_in_seconds,
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(
                              moment.segment_start_timestamp_in_seconds,
                            )}
                          </div>
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {moment.summary}
                        </p>
                      </div>
                    );
                  })}
                </DropdownMenuGroup>
              </>
            )}
          </div>

          {/* Videos Column */}
          <div className="w-1/2">
            {videos.length > 0 && (
              <>
                <DropdownMenuLabel className="border-b border-border px-3">
                  Videos
                </DropdownMenuLabel>
                <DropdownMenuGroup className="max-h-96 overflow-y-auto">
                  {videos.map((video) => (
                    <div
                      key={video.videoId}
                      className="flex cursor-pointer flex-col gap-1 border-b border-border/10 px-3 py-2 hover:bg-accent"
                      onClick={() => handleVideoSelect(video)}
                    >
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{video.title}</span>
                        {selectedVideos.some(
                          (v) => v.videoId === video.videoId,
                        ) && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", duration: 0.2 }}
                          >
                            <CheckIcon className="h-5 w-5 text-primary" />
                          </motion.div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-0.5 text-xs leading-none text-muted-foreground">
                        {video.publishedAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(video.publishedAt).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </div>
                        )}
                        {video.tags && video.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {video.tags.join(", ")}
                          </div>
                        )}
                      </div>
                      {video.description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {video.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
