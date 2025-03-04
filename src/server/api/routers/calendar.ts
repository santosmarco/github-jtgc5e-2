import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { logger } from "~/lib/logging/server";
import { meetingBaas } from "~/lib/meeting-baas/client";
import { createLiveMeetingService } from "~/lib/meeting-bots/live-meeting/service";
import type { MeetingBotsServiceDependencies } from "~/lib/meeting-bots/types";
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
        console.error("Error fetching calendar events:", error);
        return [];
      }

      return data ?? [];
    }),

  launchMeetingBot: publicProcedure
    .input(
      z.object({
        meetingUrl: z.string().url(),
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
      });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error,
        });
      }

      return result;
    }),
});
