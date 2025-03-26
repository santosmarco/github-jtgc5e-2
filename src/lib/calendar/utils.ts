import dayjs from "dayjs";
import _ from "lodash";

import type { RouterOutputs } from "~/trpc/react";

type CalendarEvent = RouterOutputs["calendar"]["getCalendarEvents"][number];

/**
 * Returns events that are currently happening (started in the past and ending in the future)
 */
export function getCurrentEvents(events: CalendarEvent[]): CalendarEvent[] {
  const now = dayjs();
  return events.filter((event) => {
    if (!event.start_time || !event.end_time) return false;
    const startTime = dayjs(event.start_time);
    const endTime = dayjs(event.end_time);
    return startTime.isBefore(now) && endTime.isAfter(now);
  });
}

/**
 * Returns events happening today but not currently happening
 */
export function getTodayEvents(events: CalendarEvent[]): CalendarEvent[] {
  const now = dayjs();
  const today = now.startOf("day");
  const tomorrow = today.add(1, "day");

  return events.filter((event) => {
    if (!event.start_time) return false;
    const startTime = dayjs(event.start_time);
    // Is today but not current
    return (
      startTime.isAfter(today) &&
      startTime.isBefore(tomorrow) &&
      !getCurrentEvents(events).some((e) => e.id === event.id)
    );
  });
}

/**
 * Returns events happening tomorrow
 */
export function getTomorrowEvents(events: CalendarEvent[]): CalendarEvent[] {
  const now = dayjs();
  const tomorrow = now.add(1, "day").startOf("day");
  const dayAfterTomorrow = tomorrow.add(1, "day");

  return events.filter((event) => {
    if (!event.start_time) return false;
    const startTime = dayjs(event.start_time);
    return startTime.isAfter(tomorrow) && startTime.isBefore(dayAfterTomorrow);
  });
}

/**
 * Returns events happening beyond tomorrow
 */
export function getFutureEvents(events: CalendarEvent[]): CalendarEvent[] {
  const now = dayjs();
  const dayAfterTomorrow = now.add(2, "days").startOf("day");

  return events.filter((event) => {
    if (!event.start_time) return false;
    const startTime = dayjs(event.start_time);
    return startTime.isAfter(dayAfterTomorrow);
  });
}

/**
 * Groups events by their start date in YYYY-MM-DD format
 */
export function groupEventsByDate(
  events: CalendarEvent[],
): Record<string, CalendarEvent[]> {
  return _.groupBy(events, (event) => {
    if (!event.start_time) return null;
    return dayjs(event.start_time).format("YYYY-MM-DD");
  });
}

/**
 * Returns counts of events by category
 */
export function getEventCounts(events: CalendarEvent[]) {
  if (!events.length) return null;

  return {
    current: getCurrentEvents(events).length,
    today: getTodayEvents(events).length,
    tomorrow: getTomorrowEvents(events).length,
    future: getFutureEvents(events).length,
  };
}

/**
 * Formats a date string in a consistent format (dddd, MMMM D)
 */
export function formatDate(dateStr: string): string {
  return dayjs(dateStr).format("dddd, MMMM D");
}

/**
 * Gets events for a specific date
 */
export function getEventsForDate(
  events: CalendarEvent[],
  date: Date,
): CalendarEvent[] {
  const targetDate = dayjs(date).startOf("day");
  const nextDay = targetDate.add(1, "day");

  return events.filter((event) => {
    if (!event.start_time) return false;
    const startTime = dayjs(event.start_time);
    return startTime.isAfter(targetDate) && startTime.isBefore(nextDay);
  });
}

/**
 * Determines if a date is in the past (before today)
 */
export function isDateInPast(date: Date): boolean {
  return dayjs(date).startOf("day").isBefore(dayjs().startOf("day"));
}

/**
 * Ensures events are unique by ID
 */
export function uniqueEvents(events: CalendarEvent[]): CalendarEvent[] {
  return _.uniqBy(events, (event) => event.id);
}
