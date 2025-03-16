import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import { type ProcessingContext, runProcessing } from "~/lib/processing/steps";
import { slack } from "~/lib/slack";
import { __dangerouslyCreateAdminClient__ } from "~/lib/supabase/admin";

// Define the schema for the task
const RunMeetingProcessingSchema = z.object({
  video_api_id: z.string(),
});

export const runMeetingProcessing = schemaTask({
  id: "run-meeting-processing",
  schema: RunMeetingProcessingSchema,
  maxDuration: 60 * 15, // 15 minutes
  run: async (payload, { ctx }) => {
    logger.info("🔄 Starting meeting processing", {
      video_api_id: payload.video_api_id,
      jobId: ctx.run?.id,
    });

    await logger.trace("Meeting processing task", async (span) => {
      span.setAttribute("video_api_id", payload.video_api_id);
      span.setAttribute("task_id", "run-meeting-processing");
      span.setAttribute("run_id", ctx.run?.id || "unknown");

      await slack.send({
        text: `🔄 Starting meeting processing for video ${payload.video_api_id}`,
      });

      try {
        // Create processing context with logger
        const processingContext = {
          ...ctx,
          logger,
        } satisfies ProcessingContext;

        const startTime = performance.now();

        await logger.trace(
          "Run processing operation",
          async (processingSpan) => {
            processingSpan.setAttribute("video_api_id", payload.video_api_id);

            await runProcessing(
              { video_api_id: payload.video_api_id },
              processingContext,
            );
          },
        );

        const duration = performance.now() - startTime;

        logger.info("✅ Processing completed successfully", {
          video_api_id: payload.video_api_id,
          durationMs: Math.round(duration),
          timestamp: new Date().toISOString(),
        });

        await slack.send({
          text: `✅ Meeting processing completed for video ${payload.video_api_id} in ${Math.round(duration)}ms`,
        });

        return {
          success: true,
          video_api_id: payload.video_api_id,
          processingCompleted: true,
          processingDuration: Math.round(duration),
        };
      } catch (error) {
        logger.error("❌ Error in meeting processing", {
          video_api_id: payload.video_api_id,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        });

        await slack.send({
          text: `❌ Meeting processing failed for video ${payload.video_api_id}: ${error instanceof Error ? error.message : String(error)}`,
        });

        throw error;
      }
    });
  },
});
