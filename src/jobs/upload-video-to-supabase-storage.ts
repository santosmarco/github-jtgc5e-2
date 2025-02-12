import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { isAxiosError } from "axios";
import { z } from "zod";

import { slack } from "~/lib/slack";
import { createClient } from "~/lib/supabase/client";

export const uploadVideoToSupabaseStorage = schemaTask({
  id: "upload-video-to-supabase-storage",
  schema: z.object({
    botId: z.string(),
    provider: z.enum(["recall", "meeting_baas"]),
    videoUrl: z.string(),
    fileName: z.string(),
  }),
  maxDuration: 60 * 10, // 10 minutes
  machine: { preset: "medium-1x" },
  run: async (payload) => {
    logger.info("🎥 Starting video upload to Supabase storage", {
      bot_id: payload.botId,
      video_url: payload.videoUrl,
      file_name: payload.fileName,
      provider: payload.provider,
    });

    const supabase = createClient();

    try {
      await slack.send({
        text: `🎥 Starting video upload to Supabase storage for bot ${payload.botId}`,
      });

      logger.info("📥 Fetching video from source URL", {
        bot_id: payload.botId,
        video_url: payload.videoUrl,
      });

      const response = await fetch(payload.videoUrl);

      logger.info("📡 Received response from video source", {
        bot_id: payload.botId,
        video_url: payload.videoUrl,
        status: response.status,
        content_type: response.headers.get("content-type"),
        content_length: response.headers.get("content-length"),
        response_ok: response.ok,
      });

      if (response.status < 200 || response.status >= 300) {
        logger.error("❌ Failed to fetch video - Invalid response status", {
          bot_id: payload.botId,
          video_url: payload.videoUrl,
          status: response.status,
          status_text: response.statusText,
        });
        throw new Error(
          `Failed to fetch video from source: ${response.status} ${response.statusText}`,
        );
      }

      const blob = await response.blob();

      logger.info("💾 Preparing to upload video blob", {
        bot_id: payload.botId,
        video_url: payload.videoUrl,
        file_name: payload.fileName,
        blob_size: blob.size,
        blob_type: blob.type,
        content_type: "video/mp4",
        provider: payload.provider,
      });

      logger.info("📤 Initiating storage upload", {
        bot_id: payload.botId,
        file_name: payload.fileName,
        storage_bucket: "meetings",
        content_type: "video/mp4",
      });

      const { error } = await supabase.storage
        .from("meetings")
        .upload(payload.fileName, blob, {
          contentType: "video/mp4",
          upsert: true,
          metadata: {
            meeting_bot_id: payload.botId,
            video_url: payload.videoUrl,
            provider: payload.provider,
            upload_timestamp: new Date().toISOString(),
          },
        });

      if (error) {
        logger.error("❌ Storage upload failed", {
          bot_id: payload.botId,
          file_name: payload.fileName,
        });
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("meetings").getPublicUrl(payload.fileName);

      logger.info("✅ Successfully uploaded video to storage", {
        bot_id: payload.botId,
        video_url: payload.videoUrl,
        file_name: payload.fileName,
        public_url: publicUrl,
        blob_size: blob.size,
        provider: payload.provider,
      });

      await slack.success({
        text: `Successfully uploaded video for bot ${payload.botId} to storage (${(blob.size / 1024 / 1024).toFixed(2)}MB)`,
      });
    } catch (error) {
      let message = (error as Error).message;
      let errorDetails = {};

      if (isAxiosError(error)) {
        message = JSON.stringify(error.response?.data);
        errorDetails = {
          status: error.response?.status,
          status_text: error.response?.statusText,
          response_data: error.response?.data,
        };
      }

      logger.error("❌ Failed to upload video to storage", {
        error,
        bot_id: payload.botId,
        video_url: payload.videoUrl,
        file_name: payload.fileName,
        provider: payload.provider,
        ...errorDetails,
      });

      await slack.error({
        text: `Failed to upload video for bot ${payload.botId} to storage: ${message}`,
      });
    }
  },
});
