import { TRPCError } from "@trpc/server";
import dayjs from "dayjs";
import { z } from "zod";

import { syncCalendars } from "~/jobs/sync-calendars";
import type { GoogleCalendarEvent } from "~/lib/google-calendar/schemas";
import { logger } from "~/lib/logging/server";
import { meetingBaas } from "~/lib/meeting-baas/client";
import { createLiveMeetingService } from "~/lib/meeting-bots/live-meeting/service";
import type { MeetingBotsServiceDependencies } from "~/lib/meeting-bots/types";
import { evaluateShouldScheduleBot } from "~/lib/meeting-bots/utils";
import { createClient as createRecallClient } from "~/lib/recall/client";
import { slack } from "~/lib/slack";
import { __dangerouslyCreateAdminClient__ } from "~/lib/supabase/admin";
import { createClient as createSupabaseClient } from "~/lib/supabase/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

import { apiVideo } from "../services/api-video";

export const calendarRouter = createTRPCRouter({
  getLiveEvents: publicProcedure
    .input(
      z.object({
        profileId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createSupabaseClient();
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from("calendar_event_details_v2")
        .select("*")
        .eq("is_deleted", false)
        .eq("profile_id", input.profileId)
        .gte("end_time", now.toISOString())
        .lte("start_time", tomorrow.toISOString())
        .order("start_time");

      if (error) {
        logger.error("Error fetching calendar events:", error);
        return [];
      }

      return data;
    }),

  getCalendarEvents: publicProcedure
    .input(
      z.object({
        profileId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createSupabaseClient();
      const now = new Date();

      const { data, error } = await supabase
        .from("calendar_events_v2")
        .select("*, meeting_bots:meeting_bots_v2(*)")
        .eq("is_deleted", false)
        .eq("profile_id", input.profileId)
        .gte("end_time", dayjs(now).startOf("day").toISOString())
        .order("start_time");

      if (error) {
        logger.error("Error fetching calendar events:", error);
        return [];
      }

      return await Promise.all(
        (data || []).map(async (event) => {
          const [{ shouldJoin, reason }] = await Promise.all([
            evaluateShouldScheduleBot(
              input.profileId,
              {
                ...event,
                id: event.id ?? "",
                is_deleted: event.is_deleted ?? false,
              },
              supabase,
            ),
          ]);

          const eventDetails = event.raw as z.infer<typeof GoogleCalendarEvent>;

          return {
            ...event,
            event_id: eventDetails.id,
            start_date_time: eventDetails.start?.dateTime,
            end_date_time: eventDetails.end?.dateTime,
            summary: eventDetails.summary,
            status: eventDetails.status,
            created: eventDetails.created,
            creator_email: eventDetails.creator?.email,
            html_link: eventDetails.htmlLink,
            attendees: eventDetails.attendees?.map((a) => a.email),
            should_join_calculated: shouldJoin,
            should_join_calculated_reason: reason,
            meeting_bot: event.meeting_bots?.find((mb) => !!mb.status),
          };
        }),
      );
    }),

  getPastCalendarEvents: publicProcedure
    .input(
      z.object({
        profileId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createSupabaseClient();
      const now = new Date();

      const { data, error } = await supabase
        .from("calendar_events_v2")
        .select("*, meeting_bots:meeting_bots_v2(*)")
        .eq("is_deleted", false)
        .eq("profile_id", input.profileId)
        .lt("end_time", dayjs(now).startOf("day").toISOString())
        .order("start_time", { ascending: false });

      if (error) {
        logger.error("Error fetching past calendar events:", error);
        return [];
      }

      return await Promise.all(
        (data || []).map(async (event) => {
          const [{ shouldJoin, reason }] = await Promise.all([
            evaluateShouldScheduleBot(
              input.profileId,
              {
                ...event,
                id: event.id ?? "",
                is_deleted: event.is_deleted ?? false,
              },
              supabase,
            ),
          ]);

          const eventDetails = event.raw as z.infer<typeof GoogleCalendarEvent>;

          return {
            ...event,
            event_id: eventDetails.id,
            start_date_time: eventDetails.start?.dateTime,
            end_date_time: eventDetails.end?.dateTime,
            summary: eventDetails.summary,
            status: eventDetails.status,
            created: eventDetails.created,
            creator_email: eventDetails.creator?.email,
            html_link: eventDetails.htmlLink,
            attendees: eventDetails.attendees?.map((a) => a.email),
            should_join_calculated: shouldJoin,
            should_join_calculated_reason: reason,
            meeting_bot: event.meeting_bots?.find((mb) => !!mb.status),
          };
        }),
      );
    }),

  updateMeetingJoinPreference: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        profileId: z.string(),
        shouldJoin: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createSupabaseClient();

      // First find the calendar_event record to update
      const { data: eventData, error: findError } = await supabase
        .from("calendar_events_v2")
        .select("id, calendar:recall_calendars_v2(id)")
        .eq("id", input.eventId)
        .eq("profile_id", input.profileId)
        .single();

      if (findError || !eventData) {
        logger.error(
          "Failed to find calendar event for updating join preference",
          {
            error: findError,
            eventId: input.eventId,
            profileId: input.profileId,
          },
        );
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar event not found",
        });
      }

      // Now update the record with the correct ID
      const { error } = await supabase
        .from("calendar_events_v2")
        .update({
          should_join_user_override: input.shouldJoin,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventData.id);

      if (error) {
        logger.error("Failed to update meeting join preference", {
          error,
          eventId: input.eventId,
          profileId: input.profileId,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update meeting join preference",
        });
      }

      void syncCalendars.trigger({
        event: "calendar.sync_events",
        data: {
          calendar_id: eventData.calendar.id,
          last_updated_ts: dayjs().subtract(1, "day").toISOString(),
        },
        full: "true",
      });

      return { success: true };
    }),

  launchMeetingBot: publicProcedure
    .input(
      z.object({
        meetingUrl: z.string().url(),
        meetingTitle: z.string(),
        profileId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const deps = {
        supabase: await __dangerouslyCreateAdminClient__(),
        logger: logger,
        recall: createRecallClient(),
        meetingBaas: meetingBaas,
        apiVideo: apiVideo,
        slack: slack,
      } satisfies MeetingBotsServiceDependencies;

      const { launchLiveMeeting } = createLiveMeetingService(deps);

      const result = await launchLiveMeeting({
        userId: input.profileId,
        meetingUrl: input.meetingUrl,
        meetingTitle: input.meetingTitle,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error,
        });
      }

      return result;
    }),

  addTag: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        profileId: z.string(),
        tag: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createSupabaseClient();

      // First get the current tags
      const { data: eventData, error: findError } = await supabase
        .from("calendar_events_v2")
        .select("tags")
        .eq("id", input.eventId)
        .eq("profile_id", input.profileId)
        .single();

      if (findError) {
        logger.error("Failed to fetch calendar event for adding tag", {
          error: findError,
          eventId: input.eventId,
          profileId: input.profileId,
        });
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar event not found",
        });
      }

      // Create new tags array, ensuring no duplicates
      const currentTags = eventData?.tags || [];
      if (currentTags.includes(input.tag)) {
        return { success: true }; // Tag already exists
      }
      const newTags = [...currentTags, input.tag];

      // Update the tags
      const { error } = await supabase
        .from("calendar_events_v2")
        .update({
          tags: newTags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.eventId)
        .eq("profile_id", input.profileId);

      if (error) {
        logger.error("Failed to add tag to calendar event", {
          error,
          eventId: input.eventId,
          profileId: input.profileId,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add tag",
        });
      }

      return { success: true };
    }),

  removeTag: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        profileId: z.string(),
        tag: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createSupabaseClient();

      // First get the current tags
      const { data: eventData, error: findError } = await supabase
        .from("calendar_events_v2")
        .select("tags")
        .eq("id", input.eventId)
        .eq("profile_id", input.profileId)
        .single();

      if (findError) {
        logger.error("Failed to fetch calendar event for removing tag", {
          error: findError,
          eventId: input.eventId,
          profileId: input.profileId,
        });
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar event not found",
        });
      }

      // Remove the tag from the array
      const currentTags = eventData?.tags || [];
      const newTags = currentTags.filter((t) => t !== input.tag);

      // Update the tags
      const { error } = await supabase
        .from("calendar_events_v2")
        .update({
          tags: newTags.length > 0 ? newTags : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.eventId)
        .eq("profile_id", input.profileId);

      if (error) {
        logger.error("Failed to remove tag from calendar event", {
          error,
          eventId: input.eventId,
          profileId: input.profileId,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove tag",
        });
      }

      return { success: true };
    }),
});
