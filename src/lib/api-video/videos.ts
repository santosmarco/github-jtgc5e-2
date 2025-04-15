"server-only";

import ApiVideoClient from "@api.video/nodejs-client";
import axios from "axios";
import { cache } from "react";
import { z } from "zod";
import { env } from "~/env";
import { Video, VideoWithDetails } from "~/lib/schemas/video";
import { fetchWithTimeout } from "~/lib/utils";
import { createClient } from "~/lib/supabase/server";

const apiVideo = new ApiVideoClient({
  apiKey: env.API_VIDEO_API_KEY,
  baseUri: env.API_VIDEO_BASE_URI,
});

async function _listVideos(...args: Parameters<typeof apiVideo.videos.list>) {
  const { data } = await apiVideo.videos.list(...args);
  const videosWithDetails = await Promise.all(
    data.map(async (video) => {
      const details = await apiVideo.videos.getStatus(video.videoId);
      return { ...video, details };
    }),
  );
  return videosWithDetails.map((video) => VideoWithDetails.parse(video));
}

export const listVideos = cache(_listVideos);

/**
 * Extracts token from api.video URL
 * Works with both embedded and HLS formats
 */
function extractTokenFromUrl(url: string): string | null {
  // For embedded format: ?token=xyz
  const queryMatch = /[?&]token=([^&]+)/.exec(url);
  if (queryMatch?.[1]) return queryMatch[1];

  // For HLS format: /token/xyz/
  const pathMatch = /\/token\/([^/]+)\//.exec(url);
  if (pathMatch?.[1]) return pathMatch[1];

  return null;
}

/**
 * Always fetches a fresh video with new token from api.video
 * This ensures we always have a valid token for private videos
 */
export async function getVideoWithFreshToken(
  ...args: Parameters<typeof apiVideo.videos.get>
) {
  const video = await apiVideo.videos.get(...args);

  if (!video._public && video.assets?.mp4) {
    // For private videos, extract and validate token
    const token = extractTokenFromUrl(video.assets.mp4);
    if (!token) {
      throw new Error("No token found in private video URL");
    }
  }

  return video;
}

/**
 * Gets the appropriate video source URL based on video privacy
 * For private videos, ensures we have a fresh token
 */
export async function getAppropriateVideoSource(videoId: string) {
  const video = await getVideo(videoId);

  // For private videos, use the token-embedded MP4 URL
  if (!video._public) {
    return video.assets?.mp4 ?? null;
  }

  // For public videos, use the standard URL format
  return `https://vod.api.video/vod/${videoId}/mp4/source.mp4`;
}

// Update the existing getVideo function to use fresh tokens for private videos
export async function getVideo(
  ...args: Parameters<typeof apiVideo.videos.get>
) {
  const video = await getVideoWithFreshToken(...args);
  return Video.parse(video);
}

export async function getVTT(
  ...args: Parameters<typeof apiVideo.captions.get>
) {
  const caption = await apiVideo.captions.get(...args);
  const res = caption.src
    ? await axios.get(caption.src, { responseType: "text" })
    : null;
  return { ...caption, content: z.string().parse(res?.data) };
}

export async function getVideoSourceUrl(videoId: string): Promise<string> {
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
