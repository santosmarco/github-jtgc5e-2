import { type NextRequest, NextResponse } from "next/server";
import { processMeetingBot } from "~/jobs/process-meeting-bot";

import { syncCalendars } from "~/jobs/sync-calendars";
import { logger } from "~/lib/logging/server";
import {
  CalendarSyncEventQuery,
  MeetingBotsWebhookRequest,
} from "~/lib/meeting-bots/schemas";
import { slack } from "~/lib/slack";

export const maxDuration = 800;

export async function POST(request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });

  const processWebhook = async () => {
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

        try {
          await processMeetingBot.trigger(parsedBody, {
            tags: [
              `event:${parsedBody.event}`,
              `status:${parsedBody.data.status.code}`,
              `bot_id:${parsedBody.data.bot_id}`,
              "provider:recall",
            ],
          });
        } catch (triggerError) {
          logger.error("❌ Failed to trigger meeting bot processing", {
            error: triggerError,
            bot_id: parsedBody.data.bot_id,
          });
        }
      } else if (parsedBody.event === "calendar.sync_events") {
        const query = CalendarSyncEventQuery.catch({
          full: "false",
        }).parse(Object.fromEntries(request.nextUrl.searchParams.entries()));

        logger.info("📅 Processing calendar sync event", {
          calendar_id: parsedBody.data.calendar_id,
          last_updated: parsedBody.data.last_updated_ts,
          query,
        });

        try {
          await syncCalendars.trigger(
            { ...parsedBody, ...query },
            {
              tags: [
                `event:${parsedBody.event}`,
                `calendar_id:${parsedBody.data.calendar_id}`,
                `last_updated:${parsedBody.data.last_updated_ts}`,
              ],
            },
          );
        } catch (syncError) {
          logger.error("❌ Failed to trigger calendar sync", {
            error: syncError,
            calendar_id: parsedBody.data.calendar_id,
          });
        }
      }

      logger.info("✨ Successfully processed webhook", {
        event: parsedBody.event,
      });

      try {
        await slack.success({
          text: `Successfully processed ${parsedBody.event} webhook`,
        });
      } catch (slackError) {
        logger.error("❌ Failed to send success notification to Slack", {
          error: slackError,
        });
      }
    } catch (error) {
      logger.error("❌ Failed to process webhook", {
        error,
        url: request.url,
      });

      try {
        await slack.error({
          text: `Failed to process webhook: ${(error as Error).message}`,
        });
      } catch (slackError) {
        logger.error("❌ Failed to send error notification to Slack", {
          original_error: error,
          slack_error: slackError,
        });
      }
    }
  };

  await processWebhook().catch((error) => {
    logger.error("❌ Unhandled error in webhook processing", {
      error,
    });
  });

  return response;
}
