import { motion } from "framer-motion";
import { Video, XIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { getMomentIcon } from "~/lib/moments";
import { cn } from "~/lib/utils";
import type { VideoOutput } from "~/lib/videos";
import type { RouterOutputs } from "~/trpc/react";

type Moment = NonNullable<
  RouterOutputs["moments"]["listForInsights"]
>["moments"][number];
type MomentsList = NonNullable<
  RouterOutputs["moments"]["listForInsights"]
>["moments"];

export type SelectedContentListProps = {
  selectedMoments: MomentsList;
  selectedVideos: VideoOutput[];
  onUnselectMoment: (moment: Moment) => void;
  onUnselectVideo: (video: VideoOutput) => void;
};

export function SelectedContentList({
  selectedMoments,
  selectedVideos,
  onUnselectMoment,
  onUnselectVideo,
}: SelectedContentListProps) {
  if (selectedMoments.length === 0 && selectedVideos.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-x-scroll py-3 pl-3">
      <div className="flex space-x-2">
        {selectedMoments.map((moment) => (
          <SelectedMomentItem
            key={moment.id}
            moment={moment}
            onUnselect={onUnselectMoment}
          />
        ))}
        {selectedVideos.map((video) => (
          <SelectedVideoItem
            key={video.videoId}
            video={video}
            onUnselect={onUnselectVideo}
          />
        ))}
        <div className="min-w-1"> </div>
      </div>
    </div>
  );
}

type SelectedMomentItemProps = {
  moment: Moment;
  onUnselect: (moment: Moment) => void;
};

function SelectedMomentItem({ moment, onUnselect }: SelectedMomentItemProps) {
  const Icon = getMomentIcon(moment);

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger onClick={() => onUnselect(moment)}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "group relative flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-xs transition-colors hover:border-primary/30 hover:bg-primary/10",
            )}
          >
            <Icon className="h-3 w-3 text-primary/70" />
            <span className="max-w-[120px] truncate">{moment.title}</span>
            <RemoveIcon />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={6}
          alignOffset={-10}
          className="max-w-xs border border-border bg-accent"
        >
          <div className="space-y-1">
            <p className="font-medium">{moment.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {moment.summary}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type SelectedVideoItemProps = {
  video: VideoOutput;
  onUnselect: (video: VideoOutput) => void;
};

function SelectedVideoItem({ video, onUnselect }: SelectedVideoItemProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger onClick={() => onUnselect(video)}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "group relative flex items-center gap-1.5 rounded-md border border-accent px-2 py-1 text-xs transition-colors hover:border-accent/70 hover:bg-accent/10",
            )}
          >
            <Video className="h-3 w-3 text-accent-foreground/70" />
            <span className="max-w-[120px] truncate">{video.title}</span>
            <RemoveIcon />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={6}
          alignOffset={-10}
          className="max-w-xs border border-border bg-accent"
        >
          <div className="space-y-1">
            <p className="font-medium">{video.title}</p>
            {video.summary && (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {video.summary}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RemoveIcon() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileHover={{ opacity: 0 }}
      animate={{ opacity: 0, y: 10 }}
      variants={{
        hover: { opacity: 1, y: 0 },
      }}
      className="absolute right-2"
    >
      <XIcon className="h-3 w-3" />
    </motion.div>
  );
}
