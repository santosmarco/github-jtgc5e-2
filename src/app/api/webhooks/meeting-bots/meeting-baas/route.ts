import { type NextRequest, NextResponse } from "next/server";
import { processMeetingBot } from "~/jobs/process-meeting-bot";

import { logger } from "~/lib/logging/server";
import { MeetingBotsWebhookRequest } from "~/lib/meeting-bots/schemas";
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

        try {
          // Determine status tag based on payload data
          let statusTag = "status:unknown";
          if ("status" in parsedBody.data) {
            statusTag = `status:${parsedBody.data.status.code}`;
          } else if ("error" in parsedBody.data) {
            statusTag = "status:fatal";
          } else {
            statusTag = "status:done";
          }

          await processMeetingBot.trigger(parsedBody, {
            tags: [
              "event:bot.status_change",
              statusTag,
              `bot_id:${parsedBody.data.bot_id}`,
              "provider:meeting_baas",
            ],
          });
        } catch (triggerError) {
          logger.error("❌ Failed to trigger meeting bot processing", {
            error: triggerError,
            bot_id:
              "bot_id" in parsedBody.data ? parsedBody.data.bot_id : undefined,
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
