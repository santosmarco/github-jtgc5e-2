import { TRPCError } from "@trpc/server";
import type { Except } from "type-fest";
import { z } from "zod";

import {
  fetchMomentByActivity,
  fetchPaginatedMoments,
  fetchVideoMoments,
  transformMoment,
} from "~/lib/db/moments";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import { createClient } from "~/lib/supabase/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const reactionTypeSchema = z.enum(["thumbs_up", "thumbs_down"]);

export const momentsRouter = createTRPCRouter({
  getOneById: publicProcedure
    .input(z.object({ momentId: z.string() }))
    .query(async ({ input }) => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("moments")
        .select("*, subtags:moment_subtags(*)")
        .eq("id", input.momentId);

      if (error) throw error;
      if (!data?.[0]) throw new TRPCError({ code: "NOT_FOUND" });
      return transformMoment(data[0], 0);
    }),

  listByVideo: publicProcedure
    .input(z.object({ videoId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await fetchVideoMoments(input.videoId);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list moments: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  getOne: publicProcedure
    .input(
      z.object({
        videoId: z.string(),
        activity: z.string(),
        sequenceId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const moment = await fetchMomentByActivity(
          input.videoId,
          input.activity,
          input.sequenceId,
        );

        if (!moment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Moment not found",
          });
        }

        return moment;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get moment: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  listAll: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional(),
          cursor: z.number().optional(),
        })
        .default({}),
    )
    .query(async ({ input }) => {
      try {
        return await fetchPaginatedMoments(input);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list all moments: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().min(1).max(100).optional().default(50),
        ids: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      try {
        let query = supabase.from("moments").select("id").eq("latest", true);

        if (input.query) {
          query = query.textSearch(
            "search_vector",
            input.query
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .map((term) => `${term}:*`)
              .join(" & "),
          );
        }

        if (input.ids) {
          query = query.in("id", input.ids);
        }

        const { data, error } = await query;
        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to search moments: ${(error as Error).message}`,
            cause: error,
          });
        }

        return data;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to search moments: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  getReactions: publicProcedure
    .input(z.object({ momentId: z.string() }))
    .query(async ({ input }) => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("moment_reactions")
        .select("*, user:profiles(*)")
        .eq("moment_id", input.momentId);

      if (error)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: error });
      return data;
    }),

  addReaction: publicProcedure
    .input(
      z.object({
        momentId: z.string(),
        type: reactionTypeSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const existingReaction = await supabase
        .from("moment_reactions")
        .select("*")
        .eq("moment_id", input.momentId)
        .eq("user_id", user.id);

      if (existingReaction.data?.[0]?.id) {
        const { error } = await supabase
          .from("moment_reactions")
          .delete()
          .eq("id", existingReaction.data[0].id);

        if (error)
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: error });
      }

      const { error } = await supabase.from("moment_reactions").upsert({
        moment_id: input.momentId,
        user_id: user.id,
        reaction_type: input.type,
      });

      if (error)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: error });
      return { success: true };
    }),

  getComments: publicProcedure
    .input(z.object({ momentId: z.string() }))
    .query(async ({ input }) => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("moment_comments")
        .select("*, user:profiles(*)")
        .eq("moment_id", input.momentId)
        .order("created_at", { ascending: true });

      if (error)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: error });
      return data;
    }),

  addComment: publicProcedure
    .input(
      z.object({
        momentId: z.string(),
        content: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const { error } = await supabase.from("moment_comments").insert({
        moment_id: input.momentId,
        user_id: user.id,
        content: input.content,
      });

      if (error)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: error });
      return { success: true };
    }),

  listForInsights: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        videoId: z.string().optional(),
        topic: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.number().nullish(),
        includeFullDetails: z.boolean().default(false),
      }),
    )
    .query(async ({ input }) => {
      try {
        const { userId, videoId, topic, limit, cursor, includeFullDetails } =
          input;
        const supabase = await createClient();

        // Build query with filters
        let query = (
          includeFullDetails
            ? supabase.from("moments").select("*, subtags:moment_subtags(*)")
            : supabase
                .from("moments")
                .select(
                  "id, activity, activity_type, activity_reasoning, title, summary, segment_start_timestamp_in_seconds, segment_end_timestamp_in_seconds, segment_start_timestamp_in_seconds_ideal, relevant, video_api_id",
                )
        )
          .eq("latest", true)
          .eq("relevant", true);

        // Filter by video if specified
        if (videoId && videoId !== "all") {
          query = query.eq("video_api_id", videoId);
        }

        // Filter by topic if specified and not "Coach"
        if (topic && topic !== "Coach") {
          query = query.eq("activity", topic);
        }

        // Apply pagination
        if (cursor) {
          query = query.range(cursor, cursor + limit - 1);
        } else {
          query = query.limit(limit);
        }

        // Execute query
        const { data, error } = await query;

        if (error) throw error;

        // Transform moments
        const moments = data.map(
          (
            moment,
            idx,
          ): Except<
            VideoMoment,
            | "segment_end_timestamp"
            | "segment_id_sequence_end"
            | "segment_id_sequence_start"
            | "segment_start_timestamp"
          > => {
            // Create a transformation function that handles partial data
            if (includeFullDetails) {
              return transformMoment(moment, idx);
            }

            return {
              id:
                moment.id ?? `${moment.video_api_id}_${moment.activity}_${idx}`,
              index: `${moment.video_api_id}_${moment.activity}_${idx}`,
              sequence_id: idx ?? "",
              title: (moment.title ?? "").replace(/^"|"$/g, ""),
              summary: (moment.summary ?? "").replace(/^"|"$/g, ""),
              segment_start_timestamp_in_seconds:
                moment.segment_start_timestamp_in_seconds ?? 0,
              segment_end_timestamp_in_seconds:
                moment.segment_end_timestamp_in_seconds ?? 0,
              segment_ideal_timestamp_in_seconds:
                moment.segment_start_timestamp_in_seconds_ideal,
              video_id: moment.video_api_id ?? "",
              activity_type: (moment.activity_type ?? "").replace(/_.*$/, ""),
              activity_reasoning: (moment.activity_reasoning ?? "").replace(
                /^"|"$/g,
                "",
              ),
              target_person_reasoning: null,
              activity: (moment.activity ?? "").replace(/_.*$/, ""),
              relevant: moment.relevant,
              reactions: [],
              subtags: [],
            };
          },
        );

        // Only fetch reactions if we need full details
        if (includeFullDetails && moments.length > 0) {
          const momentIds = moments.map((m) => m.id);

          const { data: reactions } = await supabase
            .from("moment_reactions")
            .select("*")
            .in("moment_id", momentIds);

          if (reactions) {
            for (const moment of moments) {
              moment.reactions = reactions.filter(
                (r) => r.moment_id === moment.id,
              );
            }
          }
        }

        return {
          moments,
          nextCursor:
            moments.length === limit ? (cursor ?? 0) + limit : undefined,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list moments for insights: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  listBasicByVideo: protectedProcedure
    .input(
      z.object({
        videoId: z.string(),
        includeReactions: z.boolean().default(false),
        includeNonRelevant: z.boolean().default(false),
      }),
    )
    .query(async ({ input, ctx: { user } }) => {
      try {
        const { videoId, includeReactions, includeNonRelevant } = input;
        const supabase = await createClient();

        // Only fetch essential fields needed for display
        let query = supabase
          .from("moments")
          .select(
            "id, activity, activity_type, activity_reasoning, title, summary, segment_start_timestamp_in_seconds, segment_end_timestamp_in_seconds, segment_start_timestamp_in_seconds_ideal, relevant, video_api_id",
          )
          .eq("video_api_id", videoId)
          .eq("latest", true);

        if (user.role !== "admin" && !includeNonRelevant) {
          query = query.eq("relevant", true);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Transform to minimized moment format
        const moments = data.map(
          (
            moment,
            idx,
          ): Except<
            VideoMoment,
            | "segment_end_timestamp"
            | "segment_id_sequence_end"
            | "segment_id_sequence_start"
            | "segment_start_timestamp"
          > => ({
            id: moment.id,
            index: `${moment.video_api_id}_${moment.activity}_${idx}`,
            sequence_id: idx,
            video_id: moment.video_api_id ?? "",
            activity: (moment.activity ?? "").replace(/_.*$/, ""),
            activity_type: (moment.activity_type ?? "").replace(/_.*$/, ""),
            activity_reasoning: (moment.activity_reasoning ?? "").replace(
              /^"|"$/g,
              "",
            ),
            title: (moment.title ?? "").replace(/^"|"$/g, ""),
            summary: (moment.summary ?? "").replace(/^"|"$/g, ""),
            segment_start_timestamp_in_seconds:
              moment.segment_start_timestamp_in_seconds ?? 0,
            segment_end_timestamp_in_seconds:
              moment.segment_end_timestamp_in_seconds ?? 0,
            segment_ideal_timestamp_in_seconds:
              moment.segment_start_timestamp_in_seconds_ideal ?? 0,
            relevant: moment.relevant,
            reactions: [],
            subtags: [],
          }),
        );

        // Optionally include reactions
        if (includeReactions && moments.length > 0) {
          const momentIds = moments.map((m) => m.id);
          const { data: reactions } = await supabase
            .from("moment_reactions")
            .select("*")
            .in("moment_id", momentIds);

          if (reactions) {
            for (const moment of moments) {
              moment.reactions = reactions.filter(
                (r) => r.moment_id === moment.id,
              );
            }
          }
        }

        return moments;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list basic moments: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),
});
