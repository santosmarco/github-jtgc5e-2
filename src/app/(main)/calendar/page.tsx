"use client";

import { AnimatePresence, motion } from "framer-motion";
import _ from "lodash";
import { Calendar as CalendarIcon, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useReducedMotion } from "framer-motion";

import { Button } from "~/components/ui/button";
import { useProfile } from "~/hooks/use-profile";
import { getEventCounts } from "~/lib/calendar/utils";
import { api } from "~/trpc/react";

import { CalendarView } from "./_components/calendar-view";
import { PastEventsLoader } from "./_components/past-events-loader";
import { SidebarCalendar } from "./_components/sidebar-calendar";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
      ease: "easeOut",
      duration: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const headerIconVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  hover: {
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10,
    },
  },
};

const headerTextVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      delay: 0.2,
    },
  },
};

// Animation variants for filtered content
const filteredContentVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.2,
    },
  },
};

export default function CalendarPage(): JSX.Element {
  const { profile } = useProfile();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined,
  );

  // Fetch current and future calendar events from the API
  const { data: futureEvents, isLoading: isLoadingFuture } =
    api.calendar.getCalendarEvents.useQuery(
      {
        profileId: profile?.id ?? "",
      },
      {
        enabled: !!profile?.id,
        refetchInterval: 60000, // Refresh every minute
      },
    );

  // Fetch past calendar events in the background
  const { data: pastEvents, isLoading: isLoadingPast } =
    api.calendar.getPastCalendarEvents.useQuery(
      {
        profileId: profile?.id ?? "",
      },
      {
        enabled: !!profile?.id,
        refetchInterval: false, // Don't auto-refresh past events
      },
    );

  // Combine all events, ensuring uniqueness by ID
  const calendarEvents = React.useMemo(() => {
    const allEvents = [...(futureEvents ?? []), ...(pastEvents ?? [])];
    return _.uniqBy(
      allEvents.filter((event) => event.meeting_url),
      (event) => event.id,
    );
  }, [futureEvents, pastEvents]);

  // Get event counts for improved header display
  const eventCounts = calendarEvents ? getEventCounts(calendarEvents) : null;

  // Filter events based on selected date
  const filteredEvents = React.useMemo(() => {
    if (!selectedDate || !calendarEvents) return calendarEvents;

    const selectedDateStr = selectedDate.toDateString();
    return calendarEvents.filter((event) => {
      if (!event.start_time || !event.meeting_url) return false;
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === selectedDateStr;
    });
  }, [calendarEvents, selectedDate]);

  // Handle date selection
  const handleDateSelect = React.useCallback((date: Date | undefined) => {
    setSelectedDate(date);
  }, []);

  // Only block UI on future events loading
  const isLoading = isLoadingFuture;

  // Inside the component, add reduced motion support
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="-mx-12 -mt-12 min-h-screen space-y-8"
      {...(prefersReducedMotion ? { transition: { duration: 0 } } : {})}
    >
      <AnimatePresence>
        {isLoadingPast && <PastEventsLoader isLoading={isLoadingPast} />}
      </AnimatePresence>

      {/* Header Section */}
      <motion.div
        className="sticky top-0 z-10 mb-12 overflow-hidden border-b border-border/40 bg-card/60 px-6 py-8 backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              variants={headerIconVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner"
            >
              <CalendarIcon className="h-6 w-6" />
            </motion.div>
            <div>
              <motion.h1
                variants={headerTextVariants}
                initial="hidden"
                animate="visible"
                className="text-3xl font-bold tracking-tight text-foreground"
              >
                Calendar
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-sm text-muted-foreground"
              >
                {isLoading
                  ? "Loading your schedule..."
                  : !eventCounts
                    ? "No upcoming events"
                    : selectedDate
                      ? `${filteredEvents?.length || 0} event${filteredEvents?.length !== 1 ? "s" : ""} on ${selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                      : [
                          eventCounts.current > 0
                            ? `${eventCounts.current} now`
                            : null,
                          eventCounts.today > 0
                            ? `${eventCounts.today} today`
                            : null,
                          eventCounts.tomorrow > 0
                            ? `${eventCounts.tomorrow} tomorrow`
                            : null,
                          eventCounts.future > 0
                            ? `${eventCounts.future} upcoming`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(", ") || "No upcoming events"}
              </motion.p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/settings")}
            className="gap-2 border-primary/20 bg-card/80 backdrop-blur-sm"
          >
            <Settings className="h-4 w-4" />
            Recording settings
          </Button>
        </div>

        <motion.div
          className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-primary/5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
        />
        <motion.div
          className="absolute -left-6 -top-6 h-16 w-16 rounded-full bg-primary/5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
        />
      </motion.div>

      {/* Calendar and Events Layout */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-6 px-6 lg:grid-cols-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        {/* Left Column - Calendar */}
        <div className="col-span-1 lg:sticky lg:top-32 lg:self-start">
          <SidebarCalendar
            events={calendarEvents ?? []}
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
          />
        </div>

        {/* Right Column - Calendar View */}
        <div className="col-span-1 lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDate?.toDateString() || "all-events"}
              variants={filteredContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <CalendarView
                events={filteredEvents ?? []}
                isLoading={isLoading}
                profileId={profile?.id}
                selectedDate={selectedDate}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
