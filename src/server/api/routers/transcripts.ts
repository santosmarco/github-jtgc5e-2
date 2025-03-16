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

      // Filter out duplicate transcript slices based on word content
      const uniqueTranscriptSlices = transcriptSlices.reduce<
        typeof transcriptSlices
      >((uniqueSlices, currentSlice) => {
        // Extract and normalize the text content from slice words
        const sliceText = currentSlice.words
          .reduce<string[]>((words, word) => {
            // Type guard to ensure word has content
            if (!("content" in word) || typeof word.content !== "string") {
              return words;
            }
            return words.concat(word.content.trim());
          }, [])
          .join(" ")
          .trim();

        // Skip empty slices
        if (!sliceText) {
          return uniqueSlices;
        }

        // Get the text of the last added slice
        const lastSliceText = uniqueSlices[uniqueSlices.length - 1]?.words
          .reduce<string[]>((words, word) => {
            if (!("content" in word) || typeof word.content !== "string") {
              return words;
            }
            return words.concat(word.content.trim());
          }, [])
          .join(" ")
          .trim();

        // Only add if content differs from previous slice
        if (sliceText !== lastSliceText) {
          uniqueSlices.push(currentSlice);
        }

        return uniqueSlices;
      }, []);

      return uniqueTranscriptSlices;
    }),

  getMinimalTranscript: publicProcedure
    .input(
      z.object({
        videoId: z.string(),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ input }) => {
      const { videoId, limit } = input;
      const supabase = await createClient();

      try {
        // Find the relevant meeting bot
        const { data: meetingBotV1 } = await supabase
          .from("meeting_bots")
          .select("id")
          .eq("api_video_id", videoId)
          .order("created_at", { ascending: false })
          .limit(1);

        let botId = meetingBotV1?.[0]?.id;
        let isV1 = !!botId;

        if (!botId) {
          const { data: meetingBotV2 } = await supabase
            .from("meeting_bots_v2")
            .select("id")
            .eq("api_video_id", videoId)
            .order("created_at", { ascending: false })
            .limit(1);

          botId = meetingBotV2?.[0]?.id;
          isV1 = false;
        }

        if (!botId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Unable to find transcript for video",
          });
        }

        // Get basic transcript content with simplified word data
        const { data: slices, error } = await (
          isV1
            ? supabase.from("transcript_slices").select(
                `
                id, 
                index,
                speaker_name,
                words:transcript_words(
                  id,
                  index,
                  start_time,
                  end_time,
                  content
                )
                `,
              )
            : supabase.from("transcript_slices_v2").select(
                `
                id, 
                index,
                speaker_name,
                words:transcript_words_v2(
                  id,
                  index,
                  start_time,
                  end_time,
                  content
                )
                `,
              )
        )
          .eq("bot_id", botId)
          .order("index")
          .limit(limit);

        if (error) throw error;

        return {
          slices: slices || [],
          isComplete: (slices || []).length < limit,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get minimal transcript: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),
});
