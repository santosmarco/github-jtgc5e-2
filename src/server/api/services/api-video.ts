import ApiVideoClient from "@api.video/nodejs-client";

import { env } from "~/env";

export const apiVideo = new ApiVideoClient({
  apiKey: env.API_VIDEO_API_KEY,
  baseUri: env.API_VIDEO_BASE_URI,
});
