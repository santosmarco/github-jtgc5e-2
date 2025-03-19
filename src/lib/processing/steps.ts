import type { Context } from "@trigger.dev/sdk/v3";
import { logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";

import { createClient } from "../supabase/client";
import { runEntityExtraction } from "./entity-extraction";
import type { TopicSegmentationOutput } from "./topic-segmentation";
import { runTopicSegmentation } from "./topic-segmentation";
import { runMomentIdentification } from "./moment-identification";

export const ProcessingStepId = z.enum([
  "topic-segmentation",
  "entity-extraction",
  "moment-identification",
]);
export type ProcessingStepId = z.infer<typeof ProcessingStepId>;

export type ProcessingContext = Context & { logger: typeof logger };

type ProcessingStepResult = void | TopicSegmentationOutput;

export type ProcessingStepFn = (
  { video_api_id }: { video_api_id: string },
  ctx: ProcessingContext,
) => Promise<ProcessingStepResult>;

const processingSteps = {
  "topic-segmentation": runTopicSegmentation,
  "entity-extraction": runEntityExtraction,
  "moment-identification": runMomentIdentification,
} as const satisfies Record<ProcessingStepId, ProcessingStepFn>;

export async function getCurrentProcessingStep({
  video_api_id,
}: {
  video_api_id: string;
}): Promise<ProcessingStepId | null> {
  const supabase = createClient();
  logger.info("🔎 Determining current processing step", { video_api_id });

  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("*")
    .eq("video_api_id", video_api_id)
    .single();

  if (meetingError) {
    logger.error("❌ Failed to fetch meeting data for processing", {
      video_api_id,
      error: meetingError,
    });
    throw meetingError;
  }

  logger.info("📋 Checking for existing meeting topics", {
    video_api_id,
  });

  const { data: meetingTopics, error: meetingTopicsError } = await supabase
    .from("meeting_topics_v2")
    .select("*")
    .eq("api_video_id", meeting.video_api_id)
    .eq("latest", true)
    .limit(1);

  if (meetingTopicsError) {
    logger.error("❌ Failed to fetch meeting topics", {
      video_api_id,
      error: meetingTopicsError,
    });
    throw meetingTopicsError;
  }

  if (!meetingTopics?.length) {
    logger.info(
      "📊 No existing topics found, starting with topic segmentation",
      {
        video_api_id,
      },
    );
    return "topic-segmentation";
  }

  logger.info("📋 Checking for existing entity extraction", {
    video_api_id,
  });

  const { data: meetingEntities, error: meetingEntitiesError } = await supabase
    .from("meeting_entities_v2")
    .select("*")
    .eq("api_video_id", meeting.video_api_id)
    .limit(1);

  if (meetingEntitiesError) {
    logger.error("❌ Failed to fetch meeting entities", {
      video_api_id,
      error: meetingEntitiesError,
    });
    throw meetingEntitiesError;
  }

  if (!meetingEntities?.length) {
    logger.info(
      "🔍 Topics found but no entities, proceeding with entity extraction",
      {
        video_api_id,
      },
    );
    return "entity-extraction";
  }

  const { data: v2Moments, error: v2MomentsError } = await supabase
    .from("moments")
    .select("*")
    .eq("video_api_id", meeting.video_api_id)
    .eq("latest", true)
    .eq("version", 2);

  if (v2MomentsError) {
    logger.error("❌ Failed to fetch v2 moments", {
      video_api_id,
      error: v2MomentsError,
    });
    throw v2MomentsError;
  }

  if (!v2Moments?.length) {
    logger.info(
      "🔍 Topics and entities found but no moments, proceeding with moment identification",
      {
        video_api_id,
      },
    );
    return "moment-identification";
  }

  logger.info(
    "✅ Meeting already has topics, entities, and moments, no processing needed",
    {
      video_api_id,
      topic_count: meetingTopics.length,
      entity_count: meetingEntities.length,
      moment_count: v2Moments.length,
    },
  );

  return null;
}

export async function runStep(
  { video_api_id }: { video_api_id: string },
  step: ProcessingStepId,
  ctx: ProcessingContext,
): Promise<void> {
  const stepFunction = processingSteps[step];
  logger.info(`🔄 Running processing step: ${step}`, {
    video_api_id,
    step,
    timestamp: new Date().toISOString(),
  });

  const startTime = performance.now();
  try {
    await stepFunction({ video_api_id }, ctx);
    const duration = performance.now() - startTime;

    logger.info(`✅ Completed processing step: ${step}`, {
      video_api_id,
      step,
      durationMs: Math.round(duration),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = performance.now() - startTime;
    logger.error(`❌ Failed processing step: ${step}`, {
      video_api_id,
      step,
      durationMs: Math.round(duration),
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

export async function runFromStep(
  { video_api_id }: { video_api_id: string },
  startStep: ProcessingStepId,
  ctx: ProcessingContext,
): Promise<void> {
  const steps = Object.values(ProcessingStepId.enum);
  const startIndex = steps.indexOf(startStep);

  if (startIndex === -1) {
    throw new Error(`Invalid starting step: ${startStep}`);
  }

  logger.info("🏁 Starting processing pipeline from specific step", {
    video_api_id,
    startStep,
    remainingSteps: steps.slice(startIndex).join(", "),
    timestamp: new Date().toISOString(),
  });

  for (let i = startIndex; i < steps.length - 1; i++) {
    const currentStep = ProcessingStepId.parse(steps[i]);
    logger.info(`⏭️ Moving to step ${i + 1}/${steps.length}: ${currentStep}`, {
      video_api_id,
      currentStep,
      stepNumber: i + 1,
      totalSteps: steps.length,
    });
    await runStep({ video_api_id }, currentStep, ctx);
  }

  logger.info("🎉 Completed all processing steps successfully", {
    video_api_id,
    stepsCompleted: steps.slice(startIndex).length,
    timestamp: new Date().toISOString(),
  });
}

export async function runProcessing(
  { video_api_id }: { video_api_id: string },
  ctx: ProcessingContext,
): Promise<void> {
  try {
    logger.info("🚀 Starting processing pipeline execution", {
      video_api_id,
      timestamp: new Date().toISOString(),
    });

    const currentStep = await getCurrentProcessingStep({ video_api_id });

    if (currentStep) {
      logger.info("🔍 Identified current processing step", {
        video_api_id,
        currentStep,
        timestamp: new Date().toISOString(),
      });
      await runFromStep({ video_api_id }, currentStep, ctx);
    } else {
      ctx.logger.info("⏹️ No processing step identified for video", {
        video_api_id,
        status: "COMPLETE_OR_UNKNOWN",
        timestamp: new Date().toISOString(),
      });
    }

    logger.info("✅ Processing pipeline execution completed", {
      video_api_id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    ctx.logger.error("❌ Error running processing pipeline", {
      video_api_id,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : "UnknownError",
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}
