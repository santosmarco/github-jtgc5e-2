"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Calendar, ClockArrowDownIcon } from "lucide-react";
import * as React from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  formatDate,
  getCurrentEvents,
  getEventsForDate,
  getFutureEvents,
  getTodayEvents,
  getTomorrowEvents,
  groupEventsByDate,
  isDateInPast,
} from "~/lib/calendar/utils";
import type { RouterOutputs } from "~/trpc/react";

import { MeetingEntry } from "./meeting-entry";
import { NoMeetings } from "./no-meetings";

interface CalendarViewProps {
  events: RouterOutputs["calendar"]["getCalendarEvents"];
  isLoading: boolean;
  profileId?: string;
  selectedDate?: Date;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      when: "beforeChildren",
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
      staggerChildren: 0.05,
      when: "beforeChildren",
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 5, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, x: -5 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
    },
  },
};

export function CalendarView({
  events,
  isLoading,
  selectedDate,
}: CalendarViewProps) {
  const prefersReducedMotion = useReducedMotion();

  // Create refs for each section
  const selectedDateSectionRef = React.useRef<HTMLElement>(null);
  const nowSectionRef = React.useRef<HTMLElement>(null);
  const todaySectionRef = React.useRef<HTMLElement>(null);
  const tomorrowSectionRef = React.useRef<HTMLElement>(null);
  const futureSectionRefs = React.useRef<Record<string, HTMLElement | null>>(
    {},
  );

  /*
  const meetingBotMutation = api.calendar.launchMeetingBot.useMutation({
    onSuccess: () => {
      toast.success("Meeting bot launched successfully");
    },
    onError: (error) => {
      toast.error(`Failed to launch meeting bot: ${error.message}`);
    },
  });
  */

  // Get selected date events
  const selectedDateEvents = React.useMemo(() => {
    if (!selectedDate) return [];
    return getEventsForDate(events, selectedDate);
  }, [events, selectedDate]);

  // Determine if selected date is in the past
  const isSelectedDatePast = React.useMemo(() => {
    if (!selectedDate) return false;
    return isDateInPast(selectedDate);
  }, [selectedDate]);

  // Get categorized events using utility functions
  const nowEvents = getCurrentEvents(events);
  const todayEvents = getTodayEvents(events);
  const tomorrowEvents = getTomorrowEvents(events);
  const futureEvents = getFutureEvents(events);

  // Group future events by date
  const futureEventsByDate = groupEventsByDate(futureEvents);

  // Sort dates chronologically
  const sortedFutureDates = Object.keys(futureEventsByDate).sort();

  // Intelligently categorize today's events
  const { upcomingTodayEvents, pastTodayEvents } = React.useMemo(() => {
    const now = new Date();
    const upcoming: typeof todayEvents = [];
    const past: typeof todayEvents = [];

    for (const event of todayEvents) {
      const endTime = event.end_time ? new Date(event.end_time) : null;

      // If the event has ended, put it in past events
      if (endTime && endTime < now) {
        past.push(event);
      } else {
        upcoming.push(event);
      }
    }

    // Sort upcoming events by start time (ascending)
    upcoming.sort((a, b) => {
      const aStart = a.start_time ? new Date(a.start_time).getTime() : 0;
      const bStart = b.start_time ? new Date(b.start_time).getTime() : 0;
      return aStart - bStart;
    });

    // Sort past events - prioritize events with meeting_bot.api_video_id first, then by end time
    past.sort((a, b) => {
      // First prioritize events with meeting_bot.api_video_id
      const aHasVideo = a.meeting_bot?.api_video_id ? 1 : 0;
      const bHasVideo = b.meeting_bot?.api_video_id ? 1 : 0;

      if (aHasVideo !== bHasVideo) {
        return bHasVideo - aHasVideo; // Events with videos come first
      }

      // Then sort by end time (most recent first)
      const aEnd = a.end_time ? new Date(a.end_time).getTime() : 0;
      const bEnd = b.end_time ? new Date(b.end_time).getTime() : 0;
      return bEnd - aEnd;
    });

    return { upcomingTodayEvents: upcoming, pastTodayEvents: past };
  }, [todayEvents]);

  // Determine if completed section should be collapsed
  const shouldCollapseCompleted =
    nowEvents.length > 0 || upcomingTodayEvents.length > 0;

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-16 text-center text-muted-foreground"
      >
        <motion.div
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [0.98, 1, 0.98],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          Loading calendar events...
        </motion.div>
      </motion.div>
    );
  }

  if (
    (!selectedDate && events.length === 0) ||
    (selectedDate && selectedDateEvents.length === 0)
  ) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            damping: 20,
            stiffness: 100,
          }}
          className="py-8"
        >
          <NoMeetings isPastDate={isSelectedDatePast} />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      className="mx-auto space-y-8 py-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      {...(prefersReducedMotion ? { transition: { duration: 0 } } : {})}
    >
      {/* Selected Past Date Section */}
      {isSelectedDatePast && selectedDateEvents.length > 0 && (
        <motion.section
          ref={selectedDateSectionRef}
          variants={sectionVariants}
          className="space-y-4"
          id="section-selected-date"
        >
          <motion.div
            className="mb-5 flex items-center gap-3 text-sm font-medium text-muted-foreground"
            variants={headerVariants}
          >
            <Calendar className="h-4 w-4" />
            <span>
              {selectedDate ? formatDate(selectedDate.toISOString()) : ""}
            </span>
          </motion.div>
          <motion.div className="space-y-4">
            {selectedDateEvents.map((event, index) => (
              <motion.div
                key={event.id}
                variants={itemVariants}
                custom={index}
                className="rounded-lg"
              >
                <MeetingEntry event={event} />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}

      {/* Only show current/future sections if no past date is selected */}
      {!isSelectedDatePast && (
        <>
          {/* Current Meetings */}
          {nowEvents.length > 0 && (
            <motion.section
              ref={nowSectionRef}
              variants={sectionVariants}
              className="space-y-4"
              id="section-now"
            >
              <motion.div
                className="mb-5 flex items-center gap-3 text-sm font-medium text-muted-foreground"
                variants={headerVariants}
              >
                <Calendar className="h-4 w-4" />
                <span>Now</span>
              </motion.div>
              <motion.div className="space-y-4">
                {nowEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    variants={itemVariants}
                    custom={index}
                    className="rounded-lg"
                  >
                    <MeetingEntry event={event} isNow={true} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          )}

          {/* Today's Upcoming Meetings */}
          {upcomingTodayEvents.length > 0 && (
            <motion.section
              ref={todaySectionRef}
              variants={sectionVariants}
              className="space-y-4"
              id="section-today-upcoming"
            >
              <motion.div
                className="mb-5 flex items-center gap-3 text-sm font-medium text-muted-foreground"
                variants={headerVariants}
              >
                <Calendar className="h-4 w-4" />
                <span>Upcoming Today</span>
              </motion.div>
              <motion.div className="space-y-4">
                {upcomingTodayEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    variants={itemVariants}
                    custom={index}
                    className="rounded-lg"
                  >
                    <MeetingEntry event={event} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          )}

          {/* Today's Past Meetings - Collapsible if there are upcoming or current meetings */}
          {pastTodayEvents.length > 0 &&
            (shouldCollapseCompleted ? (
              <Collapsible className="space-y-4">
                <CollapsibleTrigger className="w-full">
                  <motion.div
                    className="flex items-center justify-between text-sm font-medium text-muted-foreground"
                    variants={sectionVariants}
                  >
                    <motion.div
                      className="flex items-center gap-3"
                      variants={headerVariants}
                    >
                      <ClockArrowDownIcon className="h-4 w-4" />
                      <span>Earlier Today ({pastTodayEvents.length})</span>
                    </motion.div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="ui-open:rotate-180 h-4 w-4 transition-transform"
                      aria-hidden="true"
                    >
                      <title>Expand section</title>
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-4">
                    {pastTodayEvents.map((event) => (
                      <div key={event.id} className="rounded-lg">
                        <MeetingEntry event={event} />
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <motion.section
                variants={sectionVariants}
                className="space-y-4"
                id="section-today-past"
              >
                <motion.div
                  className="mb-5 flex items-center gap-3 text-sm font-medium text-muted-foreground"
                  variants={headerVariants}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Today&apos;s Completed</span>
                </motion.div>
                <motion.div className="space-y-4">
                  {pastTodayEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      variants={itemVariants}
                      custom={index}
                      className="rounded-lg"
                    >
                      <MeetingEntry event={event} />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>
            ))}

          {/* Tomorrow's Meetings */}
          {tomorrowEvents.length > 0 && (
            <motion.section
              ref={tomorrowSectionRef}
              variants={sectionVariants}
              className="space-y-4"
              id="section-tomorrow"
            >
              <motion.div
                className="mb-5 flex items-center gap-3 text-sm font-medium text-muted-foreground"
                variants={headerVariants}
              >
                <Calendar className="h-4 w-4" />
                <span>Tomorrow</span>
              </motion.div>
              <motion.div className="space-y-4">
                {tomorrowEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    variants={itemVariants}
                    custom={index}
                    className="rounded-lg"
                  >
                    <MeetingEntry event={event} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          )}

          {/* Future Meetings - Grouped by Date */}
          {sortedFutureDates.map((dateKey) => {
            const eventsForDate = futureEventsByDate[dateKey] || [];
            return (
              <motion.section
                key={dateKey}
                ref={(el) => {
                  futureSectionRefs.current[dateKey] = el;
                }}
                variants={sectionVariants}
                className="space-y-4"
                id={`section-${dateKey}`}
              >
                <motion.div
                  className="mb-5 flex items-center gap-3 text-sm font-medium text-muted-foreground"
                  variants={headerVariants}
                >
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(dateKey)}</span>
                </motion.div>
                <motion.div className="space-y-4">
                  {eventsForDate.map((event, index) => (
                    <motion.div
                      key={event.id}
                      variants={itemVariants}
                      custom={index}
                      className="rounded-lg"
                    >
                      <MeetingEntry event={event} />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>
            );
          })}
        </>
      )}
    </motion.div>
  );
}
