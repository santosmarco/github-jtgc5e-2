import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { syncCalendars } from "~/jobs/sync-calendars";
import type { Tables } from "~/lib/supabase/database.types";
import { createClient } from "~/lib/supabase/server";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const settingsRouter = createTRPCRouter({
  retrieveForProfile: publicProcedure
    .input(z.object({ profileId: z.string().nullish() }))
    .query(async ({ input }) => {
      if (!input.profileId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Profile ID is required",
        });
      }

      const supabase = await createClient();

      const { data: settings, error: settingsError } = await supabase
        .from("user_settings")
        .select("*, profile:profiles(*)")
        .eq("profile_id", input.profileId)
        .single();

      if (settingsError) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      return settings;
    }),

  updateSetting: publicProcedure
    .input(
      z.object({
        profileId: z.string(),
        key: z.enum([
          "bot_name",
          "should_join_team_meetings",
          "should_join_external_meetings",
          "should_not_join_pending_meetings",
          "should_not_join_owned_by_others_meetings",
          "should_not_join_coaching_sessions",
          "has_ai_coaching_enabled",
        ]) satisfies z.ZodType<keyof Tables<"user_settings">>,
        value: z.union([z.string(), z.boolean()]),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("user_settings")
        .update({ [input.key]: input.value })
        .eq("profile_id", input.profileId)
        .select("*")
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update setting",
          cause: error,
        });
      }

      // Get the calendar ID for this profile
      const { data: calendar } = await supabase
        .from("recall_calendars_v2")
        .select("id")
        .eq("profile_id", input.profileId)
        .maybeSingle();

      if (calendar?.id) {
        try {
          // Trigger calendar sync job with full=true to process all events
          await syncCalendars.trigger(
            {
              event: "calendar.sync_events",
              data: {
                calendar_id: calendar.id,
                last_updated_ts: new Date().toISOString(),
              },
              full: "true",
            },
            {
              tags: [
                "event:calendar.sync_events",
                `calendar_id:${calendar.id}`,
                `setting_change:${input.key}`,
              ],
            },
          );
        } catch (syncError) {
          console.error(
            "Failed to trigger calendar sync after setting update",
            syncError,
          );
          // Don't throw error here, as the setting was successfully updated
        }
      }

      return data;
    }),
});
