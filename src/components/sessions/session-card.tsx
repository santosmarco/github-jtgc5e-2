"use client";

import dayjs from "dayjs";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Lightbulb,
  Video,
} from "lucide-react";
import { useRef, useState } from "react";

import { PlayerProvider } from "~/components/player/provider";
import { VideoPlayer } from "~/components/player/video";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useIsMobile } from "~/hooks/use-mobile";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";

import { ActionsList } from "./actions-list";
import { InsightsList } from "./insights-list";
import PostItContainer from "./post-it-container";
import SessionAnnotation from "./session-annotation";

export interface SessionCardProps {
  session: RouterOutputs["sessions"]["getAllSessionsForUser"][number];
  isLoading?: boolean;
  isNextSession?: boolean;
  isCollapsed?: boolean;
  sessionStreak?: number;
  onAddInsight?: (content: string) => void;
  onToggleStar?: (id: string, isStarred: boolean) => void;
}

export interface SessionNoteType {
  id: string;
  content: string;
  author: {
    id: string;
    nickname?: string | null;
    avatar_url?: string | null;
  };
  created_at: string;
  likes?: number;
  isLiked?: boolean;
}

type ActiveSectionType = "insights" | "actions" | "both";

export default function SessionCard({
  session,
  isLoading = false,
  isNextSession = false,
  isCollapsed = false,
  sessionStreak = 0,
  onAddInsight,
  onToggleStar,
}: SessionCardProps): JSX.Element {
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<ActiveSectionType>("both");
  const [showAllAnnotations, setShowAllAnnotations] = useState<boolean>(false);

  const isMobile = useIsMobile();

  // Determine if session is in the past
  const isPastSession = session.date
    ? dayjs(session.date).isBefore(dayjs())
    : false;

  // Limit annotations for past sessions
  const hasAnnotations = session.annotations && session.annotations.length > 0;
  const limitedAnnotations =
    isPastSession && !showAllAnnotations && hasAnnotations
      ? session.annotations.slice(0, 4)
      : session.annotations;
  const hasMoreAnnotations =
    isPastSession && hasAnnotations && session.annotations.length > 3;

  // Video state and detection
  const hasVideoRecording = Boolean(
    session.event?.meeting_bots?.some((bot) => bot.api_video_id),
  );

  // Get the first available video ID
  const videoId = hasVideoRecording
    ? session.event?.meeting_bots?.find((bot) => bot.api_video_id)
        ?.api_video_id || ""
    : "";

  // Fetch video data from the API
  const { data: videoData } = api.videos.getFromApiVideo.useQuery(
    { videoId },
    {
      enabled: hasVideoRecording && Boolean(videoId),
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  );

  // Format date for display
  const formatDate = (dateString?: string | Date | null): string => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const today = new Date();

    // If date is today
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }

    // If date is tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }

    // If date is within last 7 days
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    }

    // Otherwise show formatted date
    return dayjs(session.date).format("MMM D, YYYY • h:mm A");
  };

  // Generate display title
  const displayTitle =
    session.title ??
    (session.user?.nickname && session.coach?.nickname
      ? `${session.user.nickname} & ${session.coach.nickname}`
      : session.user?.nickname
        ? `Session with ${session.user.nickname}`
        : session.coach?.nickname
          ? `Session with ${session.coach.nickname}`
          : "Untitled Session");

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 1,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
      },
    },
  };

  const headerVariants: Variants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
        delay: 0.1,
      },
    },
  };

  const contentVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
        delay: 0.2,
        staggerChildren: 0.1,
      },
    },
  };

  const tabVariants: Variants = {
    inactive: {
      opacity: 0.7,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
      },
    },
    active: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
      },
    },
    hover: {
      opacity: 1,
      y: -2,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
      },
    },
  };

  const nextSessionVariants: Variants = {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.01, 1],
      transition: {
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse",
        ease: "easeInOut",
      },
    },
  };

  const videoPlayerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        delay: 0.3,
      },
    },
  };

  // Add streak animation variants
  const streakVariants: Variants = {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.1, 1],
      transition: {
        duration: 1.5,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse",
        ease: "easeInOut",
      },
    },
  };

  // Expand/Collapse button animation variants
  const expandButtonVariants: Variants = {
    initial: { opacity: 0.9, y: 0 },
    hover: {
      opacity: 1,
      y: -2,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
      },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 },
    },
  };

  // Show annotations expand animation variants
  const expandVariants: Variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      transition: {
        height: {
          duration: 0.3,
          ease: "easeInOut",
        },
        opacity: {
          duration: 0.2,
        },
      },
    },
    expanded: {
      height: "auto",
      opacity: 1,
      transition: {
        height: {
          duration: 0.3,
          ease: "easeInOut",
        },
        opacity: {
          duration: 0.2,
          delay: 0.1,
        },
      },
    },
  };

  // Determine if we should show tabs or both sections
  const hasInsights = Boolean(session.meeting?.insights?.length);
  const hasActions = Boolean(session.meeting?.action_items?.length);
  const shouldShowTabs = isMobile && hasInsights && hasActions;

  // Function to check if we should show annotations
  const shouldShowAnnotations = () => {
    // Only show on next session or past sessions
    if (isNextSession) return true;
    if (isPastSession && hasAnnotations) return true;
    return false;
  };

  // Handle toggle for showing all annotations
  const toggleShowAllAnnotations = () => {
    // Get the current scroll position relative to the button
    if (toggleButtonRef.current) {
      const buttonRect = toggleButtonRef.current.getBoundingClientRect();
      const buttonPositionFromTop = buttonRect.top;

      // Update state
      setShowAllAnnotations(!showAllAnnotations);

      // After state update and re-render, scroll to maintain button position
      requestAnimationFrame(() => {
        if (toggleButtonRef.current) {
          const newButtonRect = toggleButtonRef.current.getBoundingClientRect();
          const newPosition = newButtonRect.top;
          const scrollDiff = newPosition - buttonPositionFromTop;

          // Smooth scroll to maintain position
          window.scrollBy({
            top: scrollDiff,
            behavior: "smooth",
          });
        }
      });
    } else {
      setShowAllAnnotations(!showAllAnnotations);
    }
  };

  // Reference to the toggle button to help with scroll position
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <article className="w-full" aria-label={`Session: ${displayTitle}`}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card
          className={cn(
            "overflow-hidden bg-card/95 shadow-md transition-all duration-300 hover:shadow-lg dark:bg-background/90 dark:backdrop-blur-sm",
            isNextSession && "ring-2 ring-primary/20 dark:ring-primary/30",
            isCollapsed && "opacity-70 hover:opacity-90",
          )}
        >
          {isNextSession && (
            <motion.div
              variants={nextSessionVariants}
              initial="initial"
              animate="animate"
              className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-50"
              aria-hidden="true"
            />
          )}

          {/* Card Header with User Info */}
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 border-b border-border/10 bg-gradient-to-r from-background/80 to-muted/30 p-4 backdrop-blur-sm">
            <motion.div
              variants={headerVariants}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="flex -space-x-2">
                  {/* User Avatar */}
                  <Avatar className="h-11 w-11 border-2 border-background shadow-md transition-transform duration-300 hover:scale-105">
                    <AvatarImage
                      src={session.user?.image_url || undefined}
                      alt={session.user?.nickname || undefined}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-sm font-semibold text-white">
                      {session.user?.nickname?.substring(0, 2) || "U"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Coach Avatar */}
                  <Avatar className="z-10 h-11 w-11 border-2 border-background shadow-md transition-transform duration-300 hover:scale-105">
                    <AvatarImage
                      src={session.coach?.image_url || undefined}
                      alt={session.coach?.nickname || undefined}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white">
                      {session.coach?.nickname?.substring(0, 2) || "C"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium leading-none text-foreground">
                    {displayTitle}
                  </span>
                  {isNextSession && (
                    <Badge
                      variant="outline"
                      className="rounded-sm border-primary/20 bg-primary/10 px-1.5 py-0 text-[10px] font-normal text-primary"
                    >
                      Next Up
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 leading-none">
                    <Calendar className="-mt-0.5 h-3.5 w-3.5" />
                    <span className="leading-none">
                      {formatDate(session.date)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={headerVariants}
              className="flex items-center gap-2 self-start"
            >
              {/* Session Consistency Tracker */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary/80 dark:text-primary/70">
                      {sessionStreak >= 5
                        ? "Consecutive sessions: 5+"
                        : sessionStreak >= 3
                          ? "Session momentum: 3+"
                          : sessionStreak > 0
                            ? "Recording streak active"
                            : ""}
                    </span>
                    <motion.div
                      variants={streakVariants}
                      initial="initial"
                      animate={sessionStreak >= 3 ? "animate" : "initial"}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-background/10 border-border",
                        sessionStreak >= 5
                          ? "bg-gradient-to-br from-amber-600 to-amber-400 dark:from-amber-500/90 dark:to-amber-300/80"
                          : sessionStreak >= 3
                            ? "bg-gradient-to-br from-blue-600 to-blue-400 dark:from-blue-500/90 dark:to-blue-300/80"
                            : "bg-muted/60 dark:bg-muted/40",
                      )}
                    >
                      <span className="text-xs font-semibold text-white drop-shadow-sm dark:text-white/90">
                        {sessionStreak}
                      </span>
                      {sessionStreak >= 5 && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-t from-transparent to-amber-200/20 dark:to-amber-100/10"
                          animate={{
                            opacity: [0.2, 0.4, 0.2],
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatType: "mirror",
                          }}
                        />
                      )}
                    </motion.div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end">
                  <p className="text-xs">
                    {sessionStreak >= 3
                      ? `${sessionStreak} recorded sessions in sequence`
                      : sessionStreak > 0
                        ? "Continue recording sessions to build momentum"
                        : "Record sessions in sequence to build momentum"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          </CardHeader>

          {/* Card Content - Only shown if not collapsed */}
          {!isCollapsed && (
            <CardContent className="p-0">
              {/* SESSION ANNOTATIONS SECTION */}
              {shouldShowAnnotations() && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  {/* AnimatePresence to handle animations for both expanding and collapsing */}
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.div
                      key={`annotations-${showAllAnnotations ? "expanded" : "collapsed"}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Show annotations - either limited or all */}
                      <SessionAnnotation
                        annotations={limitedAnnotations || []}
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* "Show More" button for past sessions with >3 annotations */}
                  {isPastSession && hasMoreAnnotations && (
                    <motion.div
                      className="flex justify-center pb-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      layout
                    >
                      <motion.button
                        onClick={toggleShowAllAnnotations}
                        ref={toggleButtonRef}
                        className="group -mt-2 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
                        variants={expandButtonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                      >
                        {showAllAnnotations ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5 group-hover:text-primary" />
                            Show fewer topics
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5 group-hover:text-primary" />
                            {session.annotations.length - 3} more topics
                            available
                          </>
                        )}
                      </motion.button>
                    </motion.div>
                  )}

                  {/* Add separator if this is a past session with video */}
                  {isPastSession && hasVideoRecording && (
                    <div className="mx-4 my-2 h-px bg-border/30" />
                  )}
                </motion.div>
              )}

              {/* PAST SESSION CONTENT - Only show for past sessions */}
              {isPastSession && (
                <>
                  {/* Video Player Section */}
                  {hasVideoRecording && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="mb-2 bg-gradient-to-r from-muted/5 to-muted/10 px-4 py-4"
                    >
                      <div className="grid grid-cols-12 items-start gap-6">
                        {/* Summary Section */}
                        <div className="col-span-6 flex flex-col justify-center">
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                <FileText className="h-4 w-4 text-primary/70" />
                                Summary
                              </h4>
                            </div>
                            {(session.summary ?? session.meeting?.summary) ? (
                              <p className="border-l-2 border-border pl-2 text-sm leading-relaxed text-muted-foreground">
                                {session.summary ?? session.meeting?.summary}
                              </p>
                            ) : (
                              <div className="rounded-md border border-dashed border-muted-foreground/20 bg-muted/30 px-3 py-2">
                                <p className="text-sm italic text-muted-foreground">
                                  No summary available for this session yet.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Video Player */}
                        <motion.div
                          variants={videoPlayerVariants}
                          className="col-span-6 space-y-4 rounded-lg shadow-lg"
                        >
                          <div className="space-y-1.5">
                            <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              <Video className="h-4 w-4 text-primary/70" />
                              Recording
                            </h4>
                          </div>
                          {videoData ? (
                            <PlayerProvider>
                              <div className="mt-4 overflow-hidden rounded-lg ring-2 ring-primary/10">
                                <VideoPlayer
                                  video={videoData}
                                  startAt={0}
                                  playPauseButtonSize="sm"
                                  hideHeader={true}
                                />
                              </div>
                            </PlayerProvider>
                          ) : (
                            <div className="aspect-video w-full rounded-lg bg-muted/50">
                              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                                <span className="animate-pulse text-sm">
                                  Loading recording...
                                </span>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {/* Show summary in original location only if no video */}
                  {!hasVideoRecording && session.summary && (
                    <motion.div
                      variants={contentVariants}
                      className="mb-2 bg-muted/20 px-4 py-3"
                    >
                      <motion.p
                        variants={itemVariants}
                        className="text-sm leading-relaxed text-foreground"
                      >
                        {session.summary}
                      </motion.p>
                    </motion.div>
                  )}

                  {/* Tabs for mobile view */}
                  {shouldShowTabs && (
                    <motion.div
                      variants={contentVariants}
                      className="mb-2 px-4 py-2"
                    >
                      <div className="flex items-center justify-center gap-4">
                        <motion.button
                          variants={tabVariants}
                          initial="inactive"
                          animate={
                            activeSection === "insights" ||
                            activeSection === "both"
                              ? "active"
                              : "inactive"
                          }
                          whileHover="hover"
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium leading-none",
                            activeSection === "insights" ||
                              activeSection === "both"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-900/10 dark:text-amber-400"
                              : "text-muted-foreground",
                          )}
                          onClick={() =>
                            setActiveSection(
                              activeSection === "actions" ? "both" : "insights",
                            )
                          }
                        >
                          <Lightbulb className="h-3.5 w-3.5" />
                          Insights
                        </motion.button>

                        <motion.button
                          variants={tabVariants}
                          initial="inactive"
                          animate={
                            activeSection === "actions" ||
                            activeSection === "both"
                              ? "active"
                              : "inactive"
                          }
                          whileHover="hover"
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium leading-none",
                            activeSection === "actions" ||
                              activeSection === "both"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/10 dark:text-blue-400"
                              : "text-muted-foreground",
                          )}
                          onClick={() =>
                            setActiveSection(
                              activeSection === "insights" ? "both" : "actions",
                            )
                          }
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Actions
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  {/* Main Content Area - Side-by-Side for desktop, stacked for mobile */}
                  <motion.div
                    variants={contentVariants}
                    className={cn(
                      "px-4 py-3",
                      "grid gap-6",
                      !isMobile ? "grid-cols-12" : "grid-cols-1",
                    )}
                  >
                    {/* Insights Column */}
                    {(!isMobile ||
                      activeSection === "insights" ||
                      activeSection === "both") && (
                      <motion.div
                        variants={itemVariants}
                        className={cn(
                          "space-y-2",
                          !isMobile ? "col-span-6" : "col-span-10 col-start-2",
                        )}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <h4 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase leading-none text-muted-foreground">
                          <Lightbulb className="h-4 w-4 text-amber-500" />
                          Insights
                        </h4>
                        <InsightsList
                          insights={session.meeting?.insights || []}
                          isLoading={isLoading}
                          onAddInsight={onAddInsight}
                          onToggleStar={onToggleStar}
                        />
                      </motion.div>
                    )}

                    {/* Action Items Column */}
                    {(activeSection === "actions" ||
                      activeSection === "both" ||
                      !shouldShowTabs) && (
                      <motion.div
                        variants={itemVariants}
                        className={cn(
                          "space-y-2",
                          !isMobile ? "col-span-6" : "col-span-10 col-start-2",
                        )}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <h4 className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase leading-none text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-blue-500" />
                          Action Items
                        </h4>
                        <ActionsList
                          actions={session.meeting?.action_items ?? []}
                          isLoading={isLoading}
                          videoId={videoId}
                        />
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Notes Section */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`notes-${isNotesOpen}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <PostItContainer
                        sessionId={session.id}
                        className="min-h-[300px]"
                      />
                    </motion.div>
                  </AnimatePresence>
                </>
              )}
            </CardContent>
          )}
        </Card>
      </motion.div>
    </article>
  );
}
