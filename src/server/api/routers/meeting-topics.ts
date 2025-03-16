import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Tables } from "~/lib/supabase/database.types";
import { createClient } from "~/lib/supabase/server";
import { createTRPCRouter, publicProcedure } from "../trpc";

export type MeetingTopicWithSegments = Tables<"meeting_topics">;

export const meetingTopicsRouter = createTRPCRouter({
  getByVideoId: publicProcedure
    .input(
      z.object({
        videoId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { data: topics, error } = await supabase
        .from("meeting_topics")
        .select("*")
        .eq("api_video_id", input.videoId)
        .order("vtt_start_segment_id", { ascending: true });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch meeting topics: ${error.message}`,
          cause: error,
        });
      }

      if (topics.length <= 0) {
        return null;
      }

      return topics satisfies MeetingTopicWithSegments[];
    }),

  getBasicTopicsByVideoId: publicProcedure
    .input(
      z.object({
        videoId: z.string(),
        includeSegmentIds: z.boolean().default(false),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      let query = (
        input.includeSegmentIds
          ? supabase
              .from("meeting_topics")
              .select("id, title, summary, vtt_start_segment_id")
          : supabase.from("meeting_topics").select("id, title, summary")
      ).eq("api_video_id", input.videoId);

      if (input.includeSegmentIds) {
        query = query.order("vtt_start_segment_id", { ascending: true });
      }

      const { data: topics, error } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch basic meeting topics: ${error.message}`,
          cause: error,
        });
      }

      if (topics.length <= 0) {
        return null;
      }

      return topics;
    }),

  create: publicProcedure
    .input(
      z.object({
        videoId: z.string(),
        title: z.string().trim(),
        summary: z.string().trim(),
        vttStartSegmentId: z.number().optional(),
        vttEndSegmentId: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { data: topic, error } = await supabase
        .from("meeting_topics")
        .insert({
          api_video_id: input.videoId,
          title: input.title,
          summary: input.summary,
          vtt_start_segment_id: input.vttStartSegmentId ?? null,
          vtt_end_segment_id: input.vttEndSegmentId ?? null,
        })
        .select("*")
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create meeting topic: ${error.message}`,
          cause: error,
        });
      }

      return topic satisfies MeetingTopicWithSegments;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().trim().optional(),
        summary: z.string().trim().optional(),
        vttStartSegmentId: z.number().optional(),
        vttEndSegmentId: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;

      const supabase = await createClient();

      const { error } = await supabase
        .from("meeting_topics")
        .update({
          ...(updates.title && { title: updates.title }),
          ...(updates.summary && { summary: updates.summary }),
          ...(updates.vttStartSegmentId && {
            vtt_start_segment_id: updates.vttStartSegmentId,
          }),
          ...(updates.vttEndSegmentId && {
            vtt_end_segment_id: updates.vttEndSegmentId,
          }),
        })
        .eq("id", id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update meeting topic: ${error.message}`,
          cause: error,
        });
      }

      return true;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { error } = await supabase
        .from("meeting_topics")
        .delete()
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete meeting topic: ${error.message}`,
          cause: error,
        });
      }

      return true;
    }),
});
