import { type NextRequest, NextResponse } from "next/server";
import { processMeetingBot } from "~/jobs/process-meeting-bot";

import { syncCalendars } from "~/jobs/sync-calendars";
import { logger } from "~/lib/logging/server";
import {
  CalendarSyncEventQuery,
  MeetingBotsWebhookRequest,
} from "~/lib/meeting-bots/schemas";
import { slack } from "~/lib/slack";

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

      if (parsedBody.event === "bot.status_change") {
        logger.info("🤖 Processing bot status change event", {
          bot_id: parsedBody.data.bot_id,
          status: parsedBody.data.status,
        });
        await processMeetingBot.trigger(parsedBody);
      } else if (parsedBody.event === "calendar.sync_events") {
        const query = CalendarSyncEventQuery.catch({
          full: "false",
        }).parse(Object.fromEntries(request.nextUrl.searchParams.entries()));

        logger.info("📅 Processing calendar sync event", {
          calendar_id: parsedBody.data.calendar_id,
          last_updated: parsedBody.data.last_updated_ts,
          query,
        });

        void syncCalendars.trigger({ ...parsedBody, ...query });
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

  await run();

  return new NextResponse(null, { status: 200 });
}
