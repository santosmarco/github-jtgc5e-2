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

export interface SelectedContentListProps {
  selectedMoments: NonNullable<
    RouterOutputs["moments"]["listForInsights"]
  >["moments"];
  selectedVideos: VideoOutput[];
  onUnselectMoment: (
    moment: NonNullable<
      RouterOutputs["moments"]["listForInsights"]
    >["moments"][number],
  ) => void;
  onUnselectVideo: (video: VideoOutput) => void;
}

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
        {selectedMoments.map((moment) => {
          const Icon = getMomentIcon(moment);

          return (
            <TooltipProvider delayDuration={0} key={moment.id}>
              <Tooltip>
                <TooltipTrigger onClick={() => onUnselectMoment(moment)}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className={cn(
                      "group relative flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-xs transition-colors hover:border-primary/30 hover:bg-primary/10",
                    )}
                  >
                    <Icon className="h-3 w-3 text-primary/70" />
                    <span className="max-w-[120px] truncate">
                      {moment.title}
                    </span>
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
        })}
        {selectedVideos.map((video) => (
          <TooltipProvider delayDuration={0} key={video.videoId}>
            <Tooltip>
              <TooltipTrigger onClick={() => onUnselectVideo(video)}>
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
        ))}
        <div className="min-w-1"> </div>
      </div>
    </div>
  );
}
