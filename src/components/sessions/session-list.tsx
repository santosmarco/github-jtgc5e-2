"use client";

import dayjs from "dayjs";
import { AnimatePresence, motion, useInView } from "framer-motion";
import _ from "lodash";
import { useMemo, useRef } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import type { RouterOutputs } from "~/trpc/shared";

import SessionCard from "./session-card";

interface SessionListProps {
  sessions: RouterOutputs["sessions"]["getAllSessionsForUser"];
  isLoading?: boolean;
  emptyMessage?: string;
  onAddInsight?: (sessionId: string, content: string) => void;
  onToggleStar?: (
    sessionId: string,
    insightId: string,
    isStarred: boolean,
  ) => void;
}

// Calculate consecutive session streaks
const calculateSessionStreak = (
  sessions: RouterOutputs["sessions"]["getAllSessionsForUser"],
  currentIndex: number,
  streak = 0,
) => {
  if (currentIndex >= sessions.length) return streak;

  const currentSession = sessions[currentIndex];

  if (!currentSession?.event?.meeting_bots?.some((bot) => bot.api_video_id)) {
    return streak;
  }

  return calculateSessionStreak(sessions, currentIndex + 1, streak + 1);
};

export function SessionList({
  sessions,
  isLoading = false,
  emptyMessage = "No sessions found",
  onAddInsight,
  onToggleStar,
}: SessionListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.1 });

  // Add debug logs for each action callback
  const handleAddInsight = (content: string, sessionId: string) => {
    console.log("[SessionList] handleAddInsight", sessionId, content);
    if (onAddInsight) onAddInsight(sessionId, content);
  };

  const handleToggleStar = (
    insightId: string,
    isStarred: boolean,
    sessionId: string,
  ) => {
    console.log(
      "[SessionList] handleToggleStar",
      sessionId,
      insightId,
      isStarred,
    );
    if (onToggleStar) onToggleStar(sessionId, insightId, isStarred);
  };

  // Find the next upcoming session
  const nextSession = useMemo(() => {
    if (_.isEmpty(sessions)) return null;
    const now = new Date();

    return _.chain(sessions)
      .filter((session) => {
        if (!session.date) return false;
        const sessionDate = new Date(session.date);
        return sessionDate > now;
      })
      .sortBy((session) => {
        return session.date
          ? new Date(session.date).getTime()
          : Number.POSITIVE_INFINITY;
      })
      .first()
      .value();
  }, [sessions]);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading sessions">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={`session-skeleton-${i}-${Date.now()}`}
            className="h-[500px] w-full rounded-xl"
          />
        ))}
      </div>
    );
  }

  // Enhanced animation variants with improved spring dynamics
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
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

  return (
    <div
      ref={containerRef}
      className="mx-auto max-w-screen-md space-y-6"
      aria-label="Sessions list"
    >
      <AnimatePresence mode="popLayout">
        {sessions.length > 0 ? (
          sessions.map((session, idx) => {
            // Determine if this session should be collapsed
            // Sessions after the immediate next one should be collapsed
            const isNextUpcoming = nextSession?.id === session.id;
            const sessionDate = dayjs(session.date);
            const isPastSession = sessionDate.isBefore(dayjs());

            // Only future sessions that are not the immediate next should be collapsed
            const shouldBeCollapsed =
              !isPastSession && !isNextUpcoming && sessionDate.isAfter(dayjs());

            // Calculate streak starting from the current session and looking forward
            const sessionStreak = calculateSessionStreak(sessions, idx);

            return (
              <motion.div
                key={session.id}
                layout
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  layout: {
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  },
                }}
              >
                <SessionCard
                  session={session}
                  isLoading={isLoading}
                  isNextSession={isNextUpcoming}
                  isCollapsed={shouldBeCollapsed}
                  sessionStreak={sessionStreak}
                  onAddInsight={
                    onAddInsight
                      ? (content) => handleAddInsight(content, session.id)
                      : undefined
                  }
                  onToggleStar={
                    onToggleStar
                      ? (insightId, isStarred) =>
                          handleToggleStar(insightId, isStarred, session.id)
                      : undefined
                  }
                />
              </motion.div>
            );
          })
        ) : (
          <motion.div
            className="flex flex-col items-center justify-center rounded-lg bg-muted/50 px-4 py-12 text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <h3 className="text-lg font-medium">{emptyMessage}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your filters or check back later
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
