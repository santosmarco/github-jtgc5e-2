import { logger, schemaTask } from "@trigger.dev/sdk/v3";

import { meetingBaas } from "~/lib/meeting-baas/client";
import { createBotStatusChangeService } from "~/lib/meeting-bots/bot-status-change/service";
import { ProviderAgnosticBotStatusChangeEvent } from "~/lib/meeting-bots/schemas";
import type { MeetingBotsServiceDependencies } from "~/lib/meeting-bots/types";
import { createClient as createRecallClient } from "~/lib/recall/client";
import { slack } from "~/lib/slack";
import { __dangerouslyCreateAdminClient__ } from "~/lib/supabase/admin";
import { apiVideo } from "~/server/api/services/api-video";

export const processMeetingBot = schemaTask({
  id: "process-meeting-bot",
  schema: ProviderAgnosticBotStatusChangeEvent,
  maxDuration: 60 * 10, // 10 minutes
  run: async (payload) => {
    const deps = {
      supabase: await __dangerouslyCreateAdminClient__(),
      meetingBaas: meetingBaas,
      recall: createRecallClient(),
      apiVideo: apiVideo,
      logger: logger,
      slack: slack,
    } satisfies MeetingBotsServiceDependencies;

    const { handleBotStatusChange } = createBotStatusChangeService(deps);

    await handleBotStatusChange(payload);
  },
});
