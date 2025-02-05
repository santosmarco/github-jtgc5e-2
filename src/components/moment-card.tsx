"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ClockIcon,
  MessageCircle,
  Share2Icon,
  ThumbsDown,
  ThumbsUp,
  VideoIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { ExpandingText } from "~/components/expanding-text";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { useOnboardingTasks } from "~/hooks/use-onboarding-tasks";
import { useValidatedForm } from "~/hooks/use-validated-form";
import { getMomentStyles } from "~/lib/moments";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const commentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(500, "Comment is too long"),
});

export type MomentCardProps = {
  moment: VideoMoment;
  index?: number;
  onSkipToMoment?: (moment: VideoMoment) => void;
  jumpToLabel?: React.ReactNode;
  noShare?: boolean;
  className?: string;
  videoTitle?: string;
  videoDate?: string | null;
  hideRelevance?: boolean;
  hideTimestamp?: boolean;
};

export function MomentCard({
  moment,
  index,
  onSkipToMoment,
  jumpToLabel,
  noShare,
  className,
  videoTitle,
  videoDate,
  hideRelevance,
  hideTimestamp,
}: MomentCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const utils = api.useUtils();
  const { completeTask } = useOnboardingTasks();

  const form = useValidatedForm(commentSchema, {
    defaultValues: {
      content: "",
    },
  });

  const { data: user } = api.auth.getUser.useQuery();
  const { data: reactions, isLoading: reactionsLoading } =
    api.moments.getReactions.useQuery({
      momentId: moment.id,
    });
  const { data: comments } = api.moments.getComments.useQuery({
    momentId: moment.id,
  });

  const { mutate: addReaction } = api.moments.addReaction.useMutation({
    onMutate: async ({ type }) => {
      await utils.moments.getReactions.cancel({ momentId: moment.id });
      await utils.videos.getOne.cancel();
      await utils.videos.list.cancel();

      const previousReactions = utils.moments.getReactions.getData({
        momentId: moment.id,
      });
      const previousVideo = utils.videos.getOne.getData();
      const previousVideos = utils.videos.list.getData();

      utils.videos.getOne.setData(
        {
          videoId: moment.video_id,
          options: { moments: { includeNonRelevant: true } },
        },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            moments: old.moments?.map((m) => {
              if (m.id !== moment.id) return m;
              return {
                ...m,
                reactions: [
                  ...(m.reactions?.filter((r) => r.user_id !== user?.id) ?? []),
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
        },
      );

      utils.moments.getReactions.setData({ momentId: moment.id }, (old) => {
        const filtered = old?.filter((r) => r.user_id !== user?.id) ?? [];
        return [
          ...filtered,
          {
            id: "temp-id",
            moment_id: moment.id,
            user_id: user?.id ?? "",
            reaction_type: type,
            created_at: new Date().toISOString(),
            user: user!,
          },
        ];
      });

      return { previousReactions, previousVideo, previousVideos };
    },
    onError: (err, newReaction, context) => {
      utils.moments.getReactions.setData(
        { momentId: moment.id },
        context?.previousReactions,
      );
      utils.videos.getOne.setData(
        {
          videoId: moment.video_id,
          options: { moments: { includeNonRelevant: true } },
        },
        context?.previousVideo,
      );
      utils.videos.list.setData(
        { options: { moments: { includeNonRelevant: true } } },
        context?.previousVideos,
      );
      toast.error("Failed to add reaction. Please try again.");
    },
  });

  const { mutate: addComment } = api.moments.addComment.useMutation({
    onMutate: async ({ content }) => {
      await utils.moments.getComments.cancel({ momentId: moment.id });

      const previousComments = utils.moments.getComments.getData({
        momentId: moment.id,
      });

      utils.moments.getComments.setData({ momentId: moment.id }, (old) => {
        return [
          ...(old ?? []),
          {
            id: "temp-id",
            moment_id: moment.id,
            user_id: user?.id ?? "",
            content,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user: user!,
          },
        ];
      });

      return { previousComments };
    },
    onSuccess: () => {
      form.reset();
    },
    onError: (err, newComment, context) => {
      utils.moments.getComments.setData(
        { momentId: moment.id },
        context?.previousComments,
      );
      toast.error("Failed to add comment. Please try again.");
    },
  });

  const handleSkipToMoment = useCallback(() => {
    void completeTask("watch_moment");
    onSkipToMoment?.(moment);
  }, [completeTask, onSkipToMoment, moment]);

  const styles = getMomentStyles(moment);

  console.log(moment, videoDate);

  const handleCopyUrl = () => {
    const url = `${window.location.origin}/embed/moments/${encodeURIComponent(moment.index)}`;
    void navigator.clipboard.writeText(url);
    toast.success("The moment URL has been copied to your clipboard.");
    setIsOpen(false);
  };

  const handleCopyEmbed = () => {
    const embedCode = `<iframe src="${window.location.origin}/embed/moments/${encodeURIComponent(moment.index)}" width="100%" height="400" frameborder="0"></iframe>`;
    void navigator.clipboard.writeText(embedCode);
    toast.success("The embed code has been copied to your clipboard.");
    setIsOpen(false);
  };

  const handleReaction = (type: "thumbs_up" | "thumbs_down") => {
    if (!user) {
      toast.error("Please sign in to react to moments.");
      return;
    }
    addReaction({ momentId: moment.id, type });
  };

  const onSubmitComment = (data: z.infer<typeof commentSchema>) => {
    if (!user) {
      toast.error("Please sign in to comment.");
      return;
    }
    addComment({ momentId: moment.id, content: data.content });
  };

  const thumbsUpCount =
    reactions?.filter((r) => r.reaction_type === "thumbs_up").length ?? 0;
  const thumbsDownCount =
    reactions?.filter((r) => r.reaction_type === "thumbs_down").length ?? 0;
  const userReaction = reactions?.find(
    (r) => r.user_id === user?.id,
  )?.reaction_type;

  // const hasThumbs = thumbsUpCount + thumbsDownCount > 0;
  const hasMoreThumbsDown =
    !reactionsLoading && thumbsDownCount > thumbsUpCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
        delay: index ? index * 0.1 : 0,
      }}
      className="relative"
    >
      <motion.div
        className={cn(
          "flex flex-col rounded-md border border-border bg-accent p-4 shadow-md",
          className,
        )}
      >
        {/* Header Section */}
        <div className="mb-3 flex flex-col gap-1">
          {/* Title and Actions */}
          <div className="flex items-start justify-between">
            <TooltipProvider>
              <Tooltip open={user?.is_admin ? undefined : false}>
                <TooltipTrigger asChild>
                  <h2 className="flex items-baseline font-bold leading-none">
                    {moment.title}
                  </h2>
                </TooltipTrigger>
                <TooltipContent align="start" sideOffset={8}>
                  ID: <pre className="inline text-xs">{moment.id}</pre>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex items-center gap-x-2 text-muted-foreground">
              {!hideRelevance && !moment.relevant && (
                <Badge variant="destructive" className="mr-1.5">
                  Not Relevant
                </Badge>
              )}
              {!hideTimestamp && (
                <span className="flex items-center gap-x-1.5 text-sm">
                  <ClockIcon className="h-3.5 w-3.5" />
                  {moment.segment_start_timestamp.replace(/\.\d+/, "")}
                </span>
              )}
              {!noShare && (
                <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="link"
                      size="icon"
                      className="ml-1.5 hidden h-3.5 w-3.5 text-muted-foreground hover:text-foreground focus-visible:ring-0 md:block"
                    >
                      <Share2Icon className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyUrl}>
                      Copy URL
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyEmbed}>
                      Copy Embed Code
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Video Info */}
          {(videoTitle || videoDate) && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {videoTitle && (
                <div className="flex items-center gap-1.5 font-medium">
                  <VideoIcon className="h-3.5 w-3.5" />
                  <span className="leading-none">{videoTitle}</span>
                  {videoDate && <span>•</span>}
                </div>
              )}
              {videoDate && (
                <span>
                  {new Date(videoDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Activity Types */}
        <div className="mb-4 flex flex-wrap gap-2">
          {moment.target_person_type && (
            <Badge
              variant="outline"
              className="rounded-full border-foreground/50"
            >
              {moment.target_person_type}
            </Badge>
          )}
          <Badge
            variant="outline"
            className="rounded-full border-foreground/50"
            {...styles.activityTypeBadge}
          >
            {moment.activity_type}
          </Badge>
        </div>

        {/* Summary */}
        <div className="flex flex-col sm:flex-row sm:items-end">
          <ExpandingText
            text={moment.summary}
            className="text-sm text-muted-foreground"
            containerProps={{ className: "mb-4 sm:mb-0 sm:flex-grow" }}
          />
        </div>

        <Separator className="my-4" />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="link"
              size="sm"
              className={cn(
                "gap-2 text-foreground hover:text-primary hover:no-underline",
                userReaction === "thumbs_up" && "cursor-default text-primary",
                hasMoreThumbsDown && "z-30 text-muted-foreground",
              )}
              onClick={() => handleReaction("thumbs_up")}
            >
              <ThumbsUp className="h-4 w-4" />
              <span>{thumbsUpCount}</span>
            </Button>
            <Button
              variant="link"
              size="sm"
              className={cn(
                "gap-2 text-foreground hover:text-red-500 hover:no-underline",
                userReaction === "thumbs_down" && "cursor-default text-red-500",
                hasMoreThumbsDown && "z-30",
              )}
              onClick={() => handleReaction("thumbs_down")}
            >
              <ThumbsDown className="h-4 w-4" />
              <span>{thumbsDownCount}</span>
            </Button>
            <Button
              variant="link"
              size="sm"
              className={cn(
                "gap-2 text-foreground hover:text-primary hover:no-underline",
                hasMoreThumbsDown && "z-30 text-muted-foreground",
              )}
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="h-4 w-4" />
              <span>{comments?.length ?? 0}</span>
            </Button>
          </div>

          {onSkipToMoment && (
            <TooltipProvider delayDuration={0}>
              <Tooltip open={hasMoreThumbsDown ? undefined : false}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex justify-end sm:ml-4",
                      hasMoreThumbsDown && "z-30 cursor-not-allowed",
                    )}
                  >
                    <Button
                      onClick={handleSkipToMoment}
                      disabled={hasMoreThumbsDown}
                    >
                      {jumpToLabel ?? "Jump To"}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  align="end"
                  className="bg-accent"
                  sideOffset={8}
                >
                  You disliked this moment. React with a thumbs up to unlock the
                  jump-to feature.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Comments Section */}
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="z-30 mt-6 space-y-4"
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitComment)}
                className="flex items-center gap-2"
              >
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder="Add a comment..."
                          {...field}
                          className="bg-background"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" size="sm">
                  Send
                </Button>
              </form>
            </Form>

            <div className="space-y-4">
              {comments
                ?.filter(
                  (
                    comment,
                  ): comment is typeof comment & {
                    user: NonNullable<(typeof comment)["user"]>;
                  } => !!comment.user,
                )
                .map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} />
                      <AvatarFallback>
                        {comment.user.nickname?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium">
                          {comment.user.nickname}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Overlay for disliked moments */}
      <AnimatePresence mode="wait">
        {hasMoreThumbsDown && (
          <motion.div
            className="pointer-events-none absolute bottom-0 left-0 right-0 top-0 rounded-sm bg-background/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
              delay: index ? index * 0.1 : 0,
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
