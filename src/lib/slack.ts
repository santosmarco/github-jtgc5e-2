import {
  type Block,
  type KnownBlock,
  WebClient as SlackWebClient,
} from "@slack/web-api";

import { env } from "~/env";

// Initialize Slack Web Client
const slackClient = env.SLACK_BOT_TOKEN
  ? new SlackWebClient(env.SLACK_BOT_TOKEN)
  : null;

const NOTIFICATIONS_CHANNEL = env.SLACK_NOTIFICATIONS_CHANNEL;
const FEEDBACKS_CHANNEL = env.SLACK_FEEDBACKS_CHANNEL;

export const SLACK_CHANNELS = {
  NOTIFICATIONS: NOTIFICATIONS_CHANNEL,
  FEEDBACKS: FEEDBACKS_CHANNEL,
} as const;

export type SlackMessage = {
  text: string;
  channel?: string;
  blocks?: (Block | KnownBlock)[];
};

// Block Kit Builder Types
type BlockType =
  | "section"
  | "header"
  | "divider"
  | "context"
  | "image"
  | "actions";
type TextType = "plain_text" | "mrkdwn";

interface TextObject {
  type: TextType;
  text: string;
  emoji?: boolean;
}

// Block Builder Helper Functions
export const blockKit = {
  /**
   * Create a header block with plain text
   */
  header: (text: string, emoji = true): KnownBlock => ({
    type: "header",
    text: {
      type: "plain_text",
      text,
      emoji,
    },
  }),

  /**
   * Create a section block with text
   */
  section: (text: string, isPlainText = false): KnownBlock => ({
    type: "section",
    text: {
      type: isPlainText ? "plain_text" : "mrkdwn",
      text,
      emoji: isPlainText,
    },
  }),

  /**
   * Create a section block with fields (two-column layout)
   */
  sectionFields: (fields: string[]): KnownBlock => ({
    type: "section",
    fields: fields.map((field) => ({
      type: "mrkdwn",
      text: field,
    })),
  }),

  /**
   * Create a divider block
   */
  divider: (): KnownBlock => ({
    type: "divider",
  }),

  /**
   * Create a context block (small text with optional icons)
   */
  context: (
    elements: (
      | string
      | { type: "image"; image_url: string; alt_text: string }
    )[],
  ): KnownBlock => ({
    type: "context",
    elements: elements.map((element) => {
      if (typeof element === "string") {
        return {
          type: "mrkdwn",
          text: element,
        };
      }
      return element;
    }),
  }),

  /**
   * Create an image block
   */
  image: (imageUrl: string, altText: string, title?: string): KnownBlock => ({
    type: "image",
    image_url: imageUrl,
    alt_text: altText,
    ...(title && {
      title: {
        type: "plain_text",
        text: title,
        emoji: true,
      },
    }),
  }),

  /**
   * Create a message block with a title and body
   */
  message: (
    title: string,
    body: string,
    emoji?: string,
  ): (Block | KnownBlock)[] => [
    blockKit.header(`${emoji ? `${emoji} ` : ""}${title}`),
    blockKit.section(body),
  ],

  /**
   * Create a notification block for topics generation
   */
  topicsGenerated: (
    userId: string,
    sessionId: string,
    sessionDate: string,
  ): (Block | KnownBlock)[] => [
    blockKit.header("✨ Topics Generated"),
    blockKit.sectionFields([
      `*User ID:*\n${userId}`,
      `*Session:*\n${sessionId}`,
    ]),
    blockKit.section(`Session scheduled for: *${sessionDate}*`),
    blockKit.context([`Generated at: ${new Date().toLocaleString()}`]),
  ],
};

class SlackService {
  private async sendMessage({
    text,
    channel = NOTIFICATIONS_CHANNEL,
    blocks,
  }: SlackMessage) {
    if (!slackClient) {
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

  /**
   * Send a rich message using Block Kit
   * @param options Message options
   */
  async sendRichMessage({
    text,
    channel = NOTIFICATIONS_CHANNEL,
    blocks,
  }: SlackMessage) {
    return this.sendMessage({ text, channel, blocks });
  }

  /**
   * Send a message with title and body (convenient helper)
   */
  async sendTitleBodyMessage({
    title,
    body,
    emoji,
    channel = NOTIFICATIONS_CHANNEL,
  }: {
    title: string;
    body: string;
    emoji?: string;
    channel?: string;
  }) {
    return this.sendMessage({
      text: `${emoji ?? ""} ${title}`,
      channel,
      blocks: blockKit.message(title, body, emoji),
    });
  }

  /**
   * Send a notification about generated topics
   */
  async notifyTopicsGenerated({
    userId,
    sessionId,
    sessionDate,
    channel = NOTIFICATIONS_CHANNEL,
  }: {
    userId: string;
    sessionId: string;
    sessionDate: string;
    channel?: string;
  }) {
    return this.sendMessage({
      text: `✨ Topics generated for user ${userId}, session ${sessionId}`,
      channel,
      blocks: blockKit.topicsGenerated(userId, sessionId, sessionDate),
    });
  }
}

export const slack = new SlackService();
