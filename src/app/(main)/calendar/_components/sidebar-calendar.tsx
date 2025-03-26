"use client";

import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

import { Calendar } from "~/components/ui/calendar";
import { Card } from "~/components/ui/card";
import type { RouterOutputs } from "~/trpc/react";

type SidebarCalendarProps = {
  events: RouterOutputs["calendar"]["getCalendarEvents"];
  onSelectDate?: (date: Date | undefined) => void;
  selectedDate?: Date;
};

// Animation variants for the calendar container
const calendarContainerVariants = {
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
    },
  },
};

// Animation for the selected date info
const selectedDateVariants = {
  hidden: { opacity: 0, height: 0, y: -10 },
  visible: {
    opacity: 1,
    height: "auto",
    y: 0,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 25,
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
      recordable: 0,
      notRecordable: 0,
      noMeetingUrl: 0,
      total: filteredEvents.length,
    };

    for (const event of filteredEvents) {
      if (!event.meeting_url) {
        counts.noMeetingUrl++;
      } else if (
        event.should_join_user_override === true ||
        (event.should_join_user_override === null &&
          event.should_join_calculated)
      ) {
        counts.recordable++;
      } else {
        counts.notRecordable++;
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
      <Card className="overflow-hidden rounded-xl border border-border/40 bg-card p-4 shadow-sm">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          className="rounded-lg bg-card"
          modifiersClassNames={{
            selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            today: "font-medium text-primary",
          }}
          fromMonth={new Date()}
        />
      </Card>

      <AnimatePresence>
        {selectedDateEventDetails &&
          selectedDateEventDetails.counts.total > 0 && (
            <motion.div
              variants={selectedDateVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-[17.625rem] overflow-hidden rounded-xl border border-border/40 bg-card p-4 shadow-sm"
            >
              <div className="mb-2 text-sm font-medium text-foreground">
                {selectedDate && format(selectedDate, "EEEE, MMM d")}
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-muted-foreground">
                  {selectedDateEventDetails.counts.total} event
                  {selectedDateEventDetails.counts.total !== 1 ? "s" : ""}
                </div>

                {selectedDateEventDetails.counts.recordable > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span>
                      {selectedDateEventDetails.counts.recordable} will be
                      recorded
                    </span>
                  </div>
                )}

                {selectedDateEventDetails.counts.notRecordable > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    <span>
                      {selectedDateEventDetails.counts.notRecordable} not
                      recorded
                    </span>
                  </div>
                )}

                {selectedDateEventDetails.counts.noMeetingUrl > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <span>
                      {selectedDateEventDetails.counts.noMeetingUrl} not
                      recordable
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </motion.div>
  );
}
