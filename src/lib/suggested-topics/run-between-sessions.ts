import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import dayjs from "dayjs";
import { dedent } from "ts-dedent";
import { z } from "zod";

import { four_point_one } from "~/lib/ai/models/openai";
import { logger } from "~/lib/logging/server";
import { saveTopicsToDatabase } from "~/lib/suggested-topics";
import type { Database, Tables } from "~/lib/supabase/database.types";

import {
  fetchMeeting,
  type Meeting,
  SuggestedTopicSources,
  summarizeMeeting,
  summarizeMeetings,
} from "./run-meeting";
import { transformJsonIntoXml } from "./utils";

/**
 * Represents a session with its associated meetings
 */
interface SessionWithMeetings {
  readonly session:
    | (Tables<"sessions"> & {
        annotations: ReadonlyArray<
          Tables<"session_annotations"> & {
            sources: ReadonlyArray<Tables<"session_annotation_sources">>;
          }
        >;
      })
    | null;
  readonly meetings: readonly Meeting[];
}

/**
 * Retrieves all meetings for a user, grouped by the sessions they occurred between.
 *
 * @param profileId - The unique identifier for the user profile
 * @param supabase - The initialized Supabase client
 * @returns An array of objects containing sessions and their associated meetings
 * @throws Will throw an error if the database query fails
 */
export async function getMeetingsBetweenSessions(
  profileId: string,
  supabase: SupabaseClient<Database>,
): Promise<ReadonlyArray<SessionWithMeetings>> {
  logger.info(
    `Starting getMeetingsBetweenSessions for profileId: ${profileId}`,
  );

  // Fetch all sessions for the user, ordered chronologically
  logger.info(`Fetching sessions for profileId: ${profileId}`);
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select(
      "*, annotations:session_annotations(*, sources:session_annotation_sources(*))",
    )
    .eq("user_id", profileId)
    .order("date", { ascending: true });

  if (sessionsError) {
    logger.error(
      `Error fetching sessions: ${sessionsError.message}`,
      sessionsError,
    );
    throw sessionsError;
  }

  logger.info(
    `Retrieved ${sessions?.length || 0} sessions for profileId: ${profileId}`,
  );

  // If no sessions exist, return all meetings for the profile in a single group
  if (!sessions?.length) {
    logger.info(
      `No sessions found for profileId: ${profileId}, fetching all meetings`,
    );
    const allMeetings = await fetchMeeting(supabase, { profileId });
    logger.info(
      `Retrieved ${allMeetings.length} meetings for profileId: ${profileId}`,
    );
    return [{ session: null, meetings: allMeetings }];
  }

  const result: SessionWithMeetings[] = [];

  // Process each session and collect meetings that occurred between sessions
  logger.info(
    `Processing ${sessions.length} sessions to collect meetings between them`,
  );
  for (let i = 0; i < sessions.length; i++) {
    const currentSession = sessions[i];
    const previousSession = i > 0 ? sessions[i - 1] : null;

    if (!currentSession?.date) {
      logger.warn(`Session at index ${i} has no date, skipping`);
      continue;
    }

    logger.info(
      `Processing session ${currentSession.id} (${i + 1}/${sessions.length})`,
    );

    // Fetch meetings that occurred between the current session and the next one
    logger.info(
      `Fetching meetings between ${previousSession?.date ?? "beginning of time"} and ${currentSession.date} for profileId: ${profileId}`,
    );
    const meetings = await fetchMeeting(supabase, {
      profileId,
      minDate: previousSession?.date ?? undefined,
      maxDate: currentSession.date,
    });

    logger.info(
      `Found ${meetings.length} meetings for session ${currentSession.id}`,
    );

    result.push({
      session: currentSession,
      meetings,
    });
  }

  // Add meetings that occurred after the most recent session
  const lastSession = sessions[sessions.length - 1];
  if (lastSession?.date) {
    logger.info(
      `Checking for meetings after the last session (${lastSession.id})`,
    );
    const meetingsSinceLastSession = await fetchMeeting(supabase, {
      profileId,
      minDate: lastSession.date,
    });

    logger.info(
      `Found ${meetingsSinceLastSession.length} meetings since last session`,
    );

    if (meetingsSinceLastSession.length > 0) {
      result.push({
        session: null, // Represents future/upcoming session
        meetings: meetingsSinceLastSession,
      });
    }
  }

  logger.info(
    `Completed getMeetingsBetweenSessions, returning ${result.length} session groups`,
  );
  return result;
}

/**
 * Type representing meeting summaries with their associated metadata
 */
type MeetingWithSummary = {
  meeting: Meeting;
  summary: NonNullable<Awaited<ReturnType<typeof summarizeMeeting>>>;
};

/**
 * Type for mapping weeks to meeting summaries
 */
type MeetingsByWeekMap = Map<string, Array<MeetingWithSummary>>;

/**
 * Type for session summary tracking
 */
type SessionSummaryMap = Map<
  string,
  Awaited<ReturnType<typeof summarizeMeetings>>
>;

/**
 * Groups meetings by week and returns a map of week keys to meeting arrays
 *
 * @param meetings - Array of meetings to group
 * @param profileDossier - Optional profile dossier for context
 * @returns A promise resolving to a map of week keys to meeting summary arrays
 */
async function groupMeetingsByWeek(
  meetings: readonly Meeting[],
  profileDossier: string | null | undefined,
): Promise<MeetingsByWeekMap> {
  const meetingsByWeek: MeetingsByWeekMap = new Map();

  logger.info(`Summarizing ${meetings.length} meetings`);
  const summaryPromises = meetings.map(async (meeting) => {
    logger.info(`Summarizing meeting: ${meeting.id}`);
    const summary = await summarizeMeeting(meeting, profileDossier);

    if (!summary) {
      logger.warn(`No summary generated for meeting: ${meeting.id}`);
      return null;
    }

    const meetingDate = dayjs(meeting.date || Date.now());
    const weekStart = meetingDate.startOf("week");
    const weekKey = weekStart.format("YYYY-MM-DD");
    logger.debug(`Assigning meeting ${meeting.id} to week: ${weekKey}`);

    return { meeting, summary, weekKey };
  });

  const summaryResults = await Promise.all(summaryPromises);

  // Filter out null results and organize into the map
  for (const { meeting, summary, weekKey } of summaryResults.filter(
    (result): result is NonNullable<typeof result> => result !== null,
  )) {
    if (!meetingsByWeek.has(weekKey)) {
      meetingsByWeek.set(weekKey, []);
    }

    meetingsByWeek.get(weekKey)?.push({ meeting, summary });
    logger.debug(`Added meeting ${meeting.id} summary to week ${weekKey}`);
  }

  logger.info(`Grouped meetings into ${meetingsByWeek.size} weeks`);
  return meetingsByWeek;
}

/**
 * Processes meetings between sessions and generates coaching topics.
 *
 * @param profileId - The unique identifier for the user profile
 * @param supabase - The initialized Supabase client
 * @throws Will throw an error if database operations fail
 */
export async function runBetweenSessions(
  profileId: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  logger.info(`Starting runBetweenSessions for profileId: ${profileId}`);

  // Fetch profile enhancements
  logger.info(`Fetching profile enhancements for profileId: ${profileId}`);
  const { data: profileEnhancements, error: profileEnhancementsError } =
    await supabase
      .from("profile_enhancements")
      .select("dossier")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(1);

  if (profileEnhancementsError) {
    logger.error(
      `Error fetching profile enhancements: ${profileEnhancementsError.message}`,
      profileEnhancementsError,
    );
    throw profileEnhancementsError;
  }

  const profileDossier = profileEnhancements?.[0]?.dossier;
  logger.info(
    `Profile dossier ${profileDossier ? "found" : "not found"} for profileId: ${profileId}`,
  );

  // Get meetings between sessions
  logger.info(`Getting meetings between sessions for profileId: ${profileId}`);
  const sessionsWithMeetings = await getMeetingsBetweenSessions(
    profileId,
    supabase,
  );
  logger.info(
    `Retrieved ${sessionsWithMeetings.length} session groups with meetings`,
  );

  const inBetweenSessionSummaries: SessionSummaryMap = new Map();

  // Process each session group
  logger.info(`Processing ${sessionsWithMeetings.length} session groups`);
  for (const sessionWithMeetings of sessionsWithMeetings) {
    // Skip sessions that already have annotations
    if (
      sessionWithMeetings.session &&
      Array.isArray(sessionWithMeetings.session.annotations) &&
      sessionWithMeetings.session.annotations.length > 0
    ) {
      logger.info(
        `Skipping session ${sessionWithMeetings.session.id} because it already has ${sessionWithMeetings.session.annotations.length} annotations.`,
      );
      continue;
    }

    const { session, meetings } = sessionWithMeetings;
    logger.info(
      `Processing session ${session?.id || "future session"} with ${meetings.length} meetings`,
    );

    // Group meetings by week
    const meetingsByWeek = await groupMeetingsByWeek(meetings, profileDossier);

    // Generate weekly summaries
    logger.info("Generating weekly summaries");
    const weekSummaries = await Promise.all(
      Array.from(meetingsByWeek.entries()).map(
        async ([weekKey, meetings]): Promise<
          [string, Awaited<ReturnType<typeof summarizeMeetings>> | null]
        > => {
          if (meetings.length === 0) {
            logger.info(`No meetings for week ${weekKey}, skipping summary`);
            return [weekKey, null];
          }

          logger.info(
            `Summarizing ${meetings.length} meetings for week ${weekKey}`,
          );
          const summary = await summarizeMeetings(
            meetings.map(({ summary }) => summary),
            profileDossier,
          );
          logger.info(`Completed summary for week ${weekKey}`);
          return [weekKey, summary];
        },
      ),
    );

    logger.info(
      `Generated ${weekSummaries.filter(([_, summary]) => summary !== null).length} weekly summaries`,
    );

    await processSessionTopics(
      session,
      weekSummaries,
      profileDossier,
      inBetweenSessionSummaries,
      supabase,
    );
  }

  logger.info(`Completed runBetweenSessions for profileId: ${profileId}`);
}

/**
 * Processes and generates suggested topics for a session
 *
 * @param session - The session to process
 * @param weekSummaries - Array of week summaries
 * @param profileDossier - Optional profile dossier for context
 * @param inBetweenSessionSummaries - Map of session summaries
 * @param supabase - The initialized Supabase client
 */
async function processSessionTopics(
  session: SessionWithMeetings["session"],
  weekSummaries: Array<
    [string, Awaited<ReturnType<typeof summarizeMeetings>> | null]
  >,
  profileDossier: string | null | undefined,
  inBetweenSessionSummaries: SessionSummaryMap,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  logger.info("Generating suggested topics using AI");

  // Define schema for generated topics
  const topicsSchema = z.object({
    email_subject: z
      .string()
      .describe(
        "A concise, engaging email subject line that highlights key leadership themes from recent meetings",
      ),
    email_greeting: z
      .string()
      .describe(
        "A personalized greeting that acknowledges recent activities or achievements",
      ),
    email_introduction: z
      .string()
      .describe(
        "A brief, contextual introduction that frames the upcoming coaching session and connects to recent leadership experiences",
      ),
    topics: z
      .array(
        z.object({
          what_happened: z
            .string()
            .describe(
              "A precise, evidence-based factual statement capturing the key observable event, pattern, or challenge that emerged from meetings, with specific details and appropriate citations",
            ),
          why_this_matters: z
            .string()
            .describe(
              "An insightful explanation that: 1) Connects the observation to specific leadership implications; 2) References relevant past coaching themes with concrete examples; 3) Frames a compelling, growth-oriented conversation opportunity; and 4) Offers a specific, actionable suggestion tied directly to the leader's development goals",
            ),
          thought_provoking_questions: z
            .array(z.string())
            .describe(
              "2-3 powerful, open-ended questions that prompt reflection on this topic before the coaching session",
            ),
          sources: SuggestedTopicSources,
        }),
      )
      .describe(
        "High-impact coaching topics derived from objective meeting observations, prioritized by leadership development relevance and growth potential",
      ),
    email_conclusion: z
      .string()
      .describe(
        "A warm, action-oriented closing that encourages preparation and sets positive expectations for the upcoming session",
      ),
  });

  const { object } = await generateObject({
    model: four_point_one,
    schemaName: "NextSessionSuggestedTopics",
    schemaDescription:
      "A strategically curated coaching email with high-impact topics for the next leadership development session",
    schema: topicsSchema,
    prompt: dedent`
      You are an elite AI coaching strategist for the Titan system, with exceptional skill in identifying pivotal leadership moments from meeting data. Your mission is to extract the most impactful coaching opportunities from inter-session meetings, transforming raw observations into powerful conversation catalysts for the next coaching session, formatted as a compelling email to the client.

      Your output must be:
      - Evidence-driven and meticulously sourced
      - Focused on high-leverage leadership development opportunities
      - Precisely traceable, with every insight citing its original source(s) in the format [<source_table_name>:<source_id>]
      - Strategically prioritized by growth potential and leadership impact
      - Formatted as a complete, ready-to-send coaching preparation email

      1. EMAIL STRUCTURE: Create a complete coaching preparation email with:
         - A compelling subject line that captures key themes
         - A personalized greeting that acknowledges recent activities
         - A brief introduction framing the upcoming session
         - 3-5 high-impact coaching topics (detailed below)
         - A warm, action-oriented conclusion

      2. TOPIC IDENTIFICATION: Analyze all inter-session meetings to identify critical leadership moments, particularly those that:
         - Form recurring patterns across multiple interactions
         - Reveal pivotal team dynamics or decision points
         - Demonstrate evolution in leadership challenges or approaches
         - Highlight specific strengths to leverage or growth edges to address
         - Connect to previously established coaching themes or development goals
      
      3. CRAFT PRECISE \`WHAT_HAPPENED\` STATEMENTS: For each topic, create a compelling \`what_happened\` that:
         - Captures the exact observable behavior or situation with specific details
         - Uses precise, concrete language that paints a clear picture
         - Incorporates relevant metrics, quotes, or specific examples when available
         - Maintains strict neutrality while providing rich context
         - Includes comprehensive source citations for full traceability
         - Mentions actual meeting names, participants, and specific contexts rather than using bracketed citations in the narrative
      
      4. DEVELOP INSIGHTFUL \`WHY_THIS_MATTERS\` EXPLANATIONS: For each topic, craft a powerful \`why_this_matters\` that:
         - Opens with a concise analysis connecting the observation to leadership effectiveness
         - Bridges to past coaching work with "In your coaching journey, you've been working on [specific theme] and this situation directly connects to that work because [precise connection]"
         - Presents a growth opportunity with "This presents a valuable opportunity to strengthen your [specific leadership capability]"
         - Concludes with an actionable suggestion: "Exploring with your coach how you might [specific approach] could significantly enhance your effectiveness in [specific leadership domain]"
         - Refers to specific meetings, people, and contexts by name rather than using bracketed citations
         
         The explanation should feel personalized, insightful, and immediately relevant to their leadership journey.

      5. CREATE THOUGHT-PROVOKING QUESTIONS: For each topic, develop 2-3 powerful questions that:
         - Are open-ended and non-leading
         - Prompt deep reflection before the coaching session
         - Connect directly to the specific leadership challenge or opportunity
         - Encourage exploration of both mindset and practical approaches
         - Invite the leader to prepare specific examples or situations to discuss

      6. STRATEGIC PRIORITIZATION: Sequence topics based on:
         - Alignment with established development goals
         - Frequency and consistency of the pattern
         - Potential impact on leadership effectiveness and team outcomes
         - Timeliness and actionability of the insight

      7. COMPREHENSIVE TRACEABILITY: Ensure every insight is anchored in specific evidence:
         - Include multiple, diverse citations when patterns span multiple meetings
         - Format all citations as [<source_table_name>:<source_id>] in the sources field only
         - Do not include bracketed citations in the actual text of what_happened or why_this_matters
         - Instead, mention meeting names, dates, participants, and contexts naturally in the narrative
         - Prioritize recent and recurring evidence

      EXEMPLARY EMAIL MODEL:

      <exemplary_email_model>
      Subject: Strategic Decision-Making & Team Dynamics: Key Themes for Our Next Session

      Hi Sarah,

      I hope this finds you well! I've been reviewing the insights from your recent meetings, and I'm impressed by how you've been navigating the Symbiont partnership challenges. I've identified several powerful themes for us to explore in our upcoming coaching session that build directly on your leadership development goals.

      TOPIC 1: INVENTORY MANAGEMENT DECISION-MAKING
      What Happened: In three separate meetings with Symbiont during March, you navigated inventory challenges including 40 excess prosthetic hands, creating uncertainty about future sales projections and revenue forecasting. Your discussion with Stanley during the quarterly review specifically highlighted concerns about inventory-demand mismatch and risks of over-reliance on a single buyer.

      Why This Matters: This situation directly tests your strategic decision-making under uncertainty. In your coaching journey, you've been working on building self-trust when facing ambiguous business situations rather than falling into analysis-paralysis. This presents a valuable opportunity to apply your developing proactive leadership approach. Exploring with your coach how you might create a structured decision framework for inventory management could transform this challenge into a demonstration of your growing strategic leadership capability.

      Questions to Consider:
      • What patterns do you notice in how you approach high-stakes decisions with incomplete information?
      • How might you balance data-driven analysis with your intuitive business sense in this situation?
      • What would a "confident decision" look like in this context, even with remaining uncertainties?

      TOPIC 2: QUALITY CONTROL LEADERSHIP
      What Happened: Quality control data from the April product review meeting shows recurring deterioration issues (chipping/flaking) in painted prosthetic hands, affecting even demonstration units. During the technical team standup, your team initiated a systematic response including incident logging, batch correlation, and technical investigation led by Vickas focused on root cause analysis.

      Why This Matters: Your response to this quality issue demonstrates your evolution from reactive to systems-oriented leadership. In your coaching work, you've been developing your capacity to use data as a leadership tool rather than relying solely on intuition. This situation offers a perfect opportunity to reinforce that growth edge. Discussing with your coach how you're designing accountability structures around your quality improvement initiative could significantly strengthen your ability to lead sustainable operational excellence.

      Questions to Consider:
      • How are you balancing immediate problem-solving with building long-term quality systems?
      • In what ways might this quality challenge be an opportunity to model your leadership values?
      • What specific leadership behaviors do you want your team to observe in how you handle this situation?

      I'm looking forward to our session on Thursday at 2pm. Consider reflecting on these topics beforehand, and please bring any specific examples or situations you'd like to explore further. This is a great opportunity to build on the momentum you've created in developing your strategic leadership approach.

      Warm regards,
      Your Coach
      </exemplary_email_model>

      CRITICAL REQUIREMENTS:
      1. Maintain absolute fidelity to the evidence - never speculate beyond what's directly observable
      2. Ensure every insight is actionable and directly relevant to leadership development
      3. Create a clear through-line from observation to coaching opportunity
      4. Balance supportive acknowledgment of growth with honest identification of development areas
      5. Craft language that inspires reflection and action rather than defensiveness
      6. DO NOT include bracketed citations [like:this] in the narrative text - instead, mention meeting names, participants, and contexts naturally
      7. Only include the bracketed citations in the separate sources field
      8. Create a complete, cohesive email that feels personalized and thoughtfully crafted

      ${profileDossier ? `\n\nFOUNDER CONTEXT (reference only for personalization, do not interpret beyond evidence):\n\n<profile_dossier>\n${profileDossier}\n</profile_dossier>` : ""}

      MEETING DATA (grouped by week between sessions):

      ${transformJsonIntoXml(
        weekSummaries.map(([weekKey, summary]) => ({
          week: weekKey,
          summary,
        })),
        "between-sessions-summaries",
      )}
    `,
    experimental_telemetry: {
      isEnabled: true,
    },
  });

  logger.info(
    `Generated ${object?.topics?.length || 0} suggested topics using AI`,
  );

  // Save suggested topics to the database if session is present and topics exist
  if (session && object?.topics?.length) {
    try {
      logger.info(
        `Saving ${object.topics.length} suggested topics for session ${session.id}`,
      );
      // Attach inBetweenSessionSummaries if available for this session
      const inBetweenSummary = inBetweenSessionSummaries.get(session.id);

      if (inBetweenSummary) {
        logger.debug(`Found in-between summary for session ${session.id}`);
      }

      const topicsToSave = object.topics.map((topic) => ({
        what_happened: topic.what_happened,
        why_this_matters: topic.why_this_matters,
        thought_provoking_questions: topic.thought_provoking_questions || [],
        type: "new" as const,
        sources: (topic.sources || []).map((src) => ({
          source_type: src.type,
          source_id: src.id,
        })),
      }));

      logger.debug(`Prepared ${topicsToSave.length} topics for database save`);

      // Save email metadata if available
      const emailMetadata = {
        email_subject: object.email_subject,
        email_greeting: object.email_greeting,
        email_introduction: object.email_introduction,
        email_conclusion: object.email_conclusion,
      };

      logger.debug(`Email metadata: ${JSON.stringify(emailMetadata)}`);

      await saveTopicsToDatabase(
        supabase,
        session.id,
        topicsToSave,
        // emailMetadata,
      );

      logger.info(
        `Successfully saved ${object.topics.length} suggested topics for session ${session.id}${inBetweenSummary ? ` | In-between summary: ${JSON.stringify(inBetweenSummary)}` : ""}`,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorObject = err instanceof Error ? err : new Error(String(err));

      logger.error(
        `Failed to save suggested topics for session ${session.id}: ${errorMessage}`,
        errorObject,
      );
    }
  } else {
    logger.info(
      `Skipping database save: ${session ? "Has session" : "No session"}, ${object?.topics?.length || 0} topics generated`,
    );
  }
}
