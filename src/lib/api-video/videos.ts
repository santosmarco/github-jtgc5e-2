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

export async function getVideo(
  ...args: Parameters<typeof apiVideo.videos.get>
) {
  const video = await apiVideo.videos.get(...args);
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
