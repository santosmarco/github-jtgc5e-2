import type { Tables } from "~/lib/supabase/database.types";
import { GoogleCalendarEvent } from "../google-calendar/schemas";
import { logger } from "../logging/server";
import type { SupabaseBrowserClient } from "../supabase/client";

/**
 * Validates a bot deduplication key against the expected format.
 * Valid keys must start with "2025-" followed by month and day.
 */
export function validateBotDeduplicationKey(key: string | null | undefined) {
  return !!key?.match(/^2025-\d{2}-\d{2}.*/);
}

/**
 * Evaluates whether a bot should be scheduled for a calendar event.
 *
 * @param profileId - The user's profile ID
 * @param event - The calendar event data
 * @param supabase - Supabase client instance
 * @returns Object containing the decision and reason
 */
export async function evaluateShouldScheduleBot(
  profileId: string,
  event: Pick<
    Tables<"calendar_events_v2">,
    "id" | "is_deleted" | "meeting_url" | "raw" | "should_join_user_override"
  >,
  supabase: SupabaseBrowserClient,
): Promise<{ shouldJoin: boolean; reason: string }> {
  try {
    // Early exit conditions
    if (event.is_deleted || !event.meeting_url) {
      logger.info(
        "⏭️ Skipping bot scheduling - Event deleted or missing meeting URL",
        {
          event_id: event.id,
          is_deleted: event.is_deleted,
          has_meeting_url: Boolean(event.meeting_url),
          profile_id: profileId,
        },
      );
      return {
        shouldJoin: false,
        reason: "Event deleted or missing meeting URL",
      };
    }

    // User override takes precedence over all other rules
    if (event.should_join_user_override !== null) {
      logger.info("⏭️ Skipping bot scheduling logic - User override", {
        event_id: event.id,
        profile_id: profileId,
        should_join: event.should_join_user_override,
      });
      return {
        shouldJoin: event.should_join_user_override,
        reason: "User override",
      };
    }

    // Fetch user settings with profile data
    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("*, profile:profiles!inner(*)")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!userSettings) {
      logger.info("⏭️ Skipping bot scheduling - No user settings found", {
        profile_id: profileId,
        event_id: event.id,
      });
      return {
        shouldJoin: false,
        reason: "No user settings found",
      };
    }

    // Parse and validate event data
    const parseResult = GoogleCalendarEvent.safeParse(event.raw ?? {});

    if (!parseResult.success) {
      logger.error("Failed to parse event data", {
        error: parseResult.error,
        data: event.raw,
        profile_id: profileId,
        validation_errors: parseResult.error.errors,
      });
      return {
        shouldJoin: false,
        reason: "Failed to parse event data",
      };
    }

    const calendarEvent = parseResult.data;
    const userEmail = userSettings.profile.email;

    if (!userEmail) {
      logger.info("⏭️ Skipping bot scheduling - No user email", {
        profile_id: profileId,
        event_id: event.id,
      });
      return {
        shouldJoin: false,
        reason: "No user email",
      };
    }

    // Extract meeting characteristics
    const userDomain = userEmail.split("@")[1];
    const isOrganizer = calendarEvent.organizer?.email === userEmail;

    const userAttendee = calendarEvent.attendees?.find(
      (attendee) => attendee.email === userEmail,
    );
    const isPending = userAttendee?.responseStatus === "needsAction";

    // Determine if meeting is internal (all attendees from same domain)
    const isInternalMeeting =
      !calendarEvent.attendees || calendarEvent.attendees.length === 0
        ? isOrganizer // Self-organized meetings with no attendees are internal
        : calendarEvent.attendees.every((attendee) => {
            const attendeeDomain = attendee.email?.split("@")[1];
            return attendeeDomain === userDomain;
          });

    // Log meeting characteristics for debugging
    logger.info("📊 Meeting evaluation details", {
      event_id: event.id,
      is_organizer: isOrganizer,
      is_pending: isPending,
      is_internal_meeting: isInternalMeeting,
      attendee_count: calendarEvent.attendees?.length ?? 0,
      user_email: userEmail,
    });

    // Apply exclusion rules first (these take precedence)
    if (userSettings.should_not_join_pending_meetings && isPending) {
      logger.info("⏭️ Skipping - Pending meeting", {
        event_id: event.id,
        profile_email: userEmail,
      });
      return {
        shouldJoin: false,
        reason: "Not joining pending meetings",
      };
    }

    if (userSettings.should_not_join_owned_by_others_meetings && !isOrganizer) {
      logger.info("⏭️ Skipping - Not organizer", {
        event_id: event.id,
        profile_email: userEmail,
      });
      return {
        shouldJoin: false,
        reason: "Not joining meetings owned by others",
      };
    }

    // Apply inclusion rules based on meeting type
    if (isInternalMeeting) {
      const shouldJoin = userSettings.should_join_team_meetings;
      logger.info(`${shouldJoin ? "✅" : "⏭️"} Internal meeting evaluation`, {
        event_id: event.id,
        should_join: shouldJoin,
        profile_email: userEmail,
      });
      return {
        shouldJoin,
        reason: shouldJoin
          ? "Internal meeting"
          : "Not joining internal meetings",
      };
    }

    const shouldJoin = userSettings.should_join_external_meetings;
    logger.info(`${shouldJoin ? "✅" : "⏭️"} External meeting evaluation`, {
      event_id: event.id,
      should_join: shouldJoin,
      profile_email: userEmail,
    });
    return {
      shouldJoin,
      reason: shouldJoin ? "External meeting" : "Not joining external meetings",
    };
  } catch (error) {
    logger.error("Failed to evaluate should schedule bot", {
      error,
      event_id: event.id,
      profile_id: profileId,
    });
    return {
      shouldJoin: false,
      reason: "Failed to evaluate should schedule bot",
    };
  }
}
