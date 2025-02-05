import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createClient } from "~/lib/supabase/server";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const transcriptsRouter = createTRPCRouter({
  getOne: publicProcedure
    .input(z.object({ videoId: z.string() }))
    .query(async ({ input }) => {
      const { videoId } = input;

      const supabase = await createClient();

      const { data: meetingBotV1, error: meetingBotV1Error } = await supabase
        .from("meeting_bots")
        .select("*")
        .eq("api_video_id", videoId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (meetingBotV1Error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: meetingBotV1Error.message,
          cause: meetingBotV1Error,
        });
      }

      let meetingBot = meetingBotV1[0];
      let isV1 = !!meetingBot;

      if (!meetingBot) {
        const { data: meetingBotV2, error: meetingBotV2Error } = await supabase
          .from("meeting_bots_v2")
          .select("*")
          .eq("api_video_id", videoId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (meetingBotV2Error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: meetingBotV2Error.message,
            cause: meetingBotV2Error,
          });
        }

        meetingBot = meetingBotV2[0];
        isV1 = false;
      }

      if (!meetingBot) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unable to find transcript for video",
        });
      }

      const { data: transcriptSlices, error: transcriptSlicesError } = await (
        isV1
          ? supabase
              .from("transcript_slices")
              .select("*, words:transcript_words(*)")
              .eq("bot_id", meetingBot.id)
          : supabase
              .from("transcript_slices_v2")
              .select("*, words:transcript_words_v2(*)")
              .eq("bot_id", meetingBot.id)
      ).order("index");

      if (transcriptSlicesError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: transcriptSlicesError.message,
          cause: transcriptSlicesError,
        });
      }

      return transcriptSlices;
    }),
});
