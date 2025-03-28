"use client";

import { format } from "date-fns";
import { AnimatePresence, type Variants, motion } from "framer-motion";
import * as React from "react";

import { Calendar } from "~/components/ui/calendar";
import { Card } from "~/components/ui/card";
import { getBotStatusInfo } from "~/lib/meeting-bots/status";
import type { RouterOutputs } from "~/trpc/react";

type SidebarCalendarProps = {
  events: RouterOutputs["calendar"]["getCalendarEvents"];
  onSelectDate?: (date: Date | undefined) => void;
  selectedDate?: Date;
};

// Animation variants for the calendar container
const calendarContainerVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      delay: 0.2,
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
};

// Animation for the calendar card
const calendarCardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, rotateX: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    rotateX: 0,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 15,
    },
  },
};

// Animation for the selected date info
const selectedDateVariants: Variants = {
  hidden: { opacity: 0, height: 0, y: -10 },
  visible: {
    opacity: 1,
    height: "auto",
    y: 0,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 25,
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    y: -10,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 30,
    },
  },
};

// Animation for each status item
const statusItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
};

// Animation for the status dot
const statusDotVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 15,
    },
  },
};

export function SidebarCalendar({
  events,
  onSelectDate,
  selectedDate,
}: SidebarCalendarProps) {
  // Get events for the selected date with detailed status counts
  const selectedDateEventDetails = React.useMemo(() => {
    if (!selectedDate) return null;

    const selectedDateStr = selectedDate.toDateString();
    const filteredEvents = events.filter((event) => {
      if (!event.start_time) return false;
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === selectedDateStr;
    });

    // Count by status
    const counts = {
      recordable: 0, // Future meetings that will be recorded
      recorded: 0, // Past meetings that were recorded
      skipped: 0, // Meetings that were skipped for valid reasons
      failed: 0, // Meetings that failed to record
      notRecordable: 0, // Meetings that won't be recorded
      total: filteredEvents.length,
    };

    for (const event of filteredEvents) {
      console.log(event);

      const status = getBotStatusInfo(
        event.meeting_bot,
        event.should_join_user_override !== null
          ? !!event.should_join_user_override
          : !!event.should_join_calculated,
        event.start_time ? new Date(event.start_time) < new Date() : false,
      );

      switch (status.variant) {
        case "success":
          counts.recorded++;
          break;
        case "warning":
          counts.skipped++;
          break;
        case "error":
          counts.failed++;
          break;
        case "muted":
          counts.notRecordable++;
          break;
        case "primary":
          counts.recordable++;
          break;
        default:
          status.variant satisfies never;
      }
    }

    return {
      events: filteredEvents,
      counts,
    };
  }, [events, selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    // If selecting the same date, clear selection
    if (
      selectedDate &&
      date &&
      selectedDate.toDateString() === date.toDateString()
    ) {
      onSelectDate?.(undefined);
    } else {
      onSelectDate?.(date);
    }
  };

  return (
    <motion.div
      variants={calendarContainerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center gap-4 pt-4"
    >
      <motion.div
        variants={calendarCardVariants}
        className="flex w-[17.625rem] items-center"
      >
        <Card className="flex w-full items-center overflow-hidden rounded-xl border border-border/40 bg-card p-4 text-center shadow-sm">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="mx-auto rounded-lg bg-card"
            modifiersClassNames={{
              selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              today: "font-medium text-primary",
            }}
            fromMonth={new Date()}
          />
        </Card>
      </motion.div>

      <AnimatePresence mode="wait">
        {selectedDateEventDetails &&
          selectedDateEventDetails.counts.total > 0 && (
            <motion.div
              variants={selectedDateVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-[17.625rem] overflow-hidden rounded-xl border border-border/40 bg-card p-4 shadow-sm"
              layoutId="selectedDateCard"
            >
              <motion.div
                className="mb-2 text-sm font-medium text-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.1 } }}
              >
                {selectedDate && format(selectedDate, "EEEE, MMM d")}
              </motion.div>
              <div className="space-y-1 text-xs">
                <motion.div
                  className="text-muted-foreground"
                  variants={statusItemVariants}
                >
                  {selectedDateEventDetails.counts.total} event
                  {selectedDateEventDetails.counts.total !== 1 ? "s" : ""}
                </motion.div>

                {selectedDateEventDetails.counts.recordable > 0 && (
                  <motion.div
                    className="flex items-center gap-1.5 text-xs"
                    variants={statusItemVariants}
                  >
                    <motion.div
                      className="h-2 w-2 rounded-full bg-primary"
                      variants={statusDotVariants}
                    />
                    <span>
                      {selectedDateEventDetails.counts.recordable} scheduled
                    </span>
                  </motion.div>
                )}

                {selectedDateEventDetails.counts.recorded > 0 && (
                  <motion.div
                    className="flex items-center gap-1.5 text-xs"
                    variants={statusItemVariants}
                  >
                    <motion.div
                      className="h-2 w-2 rounded-full bg-emerald-500"
                      variants={statusDotVariants}
                    />
                    <span>
                      {selectedDateEventDetails.counts.recorded} recorded
                    </span>
                  </motion.div>
                )}

                {selectedDateEventDetails.counts.skipped > 0 && (
                  <motion.div
                    className="flex items-center gap-1.5 text-xs"
                    variants={statusItemVariants}
                  >
                    <motion.div
                      className="h-2 w-2 rounded-full bg-yellow-500"
                      variants={statusDotVariants}
                    />
                    <span>
                      {selectedDateEventDetails.counts.skipped} skipped
                    </span>
                  </motion.div>
                )}

                {selectedDateEventDetails.counts.failed > 0 && (
                  <motion.div
                    className="flex items-center gap-1.5 text-xs"
                    variants={statusItemVariants}
                  >
                    <motion.div
                      className="h-2 w-2 rounded-full bg-destructive"
                      variants={statusDotVariants}
                    />
                    <span>
                      {selectedDateEventDetails.counts.failed} failed to record
                    </span>
                  </motion.div>
                )}

                {selectedDateEventDetails.counts.notRecordable > 0 && (
                  <motion.div
                    className="flex items-center gap-1.5 text-xs"
                    variants={statusItemVariants}
                  >
                    <motion.div
                      className="h-2 w-2 rounded-full bg-muted-foreground"
                      variants={statusDotVariants}
                    />
                    <span>
                      {selectedDateEventDetails.counts.notRecordable} not
                      recordable
                    </span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </motion.div>
  );
}
