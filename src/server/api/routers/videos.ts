import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { deleteMeeting } from "~/lib/api/meetings";
import {
  getAppropriateVideoSource,
  getVideo,
  listVideos,
} from "~/lib/api-video/videos";
import { transformMoment } from "~/lib/db/moments";
import type { Enums } from "~/lib/supabase/database.types";
import { createClient } from "~/lib/supabase/server";
import { fetchWithTimeout } from "~/lib/utils";
import { toVideoOutput } from "~/lib/videos";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import type { AuthContext } from "../types";

export const VideoOptions = z.object({
  user_id: z.string().optional(),
  moments: z
    .object({
      includeDeprecated: z.boolean().default(false),
      includeNonRelevant: z.boolean().default(false),
    })
    .default({}),
});
export type VideoOptions = z.infer<typeof VideoOptions>;

/**
 * Determines which tags to filter videos by based on user role and input
 * @param user - The current user with role information
 * @param inputUserId - Optional user ID from the input
 * @returns Array of tags to filter by or undefined
 */
function determineVideoTags(
  user: AuthContext["user"],
  inputUserId?: string,
): string[] | undefined {
  if (user.is_admin) {
    // Admin users can see all videos or filter by specific user
    return inputUserId ? [inputUserId] : undefined;
  }

  if (user.is_coach) {
    // Coaches can see their own videos or their patients' videos
    if (inputUserId) {
      const isPatient =
        user.patients.some((p) => p.id === inputUserId) ?? false;
      return isPatient ? [inputUserId] : [];
    }

    return [user.id];
  }

  // Regular users can only see their own videos
  return [user.id];
}

/**
 * Retrieves the video source URL with fallback mechanisms
 * @param videoId - The API video identifier
 * @returns The resolved video source URL
 */
async function getVideoSourceUrl(videoId: string): Promise<string> {
  const defaultUrl = `https://vod.api.video/vod/${videoId}/mp4/source.mp4`;

  try {
    try {
      // First try the default API.video URL with HEAD request
      // This avoids burning one-time tokens for private videos
      const videoFetch = await fetchWithTimeout(defaultUrl, {
        method: "HEAD",
        timeout: 15000,
        retries: 3,
      });

      if (videoFetch.status === 200) {
        return defaultUrl;
      }
    } catch (fetchError) {
      console.warn(`HEAD request failed for ${videoId}:`, fetchError);
      // Continue to fallbacks if HEAD request fails
    }

    // Try to get appropriate source for private videos
    // This comes before database checks to handle private videos properly
    const appropriateSource = await getAppropriateVideoSource(videoId);
    if (appropriateSource) {
      return appropriateSource;
    }

    // If no appropriate source found, check database for stored URLs
    const supabase = await createClient();

    // First fallback: check meeting_bots table
    const { data: meetingBots } = await supabase
      .from("meeting_bots")
      .select("mp4_source_url")
      .eq("api_video_id", videoId)
      .not("mp4_source_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (meetingBots?.[0]?.mp4_source_url) {
      return meetingBots[0].mp4_source_url;
    }

    // Second fallback: check meeting_bots_v2 table
    const { data: meetingBotsV2 } = await supabase
      .from("meeting_bots_v2")
      .select("mp4_source_url")
      .eq("api_video_id", videoId)
      .not("mp4_source_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (meetingBotsV2?.[0]?.mp4_source_url) {
      return meetingBotsV2[0].mp4_source_url;
    }

    // Return default URL if no alternatives found
    return defaultUrl;
  } catch (error) {
    console.error(`Error resolving video source for ${videoId}:`, error);
    return defaultUrl; // Return default URL on error
  }
}

/**
 * Fetches comprehensive video data including moments, reactions, and source URL
 */
async function fetchVideoData(
  videoId: string,
  userRole: Enums<"user_role_enum">,
  videoOptions: VideoOptions | undefined,
) {
  try {
    const supabase = await createClient();

    // Build moments query with appropriate filters
    let momentsQuery = supabase
      .from("moments")
      .select("*, subtags:moment_subtags(*)")
      .eq("video_api_id", videoId);

    if (userRole !== "admin" && !videoOptions?.moments.includeDeprecated) {
      momentsQuery = momentsQuery.eq("latest", true);
    }
    if (userRole !== "admin" && !videoOptions?.moments.includeNonRelevant) {
      momentsQuery = momentsQuery.eq("relevant", true);
    }

    // Fetch meeting and moments data in parallel
    const [meetingResult, momentsResult, videoSrc] = await Promise.all([
      supabase
        .from("meetings")
        .select(
          "*, action_items:meeting_action_items(*), topics_discussed:meeting_topics(*)",
        )
        .eq("video_api_id", videoId),
      momentsQuery,
      getVideoSourceUrl(videoId),
    ]);

    if (meetingResult.error) throw meetingResult.error;
    if (momentsResult.error) throw momentsResult.error;

    // Fetch reactions for all moments
    const momentIds = momentsResult.data?.map((m) => m.id) ?? [];
    const momentReactionsResult =
      momentIds.length > 0
        ? await supabase
            .from("moment_reactions")
            .select("*")
            .in("moment_id", momentIds)
        : { data: [], error: null };

    if (momentReactionsResult.error) throw momentReactionsResult.error;

    // Transform moments and attach their reactions
    const transformedMoments = momentsResult.data
      .map(transformMoment)
      .map((m) => ({
        ...m,
        reactions: momentReactionsResult.data?.filter(
          (r) => r.moment_id === m.id,
        ),
      }));

    return {
      videoSrc,
      meeting: meetingResult.data?.[0],
      summary: (meetingResult.data?.[0]?.summary ?? "").replace(/^"|"$/g, ""),
      moments: transformedMoments,
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to fetch video data: ${(error as Error).message}`,
      cause: error,
    });
  }
}

export const videosRouter = createTRPCRouter({
  listAll: protectedProcedure
    .input(VideoOptions.optional())
    .query(async ({ input, ctx: { user } }) => {
      const PAGE_SIZE = 100;
      const allVideos: Awaited<
        ReturnType<
          typeof toVideoOutput<Awaited<ReturnType<typeof listVideos>>[number]>
        >
      >[] = [];
      let currentPage = 1;
      let hasMore = true;

      // Determine which tags to filter by based on user role and input
      const tags = determineVideoTags(user, input?.user_id);

      while (hasMore) {
        const videos = await listVideos({
          pageSize: PAGE_SIZE,
          currentPage,
          sortBy: "createdAt",
          sortOrder: "desc",
          tags,
        });

        const pageVideos = await Promise.all(
          videos.map(async (video) =>
            toVideoOutput(
              video,
              await fetchVideoData(video.videoId, user.role, input),
            ),
          ),
        );

        allVideos.push(...pageVideos);

        // If we got less videos than the page size, we've reached the end
        hasMore = videos.length === PAGE_SIZE;
        currentPage++;
      }

      return allVideos;
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          cursor: z.number().nullish(),
          limit: z.number().min(1).max(100).default(50),
          options: VideoOptions.optional(),
        })
        .default({}),
    )
    .query(async ({ input, ctx: { user } }) => {
      try {
        const { cursor, limit, options } = input;

        // Determine which tags to filter by based on user role and input
        const tags = determineVideoTags(user, options?.user_id);

        const videos = await listVideos({
          pageSize: limit,
          currentPage: cursor ? Math.floor(cursor / limit) + 1 : 1,
          sortBy: "createdAt",
          sortOrder: "desc",
          tags,
        });

        const enrichedVideos = await Promise.all(
          videos.map(async (video) =>
            toVideoOutput(
              video,
              await fetchVideoData(video.videoId, user.role, options),
            ),
          ),
        );

        const nextCursor =
          enrichedVideos.length === limit ? (cursor ?? 0) + limit : undefined;

        return {
          videos: enrichedVideos,
          nextCursor,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list videos: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  listForInsights: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(100).default(36),
        cursor: z.number().nullish(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const { userId, limit, cursor } = input;
        const supabase = await createClient();

        // Fetch videos without full enrichment
        const videos = await listVideos({
          pageSize: limit,
          currentPage: cursor ? Math.floor(cursor / limit) + 1 : 1,
          sortBy: "createdAt",
          sortOrder: "desc",
          tags: [userId],
        });

        // Get minimal video data for performance
        const lightVideos = await Promise.all(
          videos.map(async (video) => {
            // Fetch meeting data, activities, and video source in parallel
            const [meetingResult, activitiesResult, videoSrc] =
              await Promise.all([
                supabase
                  .from("meetings")
                  .select("summary")
                  .eq("video_api_id", video.videoId)
                  .maybeSingle(),
                supabase
                  .from("moments")
                  .select("activity")
                  .eq("video_api_id", video.videoId)
                  .eq("latest", true)
                  .eq("relevant", true),
                getVideoSourceUrl(video.videoId),
              ]);

            if (meetingResult.error) throw meetingResult.error;
            if (activitiesResult.error) throw activitiesResult.error;

            // Extract unique topics
            const topics = Array.from(
              new Set(activitiesResult.data?.map((m) => m.activity) ?? []),
            );

            // Create a lighter version of the video object
            return {
              ...video,
              videoSrc,
              summary: (meetingResult.data?.summary ?? "").replace(
                /^"|"$/g,
                "",
              ),
              topics,
            };
          }),
        );

        const nextCursor =
          lightVideos.length === limit ? (cursor ?? 0) + limit : undefined;

        return {
          videos: lightVideos,
          nextCursor,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list videos for insights: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  getOne: protectedProcedure
    .input(
      z.object({
        videoId: z.string(),
        options: VideoOptions.optional(),
      }),
    )
    .query(async ({ input, ctx: { user } }) => {
      try {
        const video = await getVideo(input.videoId);
        return toVideoOutput(
          video,
          await fetchVideoData(video.videoId, user.role, input.options),
        );
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get video: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  getBasicInfo: publicProcedure
    .input(
      z.object({
        videoId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const video = await getVideo(input.videoId);
        const supabase = await createClient();

        // Fetch essential metadata and video source in parallel
        const [meetingData, videoSrc] = await Promise.all([
          supabase
            .from("meetings")
            .select("summary, clean_vtt_file")
            .eq("video_api_id", input.videoId)
            .maybeSingle(),
          getVideoSourceUrl(input.videoId),
        ]);

        if (meetingData.error) throw meetingData.error;

        return {
          ...video,
          videoSrc,
          summary: (meetingData.data?.summary ?? "").replace(/^"|"$/g, ""),
          vtt: meetingData.data?.clean_vtt_file ?? "",
          // No moments included
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get video basic info: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  getFromApiVideo: publicProcedure
    .input(
      z.object({
        videoId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const video = await getVideo(input.videoId);
        const videoSrc = await getVideoSourceUrl(input.videoId);

        return {
          ...video,
          videoSrc,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get video from API: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  deleteMeeting: publicProcedure
    .input(z.object({ meetingId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const { meetingId } = input;
        return await deleteMeeting({ videoId: meetingId });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete meeting: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),
});
