import { WebClient as SlackWebClient } from "@slack/web-api";
import type { Block, KnownBlock } from "@slack/types";

import { env } from "~/env";

// Initialize Slack Web Client
const slackClient = env.SLACK_BOT_TOKEN
  ? new SlackWebClient(env.SLACK_BOT_TOKEN)
  : null;

const NOTIFICATIONS_CHANNEL = env.SLACK_NOTIFICATIONS_CHANNEL;

type SlackMessage = {
  text: string;
  channel?: string;
  blocks?: (Block | KnownBlock)[];
};

class SlackService {
  private async sendMessage({
    text,
    channel = NOTIFICATIONS_CHANNEL,
    blocks,
  }: SlackMessage) {
    if (!slackClient || env.NODE_ENV !== "production") {
      console.warn(
        "Slack notifications disabled - no SLACK_BOT_TOKEN provided",
      );
      return;
    }

    try {
      await slackClient.chat.postMessage({
        channel,
        text,
        blocks,
        unfurl_links: false,
        unfurl_media: false,
      });
    } catch (error) {
      console.error("Failed to send Slack message:", error);
      // Don't throw - we don't want Slack errors to break the main flow
    }
  }

  async send(message: SlackMessage) {
    return this.sendMessage(message);
  }

  async info({ text, channel, blocks }: SlackMessage) {
    return this.sendMessage({ text: `ℹ️ ${text}`, channel, blocks });
  }

  async success({ text, channel, blocks }: SlackMessage) {
    return this.sendMessage({ text: `✅ ${text}`, channel, blocks });
  }

  async warn({ text, channel, blocks }: SlackMessage) {
    return this.sendMessage({ text: `⚠️ ${text}`, channel, blocks });
  }

  async error({ text, channel, blocks }: SlackMessage) {
    return this.sendMessage({ text: `❌ ${text}`, channel, blocks });
  }

  async done({ text, channel, blocks }: SlackMessage) {
    return this.sendMessage({ text: `✨ ${text}`, channel, blocks });
  }
}

export const slack = new SlackService();
