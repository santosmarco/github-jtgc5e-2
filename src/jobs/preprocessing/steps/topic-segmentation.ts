import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { TopicSegmentationService } from "~/lib/backend/services/topic-segmentation/topic-segmentation.service";
import type { MeetingBotWithProfileAndEventAndCalendarAndTranscript } from "~/lib/meeting-bots/bot-status-change/service";
import { createClient } from "~/lib/supabase/client";

export const TopicSegmentationInput =
  z.custom<MeetingBotWithProfileAndEventAndCalendarAndTranscript>();
export type TopicSegmentationInput = z.infer<typeof TopicSegmentationInput>;

export const topicSegmentation = schemaTask({
  id: "topic-segmentation",
  schema: TopicSegmentationInput,
  maxDuration: 60 * 10, // 10 minutes
  run: async (input, { ctx }) => {
    const supabase = createClient();
    const topicSegmentationService = new TopicSegmentationService(supabase);
    await topicSegmentationService.runTopicSegmentation(input, {
      ...ctx,
      logger,
    });
  },
});
