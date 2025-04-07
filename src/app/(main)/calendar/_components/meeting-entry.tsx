"use client";

import { motion, useReducedMotion } from "framer-motion";
import _ from "lodash";
import { ArrowRight, Info, Video, VideoOff } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { getBotStatusInfo } from "~/lib/meeting-bots/status";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

interface MeetingEntryProps {
  event: RouterOutputs["calendar"]["getCalendarEvents"][number];
  isNow?: boolean;
}

interface BotStatusDetails {
  border: string;
  message: string;
  icon: JSX.Element;
  badge: string;
}

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 5, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 3 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
    },
  },
};

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
      delay: 0.2,
    },
  },
  hover: {
    scale: 1.05,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 400,
    },
  },
  tap: { scale: 0.95 },
};

export function MeetingEntry({ event, isNow = false }: MeetingEntryProps) {
  const [tag, setTag] = React.useState("");
  const hasMeetingUrl = !!event.meeting_url;
  const isInPast = event.start_time
    ? new Date(event.start_time) < new Date()
    : false;

  const utils = api.useUtils();
  const prefersReducedMotion = useReducedMotion();

  console.log(event);

  // Determine whether the meeting bot should join this meeting
  const [shouldJoin, setShouldJoin] = React.useState<boolean>(
    // Use the explicit override value if available, otherwise use the system-calculated value
    event.should_join_user_override !== null
      ? !!event.should_join_user_override
      : !!event.should_join_calculated,
  );

  // Get the mutation for updating join preference
  const updateJoinPreferenceMutation =
    api.calendar.updateMeetingJoinPreference.useMutation({
      onSuccess: () => {
        toast.success("Meeting join preference updated");
        void utils.calendar.getCalendarEvents.invalidate();
        void utils.calendar.getPastCalendarEvents.invalidate();
      },
      onError: (error) => {
        toast.error(`Failed to update join preference: ${error.message}`);
        // Reset to previous value on error
        setShouldJoin(
          event.should_join_user_override !== null
            ? !!event.should_join_user_override
            : !!event.should_join_calculated,
        );
      },
    });

  // Add tag mutation with optimistic updates
  const addTagMutation = api.calendar.addTag.useMutation({
    onMutate: async ({ tag: newTag }) => {
      // Cancel any outgoing refetches
      await utils.calendar.getCalendarEvents.cancel();
      await utils.calendar.getPastCalendarEvents.cancel();

      // Snapshot the previous value
      const previousFutureEvents = utils.calendar.getCalendarEvents.getData();
      const previousPastEvents = utils.calendar.getPastCalendarEvents.getData();

      // Optimistically update to the new value
      const updateEvents = (old: typeof previousFutureEvents) => {
        if (!old) return old;
        return _.uniqBy(
          old.map((e) => {
            if (e.id !== event.id) return e;
            return {
              ...e,
              tags: [...(e.tags ?? []), newTag],
            };
          }),
          (e) => e.id,
        );
      };

      utils.calendar.getCalendarEvents.setData(
        { profileId: event.profile_id ?? "" },
        updateEvents,
      );

      utils.calendar.getPastCalendarEvents.setData(
        { profileId: event.profile_id ?? "" },
        updateEvents,
      );

      setTag(""); // Clear input optimistically
      return { previousFutureEvents, previousPastEvents };
    },
    onError: (_err, _newTag, context) => {
      // Revert the optimistic update on error
      utils.calendar.getCalendarEvents.setData(
        { profileId: event.profile_id ?? "" },
        context?.previousFutureEvents,
      );
      utils.calendar.getPastCalendarEvents.setData(
        { profileId: event.profile_id ?? "" },
        context?.previousPastEvents,
      );
      toast.error("Failed to add tag");
    },
  });

  // Remove tag mutation with optimistic updates
  const removeTagMutation = api.calendar.removeTag.useMutation({
    onMutate: async ({ tag: tagToRemove }) => {
      await utils.calendar.getCalendarEvents.cancel();
      await utils.calendar.getPastCalendarEvents.cancel();

      const previousFutureEvents = utils.calendar.getCalendarEvents.getData();
      const previousPastEvents = utils.calendar.getPastCalendarEvents.getData();

      const updateEvents = (old: typeof previousFutureEvents) => {
        if (!old) return old;
        return _.uniqBy(
          old.map((e) => {
            if (e.id !== event.id) return e;
            return {
              ...e,
              tags: (e.tags ?? []).filter((t) => t !== tagToRemove),
            };
          }),
          (e) => e.id,
        );
      };

      utils.calendar.getCalendarEvents.setData(
        { profileId: event.profile_id ?? "" },
        updateEvents,
      );

      utils.calendar.getPastCalendarEvents.setData(
        { profileId: event.profile_id ?? "" },
        updateEvents,
      );

      return { previousFutureEvents, previousPastEvents };
    },
    onError: (_err, _variables, context) => {
      utils.calendar.getCalendarEvents.setData(
        { profileId: event.profile_id ?? "" },
        context?.previousFutureEvents,
      );
      utils.calendar.getPastCalendarEvents.setData(
        { profileId: event.profile_id ?? "" },
        context?.previousPastEvents,
      );
      toast.error("Failed to remove tag");
    },
  });

  // Handle toggle change
  const handleJoinToggleChange = (checked: boolean) => {
    setShouldJoin(checked);

    // Only call the mutation if we have a valid id and profile_id
    if (event.id && event.profile_id) {
      updateJoinPreferenceMutation.mutate({
        eventId: event.id,
        profileId: event.profile_id,
        shouldJoin: checked,
      });
    } else {
      toast.error("Cannot update join preference: Missing event or profile ID");
    }
  };

  /*
  // Handle tag submission
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tag.trim() && event.id && event.profile_id) {
      e.preventDefault();
      addTagMutation.mutate({
        eventId: event.id,
        profileId: event.profile_id,
        tag: tag.trim(),
      });
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    if (event.id && event.profile_id) {
      removeTagMutation.mutate({
        eventId: event.id,
        profileId: event.profile_id,
        tag: tagToRemove,
      });
    }
  };
  */

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const meetingTypeIcon = () => {
    if (!event.meeting_platform) {
      return <VideoOff className="h-4 w-4 text-muted-foreground" />;
    }

    if (event.meeting_bot?.api_video_id) {
      return <Video className="h-4 w-4 text-primary" />;
    }

    if (isInPast) {
      return <Video className="h-4 w-4 text-muted-foreground" />;
    }

    if (event.should_join_user_override || event.should_join_calculated) {
      return <Video className="h-4 w-4 text-primary" />;
    }

    return <Video className="h-4 w-4" />;
  };

  const botStatusDetails = getBotStatusInfo(
    event.meeting_bot,
    shouldJoin,
    isInPast,
  );

  // Add bot mutation
  const addBotMutation = api.calendar.launchMeetingBot.useMutation({
    onSuccess: () => {
      toast.success("Bot added to meeting successfully");
      void utils.calendar.getCalendarEvents.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to add bot: ${error.message}`);
    },
  });

  // Handle add bot
  const handleAddBot = () => {
    if (event.id && event.profile_id && event.meeting_url && event.summary) {
      addBotMutation.mutate({
        profileId: event.profile_id,
        meetingUrl: event.meeting_url,
        meetingTitle: event.summary,
      });
    }
  };

  // If no meeting URL, render a minimalist version
  if (!hasMeetingUrl) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className="flex h-10 items-center rounded-lg border border-dashed border-border p-2"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <VideoOff className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {event.summary}
            </span>
            <span className="ml-auto text-xs text-muted-foreground/70">
              {formatTime(event.start_time)}
            </span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Cannot record: No meeting URL available</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          className={cn(
            "relative overflow-hidden rounded-lg border p-4",
            isNow &&
              {
                primary: "border-primary/30 bg-primary/5",
                warning: "border-yellow-500/30 bg-yellow-500/5",
                error: "border-destructive/30 bg-destructive/5",
                muted: "border-border bg-background",
                success: "border-emerald-500/30 bg-emerald-500/5",
              }[botStatusDetails.variant],
          )}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          {...(prefersReducedMotion ? { transition: { duration: 0 } } : {})}
        >
          {isNow && (
            <motion.div
              className={cn(
                "absolute inset-0 bg-gradient-to-r",
                {
                  primary: "from-transparent via-transparent to-primary/10",
                  warning: "from-transparent via-transparent to-yellow-500/10",
                  error: "from-transparent via-transparent to-destructive/10",
                  muted: "from-transparent via-transparent to-border",
                  success: "from-transparent via-transparent to-emerald-500/10",
                }[botStatusDetails.variant],
              )}
              initial={{ x: "-100%" }}
              animate={{
                x: "100%",
                transition: {
                  duration: 3,
                  ease: "linear",
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 1,
                },
              }}
            />
          )}

          <div>
            <motion.div
              className="flex items-center justify-between gap-2"
              variants={itemVariants}
            >
              <motion.div
                className="flex items-center gap-2"
                variants={itemVariants}
              >
                <motion.div
                  className="relative"
                  initial={{ rotate: -10, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.1,
                  }}
                >
                  {meetingTypeIcon()}
                </motion.div>
                <motion.div
                  className="flex items-center gap-1"
                  initial={{ x: -5, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 24,
                    delay: 0.15,
                  }}
                >
                  <h3 className="text-sm font-medium">{event.summary}</h3>
                  <div className="flex items-center gap-2">
                    {event.should_join_calculated_reason && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <Info className="h-3.5 w-3.5 text-muted-foreground transition-colors hover:text-primary" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-xs"
                          sideOffset={10}
                        >
                          <p className="text-xs">
                            {event.should_join_calculated_reason}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                      className="flex items-center gap-2"
                    >
                      <Tooltip
                        open={
                          botStatusDetails.message === null ? false : undefined
                        }
                      >
                        <TooltipTrigger className="flex items-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-sm px-2 text-[10px]",
                              botStatusDetails.message
                                ? "cursor-help"
                                : "cursor-default",
                              botStatusDetails.styles.border,
                            )}
                          >
                            <span className="flex items-center gap-1">
                              <botStatusDetails.icon
                                className={cn(
                                  "h-3 w-3",
                                  botStatusDetails.styles.text,
                                )}
                              />
                              {botStatusDetails.badge}
                            </span>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="flex items-center gap-2"
                        >
                          <div className="flex flex-col gap-0.5">
                            <p className="text-xs font-medium">
                              {botStatusDetails.message}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                className="flex items-center gap-2"
                variants={itemVariants}
                initial={{ x: 5, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 24,
                  delay: 0.2,
                }}
              >
                {!isInPast && (
                  <div className="group flex items-center gap-2">
                    <Switch
                      id={`join-toggle-${event.id}`}
                      checked={shouldJoin}
                      onCheckedChange={handleJoinToggleChange}
                      className={cn(
                        "transition-all",
                        shouldJoin
                          ? "bg-primary"
                          : "data-[state=unchecked]:bg-foreground/30",
                        "group-hover:bg-secondary-foreground",
                      )}
                    />
                    <label
                      htmlFor={`join-toggle-${event.id}`}
                      className="cursor-pointer select-none text-xs font-medium"
                    >
                      Record
                    </label>
                  </div>
                )}
                {isNow &&
                  !event.meeting_bot?.api_video_id &&
                  botStatusDetails.variant !== "primary" && (
                    <motion.div
                      variants={buttonVariants}
                      initial="hidden"
                      animate="visible"
                      whileTap="tap"
                      className="flex h-6 items-center justify-center gap-2 text-xs font-medium"
                    >
                      <Button
                        onClick={handleAddBot}
                        disabled={addBotMutation.isPending}
                        size="sm"
                        className={cn(
                          "flex h-full items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90",
                          {
                            warning:
                              "border-yellow-500 bg-yellow-500/5 text-yellow-500 hover:bg-yellow-500/10",
                            error:
                              "border-destructive bg-destructive/5 text-destructive hover:bg-destructive/10",
                            muted:
                              "border-border bg-background text-muted-foreground hover:bg-background",
                            success:
                              "border-emerald-500 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10",
                          }[botStatusDetails.variant],
                        )}
                      >
                        {addBotMutation.isPending
                          ? "Adding bot..."
                          : "Add bot to meeting"}
                        <ArrowRight className="!h-3.5 !w-3.5" />
                      </Button>
                    </motion.div>
                  )}
                {event.meeting_bot?.api_video_id && (
                  <Link
                    href={`/videos/${event.meeting_bot.api_video_id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90",
                    )}
                  >
                    <Video className="h-3.5 w-3.5" />
                    See recording
                  </Link>
                )}
              </motion.div>
            </motion.div>

            <motion.p
              className="mt-1 text-xs text-muted-foreground"
              variants={itemVariants}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 24,
                delay: 0.25,
              }}
            >
              {formatTime(event.start_time)} - {formatTime(event.end_time)}
              {event.meeting_platform && (
                <> • {event.meeting_platform === "zoom" ? "Zoom" : "GMeet"}</>
              )}
            </motion.p>
          </div>

          {/* Alert when user has an explicit override */}
          {event.should_join_user_override !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 24,
                delay: 0.3,
              }}
            >
              <Alert
                variant={shouldJoin ? "default" : "destructive"}
                className="mt-2 py-2"
              >
                <AlertDescription>
                  {shouldJoin
                    ? "You've set this meeting to be automatically joined and recorded"
                    : "You've opted out of auto-joining for this meeting"}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Tags Input */}
          {/* <motion.div
            className="mt-3 flex h-7 items-center gap-2"
            variants={itemVariants}
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 24,
              delay: 0.35,
            }}
          >
            <motion.div className="flex flex-1 items-center border-b">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 24,
                  delay: 0.4,
                }}
              >
                <Tag className="h-4 w-4 text-muted-foreground" />
              </motion.div>

              <div
                className={cn(
                  "flex h-7 items-center gap-1 overflow-x-auto",
                  event.tags && event.tags.length > 0 && "ml-2",
                )}
              >
                {event.tags &&
                  event.tags.length > 0 &&
                  event.tags.map((tag, index) => (
                    <motion.div
                      key={tag}
                      variants={tagVariants}
                      whileTap="tap"
                      custom={index}
                      className="flex h-7 flex-shrink-0 items-center"
                    >
                      <Badge
                        variant="outline"
                        size="sm"
                        className="-mt-1 text-xs"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTag(tag);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    </motion.div>
                  ))}

                <Input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="h-7 min-w-[100px] flex-1 border-0 bg-transparent text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="# add tag"
                />
              </div>
            </motion.div>
          </motion.div> */}
        </motion.div>
      </TooltipTrigger>
    </Tooltip>
  );
}
