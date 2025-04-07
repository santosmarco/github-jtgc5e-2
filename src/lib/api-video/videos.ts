"server-only";

import ApiVideoClient from "@api.video/nodejs-client";
import axios from "axios";
import { cache } from "react";
import { z } from "zod";

import { env } from "~/env";
import { Video, VideoWithDetails } from "~/lib/schemas/video";

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
