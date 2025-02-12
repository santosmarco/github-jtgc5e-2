import type { Block, KnownBlock } from "@slack/web-api";
import { TRPCError } from "@trpc/server";

import { FeedbackInput } from "~/lib/feedbacks/schemas";
import { slack,SLACK_CHANNELS } from "~/lib/slack";
import { createClient } from "~/lib/supabase/server";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const feedbacksRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(FeedbackInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const supabase = await createClient();

        // Upload screenshot if provided
        let screenshotUrl: string | null = null;
        if (input.screenshot) {
          const base64Data = input.screenshot.replace(
            /^data:image\/\w+;base64,/,
            "",
          );
          const buffer = Buffer.from(base64Data, "base64");

          const fileName = `feedback-${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage
            .from("feedback-screenshots")
            .upload(fileName, buffer, {
              contentType: "image/png",
              upsert: false,
            });

          if (uploadError) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: uploadError.message,
              cause: uploadError,
            });
          }

          const {
            data: { publicUrl },
          } = supabase.storage
            .from("feedback-screenshots")
            .getPublicUrl(fileName);

          screenshotUrl = publicUrl;
        }

        const { data: feedback, error: feedbackError } = await supabase
          .from("feedbacks")
          .insert({
            user_id: ctx.user.id,
            type: input.type,
            criticality: input.criticality,
            description: input.description,
            screenshot: screenshotUrl,
          })
          .select("*")
          .single();

        if (feedbackError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: feedbackError.message,
            cause: feedbackError,
          });
        }

        // Get emoji based on feedback type
        const typeEmoji = {
          suggestion: "💡",
          improvement: "⭐",
          bug: "🐛",
        }[feedback.type];

        /*
        // Get emoji based on criticality
        const criticalityEmoji = {
          low: "🟢",
          medium: "🟡",
          high: "🔴",
        }[feedback.criticality];
        */

        // Build blocks array
        const blocks: (Block | KnownBlock)[] = [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📝 New Feedback Submission",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*From:*\n${ctx.user.email}`,
              },
              {
                type: "mrkdwn",
                text: `*Type:*\n${typeEmoji} ${feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}`,
              },
            ],
          },
          /*
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Criticality:*\n${criticalityEmoji} ${feedback.criticality.toUpperCase()}`,
              },
            ],
          },
          */
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Description:*\n${feedback.description}`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Submitted at: ${new Date().toLocaleString()}`,
              },
            ],
          },
        ];

        // Add screenshot block if screenshot exists
        if (feedback.screenshot) {
          blocks.splice(blocks.length - 1, 0, {
            type: "image",
            title: {
              type: "plain_text",
              text: "Screenshot",
              emoji: true,
            },
            image_url: feedback.screenshot,
            alt_text: "Feedback screenshot",
          });
        }

        await slack.info({
          text: `New feedback submitted by ${ctx.user.email}`,
          channel: SLACK_CHANNELS.FEEDBACKS,
          blocks,
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit feedback",
        });
      }
    }),
});
