import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, type CoreMessage, streamText } from "ai";
import _ from "lodash";
import { type NextRequest, NextResponse } from "next/server";
import dedent from "ts-dedent";
import { z } from "zod";

import {
  displayMomentTool,
  explainTool,
  explainTools,
  listMeetingsTool as createListMeetingsTool,
  searchMomentsTool as createSearchMomentsTool,
} from "~/lib/ai/tools";
import { SlashCommand } from "~/lib/commands/schemas";
import { searchSimilar } from "~/lib/pinecone/search";
import { UIMessage } from "~/lib/schemas/ai";
import { Video } from "~/lib/schemas/video";
import { VideoMomentPartial } from "~/lib/schemas/video-moment";
import { createClient } from "~/lib/supabase/server";
import type { toVideoOutput } from "~/lib/videos";
import { api } from "~/trpc/server";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

export const ChatRequestBody = z
  .object({
    userId: z.string(),
    selectedActivity: z.string(),
    messages: z.array(UIMessage.passthrough()),
    selectedMoments: z.array(VideoMomentPartial).default([]),
    selectedVideos: z.array(Video.partial()).default([]),
  })
  .partial()
  .passthrough();
export type ChatRequestBody = z.infer<typeof ChatRequestBody>;

const MODEL_RETRY_ORDER = [
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
] as const satisfies Parameters<typeof openai>[0][];
const modelRetryOrderSchema = z
  .enum(MODEL_RETRY_ORDER)
  .catch(MODEL_RETRY_ORDER[0]);

export async function POST(request: NextRequest) {
  try {
    console.log("[Chat] Received request");
    const body = (await request.json()) as unknown;
    const bodyParseResult = ChatRequestBody.required().safeParse(body);

    if (!bodyParseResult.success) {
      console.error("[Chat] Validation error:", bodyParseResult.error);
      return NextResponse.json(
        { error: "Invalid chat payload" },
        { status: 400 },
      );
    }

    const model = modelRetryOrderSchema.parse(
      request.nextUrl.searchParams.get("model") ?? MODEL_RETRY_ORDER[0],
    );
    console.log("[Chat] Using model:", model);

    const {
      userId,
      selectedActivity,
      messages,
      selectedMoments,
      selectedVideos,
    } = bodyParseResult.data;
    console.log(
      "[Chat] Processing request for user:",
      userId,
      "activity:",
      selectedActivity,
    );

    const supabase = await createClient();
    console.log("[Chat] Supabase client initialized");

    const [
      { data: profile },
      { data: observationPrompts },
      { data: frameworks },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("observation_prompts")
        .select("*")
        .eq("profile_id", userId)
        .eq("type", selectedActivity)
        .eq("latest", true)
        .order("created_at", { ascending: false }),
      supabase.from("coaching_frameworks").select("*"),
    ]);

    const selectedVideoIds = selectedVideos?.map((v) => v.videoId);

    const listMeetingsTool = createListMeetingsTool(
      userId,
      selectedVideoIds?.length
        ? selectedVideoIds.filter((id): id is NonNullable<typeof id> => !!id)
        : undefined,
    );
    const searchMomentsTool = createSearchMomentsTool(
      userId,
      selectedVideoIds?.length
        ? selectedVideoIds.filter((id): id is NonNullable<typeof id> => !!id)
        : undefined,
    );

    const observationPrompt = observationPrompts?.[0];

    console.log("[Chat] Fetched profile and observation prompt", {
      hasProfile: !!profile,
      hasObservationPrompt: !!observationPrompt,
    });

    const tools = {
      displayMoment: displayMomentTool,
      listMeetings: listMeetingsTool,
      searchMoments: searchMomentsTool,
    };

    let systemMessage = dedent`
      You are the best coach in the world. You can assist your clients with any questions they have. You help them with their goals, emotions, decisions, delegations, feedback, team conflicts, goal setting, and more.

      You have the following tools available:

      <tools>
      ${explainTools(tools)}
      </tools>

      Whenever you may need further explanation about a tool, don't forget to run the \`explain\` tool.
    `;
    if (profile?.nickname) {
      systemMessage += `\n\nYou are coaching <user>${profile.nickname}</user>.`;
    }
    if (selectedActivity) {
      systemMessage += `\n\nYou are specifically discussing <topic>${selectedActivity}</topic>.`;
    }
    systemMessage += "\n\nNow, the conversation begins.";
    console.log("[Chat] Generated system message", { systemMessage });

    const initialMessages: CoreMessage[] = [
      { role: "system", content: systemMessage },
      ...(observationPrompt
        ? [
            { role: "user" as const, content: observationPrompt.prompt },
            ...(observationPrompt.result && observationPrompt.type !== "Coach"
              ? [
                  {
                    role: "assistant" as const,
                    content: observationPrompt.result,
                  },
                ]
              : []),
          ]
        : []),
    ];
    console.log("[Chat] Prepared initial messages:", initialMessages);

    const coreMessages = convertToCoreMessages(messages, {
      tools: { ...tools, explain: explainTool(tools) },
    });
    console.log("[Chat] Converted core messages:", coreMessages);

    const latestUserMessage = [...coreMessages]
      .reverse()
      .find((m): m is Extract<typeof m, { role: "user" }> => m.role === "user");

    let userCommands: string[] = [];

    if (latestUserMessage) {
      const userMessageContent =
        typeof latestUserMessage.content === "string"
          ? latestUserMessage.content
          : latestUserMessage.content.reduce((acc, curr) => {
              return acc + (curr.type === "text" ? curr.text : "");
            }, "");

      userCommands = _.uniq(
        userMessageContent.match(
          new RegExp(`\\${SlashCommand.options.join("|")}`, "g"),
        ),
      );
      const userFrameworks = _.uniq(
        userMessageContent.match(
          new RegExp(
            `@(?:${(frameworks ?? []).map((f) => `(?:${f.title})`).join("|")})`,
            "g",
          ),
        ),
      ).map((f) => f.replace(/^@/, ""));

      const cleanedUserMessageContent = userMessageContent
        .replace(
          new RegExp(`\\${SlashCommand.options.join("|")}`, "g"),
          (match) => match.slice(1),
        )
        .replace(
          new RegExp(
            `@(?:${(frameworks ?? []).map((f) => `(?:${f.title})`).join("|")})`,
            "g",
          ),
          (match) => match.slice(1),
        );

      console.log(
        "[Chat] Found latest user message, searching for similar content",
      );

      const results = await searchSimilar(
        `${profile?.nickname ? `${profile.nickname}: ` : ""}${cleanedUserMessageContent}`,
        {
          topK: 15,
          minScore: 0.4,
          filter: { profile_id: { $eq: userId } },
        },
      );

      console.log("[Chat] Found similar results:", results);

      latestUserMessage.content = dedent`
        Here is some relevant context from previous meetings that might help with the response:
        
        <context>
        ${results.length > 0 ? results.map((r) => JSON.stringify(r)).join("\n\n") : "No relevant context found"}
        </context>

        REMEMBER: The user's name is <user>${profile?.nickname}</user>.
        
        RESPONSE STYLE:  
          - The user prefers succinct yet complete answers that are easy to understand and follow up on.  
          - The user values responses that feel human rather than robotic.
          - The user prefers engaging in a real conversation; avoid lists, tables, and other formatting unless necessary.
          - **IMPORTANT**: Use the second person when addressing the user, i.e., "you" instead of "${profile?.nickname}".

        NOTES:  
          - You do not need to use the entire context; focus on the most relevant information.  
          - When citing information from meetings, videos, or moments, make sure to call the relevant tools.
          - Use the \`<moment id={moment_id} reasoning={optional_reasoning_for_why_this_moment_is_relevant} />\` tag to reference specific moments **inline** (in the message). Important: Treat <moment /> tags like paragraphs; they occupy a full block in the document and cannot be nested.
      `;

      if (userCommands.includes("/meetings")) {
        latestUserMessage.content += `\n\nVERY IMPORTANT: THE USER IS ASKING FOR MEETINGS. **CALLING THE \`listMeetings\` TOOL IS MANDATORY.**\n${explainTools({ listMeetings: listMeetingsTool }, false)}`;
      }
      if (coreMessages.length === 1 || userCommands.includes("/moments")) {
        latestUserMessage.content += `\n\nVERY IMPORTANT: THE USER IS ASKING FOR MOMENTS. **CALLING BOTH THE \`searchMoments\` AND \`displayMoment\` TOOLS IS MANDATORY.**\n${explainTools({ searchMoments: searchMomentsTool, displayMoment: displayMomentTool }, false)}`;
      }
      if (selectedMoments.length > 0) {
        latestUserMessage.content += `\n\nVERY IMPORTANT: FOCUS **ONLY** ON THESE MOMENTS:\n\`\`\`\n${JSON.stringify(selectedMoments)}\n\`\`\``;
      }
      if (selectedVideos.length > 0) {
        latestUserMessage.content += `\n\nVERY IMPORTANT: FOCUS **ONLY** ON THESE MEETINGS:\n\`\`\`\n${JSON.stringify(
          selectedVideos.map((v) =>
            _.omit(v, [
              "meeting",
              "metadata",
              "moments",
              "vtt",
            ] satisfies (keyof ReturnType<typeof toVideoOutput>)[]),
          ),
        )}\n\`\`\``;
      }
      if (userFrameworks.length > 0) {
        for (const framework of userFrameworks) {
          const frameworkRecord = frameworks?.find(
            (f) =>
              f.title.trim().toLowerCase() === framework.trim().toLowerCase(),
          );
          if (frameworkRecord) {
            latestUserMessage.content += `\n\n---\n\n[!!! VERY IMPORTANT !!! ${frameworkRecord.definition_prompt}]`;
          }
        }
      }

      latestUserMessage.content += `\n\n---\n\n${cleanedUserMessageContent}`;

      console.log("[Chat] Updated latest user message:", latestUserMessage);
    }

    console.log(
      "[Chat] Starting stream with total messages:",
      initialMessages.length + coreMessages.length,
    );
    const result = streamText({
      model: openai.chat(model),
      tools: { ...tools, explain: explainTool(tools) },
      maxSteps: userCommands.length > 0 ? 8 : 5,
      temperature: 0.2,
      maxTokens: 8192,
      experimental_continueSteps: true,
      messages: [
        ...initialMessages,
        ...coreMessages,
        {
          role: "user",
          content:
            "REMEMBER: You must always state what you will do before calling a tool. For example, you will say, 'I will now search for moments that are relevant to what you want...'.",
        },
      ],
      onFinish: async ({ response: { messages: responseMessages } }) => {
        if (!selectedActivity) return;

        try {
          console.log("[Chat] Saving chat messages");
          await api.chats.save({
            userId,
            topic: selectedActivity,
            messages: [...coreMessages, ...responseMessages],
          });
          console.log("[Chat] Successfully saved chat messages");
        } catch (error) {
          console.error("[Chat] Failed to save chat", { error });
        }
      },
      experimental_telemetry: { isEnabled: true },
    });

    console.log("[Chat] Returning stream response");
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("[Chat] Encountered error:", error);

    // const nextRetryModel = MODEL_RETRY_ORDER.find((model, idx) => {
    //   return MODEL_RETRY_ORDER.indexOf(model) === idx + 1;
    // });

    // if (nextRetryModel) {
    //   console.log("[Chat] Retrying with next model:", nextRetryModel);
    //   const url = new URL(request.nextUrl);
    //   url.searchParams.set("model", nextRetryModel);
    //   return fetch(url.toString(), request);
    // }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
