import { openai } from "@ai-sdk/openai";
import { type CoreMessage, convertToCoreMessages, streamText } from "ai";
import _ from "lodash";
import { type NextRequest, NextResponse } from "next/server";
import dedent from "ts-dedent";
import { z } from "zod";

import {
  listMeetingsTool as createListMeetingsTool,
  searchMomentsTool as createSearchMomentsTool,
} from "~/lib/ai/tools";
import { SlashCommand } from "~/lib/commands/schemas";
import { searchEntities } from "~/lib/graph/entity-search";
import { searchSimilar } from "~/lib/pinecone/search";
import {
  discoverKeyEntitiesTool as createDiscoverKeyEntitiesTool,
  entityLookupTool as createEntityLookupTool,
  entitySemanticSearchTool as createEntitySemanticSearchTool,
  findEntityRelationshipsTool as createFindEntityRelationshipsTool,
  findRelatedTopicsTool as createFindRelatedTopicsTool,
  listEntityNamesTool as createListEntityNamesTool,
  listRelationshipTypesTool as createListRelationshipTypesTool,
  listEntityTypesTool as createListEntityTypesTool,
} from "~/lib/processing/ai-search-tools";
import { UIMessage } from "~/lib/schemas/ai";
import { Video } from "~/lib/schemas/video";
import { VideoMomentPartial } from "~/lib/schemas/video-moment";
import type { Tables } from "~/lib/supabase/database.types";
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
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
] as const satisfies Parameters<typeof openai>[0][];
const modelRetryOrderSchema = z
  .enum(MODEL_RETRY_ORDER)
  .catch(MODEL_RETRY_ORDER[0]);

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as unknown;
    const bodyParseResult = ChatRequestBody.required().safeParse(body);

    if (!bodyParseResult.success) {
      return NextResponse.json(
        { error: "Invalid chat payload" },
        { status: 400 },
      );
    }

    const model = modelRetryOrderSchema.parse(
      request.nextUrl.searchParams.get("model") ?? MODEL_RETRY_ORDER[0],
    );

    const {
      userId,
      selectedActivity,
      messages,
      selectedMoments,
      selectedVideos,
    } = bodyParseResult.data;

    const supabase = await createClient();

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

    const selectedVideoIds = selectedVideos
      ?.map((v) => v.videoId)
      .filter((id): id is string => Boolean(id));

    const tools = {
      listMeetings: createListMeetingsTool(
        userId,
        selectedVideoIds?.length ? selectedVideoIds : undefined,
      ),
      searchMoments: createSearchMomentsTool(
        userId,
        selectedVideoIds?.length ? selectedVideoIds : undefined,
      ),
      discoverKeyEntities: createDiscoverKeyEntitiesTool(userId),
      findEntityRelationships: createFindEntityRelationshipsTool(userId),
      findRelatedTopics: createFindRelatedTopicsTool(userId),
      entityLookup: createEntityLookupTool(userId),
      entitySemanticSearch: createEntitySemanticSearchTool(userId),
      listEntityNames: createListEntityNamesTool(userId),
      listRelationshipTypes: createListRelationshipTypesTool(userId),
      listEntityTypes: createListEntityTypesTool(userId),
    };

    const observationPrompt = observationPrompts?.[0];

    let systemMessage = dedent`
      You are an elite executive coach with world-class expertise in professional development. Your coaching approach combines deep empathy with strategic insight, helping clients achieve breakthrough results in their careers and personal growth. You excel at asking powerful questions that unlock new perspectives and possibilities.

      Your coaching specialties include:
      • Leadership development and executive presence
      • Strategic decision-making and problem-solving
      • Emotional intelligence and interpersonal dynamics
      • Team management and conflict resolution
      • Goal setting, accountability, and performance optimization
      • Work-life integration and stress management
      • Career transitions and professional advancement

      TOOL USAGE PROTOCOL:
      1. ANALYZE: Begin by gathering comprehensive context using these essential tools:
         • discoverKeyEntities - Map the critical concepts, people, and themes
         • listEntityTypes - Understand available entity categories before deeper exploration
         • listEntityNames - Identify specific entities to investigate further
         • listRelationshipTypes - Discover connection patterns between entities

      2. EXPLORE: Deepen your understanding with these investigative tools:
         • findEntityRelationships - Trace connections between key entities
         • findRelatedTopics - Expand context by identifying relevant discussion areas
         • entityLookup - Get precise details about specific entities
         • entitySemanticSearch - Uncover nuanced insights across conversations

      3. REFERENCE: Ground your coaching in specific evidence using:
         • listMeetings - Identify relevant conversation sessions
         • searchMoments - Find specific instances that illustrate patterns or insights

      For each client question, employ a minimum of 3-5 tools in sequence, using the output of each tool to inform your next query. This methodical approach ensures your coaching is data-driven, personalized, and transformative.
    `;

    if (profile?.nickname) {
      systemMessage += `\n\nYou are coaching <user>${profile.nickname}</user>.`;
    }

    if (selectedActivity) {
      systemMessage += `\n\nYou are specifically discussing <topic>${selectedActivity}</topic>.`;
    }

    systemMessage += "\n\nNow, the conversation begins.";

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

    const coreMessages = convertToCoreMessages(messages, { tools });

    const latestUserMessage = [...coreMessages]
      .reverse()
      .find((m): m is Extract<typeof m, { role: "user" }> => m.role === "user");

    const userCommands: string[] = [];

    if (latestUserMessage) {
      const userMessageContent = extractTextContent(latestUserMessage.content);

      const extractedCommands = userMessageContent.match(
        new RegExp(`\\${SlashCommand.options.join("|")}`, "g"),
      );

      if (extractedCommands) {
        userCommands.push(..._.uniq(extractedCommands));
      }

      const userFrameworks = extractFrameworks(userMessageContent, frameworks);

      const cleanedUserMessageContent = cleanUserMessage(
        userMessageContent,
        SlashCommand.options,
        frameworks,
      );

      const [searchResults, entityResults] = await Promise.all([
        searchSimilar(
          `${profile?.nickname ? `${profile.nickname}: ` : ""}${cleanedUserMessageContent}`,
          {
            topK: 15,
            minScore: 0.4,
            filter: { profile_id: { $eq: userId } },
          },
        ),
        searchEntities(cleanedUserMessageContent, {
          topK: 15,
          minScore: 0.4,
          filter: { profile_id: { $eq: userId } },
        }),
      ]);

      latestUserMessage.content = buildEnhancedUserMessage({
        cleanedUserMessageContent,
        searchResults,
        profile,
        userCommands,
        coreMessages,
        selectedMoments,
        selectedVideos,
        userFrameworks,
        frameworks,
      });
    }

    const result = streamText({
      model: openai.chat(model),
      tools,
      maxSteps: userCommands.length > 0 ? 30 : 25,
      maxTokens: 16384,
      experimental_continueSteps: true,
      messages: [
        ...initialMessages,
        ...coreMessages,
        {
          role: "user",
          content:
            "REMEMBER: You must always explicitly announce your intentions before invoking any tool. Begin with 'I will now search for...' or 'I will now analyze...' to maintain transparency. Take as many methodical steps as necessary to thoroughly complete the task. Be comprehensive in your analysis and explanations. When new information emerges, strategically sequence your tool calls to build upon previous discoveries and maximize insights for the user. YOU MUST USE ALL AVAILABLE TOOLS TO PROVIDE THE MOST COMPREHENSIVE RESPONSE POSSIBLE.",
        },
      ],
      onFinish: async ({ response: { messages: responseMessages } }) => {
        if (!selectedActivity) return;

        try {
          await api.chats.save({
            userId,
            topic: selectedActivity,
            messages: [...coreMessages, ...responseMessages],
          });
        } catch (error) {
          console.error("[Chat] Failed to save chat", { error });
        }
      },
      experimental_telemetry: { isEnabled: true },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("[Chat] Unexpected error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Extracts text content from a CoreMessage content field
 */
function extractTextContent(content: CoreMessage["content"]): string {
  if (typeof content === "string") {
    return content;
  }

  return content.reduce(
    (acc, curr) => acc + (curr.type === "text" ? curr.text : ""),
    "",
  );
}

/**
 * Extracts framework mentions from user message
 */
function extractFrameworks(
  userMessageContent: string,
  frameworks: { title: string }[] | null,
): string[] {
  if (!frameworks?.length) return [];

  const frameworkPattern = new RegExp(
    `@(?:${frameworks.map((f) => `(?:${f.title})`).join("|")})`,
    "g",
  );

  const matches = userMessageContent.match(frameworkPattern);
  return matches ? _.uniq(matches).map((f) => f.replace(/^@/, "")) : [];
}

/**
 * Cleans user message by removing commands and framework mentions
 */
function cleanUserMessage(
  userMessageContent: string,
  slashCommands: readonly string[],
  frameworks: { title: string }[] | null,
): string {
  let cleaned = userMessageContent.replace(
    new RegExp(`\\${slashCommands.join("|")}`, "g"),
    (match) => match.slice(1),
  );

  if (frameworks?.length) {
    cleaned = cleaned.replace(
      new RegExp(
        `@(?:${frameworks.map((f) => `(?:${f.title})`).join("|")})`,
        "g",
      ),
      (match) => match.slice(1),
    );
  }

  return cleaned;
}

/**
 * Builds enhanced user message with context and instructions
 */
interface EnhancedMessageParams {
  cleanedUserMessageContent: string;
  searchResults: unknown[];
  profile: Tables<"profiles"> | null;
  userCommands: string[];
  coreMessages: CoreMessage[];
  selectedMoments: unknown[];
  selectedVideos: unknown[];
  userFrameworks: string[];
  frameworks: { title: string; definition_prompt: string }[] | null;
}

function buildEnhancedUserMessage({
  cleanedUserMessageContent,
  searchResults,
  profile,
  userCommands,
  coreMessages,
  selectedMoments,
  selectedVideos,
  userFrameworks,
  frameworks,
}: EnhancedMessageParams): string {
  let enhancedMessage = dedent`
    Here is some relevant context from previous meetings that might help with the response:
    
    <context>
    ${searchResults.length > 0 ? searchResults.map((r) => JSON.stringify(r)).join("\n\n") : "No relevant context found"}
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
      
    TOOL USAGE REQUIREMENTS:
      - You MUST use discoverKeyEntities to identify important concepts in the user's message
      - You MUST use findEntityRelationships to understand connections between entities
      - You MUST use findRelatedTopics to broaden the context of the conversation
      - You MUST use entityLookup and entitySemanticSearch for deeper insights
      - You MUST use listMeetings to find relevant meetings
      - You MUST use searchMoments to find relevant moments
      - You MUST use the results from one tool to inform your use of subsequent tools
      - You MUST provide a comprehensive analysis using ALL available tools
  `;

  if (userCommands.includes("/meetings")) {
    enhancedMessage +=
      "\n\nVERY IMPORTANT: THE USER IS ASKING FOR MEETINGS. **CALLING THE `listMeetings` TOOL IS MANDATORY.**";
  }

  if (coreMessages.length === 1 || userCommands.includes("/moments")) {
    enhancedMessage +=
      "\n\nVERY IMPORTANT: THE USER IS ASKING FOR MOMENTS. **CALLING THE `searchMoments` TOOL IS MANDATORY.**";
  } else {
    enhancedMessage +=
      "\n\nIMPORTANT: ALWAYS CALL `searchMoments` TO FIND RELEVANT MOMENTS.";
  }

  if (selectedMoments.length > 0) {
    enhancedMessage += `\n\nVERY IMPORTANT: FOCUS **ONLY** ON THESE MOMENTS:\n\`\`\`\n${JSON.stringify(selectedMoments)}\n\`\`\``;
  }

  if (selectedVideos.length > 0) {
    const omittedKeys: (keyof ReturnType<typeof toVideoOutput>)[] = [
      "meeting",
      "metadata",
      "moments",
      "vtt",
    ];

    enhancedMessage += `\n\nVERY IMPORTANT: FOCUS **ONLY** ON THESE MEETINGS:\n\`\`\`\n${JSON.stringify(
      selectedVideos.map((v) =>
        _.omit(v as Record<string, unknown>, omittedKeys),
      ),
    )}\n\`\`\``;
  }

  if (userFrameworks.length > 0) {
    for (const framework of userFrameworks) {
      const frameworkRecord = frameworks?.find(
        (f) => f.title.trim().toLowerCase() === framework.trim().toLowerCase(),
      );

      if (frameworkRecord) {
        enhancedMessage += `\n\n---\n\n[!!! VERY IMPORTANT !!! ${frameworkRecord.definition_prompt}]`;
      }
    }
  }

  enhancedMessage += `\n\n---\n\n${cleanedUserMessageContent}`;

  return enhancedMessage;
}
