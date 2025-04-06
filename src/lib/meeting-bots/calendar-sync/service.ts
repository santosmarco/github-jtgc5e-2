import type { logger } from "@trigger.dev/sdk/v3";
import _ from "lodash";

import { GoogleCalendarEvent } from "~/lib/google-calendar/schemas";
import type {
  Bot as RecallBot,
  CalendarEvent as RecallCalendarEvent,
} from "~/lib/recall/client";
import type {
  Enums,
  Json,
  Tables,
  TablesInsert,
} from "~/lib/supabase/database.types";

import { BOT_AUTOMATIC_LEAVE } from "../constants";
import {
  type CalendarSyncEvent,
  type CalendarSyncEventQuery,
  MeetingPlatform,
  Platform,
} from "../schemas";
import type { MeetingBotsServiceDependencies } from "../types";
import { evaluateShouldScheduleBot as evaluateShouldScheduleBot_ } from "../utils";

export type RecallCalendarWithProfile = Tables<"recall_calendars_v2"> & {
  profile: Tables<"profiles">;
};

export type BotMetadata = {
  user_id: string;
  event_id: string;
};

export function createCalendarSyncService(
  deps: MeetingBotsServiceDependencies<typeof logger>,
) {
  const { supabase, meetingBaas, recall, logger, slack } = deps;

  async function handleCalendarSyncEvent(
    event: CalendarSyncEvent,
    options: CalendarSyncEventQuery = { full: "false" },
  ) {
    return logger.trace("calendar-sync.handle-event", async (trace) => {
      trace.setAttributes({
        "calendar.id": event.data.calendar_id,
        "event.last_updated": event.data.last_updated_ts,
      });

      try {
        const { data: calendar, error: calendarError } = await supabase
          .from("recall_calendars_v2")
          .select("*, profile:profiles!inner(*)")
          .eq("id", event.data.calendar_id)
          .maybeSingle();

        if (calendarError) {
          logger.error("❌ Failed to fetch calendar from database", {
            error: calendarError,
            event: event,
            calendar_id: event.data.calendar_id,
          });
          await slack.error({
            text: `Calendar Sync Error: ${calendarError.message}`,
          });
          return;
        }

        if (!calendar) {
          logger.error("❓ Calendar not found in database", {
            event: event,
            calendar_id: event.data.calendar_id,
          });
          await slack.error({
            text: `Calendar Not Found: ${event.data.calendar_id}`,
          });
          return;
        }

        if (!calendar.profile) {
          logger.error("👤 Profile not found for calendar", {
            calendar: calendar,
            event: event,
            calendar_id: event.data.calendar_id,
          });
          await slack.error({
            text: `Profile Not Found for Calendar: ${calendar.id}`,
          });
          return;
        }

        trace.setAttributes({
          "profile.id": calendar.profile.id,
          "profile.email": calendar.profile.email,
          "profile.role": calendar.profile.role,
        });

        if (calendar.profile.role === "coach") {
          logger.info("👨‍🏫 Skipping calendar sync for coach profile", {
            calendar: calendar,
            event: event,
            profile_role: calendar.profile.role,
            profile_id: calendar.profile.id,
            user_email: calendar.profile.email,
          });
          return;
        }

        const { data: coachProfile } = calendar.profile.coach_id
          ? await supabase
              .from("profiles")
              .select("*")
              .eq("id", calendar.profile.coach_id)
              .maybeSingle()
          : { data: null };

        const allResults: NonNullable<
          Awaited<
            ReturnType<typeof recall.calendarV2.calendar_events_list>
          >["results"]
        > = [];
        let nextCursor: string | null = null;

        do {
          let response: Awaited<
            ReturnType<typeof recall.calendarV2.calendar_events_list>
          >;

          try {
            response = await recall.calendarV2.calendar_events_list({
              queries: {
                calendar_id: event.data.calendar_id,
                ...(options.full === "true"
                  ? { start_time__gte: new Date().toISOString() }
                  : { updated_at__gte: event.data.last_updated_ts }),
                ...(nextCursor && { cursor: nextCursor }),
              },
            });
          } catch {
            nextCursor = null;
            break;
          }

          allResults.push(...(response.results ?? []));
          nextCursor = response.next ?? null;
        } while (nextCursor);

        const events = { results: _.uniqBy(allResults, (x) => x.id) };

        /*
        const events = await recall.calendarV2.calendar_events_list({
          queries: {
            calendar_id: event.data.calendar_id,
            ...(options.full === "true"
              ? { start_time__gte: new Date().toISOString() }
              : { updated_at__gte: event.data.last_updated_ts }),
          },
        });
        */

        logger.info("📅 Retrieved calendar events for processing", {
          event_count: events.results?.length ?? 0,
          calendar_id: event.data.calendar_id,
          last_updated: event.data.last_updated_ts,
          profile_id: calendar.profile.id,
          user_email: calendar.profile.email,
        });

        await slack.info({
          text: `[${calendar.profile.email}] Retrieved ${events.results?.length ?? 0} calendar events for processing`,
        });

        logger.info("🔄 Starting event processing loop", {
          total_events: events.results?.length ?? 0,
          calendar_id: calendar.id,
          profile_email: calendar.profile.email,
        });

        for (const calendarEvent of events.results ?? []) {
          await processCalendarEvent(calendar, calendarEvent, coachProfile);
        }

        // After processing all events, create sessions as needed
        await createSessionsAsNeeded(calendar, coachProfile);

        logger.info("✅ Completed calendar sync event processing", {
          calendar_id: event.data.calendar_id,
          processed_events: events.results?.length ?? 0,
          profile_email: calendar.profile.email,
        });
      } catch (error) {
        logger.error("Failed to handle calendar sync event", {
          error,
          event,
        });
        await slack.error({
          text: `Failed to handle calendar sync event: ${(error as Error).message}`,
        });
      }
    });
  }

  async function processCalendarEvent(
    calendar: RecallCalendarWithProfile,
    event: RecallCalendarEvent,
    coachProfile: Tables<"profiles"> | null,
  ) {
    return logger.trace("calendar-sync.process-event", async (trace) => {
      trace.setAttributes({
        "event.id": event.id,
        "calendar.id": calendar.id,
        "profile.email": calendar.profile.email,
      });

      try {
        const eventType = await getEventType(calendar, event, coachProfile);

        const upsertResult = await supabase
          .from("calendar_events_v2")
          .upsert(
            {
              id: event.id,
              created_at: event.created_at,
              end_time: event.end_time,
              ical_uid: event.ical_uid,
              is_deleted: event.is_deleted,
              meeting_platform: MeetingPlatform.nullish()
                .catch(null)
                .parse(event.meeting_platform),
              start_time: event.start_time,
              platform_id: event.platform_id,
              recall_calendar_id: event.calendar_id,
              meeting_url: event.meeting_url,
              platform: Platform.nullish().catch(null).parse(event.platform),
              raw: event.raw as Json,
              updated_at: event.updated_at,
              profile_id: calendar.profile.id,
              event_type: eventType,
            },
            { onConflict: "id" },
          )
          .select("*")
          .maybeSingle();

        if (upsertResult.error || !upsertResult.data) {
          logger.error("❌ Failed to upsert calendar event", {
            error: upsertResult.error,
            event_id: event.id,
            calendar_id: calendar.id,
            profile_id: calendar.profile.id,
          });
          return;
        }

        logger.info("💾 Upserted calendar event", {
          event_id: event.id,
          calendar_id: calendar.id,
          profile_id: calendar.profile.id,
          upsert_result: upsertResult,
        });

        const calendarEvent = upsertResult.data;

        // Check if event is relevant (not in past and has required data) before proceeding
        const eventRelevance = await isEventRelevant(event);
        if (!eventRelevance.isRelevant) {
          logger.info(
            `⏭️ Skipping event processing - ${eventRelevance.reason}`,
            {
              event_id: event.id,
              calendar_id: calendar.id,
              profile_email: calendar.profile.email,
            },
          );
          return;
        }

        await cleanupExistingBots(event);

        const { shouldJoin: shouldScheduleBot, reason: schedulingReason } =
          await evaluateShouldScheduleBot(calendar, calendarEvent);

        if (!shouldScheduleBot) {
          logger.info("⏭️ Skipping bot scheduling", {
            event_id: event.id,
            calendar_id: calendar.id,
            profile_email: calendar.profile.email,
            reason: schedulingReason,
          });
          return;
        }

        logger.info("🤖 Preparing bot configuration", {
          event_id: event.id,
          calendar_id: calendar.id,
          profile_email: calendar.profile.email,
          reason: schedulingReason,
        });

        const [botName, botMetadata, botDeduplicationKey] = await Promise.all([
          getBotName(calendar),
          getBotMetadata(calendar, event),
          getBotDeduplicationKey(calendar, event),
        ]);

        if (event.meeting_platform === "zoom") {
          await handleZoomMeeting(
            calendar,
            event,
            botName,
            botMetadata,
            botDeduplicationKey,
          );
          return;
        }

        if (event.meeting_platform === "google_meet") {
          await handleGoogleMeetMeeting(
            calendar,
            event,
            botName,
            botMetadata,
            botDeduplicationKey,
          );
          return;
        }

        logger.warn("⚠️ Unsupported meeting platform", {
          event_id: event.id,
          platform: event.meeting_platform,
          calendar_id: calendar.id,
          profile_email: calendar.profile.email,
        });
      } catch (error) {
        logger.error("Failed to process calendar event", {
          error,
          event_id: event.id,
          calendar_id: calendar.id,
          profile_id: calendar.profile.id,
        });
        await slack.error({
          text: `[${calendar.profile.email}] Failed to process calendar event: ${(error as Error).message}`,
        });
      }
    });
  }

  async function getEventType(
    calendar: RecallCalendarWithProfile,
    event: RecallCalendarEvent,
    coachProfile: Tables<"profiles"> | null,
  ): Promise<Enums<"event_type">> {
    try {
      // Early validation of required data
      if (!coachProfile?.email) {
        const reason = !coachProfile
          ? "No coach profile associated with this event"
          : "Coach profile has no email";

        logger.info(`${reason}, defaulting to 'meeting' type`, {
          event_id: event.id,
          calendar_id: calendar.id,
          profile_email: calendar.profile.email,
          ...(coachProfile ? { coach_profile_id: coachProfile.id } : {}),
        });
        return "meeting";
      }

      // Parse and validate event data
      const parseResult = GoogleCalendarEvent.safeParse(event.raw ?? {});
      if (!parseResult.success) {
        logger.error(
          "Failed to parse event data, defaulting to 'meeting' type",
          {
            error: parseResult.error,
            data: event.raw,
            profile_id: calendar.profile.id,
            validation_errors: parseResult.error.errors,
          },
        );
        return "meeting";
      }

      const calendarEvent = parseResult.data;

      // Check if coach is an attendee using normalized email comparison
      const coachEmailNormalized = coachProfile.email.toLowerCase().trim();
      const hasCoachAsAttendee = calendarEvent.attendees?.some(
        (attendee) =>
          attendee.email &&
          attendee.email.toLowerCase().trim() === coachEmailNormalized,
      );

      if (hasCoachAsAttendee) {
        logger.info("Coach is an attendee, identifying as 'coaching_session'", {
          event_id: event.id,
          calendar_id: calendar.id,
          profile_email: calendar.profile.email,
          coach_email: coachProfile.email,
        });
        return "coaching_session";
      }

      logger.info("Coach is not an attendee, identifying as 'meeting'", {
        event_id: event.id,
        calendar_id: calendar.id,
        profile_email: calendar.profile.email,
      });
      return "meeting";
    } catch (error) {
      logger.error(
        "Error determining event type, defaulting to 'meeting' type",
        {
          error,
          event_id: event.id,
          calendar_id: calendar.id,
          profile_id: calendar.profile.id,
        },
      );
      return "meeting";
    }
  }

  async function createSessionsAsNeeded(
    calendar: RecallCalendarWithProfile,
    coachProfile: Tables<"profiles"> | null,
  ) {
    return logger.trace("calendar-sync.create-sessions", async (trace) => {
      trace.setAttributes({
        "calendar.id": calendar.id,
        "profile.id": calendar.profile.id,
        "profile.email": calendar.profile.email,
      });

      try {
        if (!coachProfile) {
          logger.info("⏭️ Skipping session creation - No coach profile", {
            calendar_id: calendar.id,
            profile_id: calendar.profile.id,
            profile_email: calendar.profile.email,
          });
          return;
        }

        // Find all coaching session events that don't have associated sessions
        const { data: coachingEvents, error: eventsError } = await supabase
          .from("calendar_events_v2")
          .select("*, sessions:sessions!left(id)")
          .eq("profile_id", calendar.profile.id)
          .eq("event_type", "coaching_session")
          .is("is_deleted", false);

        if (eventsError) {
          logger.error("❌ Failed to fetch coaching events", {
            error: eventsError,
            calendar_id: calendar.id,
            profile_id: calendar.profile.id,
          });
          return;
        }

        // Filter events that don't have sessions
        const eventsWithoutSessions = coachingEvents.filter(
          (event) => !event.sessions || event.sessions.length === 0,
        );

        if (eventsWithoutSessions.length === 0) {
          logger.info("✅ No new sessions needed", {
            calendar_id: calendar.id,
            profile_id: calendar.profile.id,
          });
          return;
        }

        logger.info("🔄 Creating sessions for coaching events", {
          calendar_id: calendar.id,
          profile_id: calendar.profile.id,
          events_count: eventsWithoutSessions.length,
        });

        // Create sessions for each event
        const { data: createdSessions, error: sessionsError } = await supabase
          .from("sessions")
          .insert(
            eventsWithoutSessions
              .map((event) => {
                const eventRawParseResult = GoogleCalendarEvent.safeParse(
                  event.raw,
                );

                if (!eventRawParseResult.success) {
                  logger.warn("⚠️ Failed to parse event raw data", {
                    error: eventRawParseResult.error,
                    event_id: event.id,
                  });
                }

                const eventRaw = eventRawParseResult.data;

                return {
                  user_id: calendar.profile.id,
                  coach_id: coachProfile.id,
                  event_id: event.id,
                  date: event.start_time,
                  title: eventRaw?.summary ?? "Coaching Session",
                } satisfies TablesInsert<"sessions">;
              })
              .filter(
                (event): event is NonNullable<typeof event> => event !== null,
              ),
          )
          .select("*");

        if (sessionsError) {
          logger.error("❌ Failed to create sessions", {
            error: sessionsError,
            calendar_id: calendar.id,
            profile_id: calendar.profile.id,
          });
          return;
        }

        logger.info("✅ Successfully created sessions", {
          calendar_id: calendar.id,
          profile_id: calendar.profile.id,
          sessions_count: createdSessions.length,
          session_ids: createdSessions.map((s) => s.id),
        });

        await slack.success({
          text: `[${calendar.profile.email}] Created ${createdSessions.length} coaching sessions`,
        });
      } catch (error) {
        logger.error("Failed to create sessions", {
          error,
          calendar_id: calendar.id,
          profile_id: calendar.profile.id,
        });
        await slack.error({
          text: `[${calendar.profile.email}] Failed to create sessions: ${(error as Error).message}`,
        });
      }
    });
  }

  async function isEventRelevant(event: RecallCalendarEvent) {
    // Check if the event is in the past (has ended)
    const now = new Date();
    const startTime = event.start_time ? new Date(event.start_time) : null;
    const endTime = event.end_time ? new Date(event.end_time) : null;

    // Skip if event has already ended
    if (endTime && endTime < now) {
      return {
        isRelevant: false,
        reason: "Event already ended",
      };
    }

    // Skip if event has no valid time information
    if (!startTime) {
      return {
        isRelevant: false,
        reason: "Missing start time",
      };
    }

    return {
      isRelevant: true,
      reason: "Event is current or upcoming",
    };
  }

  async function cleanupExistingBots(event: RecallCalendarEvent) {
    return logger.trace("calendar-sync.cleanup-bots", async (trace) => {
      trace.setAttributes({
        "event.id": event.id,
        existing_bots: event.bots?.length ?? 0,
      });

      try {
        const cleanupPromises: Promise<unknown>[] = [];

        if (event.bots && event.bots.length > 0) {
          logger.info("🗑️ Cleaning up Recall bots", {
            event_id: event.id,
            bot_count: event.bots.length,
          });

          cleanupPromises.push(
            recall.calendarV2.calendar_events_bot_destroy(undefined, {
              params: { id: event.id },
            }),
          );
        }

        const { data: meetingBots } = await supabase
          .from("meeting_bots_v2")
          .update({
            is_removed: true,
          })
          .eq("event_id", event.id)
          .select("*");

        const meetingBaasBots = meetingBots?.filter(
          (bot) => bot.provider === "meeting_baas",
        );

        if (meetingBaasBots && meetingBaasBots.length > 0) {
          logger.info("🗑️ Cleaning up MeetingBaas bots", {
            event_id: event.id,
            bot_count: meetingBaasBots.length,
            bot_ids: meetingBaasBots.map((bot) => bot.id),
          });

          cleanupPromises.push(
            ...meetingBaasBots.map((bot) => meetingBaas.meetings.leave(bot.id)),
          );
        }

        const results = await Promise.allSettled(cleanupPromises);

        logger.info("✅ Completed bot cleanup", {
          event_id: event.id,
          success_count: results.filter((r) => r.status === "fulfilled").length,
          failure_count: results.filter((r) => r.status === "rejected").length,
          results,
        });
      } catch (error) {
        logger.error("Failed to cleanup existing bots", {
          error,
          event_id: event.id,
        });
        await slack.error({
          text: `Failed to cleanup existing bots: ${(error as Error).message}`,
        });
      }
    });
  }

  async function evaluateShouldScheduleBot(
    calendar: RecallCalendarWithProfile,
    event: Tables<"calendar_events_v2">,
  ) {
    return logger.trace("calendar-sync.evaluate-scheduling", async (trace) => {
      trace.setAttributes({
        "event.id": event.id,
        "calendar.id": calendar.id,
        "profile.email": calendar.profile.email,
      });

      return evaluateShouldScheduleBot_(calendar.profile.id, event, supabase);
    });
  }

  async function getBotName(calendar: RecallCalendarWithProfile) {
    return logger.trace("calendar-sync.get-bot-name", async (trace) => {
      trace.setAttributes({
        "calendar.id": calendar.id,
        "profile.id": calendar.profile.id,
      });

      try {
        const { data: userSettings } = await supabase
          .from("user_settings")
          .select("*")
          .eq("profile_id", calendar.profile.id)
          .maybeSingle();

        const botName = userSettings?.bot_name ?? "Notetaker";

        logger.info("✅ Retrieved bot name", {
          calendar_id: calendar.id,
          profile_id: calendar.profile.id,
          bot_name: botName,
        });

        return botName;
      } catch (error) {
        logger.error("Failed to get bot name", {
          error,
          calendar_id: calendar.id,
          profile_id: calendar.profile.id,
        });
        await slack.error({
          text: `Failed to get bot name: ${(error as Error).message}`,
        });
        return "Notetaker";
      }
    });
  }

  async function getBotMetadata(
    calendar: RecallCalendarWithProfile,
    event: RecallCalendarEvent,
  ) {
    return logger.trace("calendar-sync.get-bot-metadata", async (trace) => {
      trace.setAttributes({
        "calendar.id": calendar.id,
        "event.id": event.id,
      });

      logger.info("📝 Generating bot metadata", {
        calendar,
        event,
      });

      return {
        user_id: calendar.profile.id,
        event_id: event.id,
      } satisfies BotMetadata;
    });
  }

  async function getBotDeduplicationKey(
    calendar: RecallCalendarWithProfile,
    event: RecallCalendarEvent,
  ) {
    return logger.trace(
      "calendar-sync.get-deduplication-key",
      async (trace) => {
        trace.setAttributes({
          "calendar.id": calendar.id,
          "event.id": event.id,
        });

        const key = `${event.start_time}-${event.meeting_url}-${calendar.profile.id}`;

        logger.info("🔑 Generated deduplication key", {
          calendar_id: calendar.id,
          event_id: event.id,
          key: key,
        });

        return key;
      },
    );
  }

  async function handleZoomMeeting(
    calendar: RecallCalendarWithProfile,
    event: RecallCalendarEvent,
    botName: string,
    botMetadata: BotMetadata,
    botDeduplicationKey: string,
  ) {
    return logger.trace("calendar-sync.handle-zoom", async (trace) => {
      trace.setAttributes({
        "calendar.id": calendar.id,
        "event.id": event.id,
        "bot.name": botName,
      });

      try {
        if (!event.meeting_url) {
          logger.warn("⚠️ Cannot handle Zoom meeting - Missing meeting URL", {
            event_id: event.id,
            calendar: calendar,
            event: event,
            profile_id: calendar.profile.id,
            user_email: calendar.profile.email,
          });
          await slack.error({
            text: `[${calendar.profile.email}] Cannot handle Zoom meeting - Missing meeting URL`,
          });
          return;
        }

        const startTimeUnix = event.start_time
          ? Math.floor(new Date(event.start_time).getTime() / 1000)
          : null;

        logger.info("🚀 Creating Zoom bot", {
          event_id: event.id,
          meeting_url: event.meeting_url,
          bot_name: botName,
          start_time: startTimeUnix,
          start_time_iso: event.start_time,
          deduplication_key: botDeduplicationKey,
          profile_id: calendar.profile.id,
          user_email: calendar.profile.email,
        });

        await slack.info({
          text: `[${calendar.profile.email}] Creating Zoom bot: ${botName} for meeting at ${new Date(event.start_time).toLocaleString()}`,
        });

        const {
          data: { user },
        } = await supabase.auth.admin.getUserById(calendar.profile.id);

        if (user?.app_metadata.recall_zoom_oauth_credential) {
          logger.info("🔑 User has Zoom integration", {
            user_id: user.id,
          });

          await slack.info({
            text: `[${calendar.profile.email}] Creating Zoom bot: ${botName} for meeting at ${new Date(event.start_time).toLocaleString()}`,
          });

          const calendarEventResult =
            await recall.calendarV2.calendar_events_bot_create(
              {
                deduplication_key: botDeduplicationKey,
                bot_config: {
                  bot_name: botName,
                  automatic_leave: {
                    waiting_room_timeout:
                      BOT_AUTOMATIC_LEAVE.WAITING_ROOM_TIMEOUT_IN_SECONDS,
                    noone_joined_timeout:
                      BOT_AUTOMATIC_LEAVE.NOONE_JOINED_TIMEOUT_IN_SECONDS,
                  },
                  transcription_options: {
                    provider: "gladia",
                  },
                  metadata: botMetadata,
                } satisfies Partial<RecallBot>,
              },
              {
                params: { id: event.id },
              },
            );

          for (const bot of calendarEventResult.bots) {
            logger.info("✅ Successfully created Zoom bot", {
              bot_id: bot.bot_id,
              event_id: event.id,
              profile_id: calendar.profile.id,
              user_email: calendar.profile.email,
              deduplication_key: bot.deduplication_key,
            });

            await slack.success({
              text: `[${calendar.profile.email}] Successfully created Zoom bot: ${bot.bot_id}`,
            });
          }

          const { data: meetingBots } = await supabase
            .from("meeting_bots_v2")
            .insert(
              calendarEventResult.bots.map(
                (bot) =>
                  ({
                    id: bot.bot_id,
                    provider: "recall",
                    profile_id: calendar.profile.id,
                    recall_calendar_id: calendar.id,
                    event_id: event.id,
                    deduplication_key: bot.deduplication_key,
                  }) satisfies TablesInsert<"meeting_bots_v2">,
              ),
            )
            .select("*");

          logger.info("💾 Saved Zoom bots", {
            event_id: event.id,
            meeting_bots: meetingBots,
            profile_id: calendar.profile.id,
            user_email: calendar.profile.email,
            bot_count: meetingBots?.length ?? 0,
          });

          return;
        }

        const meetingJoinResult = await meetingBaas.meetings.join({
          bot_name: botName,
          bot_image: "https://i.ibb.co/jbZmcsG/Slide-16-9-1.jpg",
          meeting_url: event.meeting_url,
          start_time: startTimeUnix,
          reserved: true,
          deduplication_key: botDeduplicationKey,
          recording_mode: "speaker_view",
          entry_message:
            'Please update your Titan x Zoom integration by following this link and clicking "Connect": https://app.withtitan.com/integrations\n\nThe new Zoom experience has been upgraded significantly and the old Zoom experience will stop working on April 11th at 5pm ET.',
          speech_to_text: {
            provider: "Default",
          },
          automatic_leave: {
            waiting_room_timeout:
              BOT_AUTOMATIC_LEAVE.WAITING_ROOM_TIMEOUT_IN_SECONDS,
            noone_joined_timeout:
              BOT_AUTOMATIC_LEAVE.NOONE_JOINED_TIMEOUT_IN_SECONDS,
          },
          extra: botMetadata,
        });

        logger.info("✅ Successfully created Zoom bot", {
          bot_id: meetingJoinResult.bot_id,
          event_id: event.id,
          profile_id: calendar.profile.id,
          user_email: calendar.profile.email,
          start_time: event.start_time,
        });

        await slack.success({
          text: `[${calendar.profile.email}] Successfully created Zoom bot: ${meetingJoinResult.bot_id}`,
        });

        const meetingData = await meetingBaas.meetings
          .getMeetingData(meetingJoinResult.bot_id)
          .catch((error: unknown) => {
            logger.warn("Failed to get meeting data from Meeting BaaS", {
              error,
              bot_id: meetingJoinResult.bot_id,
            });
            return null;
          });

        const { data: meetingBots } = await supabase
          .from("meeting_bots_v2")
          .insert({
            id: meetingJoinResult.bot_id,
            provider: "meeting_baas",
            profile_id: calendar.profile.id,
            recall_calendar_id: calendar.id,
            event_id: event.id,
            deduplication_key:
              meetingData?.bot_data.bot.deduplication_key ??
              botDeduplicationKey,
          } satisfies TablesInsert<"meeting_bots_v2">)
          .select("*");

        logger.info("💾 Saved Zoom bots", {
          event_id: event.id,
          meeting_bots: meetingBots,
          profile_id: calendar.profile.id,
          user_email: calendar.profile.email,
          bot_count: meetingBots?.length ?? 0,
        });
      } catch (error) {
        logger.error("Failed to handle Zoom meeting", {
          error,
          event_id: event.id,
          calendar_id: calendar.id,
          profile_id: calendar.profile.id,
        });
        await slack.error({
          text: `[${calendar.profile.email}] Failed to handle Zoom meeting: ${(error as Error).message}`,
        });
      }
    });
  }

  async function handleGoogleMeetMeeting(
    calendar: RecallCalendarWithProfile,
    event: RecallCalendarEvent,
    botName: string,
    botMetadata: BotMetadata,
    botDeduplicationKey: string,
  ) {
    return logger.trace("calendar-sync.handle-meet", async (trace) => {
      trace.setAttributes({
        "calendar.id": calendar.id,
        "event.id": event.id,
        "bot.name": botName,
      });

      try {
        if (!event.meeting_url) {
          logger.warn(
            "⚠️ Cannot handle Google Meet meeting - Missing meeting URL",
            {
              event_id: event.id,
              calendar: calendar,
              event: event,
              profile_id: calendar.profile.id,
              user_email: calendar.profile.email,
            },
          );
          await slack.error({
            text: `[${calendar.profile.email}] Cannot handle Google Meet meeting - Missing meeting URL`,
          });
          return;
        }

        logger.info("🚀 Creating Google Meet bot", {
          event_id: event.id,
          meeting_url: event.meeting_url,
          bot_name: botName,
          start_time: event.start_time,
          deduplication_key: botDeduplicationKey,
          profile_id: calendar.profile.id,
          user_email: calendar.profile.email,
        });

        await slack.info({
          text: `[${calendar.profile.email}] Creating Google Meet bot: ${botName} for meeting at ${new Date(event.start_time).toLocaleString()}`,
        });

        const calendarEventResult =
          await recall.calendarV2.calendar_events_bot_create(
            {
              deduplication_key: botDeduplicationKey,
              bot_config: {
                bot_name: botName,
                automatic_leave: {
                  waiting_room_timeout:
                    BOT_AUTOMATIC_LEAVE.WAITING_ROOM_TIMEOUT_IN_SECONDS,
                  noone_joined_timeout:
                    BOT_AUTOMATIC_LEAVE.NOONE_JOINED_TIMEOUT_IN_SECONDS,
                },
                transcription_options: {
                  provider: "gladia",
                },
                metadata: botMetadata,
              } satisfies Partial<RecallBot>,
            },
            {
              params: { id: event.id },
            },
          );

        for (const bot of calendarEventResult.bots) {
          logger.info("✅ Successfully created Google Meet bot", {
            bot_id: bot.bot_id,
            event_id: event.id,
            profile_id: calendar.profile.id,
            user_email: calendar.profile.email,
            deduplication_key: bot.deduplication_key,
          });

          await slack.success({
            text: `[${calendar.profile.email}] Successfully created Google Meet bot: ${bot.bot_id}`,
          });
        }

        const { data: meetingBots } = await supabase
          .from("meeting_bots_v2")
          .insert(
            calendarEventResult.bots.map(
              (bot) =>
                ({
                  id: bot.bot_id,
                  provider: "recall",
                  profile_id: calendar.profile.id,
                  recall_calendar_id: calendar.id,
                  event_id: event.id,
                  deduplication_key: bot.deduplication_key,
                }) satisfies TablesInsert<"meeting_bots_v2">,
            ),
          )
          .select("*");

        logger.info("💾 Saved Google Meet bots", {
          event_id: event.id,
          meeting_bots: meetingBots,
          profile_id: calendar.profile.id,
          user_email: calendar.profile.email,
          bot_count: meetingBots?.length ?? 0,
        });
      } catch (error) {
        logger.error("Failed to handle Google Meet meeting", {
          error,
          event_id: event.id,
          calendar_id: calendar.id,
          profile_id: calendar.profile.id,
        });
        await slack.error({
          text: `[${calendar.profile.email}] Failed to handle Google Meet meeting: ${(error as Error).message}`,
        });
      }
    });
  }

  return {
    handleCalendarSyncEvent,
  } as const;
}
