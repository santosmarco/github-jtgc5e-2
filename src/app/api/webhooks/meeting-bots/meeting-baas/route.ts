import { type NextRequest, NextResponse } from "next/server";

import { logger } from "~/lib/logging/server";
import { meetingBaas } from "~/lib/meeting-baas/client";
import { createBotStatusChangeService } from "~/lib/meeting-bots/bot-status-change/service";
import { MeetingBotsWebhookRequest } from "~/lib/meeting-bots/schemas";
import type { MeetingBotsServiceDependencies } from "~/lib/meeting-bots/types";
import { createClient as createRecallClient } from "~/lib/recall/client";
import { slack } from "~/lib/slack";
import { createClient as createSupabaseClient } from "~/lib/supabase/server";
import { apiVideo } from "~/server/api/services/api-video";

export async function POST(request: NextRequest) {
  async function run() {
    try {
      const body = await request.json();

      logger.info("📥 Received webhook request", {
        url: request.url,
        method: request.method,
        body,
      });

      const bodyParseResult = MeetingBotsWebhookRequest.safeParse(body);

      if (!bodyParseResult.success) {
        logger.warn("⚠️ Invalid webhook payload", {
          validation_errors: bodyParseResult.error.errors,
          body,
        });
        return;
      }

      const parsedBody = bodyParseResult.data;

      logger.info("✅ Validated webhook payload", {
        event: parsedBody.event,
        bot_id:
          "bot_id" in parsedBody.data ? parsedBody.data.bot_id : undefined,
        calendar_id:
          "calendar_id" in parsedBody.data
            ? parsedBody.data.calendar_id
            : undefined,
      });

      const deps = {
        supabase: await createSupabaseClient(),
        meetingBaas: meetingBaas,
        recall: createRecallClient(),
        apiVideo: apiVideo,
        logger: logger,
        slack: slack,
      } satisfies MeetingBotsServiceDependencies;

      const { handleBotStatusChange } = createBotStatusChangeService(deps);

      if (
        parsedBody.event === "bot.status_change" ||
        parsedBody.event === "complete" ||
        parsedBody.event === "failed"
      ) {
        logger.info("🤖 Processing bot status change event", {
          bot_id: parsedBody.data.bot_id,
          ...("status" in parsedBody.data && {
            status: parsedBody.data.status,
          }),
        });
        await handleBotStatusChange(parsedBody);
      }

      logger.info("✨ Successfully processed webhook", {
        event: parsedBody.event,
      });

      await slack.success({
        text: `Successfully processed ${parsedBody.event} webhook`,
      });
    } catch (error) {
      logger.error("❌ Failed to process webhook", {
        error,
        url: request.url,
      });

      await slack.error({
        text: `Failed to process webhook: ${(error as Error).message}`,
      });
    }
  }

  void run();

  return new NextResponse(null, { status: 200 });
}
