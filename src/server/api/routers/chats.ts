import { openai } from "@ai-sdk/openai";
import { TRPCError } from "@trpc/server";
import { generateObject } from "ai";
import dedent from "ts-dedent";
import { z } from "zod";

import { AICoreMessage } from "~/lib/schemas/ai";
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
        messages: z.any().array(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const prompt = dedent`
          You are an AI coach tasked with analyzing coaching conversations and generating follow-up questions.
          You and the coach are helping the client with their goals, emotions, decisions, delegations, feedback, team conflicts, goal setting, and more.

          Here is the conversation history:

          <conversation_history>
            ${input.messages
              .map((m) => {
                const content = m.toolInvocations?.length
                  ? `${m.content}\n\nTool Invocations:\n${m.toolInvocations
                      .filter((t: any) => t.state === "result")
                      .map(
                        (t: any) =>
                          `- ${t.toolName}: ${JSON.stringify(t.args)}\n  Result: ${JSON.stringify(t.result)}`,
                      )
                      .join("\n")}`
                  : m.content;
                return `${m.role === "user" ? "Client" : "Coach"}: ${content}`;
              })
              .join("\n")}
          </conversation_history>

          Generate three follow-up questions that:
          1. Explore specific moments or examples mentioned in the conversation
          2. Challenge assumptions about particular situations discussed
          3. Move toward concrete next steps

          Guidelines for questions:
          - Keep them short and clear
          - Make them open-ended
          - Reference specific details from the conversation
          - Use "I" instead of "you" framing
          - Focus on actionable insights

          Analyze the conversation first:
          1. List key moments and examples discussed
          2. Note specific challenges mentioned
          3. Identify potential growth areas

          Return your questions in this JSON format:
          [
            {
              "text": "Short question for the button",
              "description": "Why this question is valuable"
            }
          ]

          Example input:
          """
          ...
          Coach: [...] Proactive Problem-Solving: You tend to identify problems and actively discuss potential solutions. For example, in the meeting about meeting bot management, you recognized an issue and suggested scheduling a new meeting to test solutions. [...]
          ...
          """

          Example output:
          \`\`\`
          [
            {
              "text": "How could have I suggested better solutions for the meeting bot?",
              "description": "This question explores the conversation and challenges the user to think about how they could have suggested better solutions."
            }
          ]
          \`\`\`

          Now analyze the conversation and generate three targeted follow-up questions.
        `;

        console.log(prompt);

        const result = await generateObject({
          model: openai("gpt-4o-2024-08-06"),
          prompt,
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
