import { type NextRequest, NextResponse } from "next/server";
import { processMeetingBot } from "~/jobs/process-meeting-bot";

import { logger } from "~/lib/logging/server";
import { MeetingBotsWebhookRequest } from "~/lib/meeting-bots/schemas";
import { slack } from "~/lib/slack";

export const dynamic = "force-static";

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
        await processMeetingBot.trigger(parsedBody);
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
