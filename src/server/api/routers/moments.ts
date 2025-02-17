import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  fetchMomentByActivity,
  fetchPaginatedMoments,
  fetchVideoMoments,
  transformMoment,
} from "~/lib/db/moments";
import { createClient } from "~/lib/supabase/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
});
