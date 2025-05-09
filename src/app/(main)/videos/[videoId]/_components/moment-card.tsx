"use client";

import { motion, type Variants } from "framer-motion";
import {
  Clock,
  MessageSquare,
  Share2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const cardAnimationVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      delay: index * 0.05,
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  }),
} as const satisfies Variants;

const formatTimestamp = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const getTagColor = (tag: string): string => {
  const tagLower = tag.toLowerCase();
  if (tagLower.includes("accountability"))
    return "border-emerald-400/50 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400";
  if (tagLower.includes("communication"))
    return "border-blue-400/50 bg-blue-400/10 text-blue-600 dark:text-blue-400";
  if (tagLower.includes("decision"))
    return "border-purple-400/50 bg-purple-400/10 text-purple-600 dark:text-purple-400";
  if (tagLower.includes("analysis"))
    return "border-cyan-400/50 bg-cyan-400/10 text-cyan-600 dark:text-cyan-400";
  if (tagLower.includes("feedback"))
    return "border-amber-400/50 bg-amber-400/10 text-amber-600 dark:text-amber-400";
  return "border-gray-400/50 bg-gray-400/10 text-gray-600 dark:text-gray-400";
};

type MomentHeaderProps = {
  moment: VideoMoment;
};

function MomentHeader({ moment }: MomentHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="font-semibold">{moment.title || "Untitled Moment"}</h3>
      {!moment.relevant && (
        <Badge variant="destructive" className="text-xs">
          Not Relevant
        </Badge>
      )}
    </div>
  );
}

type MomentMetadataProps = {
  moment: VideoMoment;
};

function MomentMetadata({ moment }: MomentMetadataProps) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="flex items-center text-sm text-muted-foreground">
        <Clock className="mr-1 h-3.5 w-3.5" />
        {moment.segment_start_timestamp_in_seconds
          ? formatTimestamp(moment.segment_start_timestamp_in_seconds)
          : "00:00:00"}
      </div>
      <div className="flex gap-1">
        {moment.activity_type && (
          <Badge
            key={`tag-${moment.id}-activity`}
            variant="outline"
            className={cn("text-xs", getTagColor(moment.activity_type))}
          >
            {moment.activity_type}
          </Badge>
        )}
      </div>
    </div>
  );
}

type ShareMenuProps = {
  className?: string;
  onCopyUrl: () => void;
  onCopyEmbed: () => void;
};

function ShareMenu({ className, onCopyUrl, onCopyEmbed }: ShareMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8 text-muted-foreground", className)}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onCopyUrl}>Copy URL</DropdownMenuItem>
        <DropdownMenuItem onClick={onCopyEmbed}>
          Copy Embed Code
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type MomentSummaryProps = {
  summary: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
};

function MomentSummary({
  summary,
  expanded,
  onToggleExpand,
}: MomentSummaryProps) {
  const showExpandButton = !expanded && summary && summary.length > 100;

  return (
    <div className="h-auto transform transition-all duration-300">
      <p
        className={cn(
          "text-sm text-muted-foreground",
          !expanded && "line-clamp-2",
        )}
      >
        {summary || "No summary available"}
      </p>

      {showExpandButton && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 h-6 p-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={onToggleExpand}
        >
          Read more
        </Button>
      )}

      {expanded && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 h-6 p-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={onToggleExpand}
        >
          Show less
        </Button>
      )}
    </div>
  );
}

type ReactionButtonProps = {
  icon: React.ReactNode;
  count: number;
  onClick: () => void;
  hoverColor: string;
  active?: boolean;
  disabled?: boolean;
};

function ReactionButton({
  icon,
  count,
  onClick,
  hoverColor,
  active,
  disabled,
}: ReactionButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 gap-1.5 text-muted-foreground",
        `hover:${hoverColor}`,
        active && hoverColor,
        disabled && "cursor-default opacity-70",
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span className="text-xs">{count}</span>
    </Button>
  );
}

type MomentCardProps = {
  moment: VideoMoment;
  index: number;
  onJumpToMoment: (moment: VideoMoment) => void;
  className?: string;
};

export function MomentCard({
  moment,
  index,
  onJumpToMoment,
  className,
}: MomentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const utils = api.useUtils();

  const { data: user } = api.auth.getUser.useQuery();
  const { data: reactions, isLoading: reactionsLoading } =
    api.moments.getReactions.useQuery({
      momentId: moment.id,
    });

  const { mutate: addReaction } = api.moments.addReaction.useMutation({
    onMutate: async ({ type }) => {
      // Cancel any outgoing refetches
      await utils.moments.getReactions.cancel({ momentId: moment.id });
      await utils.videos.getOne.cancel();

      // Snapshot the previous value
      const previousReactions = utils.moments.getReactions.getData({
        momentId: moment.id,
      });
      const previousVideo = utils.videos.getOne.getData();

      // Optimistically update the reactions cache
      utils.moments.getReactions.setData({ momentId: moment.id }, (old) => {
        const filtered = old?.filter((r) => r.user_id !== user?.id) ?? [];
        return [
          ...filtered,
          {
            ...moment,
            id: "temp-id",
            moment_id: moment.id,
            user_id: user?.id ?? "",
            reaction_type: type,
            created_at: new Date().toISOString(),
            user: user as any,
          },
        ];
      });

      // Also update the video data if it exists in the cache
      if (moment.video_id) {
        utils.videos.getOne.setData({ videoId: moment.video_id }, (old) => {
          if (!old) return old;
          return {
            ...old,
            moments: old.moments?.map((m) => {
              if (m.id !== moment.id) return m;

              // Create a new reactions array with the updated reaction
              const filteredReactions =
                m.reactions?.filter?.((r) => r.user_id !== user?.id) ?? [];

              return {
                ...m,
                reactions: [
                  ...filteredReactions,
                  {
                    id: "temp-id",
                    moment_id: moment.id,
                    user_id: user?.id ?? "",
                    reaction_type: type,
                    created_at: new Date().toISOString(),
                  },
                ],
              };
            }),
          };
        });
      }

      return { previousReactions, previousVideo };
    },
    onError: (err, newReaction, context) => {
      // If the mutation fails, revert the optimistic update
      utils.moments.getReactions.setData(
        { momentId: moment.id },
        context?.previousReactions,
      );

      if (moment.video_id) {
        utils.videos.getOne.setData(
          { videoId: moment.video_id },
          context?.previousVideo,
        );
      }

      toast.error("Failed to add reaction. Please try again.");
    },
  });

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleReaction = useCallback(
    (type: "thumbs_up" | "thumbs_down") => {
      if (!user) {
        toast.error("Please sign in to react to moments.");
        return;
      }
      addReaction({ momentId: moment.id, type });
    },
    [addReaction, moment.id, user],
  );

  const handleCopyUrl = useCallback(() => {
    const url = `${window.location.origin}/videos/${moment.video_id}?moment=${moment.index}`;
    void navigator.clipboard.writeText(url);
    toast.success("The moment URL has been copied to your clipboard.");
  }, [moment.video_id, moment.index]);

  const handleCopyEmbed = useCallback(() => {
    const embedCode = `<iframe src="${window.location.origin}/embed/moments/${moment.index}" width="100%" height="400" frameborder="0"></iframe>`;
    void navigator.clipboard.writeText(embedCode);
    toast.success("The embed code has been copied to your clipboard.");
  }, [moment.index]);

  // Calculate reaction counts
  const thumbsUpCount =
    reactions?.filter((r) => r.reaction_type === "thumbs_up").length ?? 0;
  const thumbsDownCount =
    reactions?.filter((r) => r.reaction_type === "thumbs_down").length ?? 0;

  // Get the current user's reaction
  const userReaction = reactions?.find(
    (r) => r.user_id === user?.id,
  )?.reaction_type;

  // Determine if thumbs down outweigh thumbs up
  const hasMoreThumbsDown =
    !reactionsLoading && thumbsDownCount > thumbsUpCount;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardAnimationVariants}
      custom={index}
      className={className}
    >
      <Card
        className={cn(
          "overflow-hidden transition-all duration-200",
          !moment.relevant && "border-destructive/30",
          expanded ? "shadow-md" : "hover:shadow-sm",
        )}
      >
        <CardContent className="p-0">
          <div className="p-4">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex-1">
                <MomentHeader moment={moment} />
                <MomentMetadata moment={moment} />
              </div>
              <div className="flex items-center gap-1">
                <ShareMenu
                  onCopyUrl={handleCopyUrl}
                  onCopyEmbed={handleCopyEmbed}
                />
              </div>
            </div>

            <MomentSummary
              summary={moment.summary}
              expanded={expanded}
              onToggleExpand={toggleExpanded}
            />
          </div>

          <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-3">
              <ReactionButton
                icon={<ThumbsUp className="h-3.5 w-3.5" />}
                count={thumbsUpCount}
                onClick={() => handleReaction("thumbs_up")}
                hoverColor="text-primary"
                active={userReaction === "thumbs_up"}
                disabled={reactionsLoading}
              />
              <ReactionButton
                icon={<ThumbsDown className="h-3.5 w-3.5" />}
                count={thumbsDownCount}
                onClick={() => handleReaction("thumbs_down")}
                hoverColor="text-destructive"
                active={userReaction === "thumbs_down"}
                disabled={reactionsLoading}
              />
              <ReactionButton
                icon={<MessageSquare className="h-3.5 w-3.5" />}
                count={0}
                onClick={() => toast.info("Comments feature coming soon")}
                hoverColor="text-foreground"
              />
            </div>
            <TooltipProvider delayDuration={0}>
              <Tooltip open={hasMoreThumbsDown ? undefined : false}>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => onJumpToMoment(moment)}
                      disabled={hasMoreThumbsDown}
                    >
                      Jump To
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent align="end" sideOffset={8}>
                  This moment has more dislikes than likes. React with a thumbs
                  up to unlock the jump-to feature.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
