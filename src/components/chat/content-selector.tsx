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
import type { VideoOutput } from "~/lib/videos";
import type { RouterOutputs } from "~/trpc/react";

type Moment = NonNullable<
  RouterOutputs["moments"]["listForInsights"]
>["moments"][number];
type MomentsList = NonNullable<
  RouterOutputs["moments"]["listForInsights"]
>["moments"];

export type ContentSelectorProps = {
  moments?: MomentsList | null | undefined;
  videos?: VideoOutput[] | null | undefined;
  selectedMoments: MomentsList | null | undefined;
  selectedVideos: VideoOutput[] | null | undefined;
  onSelectMoment: ((moment: Moment) => void) | null | undefined;
  onUnselectMoment: ((moment: Moment) => void) | null | undefined;
  onSelectVideo: ((video: VideoOutput) => void) | null | undefined;
  onUnselectVideo: ((video: VideoOutput) => void) | null | undefined;
  disabled: boolean;
};

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

  const totalSelectedItems =
    (selectedMoments?.length ?? 0) + (selectedVideos?.length ?? 0);
  const remainingSlots = 5 - totalSelectedItems;
  const hasReachedLimit = totalSelectedItems >= 5;

  const handleMomentSelect = (moment: Moment) => {
    if (!selectedMoments) return;

    const isAlreadySelected = selectedMoments.some((m) => m.id === moment.id);

    if (isAlreadySelected) {
      onUnselectMoment?.(moment);
    } else if (!hasReachedLimit) {
      onSelectMoment?.(moment);
      if (totalSelectedItems >= 4) {
        setOpen(false);
      }
    } else {
      toast.error("You can only pin up to 5 items");
    }
  };

  const handleVideoSelect = (video: VideoOutput) => {
    if (!selectedVideos || !selectedMoments) return;

    const isAlreadySelected = selectedVideos.some(
      (v) => v.videoId === video.videoId,
    );

    if (isAlreadySelected) {
      onUnselectVideo?.(video);
    } else if (!hasReachedLimit) {
      onSelectVideo?.(video);
      if (totalSelectedItems >= 4) {
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
                {remainingSlots > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
                  >
                    {remainingSlots}
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
          <MomentsColumn
            moments={moments}
            selectedMoments={selectedMoments}
            onMomentSelect={handleMomentSelect}
          />
          <VideosColumn
            videos={videos}
            selectedVideos={selectedVideos}
            onVideoSelect={handleVideoSelect}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type MomentsColumnProps = {
  moments: MomentsList | null | undefined;
  selectedMoments: MomentsList | null | undefined;
  onMomentSelect: (moment: Moment) => void;
};

function MomentsColumn({
  moments,
  selectedMoments,
  onMomentSelect,
}: MomentsColumnProps) {
  if (!moments?.length) return <div className="w-1/2" />;

  return (
    <div className="w-1/2">
      <DropdownMenuLabel className="border-b border-border px-3">
        Moments
      </DropdownMenuLabel>
      <DropdownMenuGroup className="max-h-96 overflow-y-auto">
        {moments.map((moment) => (
          <MomentItem
            key={moment.id}
            moment={moment}
            isSelected={
              selectedMoments?.some((m) => m.id === moment.id) ?? false
            }
            onSelect={() => onMomentSelect(moment)}
          />
        ))}
      </DropdownMenuGroup>
    </div>
  );
}

type MomentItemProps = {
  moment: Moment;
  isSelected: boolean;
  onSelect: () => void;
};

function MomentItem({ moment, isSelected, onSelect }: MomentItemProps) {
  const Icon = getMomentIcon(moment);
  const duration =
    moment.segment_end_timestamp_in_seconds -
    moment.segment_start_timestamp_in_seconds;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSelect();
    }
  };

  return (
    <div
      className="flex cursor-pointer flex-col gap-1 border-b border-border/10 px-3 py-2 hover:bg-accent"
      onClick={onSelect}
      onKeyDown={handleKeyPress}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{moment.title}</span>
        {isSelected && (
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
          {formatDuration(duration)}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDuration(moment.segment_start_timestamp_in_seconds)}
        </div>
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">
        {moment.summary}
      </p>
    </div>
  );
}

type VideosColumnProps = {
  videos: VideoOutput[] | null | undefined;
  selectedVideos: VideoOutput[] | null | undefined;
  onVideoSelect: (video: VideoOutput) => void;
};

function VideosColumn({
  videos,
  selectedVideos,
  onVideoSelect,
}: VideosColumnProps) {
  if (!videos?.length) return <div className="w-1/2" />;

  return (
    <div className="w-1/2">
      <DropdownMenuLabel className="border-b border-border px-3">
        Videos
      </DropdownMenuLabel>
      <DropdownMenuGroup className="max-h-96 overflow-y-auto">
        {videos.map((video) => (
          <VideoItem
            key={video.videoId}
            video={video}
            isSelected={
              selectedVideos?.some((v) => v.videoId === video.videoId) ?? false
            }
            onSelect={() => onVideoSelect(video)}
          />
        ))}
      </DropdownMenuGroup>
    </div>
  );
}

type VideoItemProps = {
  video: VideoOutput;
  isSelected: boolean;
  onSelect: () => void;
};

function VideoItem({ video, isSelected, onSelect }: VideoItemProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSelect();
    }
  };

  return (
    <div
      className="flex cursor-pointer flex-col gap-1 border-b border-border/10 px-3 py-2 hover:bg-accent"
      onClick={onSelect}
      onKeyDown={handleKeyPress}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{video.title}</span>
        {isSelected && (
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
            {new Date(video.publishedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
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
  );
}
