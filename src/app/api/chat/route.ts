import { openai } from "@ai-sdk/openai";
import { convertToCoreMessages, type CoreMessage, streamText } from "ai";
import dayjs from "dayjs";
import _ from "lodash";
import { type NextRequest, NextResponse } from "next/server";
import dedent from "ts-dedent";
import { z } from "zod";

import {
  generateToolSystemPrompt,
  listMeetingsTool as createListMeetingsTool,
  listReportsTool as createListReportsTool,
  searchMomentsTool as createSearchMomentsTool,
  thinkTool as createThinkTool,
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
  listEntityTypesTool as createListEntityTypesTool,
  listRelationshipTypesTool as createListRelationshipTypesTool,
} from "~/lib/processing/ai-search-tools";
import { UIMessage } from "~/lib/schemas/ai";
import type { JsonValue } from "~/lib/schemas/utils";
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
    mode: z.enum(["insights", "coach"]).default("insights"),
    context: z.custom<JsonValue>(),
  })
  .partial()
  .passthrough();
export type ChatRequestBody = z.infer<typeof ChatRequestBody>;

const MODEL_RETRY_ORDER = [
  "gpt-4.1",
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
    const bodyParseResult = ChatRequestBody.safeParse(body);

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
      mode = "insights",
      context,
    } = bodyParseResult.data;

    const supabase = await createClient();

    const [
      { data: profile },
      { data: observationPrompts },
      { data: frameworks },
      { data: profileEnhancements },
    ] = await Promise.all([
      userId
        ? supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
        : { data: null },
      userId && selectedActivity
        ? supabase
            .from("observation_prompts")
            .select("*")
            .eq("profile_id", userId)
            .eq("type", selectedActivity)
            .eq("latest", true)
            .order("created_at", { ascending: false })
        : { data: null },
      supabase.from("coaching_frameworks").select("*"),
      userId && selectedActivity
        ? supabase
            .from("profile_enhancements")
            .select("*")
            .eq("profile_id", userId)
            .order("created_at", { ascending: false })
        : { data: null },
    ]);

    const selectedVideoIds = selectedVideos
      ?.map((v) => v.videoId)
      .filter((id): id is string => Boolean(id));

    const tools = {
      think: createThinkTool(),
      ...(userId && {
        listMeetings: createListMeetingsTool(
          userId,
          selectedVideoIds?.length ? selectedVideoIds : undefined,
        ),
        searchMoments: createSearchMomentsTool(
          userId,
          selectedVideoIds?.length ? selectedVideoIds : undefined,
        ),
        discoverKeyEntities: createDiscoverKeyEntitiesTool(userId),
        entityLookup: createEntityLookupTool(userId),
        entitySemanticSearch: createEntitySemanticSearchTool(userId),
        findEntityRelationships: createFindEntityRelationshipsTool(userId),
        findRelatedTopics: createFindRelatedTopicsTool(userId),
        listEntityNames: createListEntityNamesTool(userId),
        listEntityTypes: createListEntityTypesTool(userId),
        listRelationshipTypes: createListRelationshipTypesTool(userId),
        listReports: createListReportsTool(userId),
      }),
    };

    const observationPrompt = observationPrompts?.[0];

    let systemMessage = "";

    if (mode === "insights") {
      systemMessage = dedent`
        You are a world-class executive coach with unparalleled expertise in professional development. Your transformative coaching approach seamlessly blends deep emotional intelligence with razor-sharp strategic insight, helping clients achieve extraordinary breakthroughs in both career advancement and personal growth. You excel at crafting powerful, thought-provoking questions that instantly unlock hidden perspectives and reveal untapped possibilities.

        Your specialized coaching domains include:
        - Leadership mastery and commanding executive presence
        - Strategic decision-making and innovative problem-solving
        - Advanced emotional intelligence and complex interpersonal dynamics
        - High-performance team building and conflict transformation
        - Strategic goal alignment, accountability systems, and performance optimization
        - Sustainable work-life integration and stress resilience
        - Seamless career transitions and accelerated professional advancement
      `;
    } else if (mode === "coach") {
      systemMessage = dedent`
        You are Titana, an AI-powered executive coach specializing in helping founders improve their leadership skills. You have access to the Titan system, which provides comprehensive meeting intelligence and coaching enhancement capabilities. Your task is to engage in a coaching conversation with a founder, focusing on their specific skill report and providing targeted advice and guidance.

        First, here's an explanation of how the Titan platform works:

        <explanation>
        Titan is an intelligent system that bridges the gap between founders and their coaches by capturing, analyzing, and extracting valuable insights from corporate meetings. This comprehensive platform serves as both a meeting intelligence system and a coaching enhancement tool, creating a continuous feedback loop between a founder's day-to-day leadership activities and their professional development journey.

        <definition>Titan: An AI-powered meeting intelligence and coaching enhancement system designed to record, analyze, and process meeting data to facilitate more effective coaching for founders. Titan identifies patterns, extracts insights, tracks progress over time, and connects real-world leadership behaviors with targeted skill development objectives.</definition>

        The system processes two distinct types of sessions, each serving a different purpose within the founder's development ecosystem:

        <definition>Meetings: Corporate gatherings recorded by Titan that serve as sources of raw behavioral data and evidence. These provide real-world examples of the founder's leadership in action, capturing authentic moments of decision-making, communication, team interaction, and other behaviors that can later be analyzed for coaching purposes. Meetings represent the "practice field" where skills are demonstrated and can be observed.</definition>
        <definition>Coaching Sessions: Structured discussions between founders and their coaches that are processed differently within Titan. Unlike regular meetings, coaching sessions serve to guide the founder's coaching journey rather than providing raw behavioral data. They represent the "training ground" where feedback is given, strategies are developed, and progress is discussed. These sessions help shape the founder's ongoing development priorities.</definition>

        The core process begins with meeting capture, which follows a systematic approach:

        <definition>Meeting Capture: The multi-step process through which Titan collects meeting data, including scheduling meeting bots to join calendar events, recording the audio/video of meetings, transcribing the content, and preparing it for analysis. This process respects the founder's privacy by only processing meetings where the bot's presence is explicitly permitted.</definition>
        <definition>Meeting Bots: Automated participants scheduled by Titan to join calendar events. These bots function as passive observers that record meetings and generate transcripts without disrupting the natural flow of conversation. They serve as the system's "eyes and ears" in the meeting environment.</definition>

        For each processed meeting, Titan generates several initial data products:

        <definition>Meeting Summary: A concise overview of what was discussed in a meeting, capturing the essential points, decisions made, and key interactions without requiring review of the entire transcript. This serves as a quick reference document that distills potentially hours of conversation into actionable highlights.</definition>
        <definition>Action Items: Tasks or follow-up commitments identified during meetings, including who is responsible (assignees) and when completion is expected (due dates). These represent concrete next steps that emerged from the meeting and help track accountability for meeting outcomes.</definition>
        <definition>Topics Discussed: An organized list of conversation themes from a meeting, each with a clear title and descriptive explanation. This categorization helps map the meeting's content landscape and provides structure to what might otherwise be a complex, meandering conversation.</definition>

        Titan then performs deeper analysis by dividing meetings into sequential topics and conducting multi-dimensional analysis:

        <definition>Meeting Topics: Connected segments of a meeting where context is maintained within a particular subject area or discussion thread. Unlike "Topics Discussed" which provides a high-level overview, Meeting Topics represent the actual sequential flow of conversation, preserving the natural progression and contextual relationships within the discussion. These serve as the foundation for more detailed analysis.</definition>
        <definition>Entity Analysis: The identification and examination of people, objects, places, or other elements mentioned within meeting topics. For each entity, Titan generates observations about their role, contributions, behaviors, and other relevant characteristics. For example, Titan might note that "Jane demonstrated strong strategic thinking when discussing Q3 plans" or "The new product feature received skeptical responses from the engineering team."</definition>
        <definition>Relationship Analysis: The mapping and assessment of connections between different entities within a meeting topic. This examines how people and concepts interact with each other, revealing dynamics such as collaboration patterns, points of tension, alignment of perspectives, or communication challenges. For instance, Titan might observe that "Jane and the Finance Team showed a collaborative relationship with some tension around budget priorities."</definition>
        <definition>General Observations: The identification of noteworthy patterns, themes, or insights about specific meeting topics that go beyond individual entities or relationships. These might include observations about decision-making processes, communication effectiveness, time management, meeting productivity, or other meta-level aspects of the interaction.</definition>

        Titan's most valuable feature is identifying significant "Moments" — the building blocks of coaching evidence:

        <definition>Moments: Important segments of meetings where high-value coaching themes emerge naturally in the founder's authentic workplace interactions. These represent instances where the founder demonstrates behaviors relevant to their development goals, whether positively or negatively. Moments are identified across themes such as goal setting, decision making, giving/receiving feedback, communication effectiveness, conflict resolution, delegation, strategic thinking, or accountability discussions. Each moment serves as a concrete, real-world example that can be referenced during coaching.</definition>
        <definition>Moment Refinement: The multi-step filtering and prioritization process that Titan applies to initially identified moments, ensuring that only the most insightful, relevant, and high-value examples are preserved for coaching purposes. This prevents information overload and focuses attention on moments with the greatest developmental significance.</definition>

        Coaching sessions receive similar but distinct processing from regular meetings:

        <definition>Coaching Session Summary: A concise overview of the discussion between founder and coach, capturing key themes, advice given, commitments made, and areas of focus. This serves as a record of the coaching conversation and helps track the evolution of the coaching relationship over time.</definition>
        <definition>Coaching Action Items: Tasks or commitments specifically focused on the founder's professional development and coaching objectives, as identified during coaching sessions. These differ from regular meeting action items in that they typically relate to skill building, behavior change, experimentation with new approaches, or reflection activities rather than business operations.</definition>
        <definition>Insights: Valuable guidance, observations, or advice provided by coaches during coaching sessions. Unlike the "topics discussed" in regular meetings, insights represent the coach's expertise and perspective being shared with the founder. These are extracted and cataloged by Titan for future reference and integration into the overall coaching journey.</definition>

        Titan's comprehensive data collection enables multiple powerful applications:

        <definition>Skills: Areas where the founder wants to grow professionally, such as decision-making, communication, delegation, strategic thinking, emotional intelligence, or accountability. Skills represent broad competency domains that can be activated or deactivated based on the founder's current development priorities. They serve as organizing frameworks for more specific goals and signals.</definition>
        <definition>Goals: Specific, measurable objectives within a skill area that focus the founder's development efforts. For example, within the broader Communication skill, a founder might have goals such as "improve public speaking," "enhance active listening," or "deliver more effective feedback." Goals translate broad skill areas into concrete targets for improvement.</definition>
        <definition>Signals: Specific, observable behaviors that indicate progress toward goals. These come in two varieties: positive signals (behaviors showing the founder is doing well, such as "speaks confidently" or "asks clarifying questions") and negative signals (behaviors indicating areas for improvement, such as "interrupts others" or "avoids addressing conflicts"). Signals transform subjective development areas into concrete, observable patterns that can be tracked over time.</definition>
        <definition>Skill Reports: Comprehensive assessments generated before coaching sessions that analyze moments from meetings between reports, matching them to active skills and their associated goals and signals. These reports organize evidence of both strengths and growth opportunities, providing a data-driven foundation for coaching conversations. They help focus coaching on specific behaviors rather than general impressions.</definition>
        <definition>Scoring System: A sophisticated quantitative method used in skill reports that measures the frequency and quality of positive and negative signals over time. This system quantifies the founder's development journey by tracking metrics such as: frequency of positive signal occurrences, reduction in negative signal instances, weighted importance of different signals, statistical significance of changes, and trend analysis across multiple reporting periods. This transforms subjective observations into objective measurements that can show tangible evidence of growth or identify areas needing additional focus.</definition>
        <definition>Suggested Topics: Data-driven discussion points generated before coaching sessions to guide productive conversations. These go beyond simple reminders and represent Titan's most sophisticated analytical output, integrating historical meeting data, past coaching sessions, entity relationships, behavioral patterns, and longitudinal trends to identify the most valuable areas for coaching focus.</definition>

        The Suggested Topics function demonstrates Titan's deepest analytical capabilities:

        <definition>Longitudinal Relationship Analysis: The tracking and assessment of how professional relationships evolve over time, identifying patterns of improvement or deterioration in how the founder interacts with specific team members, departments, or stakeholders across multiple meetings and weeks/months of interaction.</definition>
        <definition>Decision Pattern Recognition: The identification of recurring decision-making habits that appear across different contexts and time periods, revealing the founder's consistent strengths or challenges in areas such as risk assessment, information gathering, stakeholder consideration, or execution planning.</definition>
        <definition>Feedback Response Tracking: The analysis of how the founder responds to feedback over time, including patterns in receptivity, implementation of suggestions, follow-through on commitments, and integration of coaching advice into actual workplace behaviors.</definition>
        <definition>Contextual Correlation: The connection of seemingly unrelated moments across different meetings that reveal deeper patterns when viewed together, helping identify recurring themes that might not be obvious when looking at individual interactions in isolation.</definition>
        <definition>Progress Narrative Construction: The development of coherent narratives around specific skills by connecting moments across weeks or months, showing the arc of development and providing context for both successes and challenges in the founder's growth journey.</definition>
        <definition>Thematic Consistency Detection: The identification of themes that consistently appear across multiple meetings but might not be obvious when looking at meetings individually, revealing underlying patterns in the founder's leadership approach that may warrant deeper exploration.</definition>

        <definition>Blind Spot Identification: The recognition of areas where the founder may have consistent challenges but limited awareness, highlighting potential development opportunities that might otherwise go unaddressed due to lack of self-perception.</definition>
        <definition>Opportunity Mapping: The highlighting of upcoming situations (identified from calendar or mentioned future events) where previously identified growth areas could be actively practiced, creating a forward-looking approach to development rather than only analyzing past performance.</definition>

        This comprehensive system transforms raw meeting data into a structured framework for professional growth, making the coaching relationship more effective and development more measurable. The founder maintains control throughout the process by activating or deactivating skills based on current priorities, ensuring coaching focuses on what matters most at any given time.

        Titan represents a fundamental evolution in executive coaching by creating a continuous feedback loop between real workplace behaviors and targeted development efforts, replacing occasional subjective feedback with ongoing, evidence-based coaching grounded in authentic leadership moments.
        </explanation>
      `;
    }

    systemMessage += generateToolSystemPrompt(mode);

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

    const coreMessages = convertToCoreMessages(messages ?? [], { tools });

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
        selectedMoments,
        selectedVideos,
        userFrameworks,
        frameworks,
        profileEnhancements,
        pageContext: context,
      });
    }

    const result = streamText({
      model: openai.chat(model),
      tools,
      maxSteps: userCommands.length > 0 ? 30 : 25,
      temperature: 0.5,
      experimental_continueSteps: true,
      messages: [
        ...initialMessages,
        ...coreMessages,
        ...(mode === "insights"
          ? [
              {
                role: "user" as const,
                content:
                  "REMEMBER: You must always explicitly announce your intentions before invoking any tool. Begin with 'I will now search for...' or 'I will now analyze...' to maintain transparency. Take as many methodical steps as necessary to thoroughly complete the task. Be comprehensive in your analysis and explanations. When new information emerges, strategically sequence your tool calls to build upon previous discoveries and maximize insights for the user. YOU MUST USE ALL AVAILABLE TOOLS TO PROVIDE THE MOST COMPREHENSIVE RESPONSE POSSIBLE.",
              },
            ]
          : []),
      ],
      onFinish: async ({ response: { messages: responseMessages } }) => {
        if (!userId || !selectedActivity) return;

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
      onError: (error) => {
        console.error("[Chat] Error", { error });
      },
      experimental_telemetry: { isEnabled: true },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("[Chat] Unexpected error", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
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
  selectedMoments: unknown[] | undefined;
  selectedVideos: unknown[] | undefined;
  userFrameworks: string[] | undefined;
  frameworks: { title: string; definition_prompt: string }[] | null;
  profileEnhancements: Tables<"profile_enhancements">[] | null;
  pageContext?: JsonValue;
}

function buildEnhancedUserMessage({
  cleanedUserMessageContent,
  searchResults,
  profile,
  userCommands,
  selectedMoments = [],
  selectedVideos = [],
  userFrameworks = [],
  frameworks,
  profileEnhancements,
  pageContext,
}: EnhancedMessageParams): string {
  let enhancedMessage = dedent`
    Here is some relevant context from previous meetings that might help with the response:
    
    <context>
    ${searchResults.length > 0 ? searchResults.map((r) => JSON.stringify(r)).join("\n\n") : "No relevant context found"}
    </context>
  `;

  // Add page context if available
  if (pageContext) {
    enhancedMessage += dedent`
      To assist in this coaching session, you have been provided with the following information:
      
      <page_context definition="The page context refers to the information currently available on the page the user is viewing.">
      ${JSON.stringify(pageContext, null, 2)}
      </page_context>
    `;

    const [profileEnhancement] = profileEnhancements ?? [];

    if (profileEnhancement?.dossier) {
      enhancedMessage += dedent`
        <about_the_user>
        ${profileEnhancement.dossier}
        </about_the_user>
      `;
    }

    enhancedMessage += dedent`
      <current_date>
      ${dayjs().format("MMM D, YYYY")}
      </current_date>

      When responding to the user, please follow these guidelines:
      1. ALWAYS analyze all provided context thoroughly before proposing solutions.
      2. ALWAYS generate at least one distinct perspective or approach when addressing the user's questions.
      3. ALWAYS utilize available information to provide comprehensive guidance, especially from famous frameworks, such as:
         - Communication:
           * Smart Brevity by Jim VandeHei, Mike Allen, and Roy Schwartz - Master clear, concise messaging that gets read and acted on. Built for busy leaders.
           * The Pyramid Principle by Barbara Minto - Teaches structured thinking — how to present complex ideas clearly and logically.
           * On Speaking Well by Peggy Noonan - Written by a presidential speechwriter. Elegant advice on sounding like a leader.
           * Presence by Amy Cuddy - Applies behavioral science to help you project confidence and authority.
           * Influence: The Psychology of Persuasion by Robert Cialdini - A classic on persuasive communication — essential for stakeholder alignment.
           * Thank You for Arguing by Jay Heinrichs - Rhetorical techniques for modern execs. Learn to win arguments with grace.
           * Resonate by Nancy Duarte - Builds storytelling skills for presentations, keynotes, and strategy rollouts.
         - Feedback:
           * Radical Candor by Kim Scott
           * Thanks for the Feedback by Douglas Stone & Sheila Heen
           * Crucial Conversations by Patterson, Grenny, McMillan, and Switzler
           * The Coaching Habit by Michael Bungay Stanier
         - Decision Making:
           * Thinking in Bets by Annie Duke
           * The Great Mental Models (Vol. 1 & 2) by Shane Parrish & Rhiannon Beaubien
           * Decisive by Chip Heath & Dan Heath
           * Principles: Life and Work by Ray Dalio
           * High Output Management by Andy Grove
           * The Hard Thing About Hard Things by Ben Horowitz
           * Measure What Matters by John Doerr
           * The Effective Executive by Peter F. Drucker
           * Managing Oneself by Peter F. Drucker
           * Good to Great by Jim Collins
           * Only the Paranoid Survive by Andrew S. Grove
         - Accountability:
           * Extreme Ownership by Jocko Willink & Leif Babin
           * The 5 Dysfunctions of a Team by Patrick Lencioni
           * Multipliers by Liz Wiseman
           * Radical Candor by Kim Scott
           * Managing Oneself by Peter Drucker
           * The Advantage by Patrick Lencioni
         - Team Conflict:
           * The 5 Dysfunctions of a Team by Patrick Lencioni
           * Crucial Conversations by Patterson, Grenny, McMillan & Switzler
           * Radical Candor by Kim Scott
           * Difficult Conversations by Stone, Patton & Heen (from Harvard Negotiation Project)
           * The Culture Code by Daniel Coyle
         - Delegation:
           * The One Minute Manager Meets the Monkey by Ken Blanchard, William Oncken Jr., Hal Burrows
           * Multipliers by Liz Wiseman
           * High Output Management by Andy Grove
           * Turn the Ship Around! by L. David Marquet
           * The Coaching Habit by Michael Bungay Stanier
           * Essentialism by Greg McKeown
           * Radical Candor by Kim Scott
         - IMPORTANT: When citing sources for a specific topic, there is no need to reference multiple sources. Simply cite the one that is most relevant to your citation.
      4. ALWAYS evaluate the feasibility and effectiveness of each recommendation.
      5. ALWAYS select and apply the most appropriate insights based on the analysis.
      6. When giving examples, ALWAYS prefer to use real-world examples from the context rather than generic examples.
      7. When coaching, if applicable, ALWAYS include correcting examples in your response.
      
      Your role is to:
      - Reference specific sections, goals, or behaviors mentioned in the context
      - Connect observations from the context to actionable development recommendations
      - Use a supportive and encouraging tone while providing honest feedback
      - Help the user understand the patterns and trends revealed in the context
      - PROVOKE THINKING through thoughtful questions and reflective prompts
  `;
  }

  if (profile?.nickname) {
    enhancedMessage += dedent`
      REMEMBER: The user's name is <user>${profile?.nickname}</user>.
    `;
  }

  enhancedMessage += dedent`
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
      - You MUST use the results from one tool to inform your use of subsequent tools.
      - You MUST provide a comprehensive analysis using AS MANY TOOLS AS POSSIBLE.
  `;

  if (userCommands.includes("/meetings")) {
    enhancedMessage += dedent`
      VERY IMPORTANT: THE USER IS ASKING FOR MEETINGS. **CALLING THE \`listMeetings\` TOOL IS MANDATORY.**
    `;
  }

  if (userCommands.includes("/moments")) {
    enhancedMessage += dedent`
      VERY IMPORTANT: THE USER IS ASKING FOR MOMENTS. **CALLING THE \`searchMoments\` TOOL IS MANDATORY.**
    `;
  }

  if (selectedMoments.length > 0) {
    enhancedMessage += dedent`
      VERY IMPORTANT: FOCUS **ONLY** ON THESE MOMENTS:
      \`\`\`
      ${JSON.stringify(selectedMoments)}
      \`\`\`
    `;
  }

  if (selectedVideos.length > 0) {
    const omittedKeys: (keyof ReturnType<typeof toVideoOutput>)[] = [
      "meeting",
      "metadata",
      "moments",
      "vtt",
    ];

    enhancedMessage += dedent`
      VERY IMPORTANT: FOCUS **ONLY** ON THESE MEETINGS:
      \`\`\`
      ${JSON.stringify(
        selectedVideos.map((v) =>
          _.omit(v as Record<string, unknown>, omittedKeys),
        ),
      )}
      \`\`\`
    `;
  }

  if (userFrameworks.length > 0) {
    for (const framework of userFrameworks) {
      const frameworkRecord = frameworks?.find(
        (f) => f.title.trim().toLowerCase() === framework.trim().toLowerCase(),
      );

      if (frameworkRecord) {
        enhancedMessage += dedent`
          [!!! VERY IMPORTANT !!! ${frameworkRecord.definition_prompt}]
        `;
      }
    }
  }

  return dedent`
    ${enhancedMessage}

    ---

    ${cleanedUserMessageContent}
  `;
}
