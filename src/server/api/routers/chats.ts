import { openai } from "@ai-sdk/openai";
import { TRPCError } from "@trpc/server";
import { generateObject } from "ai";
import dedent from "ts-dedent";
import { z } from "zod";

import { AICoreMessage, UIMessage } from "~/lib/schemas/ai";
import type { Json } from "~/lib/supabase/database.types";
import { createClient } from "~/lib/supabase/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const chatsRouter = createTRPCRouter({
  get: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        topic: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      return await supabase
        .from("chats")
        .select()
        .eq("user_id", input.userId)
        .eq("topic", input.topic)
        .eq("latest", true)
        .maybeSingle();
    }),

  generateFollowUpQuestions: publicProcedure
    .input(
      z.object({
        messages: UIMessage.array(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await generateObject({
          model: openai("gpt-4o-mini-2024-07-18"),
          prompt: dedent`
            You are the best coach in the world.
            You are observing a coaching conversation between a client and their coach.
            Your role is to analyze the conversation and recommend insightful follow-up questions for the USER to ask the COACH that would help deepen the discussion and lead to valuable insights.

            <conversation-history>
              ${input.messages.map((m) => `${m.role}: ${m.content}`).join("\n")}
            </conversation-history>

            Based on this coaching conversation, generate three strategic follow-up questions that would:
            - Help explore underlying themes and patterns
            - Challenge assumptions and expand perspectives  
            - Move the conversation toward actionable insights

            The questions should be concise and impactful, as they will be displayed as clickable buttons for the user.
          `,
          schema: z.object({
            questions: z
              .array(
                z.object({
                  text: z
                    .string()
                    .describe(
                      "The actual question text to display on the button (keep it concise)",
                    ),
                  description: z
                    .string()
                    .describe(
                      "A brief explanation of why this question would be valuable to ask",
                    ),
                }),
              )
              .length(3),
          }),
        });

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate follow-up questions: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),

  save: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        topic: z.string(),
        messages: AICoreMessage.array(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      try {
        const chat = await supabase
          .from("chats")
          .select()
          .eq("user_id", input.userId)
          .eq("topic", input.topic)
          .eq("latest", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (chat.error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to get chat: ${chat.error.message}`,
            cause: chat.error,
          });
        }

        if (!chat.data) {
          return await supabase
            .from("chats")
            .insert({
              user_id: input.userId,
              topic: input.topic,
              messages: input.messages as Json[],
              latest: true,
            })
            .select("*");
        }

        return await supabase
          .from("chats")
          .update({
            messages: input.messages as Json[],
          })
          .eq("id", chat.data.id)
          .select("*");
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to save chat in database: ${(error as Error).message}`,
          cause: error,
        });
      }
    }),
});
