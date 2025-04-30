import { logger } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { TablesInsert } from "~/lib/supabase/database.types";
import type { SupabaseServerClient } from "~/lib/supabase/server";
import { isTruthy } from "~/lib/utils";

export const GetAllSessionsForUserInput = z.object({
  profileId: z.string(),
});
export type GetAllSessionsForUserInput = z.infer<
  typeof GetAllSessionsForUserInput
>;

export async function handleGetAllSessionsForUser(
  input: GetAllSessionsForUserInput,
  supabase: SupabaseServerClient,
) {
  const { profileId } = input;

  // Fetch user profile with coach relationship
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (profileError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch profile",
      cause: profileError,
    });
  }

  const coachId = profile.coach_id;

  // Early return if no coach assigned to profile
  if (!coachId) {
    logger.info("No coach assigned to profile", { profileId: profile.id });
    return [];
  }

  // Fetch coach profile
  const { data: coach, error: coachError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", coachId)
    .single();

  if (coachError) {
    logger.warn("Failed to fetch coach profile", {
      profileId: profile.id,
      coachId,
      error: coachError,
    });
    return [];
  }

  // Fetch calendar events for the user
  const { data: events, error: eventsError } = await supabase
    .from("calendar_event_details_v2")
    .select("*")
    .eq("profile_id", profileId)
    .eq("is_deleted", false);

  if (eventsError) {
    logger.error("Failed to fetch calendar events", {
      profileId,
      error: eventsError,
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch calendar events",
      cause: eventsError,
    });
  }

  // Filter events where coach is an attendee
  const coachEmail = coach.email;
  const eventsWithCoachAsAttendee = events.filter(
    (event) =>
      Array.isArray(event.attendees) &&
      event.attendees.some(
        (attendee) => typeof attendee === "string" && attendee === coachEmail,
      ),
  );

  // Fetch existing sessions for the user with related entities
  const { data: existingSessions, error: sessionsError } = await supabase
    .from("sessions")
    .select(
      "*, user:profiles!user_id(*), coach:profiles!coach_id(*), event:calendar_events_v2!event_id(*, meeting_bots:meeting_bots_v2(*)), meeting:meetings!api_video_id(*, action_items:meeting_action_items(*), insights:meeting_topics(*)), annotations:session_annotations(*, sources:session_annotation_sources(*))",
    )
    .eq("user_id", profileId);

  if (sessionsError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch existing sessions",
      cause: sessionsError,
    });
  }

  // Identify events without associated sessions
  const existingEventIds = new Set(
    existingSessions.map((session) => session.event_id),
  );

  const eventsWithoutSessions = eventsWithCoachAsAttendee.filter(
    (event) => !existingEventIds.has(event.id),
  );

  // If no new sessions need to be created, return existing sessions
  if (eventsWithoutSessions.length === 0) {
    return existingSessions.map((session) => ({
      ...session,
      meeting: session.meeting
        ? {
            ...session.meeting,
            insights: session.meeting.insights.filter(
              (insight) => !insight.server_deleted_at,
            ),
            action_items: session.meeting.action_items.filter(
              (actionItem) => !actionItem.server_deleted_at,
            ),
          }
        : null,
    }));
  }

  // Prepare new session records
  // First, fetch meeting bots with api_video_id for the events
  const { data: meetingBots, error: meetingBotsError } = await supabase
    .from("meeting_bots_v2")
    .select("event_id, api_video_id")
    .in(
      "event_id",
      eventsWithoutSessions.map((event) => event.id),
    )
    .not("api_video_id", "is", null);

  if (meetingBotsError) {
    logger.error("Failed to fetch meeting bots", {
      error: meetingBotsError,
    });
  }

  // Create a map of event_id to api_video_id for quick lookup
  const eventToVideoIdMap = new Map(
    (meetingBots || []).map((bot) => [bot.event_id, bot.api_video_id]),
  );

  const newSessions = eventsWithoutSessions.map(
    (event) =>
      ({
        user_id: profileId,
        coach_id: coachId,
        event_id: event.id,
        title: event.summary || "Coaching Session",
        date: event.start_date_time,
        api_video_id: eventToVideoIdMap.get(event.id) || null,
      }) satisfies TablesInsert<"sessions">,
  );

  // Create the sessions
  const { data: createdSessions, error: insertError } = await supabase
    .from("sessions")
    .insert(newSessions)
    .select(
      "*, user:profiles!user_id(*), coach:profiles!coach_id(*), event:calendar_events_v2!event_id(*, meeting_bots:meeting_bots_v2(*)), meeting:meetings!api_video_id(*, action_items:meeting_action_items(*), insights:meeting_topics(*)), annotations:session_annotations(*, sources:session_annotation_sources(*))",
    );

  if (insertError) {
    logger.error("Failed to create sessions", {
      profileId,
      error: insertError,
    });
    // Return existing sessions if we failed to create new ones
    return existingSessions.map((session) => ({
      ...session,
      meeting: session.meeting
        ? {
            ...session.meeting,
            insights: session.meeting.insights.filter(
              (insight) => !insight.server_deleted_at,
            ),
            action_items: session.meeting.action_items.filter(
              (actionItem) => !actionItem.server_deleted_at,
            ),
          }
        : null,
    }));
  }

  // Update the events with type coaching_session
  const eventIds = eventsWithoutSessions
    .map((event) => event.id)
    .filter(isTruthy);

  if (eventIds.length === 0) {
    // Combine existing and created sessions if we have any
    return [...existingSessions, ...(createdSessions || [])].map((session) => ({
      ...session,
      meeting: session.meeting
        ? {
            ...session.meeting,
            insights: session.meeting.insights.filter(
              (insight) => !insight.server_deleted_at,
            ),
            action_items: session.meeting.action_items.filter(
              (actionItem) => !actionItem.server_deleted_at,
            ),
          }
        : null,
    }));
  }

  // Update events to coaching_session type
  const { data: updatedEvents, error: updateError } = await supabase
    .from("calendar_events_v2")
    .update({ event_type: "coaching_session" })
    .in("id", eventIds)
    .select("*, meeting_bots:meeting_bots_v2(*)");

  if (updateError) {
    logger.error("Failed to update event types", {
      profileId,
      error: updateError,
    });
  }

  // Process updated sessions with video IDs
  const sessionsWithUpdatedVideoIds = !updatedEvents?.length
    ? existingSessions
    : await Promise.all(
        existingSessions.map(async (session) => {
          const matchingEvent = updatedEvents.find(
            (event) => event.id === session.event_id,
          );

          if (!matchingEvent) return session;

          const apiVideoId = matchingEvent.meeting_bots.find(
            (meetingBot) => meetingBot.api_video_id,
          )?.api_video_id;

          if (!apiVideoId) return session;

          const { data: updatedSession } = await supabase
            .from("sessions")
            .update({ api_video_id: apiVideoId })
            .eq("event_id", matchingEvent.id)
            .select(
              "*, user:profiles!user_id(*), coach:profiles!coach_id(*), event:calendar_events_v2!event_id(*, meeting_bots:meeting_bots_v2(*)), meeting:meetings!api_video_id(*, action_items:meeting_action_items(*), insights:meeting_topics(*)), annotations:session_annotations(*, sources:session_annotation_sources(*))",
            )
            .maybeSingle();

          return updatedSession || session;
        }),
      );

  // Merge all sessions with updated event data
  const finalSessions = [
    ...sessionsWithUpdatedVideoIds,
    ...(createdSessions || []),
  ].map((session) => {
    const updatedEvent = updatedEvents?.find(
      (event) => event.id === session.event_id,
    );

    if (!updatedEvent)
      return {
        ...session,
        meeting: session.meeting
          ? {
              ...session.meeting,
              insights: session.meeting.insights.filter(
                (insight) => !insight.server_deleted_at,
              ),
              action_items: session.meeting.action_items.filter(
                (actionItem) => !actionItem.server_deleted_at,
              ),
            }
          : null,
      };

    // Create a new session object with updated event data
    return {
      ...session,
      event: { ...session.event, ...updatedEvent },
      meeting: session.meeting
        ? {
            ...session.meeting,
            insights: session.meeting.insights.filter(
              (insight) => !insight.server_deleted_at,
            ),
            action_items: session.meeting.action_items.filter(
              (actionItem) => !actionItem.server_deleted_at,
            ),
          }
        : null,
    };
  });

  return finalSessions;
}
