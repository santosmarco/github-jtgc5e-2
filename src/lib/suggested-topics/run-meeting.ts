import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import dayjs from "dayjs";
import _ from "lodash";
import { dedent } from "ts-dedent";
import { z } from "zod";

import { four_point_one } from "~/lib/ai/models/openai";
import { logger } from "~/lib/logging/server";
import type { Database, Json, Tables } from "~/lib/supabase/database.types";

import { transformJsonIntoXml } from "./utils";

/**
 * Type definitions using discriminated unions for better type safety
 */
type TableName = keyof Database["public"]["Tables"];

type ObservationTableName =
  | "meeting_entity_observations_v2"
  | "meeting_entity_relationship_observations_v2"
  | "meeting_observations_v2";

interface BaseEntity {
  readonly id: string;
  readonly _table_name: TableName;
}

export interface MeetingTopicDiscussed extends BaseEntity {
  readonly _table_name: "meeting_topics";
  readonly title: string;
  readonly summary: string;
  readonly vtt_start_segment_id: number | null;
  readonly vtt_end_segment_id: number | null;
  readonly created_at: string;
}

export interface MeetingActionItemAssignee extends BaseEntity {
  readonly _table_name: "entities";
  readonly name: string;
  readonly type: string | null;
  readonly attributes: Json;
}

export interface MeetingActionItem extends BaseEntity {
  readonly _table_name: "meeting_action_items";
  readonly text: string;
  readonly vtt_start_segment_id: number | null;
  readonly vtt_end_segment_id: number | null;
  readonly due_date: string | null;
  readonly is_completed: boolean;
  readonly completed_at: string | null;
  readonly is_deleted: boolean;
  readonly deleted_at: string | null;
  readonly created_at: string;
  readonly assignees: readonly MeetingActionItemAssignee[];
}

export interface MeetingTopicObservation extends BaseEntity {
  readonly _table_name: ObservationTableName;
  readonly observation: string;
}

export interface MeetingTopicEvent extends BaseEntity {
  readonly _table_name: "meeting_topic_events_v2";
  readonly event: string;
  readonly timestamp: string;
}

export interface MeetingTopicEntity extends BaseEntity {
  readonly _table_name: "meeting_entities_v2";
  readonly name: string;
  readonly type: string;
  readonly description: string | null;
  readonly observations: readonly MeetingTopicObservation[];
}

export interface MeetingTopicRelationship extends BaseEntity {
  readonly _table_name: "meeting_entity_relationships_v2";
  readonly subject_entity_name: string;
  readonly object_entity_name: string;
  readonly relationship_type: string;
  readonly observations: readonly MeetingTopicObservation[];
}

export interface MeetingTopic extends BaseEntity {
  readonly _table_name: "meeting_topics_v2";
  readonly title: string;
  readonly summary: string;
  readonly vtt_start_segment_id: number | null;
  readonly vtt_end_segment_id: number | null;
  readonly created_at: string;
  readonly events: readonly MeetingTopicEvent[];
  readonly entities: readonly MeetingTopicEntity[];
  readonly relationships: readonly MeetingTopicRelationship[];
  readonly observations: readonly MeetingTopicObservation[];
}

export interface MeetingMoment extends BaseEntity {
  readonly _table_name: "moments";
  readonly title: string | null;
  readonly summary: string | null;
  readonly vtt: string | null;
  readonly activity: string | null;
  readonly activity_type: string | null;
  readonly interestingness_score: number | null;
  readonly interestingness_score_why_not_lower_reason: string | null;
  readonly interestingness_score_why_not_higher_reason: string | null;
  readonly altitude_score: number | null;
  readonly altitude_score_why_not_lower_reason: string | null;
  readonly altitude_score_why_not_higher_reason: string | null;
  readonly qa_score: number | null;
  readonly qa_score_why_not_lower_reason: string | null;
  readonly qa_score_why_not_higher_reason: string | null;
  readonly final_score: number | null;
  readonly vtt_start_segment_id: number | null;
  readonly vtt_start_timestamp: string | null;
  readonly vtt_end_segment_id: number | null;
  readonly vtt_end_timestamp: string | null;
  readonly created_at: string;
}

export interface MeetingEvent extends BaseEntity {
  readonly _table_name: "calendar_events_v2";
  readonly event_type: string;
  readonly start_time: string;
  readonly end_time: string;
  readonly is_deleted: boolean;
  readonly created_at: string;
}

export interface Meeting extends BaseEntity {
  readonly _table_name: "meetings";
  readonly title: string | null;
  readonly summary: string | null;
  readonly vtt: string | null;
  readonly date: string | null;
  readonly event: MeetingEvent | null;
  readonly topics_discussed: readonly MeetingTopicDiscussed[];
  readonly action_items: readonly MeetingActionItem[];
  readonly topics: readonly MeetingTopic[];
  readonly moments: readonly MeetingMoment[];
}

export interface MeetingFilters {
  readonly apiVideoId?: string;
  readonly profileId?: string;
  readonly minDate?: string;
  readonly maxDate?: string;
}

/**
 * Types for raw Supabase query results
 */
type RawMeetingTopicObservation = Pick<
  Tables<"meeting_entity_observations_v2">,
  "id" | "observation" | "latest"
>;

type RawMeetingTopicEvent = Pick<
  Tables<"meeting_topic_events_v2">,
  "id" | "event" | "timestamp" | "latest"
>;

type RawMeetingTopicEntity = Pick<
  Tables<"meeting_entities_v2">,
  "id" | "name" | "type" | "description" | "latest"
> & {
  observations: RawMeetingTopicObservation[];
};

type RawMeetingTopicRelationship = Pick<
  Tables<"meeting_entity_relationships_v2">,
  | "id"
  | "subject_entity_name"
  | "object_entity_name"
  | "relationship_type"
  | "latest"
> & {
  observations: RawMeetingTopicObservation[];
};

type RawMeetingTopic = Pick<
  Tables<"meeting_topics_v2">,
  "id" | "index" | "title" | "summary" | "created_at" | "latest"
> & {
  start_segment_id: number | null;
  end_segment_id: number | null;
  events: RawMeetingTopicEvent[];
  entities: RawMeetingTopicEntity[];
  relationships: RawMeetingTopicRelationship[];
  observations: RawMeetingTopicObservation[];
};

type RawMeetingActionItemAssignee = {
  assignee: Pick<
    Tables<"entities">,
    "id" | "name" | "type" | "attributes" | "is_test"
  >;
};

type RawMeetingActionItem = Pick<
  Tables<"meeting_action_items">,
  | "id"
  | "text"
  | "vtt_start_segment_id"
  | "vtt_end_segment_id"
  | "due_date"
  | "completed_at"
  | "deleted_at"
  | "server_deleted_at"
  | "created_at"
> & {
  assignees: RawMeetingActionItemAssignee[];
};

type RawMeetingTopicDiscussed = Pick<
  Tables<"meeting_topics">,
  | "id"
  | "title"
  | "summary"
  | "vtt_start_segment_id"
  | "vtt_end_segment_id"
  | "server_deleted_at"
  | "created_at"
>;

type RawMeetingMoment = Pick<
  Tables<"moments">,
  | "id"
  | "title"
  | "summary"
  | "vtt"
  | "activity"
  | "activity_type"
  | "interestingness_score"
  | "interestingness_reasoning_not_lower"
  | "interestingness_reasoning_not_higher"
  | "altitude_score"
  | "altitude_score_reasoning_not_lower"
  | "altitude_score_reasoning_not_higher"
  | "qa_score"
  | "qa_reasoning_not_lower"
  | "qa_reasoning_not_higher"
  | "final_score"
  | "segment_start_timestamp"
  | "segment_end_timestamp"
  | "segment_id_sequence_start"
  | "segment_id_sequence_end"
  | "created_at"
  | "latest"
  | "relevant"
>;

type RawMeetingEvent = Pick<
  Tables<"calendar_events_v2">,
  "id" | "event_type" | "start_time" | "end_time" | "is_deleted" | "created_at"
>;

type RawMeeting = Pick<
  Tables<"meetings">,
  "video_api_id" | "name" | "summary" | "clean_vtt_file" | "date" | "profile_id"
> & {
  topics_discussed: RawMeetingTopicDiscussed[];
  action_items: RawMeetingActionItem[];
  topics: RawMeetingTopic[];
  moments: RawMeetingMoment[];
};

type RawMeetingBot = Pick<
  Tables<"meeting_bots_v2">,
  "id" | "api_video_id" | "created_at"
> & {
  event: RawMeetingEvent | null;
};

export const SuggestedTopicSourceType = z
  .enum([
    "meetings",
    "meeting_topics",
    "meeting_action_items",
    "entities",
    "meeting_topics_v2",
    "meeting_topic_events_v2",
    "meeting_entities_v2",
    "meeting_entity_observations_v2",
    "meeting_entity_relationships_v2",
    "meeting_entity_relationship_observations_v2",
    "meeting_observations_v2",
    "moments",
  ])
  .describe(
    "Identifies the specific database table or data structure from which the insight or observation was derived, enabling precise traceability and attribution of all generated content to its original source.",
  ) satisfies z.ZodType<TableName>;
export type SuggestedTopicSourceType = z.infer<typeof SuggestedTopicSourceType>;

export const SuggestedTopicSource = z
  .object({
    type: SuggestedTopicSourceType,
    id: z
      .string()
      .describe("Unique identifier of the source record in the database."),
    data: z
      .string()
      .describe(
        "JSON-stringified contextual data about the source, containing relevant fields and metadata that supports the analysis. This should include key attributes from the source record that provide context and evidence for the generated insights.",
      ),
  })
  .describe(
    "A traceable reference to original meeting data used as evidence for generated insights and observations.",
  );
export type SuggestedTopicSource = z.infer<typeof SuggestedTopicSource>;

export const SuggestedTopicSources = z
  .array(SuggestedTopicSource)
  .describe(
    "A comprehensive collection of all primary and secondary sources, evidence points, and contextual references meticulously compiled and utilized in the generation of this detailed analytical summary, enabling full traceability and verification of insights.",
  );
export type SuggestedTopicSources = z.infer<typeof SuggestedTopicSources>;

/**
 * Fetches and transforms a meeting from Supabase
 * @param apiVideoId - The video API identifier
 * @param supabase - Supabase client instance
 * @returns Promise resolving to a fully hydrated Meeting object
 * @throws Error if database queries fail
 */
export async function fetchMeeting(
  supabase: SupabaseClient<Database>,
  filters: MeetingFilters,
): Promise<Meeting[]> {
  logger.info(`Fetching meetings with filters: ${JSON.stringify(filters)}`);

  const query = supabase
    .from("meetings")
    .select(
      `
        video_api_id,
        name,
        summary,
        clean_vtt_file,
        date,
        profile_id,
        topics_discussed:meeting_topics(
          id,
          title,
          summary,
          vtt_start_segment_id,
          vtt_end_segment_id,
          server_deleted_at,
          created_at
        ),
        action_items:meeting_action_items(
          id,
          text,
          vtt_start_segment_id,
          vtt_end_segment_id,
          due_date,
          completed_at,
          deleted_at,
          server_deleted_at,
          created_at,
          assignees:meeting_action_item_assignees(
            assignee:entities(
              id,
              name,
              type,
              attributes,
              is_test
            )
          )
        ),
        topics:meeting_topics_v2(
          id,
          index,
          title,
          summary,
          start_segment_id,
          end_segment_id,
          created_at,
          latest,
          events:meeting_topic_events_v2(
            id,
            event,
            timestamp,
            latest
          ),
          entities:meeting_entities_v2(
            id,
            name,
            type,
            description,
            latest,
            observations:meeting_entity_observations_v2(
              id,
              observation,
              latest
            )
          ),
          relationships:meeting_entity_relationships_v2(
            id,
            subject_entity_name,
            object_entity_name,
            relationship_type,
            latest,
            observations:meeting_entity_relationship_observations_v2(
              id,
              observation,
              latest
            )
          ),
          observations:meeting_observations_v2(
            id,
            observation,
            latest
          )
        ),
        moments(
          id,
          title,
          summary,
          vtt,
          activity,
          activity_type,
          interestingness_score,
          interestingness_reasoning_not_lower,
          interestingness_reasoning_not_higher,
          altitude_score,
          altitude_score_reasoning_not_lower,
          altitude_score_reasoning_not_higher,
          qa_score,
          qa_reasoning_not_lower,
          qa_reasoning_not_higher,
          final_score,
          segment_start_timestamp,
          segment_end_timestamp,
          segment_id_sequence_start,
          segment_id_sequence_end,
          created_at,
          latest,
          relevant
        )
      `,
    )
    .is("topics_discussed.server_deleted_at", null)
    .is("action_items.server_deleted_at", null)
    .eq("action_items.assignees.assignee.is_test", false)
    .eq("topics.latest", true)
    .eq("topics.events.latest", true)
    .eq("topics.entities.latest", true)
    .eq("topics.entities.observations.latest", true)
    .eq("topics.relationships.latest", true)
    .eq("topics.relationships.observations.latest", true)
    .eq("topics.observations.latest", true)
    .eq("moments.latest", true)
    .eq("moments.relevant", true);

  if (filters.apiVideoId) {
    logger.info(`Filtering by apiVideoId: ${filters.apiVideoId}`);
    query.eq("video_api_id", filters.apiVideoId);
  }
  if (filters.profileId) {
    logger.info(`Filtering by profileId: ${filters.profileId}`);
    query.eq("profile_id", filters.profileId);
  }
  if (filters.minDate) {
    logger.info(`Filtering by minDate: ${filters.minDate}`);
    query.gte("date", filters.minDate);
  }
  if (filters.maxDate) {
    logger.info(`Filtering by maxDate: ${filters.maxDate}`);
    query.lte("date", filters.maxDate);
  }

  const { data: meetings, error: meetingsError } = await query;

  if (meetingsError) {
    logger.error(`Error fetching meetings: ${meetingsError.message}`, {
      error: meetingsError,
    });
    throw meetingsError;
  }

  logger.info(`Found ${meetings.length} meetings matching filters`);

  const meetingsWithMeetingBots = await Promise.all(
    meetings.map(
      async (
        meeting,
      ): Promise<RawMeeting & { meeting_bot: RawMeetingBot | null }> => {
        logger.info(
          `Fetching meeting bot for meeting: ${meeting.video_api_id}`,
        );
        const { data: meetingBots, error: meetingBotsError } = await supabase
          .from("meeting_bots_v2")
          .select(
            `
              id,
              api_video_id,
              created_at,
              event:calendar_events_v2(
                id,
                event_type,
                start_time,
                end_time,
                is_deleted,
                created_at
              )
            `,
          )
          .eq("api_video_id", meeting.video_api_id)
          .not("event_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1);

        if (meetingBotsError) {
          logger.error(
            `Error fetching meeting bot for ${meeting.video_api_id}: ${meetingBotsError.message}`,
            { error: meetingBotsError },
          );
          return { ...meeting, meeting_bot: null };
        }

        if (!meetingBots[0]) {
          logger.info(
            `No meeting bot found for meeting: ${meeting.video_api_id}`,
          );
          return { ...meeting, meeting_bot: null };
        }

        logger.info(
          `Found meeting bot for meeting: ${meeting.video_api_id}, bot id: ${meetingBots[0].id}`,
        );
        return { ...meeting, meeting_bot: meetingBots[0] };
      },
    ),
  );

  const transformedMeetings = meetingsWithMeetingBots.map(transformMeetingData);
  logger.info(
    `Successfully transformed ${transformedMeetings.length} meetings`,
  );

  return transformedMeetings;
}

/**
 * Transforms raw Supabase data to our domain model
 * @param rawMeeting - Raw meeting data from Supabase
 * @param rawMeetingBot - Raw meeting bot data from Supabase
 * @returns Fully transformed Meeting object
 */
function transformMeetingData(
  rawMeeting: RawMeeting & { meeting_bot: RawMeetingBot | null },
): Meeting {
  return {
    id: rawMeeting.video_api_id,
    title: rawMeeting.name,
    summary: rawMeeting.summary,
    vtt: rawMeeting.clean_vtt_file,
    date: dayjs(rawMeeting.date).toISOString(),
    event: rawMeeting.meeting_bot?.event
      ? transformEvent(rawMeeting.meeting_bot.event)
      : null,
    topics_discussed: rawMeeting.topics_discussed.map(transformTopicDiscussed),
    action_items: rawMeeting.action_items.map(transformActionItem),
    topics: _.orderBy(rawMeeting.topics, [(topic) => topic.index], ["asc"]).map(
      transformTopic,
    ),
    moments: rawMeeting.moments.map(transformMoment),
    _table_name: "meetings",
  };
}

/**
 * Transforms a raw meeting event to the domain model
 */
function transformEvent(event: RawMeetingEvent): MeetingEvent {
  return {
    id: event.id,
    event_type: event.event_type ?? "meeting",
    start_time: event.start_time,
    end_time: event.end_time,
    is_deleted: event.is_deleted,
    created_at: event.created_at,
    _table_name: "calendar_events_v2",
  };
}

/**
 * Transforms a raw topic discussed to the domain model
 */
function transformTopicDiscussed(
  topicDiscussed: RawMeetingTopicDiscussed,
): MeetingTopicDiscussed {
  return {
    id: topicDiscussed.id,
    title: topicDiscussed.title,
    summary: topicDiscussed.summary,
    vtt_start_segment_id: topicDiscussed.vtt_start_segment_id,
    vtt_end_segment_id: topicDiscussed.vtt_end_segment_id,
    created_at: topicDiscussed.created_at,
    _table_name: "meeting_topics",
  };
}

/**
 * Transforms a raw action item to the domain model
 */
function transformActionItem(
  actionItem: RawMeetingActionItem,
): MeetingActionItem {
  return {
    id: actionItem.id,
    text: actionItem.text,
    vtt_start_segment_id: actionItem.vtt_start_segment_id,
    vtt_end_segment_id: actionItem.vtt_end_segment_id,
    due_date: actionItem.due_date,
    is_completed: Boolean(actionItem.completed_at),
    completed_at: actionItem.completed_at,
    is_deleted: Boolean(actionItem.deleted_at),
    deleted_at: actionItem.deleted_at,
    created_at: actionItem.created_at,
    assignees: actionItem.assignees.map(transformActionItemAssignee),
    _table_name: "meeting_action_items",
  };
}

/**
 * Transforms a raw action item assignee to the domain model
 */
function transformActionItemAssignee(
  assignee: RawMeetingActionItemAssignee,
): MeetingActionItemAssignee {
  return {
    id: assignee.assignee.id,
    name: assignee.assignee.name,
    type: assignee.assignee.type,
    attributes: assignee.assignee.attributes,
    _table_name: "entities",
  };
}

/**
 * Transforms a raw topic to the domain model
 */
function transformTopic(topic: RawMeetingTopic): MeetingTopic {
  return {
    id: topic.id,
    title: topic.title,
    summary: topic.summary,
    vtt_start_segment_id: topic.start_segment_id,
    vtt_end_segment_id: topic.end_segment_id,
    created_at: topic.created_at,
    events: _.orderBy(
      topic.events,
      [(event) => dayjs(event.timestamp).unix()],
      ["asc"],
    ).map(transformTopicEvent),
    entities: topic.entities.map(transformTopicEntity),
    relationships: topic.relationships.map(transformTopicRelationship),
    observations: topic.observations.map(
      transformTopicObservation("meeting_observations_v2"),
    ),
    _table_name: "meeting_topics_v2",
  };
}

/**
 * Transforms a raw topic event to the domain model
 */
function transformTopicEvent(event: RawMeetingTopicEvent): MeetingTopicEvent {
  return {
    id: event.id,
    event: event.event,
    timestamp: event.timestamp,
    _table_name: "meeting_topic_events_v2",
  };
}

/**
 * Creates a transformer function for topic observations with the correct table name
 */
function transformTopicObservation(
  tableName: ObservationTableName,
): (observation: RawMeetingTopicObservation) => MeetingTopicObservation {
  return (observation: RawMeetingTopicObservation): MeetingTopicObservation => {
    return {
      id: observation.id,
      observation: observation.observation,
      _table_name: tableName,
    };
  };
}

/**
 * Transforms a raw topic entity to the domain model
 */
function transformTopicEntity(
  entity: RawMeetingTopicEntity,
): MeetingTopicEntity {
  return {
    id: entity.id,
    name: entity.name,
    type: entity.type,
    description: entity.description,
    observations: entity.observations.map(
      transformTopicObservation("meeting_entity_observations_v2"),
    ),
    _table_name: "meeting_entities_v2",
  };
}

/**
 * Transforms a raw topic relationship to the domain model
 */
function transformTopicRelationship(
  relationship: RawMeetingTopicRelationship,
): MeetingTopicRelationship {
  return {
    id: relationship.id,
    subject_entity_name: relationship.subject_entity_name,
    object_entity_name: relationship.object_entity_name,
    relationship_type: relationship.relationship_type,
    observations: relationship.observations.map(
      transformTopicObservation("meeting_entity_relationship_observations_v2"),
    ),
    _table_name: "meeting_entity_relationships_v2",
  };
}

/**
 * Transforms a raw moment to the domain model
 */
function transformMoment(moment: RawMeetingMoment): MeetingMoment {
  return {
    id: moment.id,
    title: moment.title,
    summary: moment.summary,
    vtt: moment.vtt,
    activity: moment.activity,
    activity_type: moment.activity_type,
    interestingness_score: moment.interestingness_score,
    interestingness_score_why_not_lower_reason:
      moment.interestingness_reasoning_not_lower,
    interestingness_score_why_not_higher_reason:
      moment.interestingness_reasoning_not_higher,
    altitude_score: moment.altitude_score,
    altitude_score_why_not_lower_reason:
      moment.altitude_score_reasoning_not_lower,
    altitude_score_why_not_higher_reason:
      moment.altitude_score_reasoning_not_higher,
    qa_score: moment.qa_score,
    qa_score_why_not_lower_reason: moment.qa_reasoning_not_lower,
    qa_score_why_not_higher_reason: moment.qa_reasoning_not_higher,
    final_score: moment.final_score,
    vtt_start_segment_id: moment.segment_id_sequence_start,
    vtt_start_timestamp: moment.segment_start_timestamp,
    vtt_end_segment_id: moment.segment_id_sequence_end,
    vtt_end_timestamp: moment.segment_end_timestamp,
    created_at: moment.created_at,
    _table_name: "moments",
  };
}

export async function summarizeMeeting(
  meeting: Meeting,
  profileDossier: string | null | undefined,
) {
  try {
    const { object } = await generateObject({
      model: four_point_one,
      schemaName: "MeetingSummary",
      schemaDescription:
        "A comprehensive, evidence-based analysis of a meeting with actionable leadership insights",
      schema: z.object({
        factualSummary: z
          .string()
          .describe(
            "Objective, journalistic summary that presents verifiable facts without interpretation, documenting key discussions, decisions, and interactions chronologically",
          ),
        coachingSummary: z
          .string()
          .describe(
            "Development-focused analysis highlighting specific leadership behaviors, patterns, and their impacts, identifying concrete growth opportunities while emphasizing both strengths and areas for improvement",
          ),
        coachingRelevantTopics: z.array(
          z.object({
            topic: z
              .string()
              .describe(
                "Specific, clearly defined coaching-relevant topic with direct leadership implications",
              ),
            description: z
              .string()
              .describe(
                "Evidence-based description detailing how this topic manifested, with specific examples and citations",
              ),
            relevanceToCoaching: z
              .string()
              .describe(
                "Analysis of why this topic represents a significant leadership development opportunity, connecting to broader leadership competencies",
              ),
            evidencePoints: z
              .array(z.string())
              .describe(
                "Concrete, diverse examples from the meeting that substantiate this topic, each with precise citations",
              ),
          }),
        ),
        leadershipBehaviors: z.array(
          z.object({
            behavior: z
              .string()
              .describe(
                "Observable, specific leadership behavior demonstrated with supporting evidence",
              ),
            context: z
              .string()
              .describe(
                "Detailed situational context explaining when and how this behavior was exhibited, with citations",
              ),
            impact: z
              .string()
              .describe(
                "Evidence-based analysis of how this behavior influenced team dynamics, decision-making, or meeting outcomes",
              ),
          }),
        ),
        sourcesUsed: SuggestedTopicSources,
      }),
      prompt: dedent`
        You are an expert leadership coach and meeting analyst for the Titan system. Your task is to analyze a meeting transcript and extract actionable leadership insights while maintaining absolute factual accuracy and comprehensive citation.

        ## ANALYSIS REQUIREMENTS
        Your analysis must be:
        - Evidence-based with specific citations for EVERY claim using the format [<source_table_name>:<source_id>]
        - Balanced between strengths and growth areas
        - Rich with specific examples that illustrate each point
        - Focused on patterns most relevant for leadership development
        - Free from judgment or prescriptive recommendations
        
        ## REQUIRED OUTPUTS

        1. FACTUAL SUMMARY (Objective Analysis):
           - Write in a neutral, journalistic style that presents only verifiable facts
           - Document key discussions, decisions, and interactions chronologically
           - Maintain complete objectivity without interpretation or bias
           - Include comprehensive source citations for all statements
           - Focus on what actually happened, not what should have happened

        2. COACHING SUMMARY (Development-Oriented Analysis):
           - Highlight specific leadership behaviors, patterns, and their impacts
           - Identify concrete development opportunities supported by evidence
           - Connect observations to potential growth areas without being prescriptive
           - Emphasize both strengths demonstrated and areas for potential improvement
           - Include comprehensive source citations for all statements

        3. COACHING-RELEVANT TOPICS:
           Identify 3-5 topics with direct leadership development relevance, such as:
           - Decision-making processes and patterns
           - Communication effectiveness and clarity
           - Strategic thinking vs. tactical execution
           - Team dynamics and relationship management
           - Emotional intelligence demonstrations
           - Delegation and empowerment behaviors
           - Conflict management approaches
           - Adaptability to changing circumstances
           
           For each topic, provide:
           - Clear topic name with supporting evidence
           - Detailed description with multiple citations
           - Explicit connection to leadership development
           - 3+ concrete evidence points from different parts of the meeting

        4. LEADERSHIP BEHAVIORS:
           Document 3-5 specific, observable leadership behaviors, including:
           - How decisions were made and communicated
           - Communication patterns and their effectiveness
           - Responses to challenges or unexpected situations
           - Team engagement and relationship management
           - Strategic vs. tactical thinking balance
           
           For each behavior, provide:
           - Specific behavior name with supporting evidence
           - Detailed context with multiple citations
           - Evidence-based impact analysis on meeting outcomes or team dynamics

        ## CITATION REQUIREMENTS
        CRITICAL: Every statement in your response MUST include at least one citation in the format \`... [<source_table_name>:<source_id>] ...\`. Maximize the number of unique sources cited throughout your analysis. Always cite your sources using this exact format.

        Examples of well-cited analysis:
           - "The leader demonstrated exceptional active listening during the budget discussion [meeting_topics_v2:<topic_id>], asking clarifying questions and acknowledging team concerns [meeting_entity_observations_v2:<observation_id>] before making any decisions, which noticeably increased team engagement [moments:<moment_id>]."
           - "When addressing product roadmap challenges [meeting_topics:<topic_id>], the leader balanced stakeholder needs with technical constraints [moments:<moment_id>], showing strategic prioritization abilities while maintaining team alignment [meeting_entity_relationship_observations_v2:<relationship_observation_id>]."
           - "A notable tension emerged between marketing and engineering teams [meeting_entity_relationship_observations_v2:<relationship_observation_id>] during the launch timeline discussion [meeting_observations_v2:<observation_id>], presenting a coaching opportunity around cross-functional collaboration and conflict resolution."
           - "The leader's feedback approach during the performance review segment [moments:<moment_id>] was direct yet empathetic [meeting_topics_v2:<topic_id>], demonstrating emotional intelligence while maintaining accountability standards [meeting_entity_observations_v2:<observation_id>]."
        
        Remember that this analysis will inform coaching sessions and track leadership development over time. Your analysis must be thorough, factual, and preserve the full context of the meeting while highlighting elements most relevant to professional development.
        
        ${profileDossier ? `\n\nHere is contextual information about the founder that may provide additional insights (use only as reference, do not interpret or make assumptions):\n\n<profile_dossier>\n${profileDossier}\n</profile_dossier>` : ""}
        
        Meeting to analyze:
        
        ${transformJsonIntoXml(meeting, "meeting")}
      `,
      experimental_telemetry: {
        isEnabled: true,
      },
    });

    return object;
  } catch (error) {
    logger.error(
      `Error generating meeting summary for meeting ${meeting.id}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

export async function summarizeMeetings(
  meetingSummaries: Array<Awaited<ReturnType<typeof summarizeMeeting>>>,
  profileDossier: string | null | undefined,
) {
  try {
    const validSummaries = meetingSummaries.filter(
      (summary): summary is NonNullable<typeof summary> => summary !== null,
    );

    if (validSummaries.length === 0) {
      logger.warn("No valid meeting summaries found, returning null");
      return null;
    }

    const { object } = await generateObject({
      model: four_point_one,
      schemaName: "MeetingsSummary",
      schemaDescription:
        "A comprehensive summary of multiple meetings with both factual and coaching perspectives",
      schema: z.object({
        factualOverallSummary: z
          .string()
          .describe(
            "Comprehensive, objective summary of all meetings that presents verifiable facts in a journalistic style",
          ),
        coachingOverallSummary: z
          .string()
          .describe(
            "Insightful, development-focused summary that identifies meaningful patterns, leadership trends, and specific growth opportunities across meetings",
          ),
        recurringTopics: z.array(
          z.object({
            topic: z
              .string()
              .describe(
                "Specific, clearly defined recurring topic identified across multiple meetings",
              ),
            frequency: z
              .number()
              .describe(
                "Precise count of meetings where this topic appeared with supporting evidence",
              ),
            progression: z
              .string()
              .describe(
                "Detailed analysis of how this topic evolved, transformed, or developed across the meeting timeline",
              ),
            significance: z
              .string()
              .describe(
                "Evidence-based explanation of why this recurring topic matters for leadership development and coaching outcomes",
              ),
          }),
        ),
        leadershipTrends: z.array(
          z.object({
            trend: z
              .string()
              .describe(
                "Specific, observable leadership behavior or pattern consistently demonstrated across meetings",
              ),
            examples: z
              .array(z.string())
              .describe(
                "Concrete, diverse examples from different meetings that illustrate this trend with precise citations",
              ),
            developmentOpportunity: z
              .string()
              .describe(
                "Actionable, growth-oriented coaching opportunity directly connected to this leadership trend with supporting evidence",
              ),
          }),
        ),
        sourcesUsed: SuggestedTopicSources,
      }),
      prompt: dedent`
        You are an expert leadership coach and meeting analyst for the Titan system. Your task is to synthesize multiple meeting summaries into actionable coaching insights while maintaining absolute factual accuracy and objectivity.

        ## ANALYSIS REQUIREMENTS
        Analyze the provided meeting summaries to identify patterns, trends, and recurring themes that would be valuable for leadership coaching. Your analysis must be:
        - Evidence-based with specific citations for every claim
        - Balanced between strengths and growth areas
        - Focused on patterns most relevant for leadership development
        - Free from judgment or prescriptive recommendations
        - Rich with specific examples that illustrate each point

        ## REQUIRED OUTPUTS

        1. FACTUAL OVERALL SUMMARY (Objective Meta-Summary):
           - Write in a neutral, journalistic style that presents only verifiable facts
           - Document key discussions, decisions, and interactions chronologically
           - Maintain complete objectivity without interpretation or bias
           - Include comprehensive source citations for all statements, particularly for \`meetings\`, \`moments\`, and all other tables.
           - Focus on what actually happened, not what should have happened

        2. COACHING OVERALL SUMMARY (Development-Oriented Meta-Summary):
           - Highlight specific leadership behaviors, patterns, and their impacts
           - Identify concrete development opportunities supported by evidence
           - Connect observations to potential growth areas without being prescriptive
           - Emphasize both strengths demonstrated and areas for potential improvement
           - Include comprehensive source citations for all statements, particularly for \`meetings\`, \`moments\`, and all other tables.

        3. RECURRING TOPICS:
           - Identify topics that appear across multiple meetings
           - Document exact frequency with specific meeting references
           - Trace how each topic evolved or changed over time
           - Explain the significance of each recurring topic for leadership development
           - Prioritize topics with the greatest coaching relevance

        4. LEADERSHIP TRENDS:
           - Document consistent leadership behaviors with specific examples
           - Provide diverse examples from different meetings for each trend
           - Connect each trend to concrete development opportunities
           - Balance identification of strengths and growth areas
           - Ensure each trend is substantiated by multiple meeting sources

        ## ANALYTICAL FOCUS AREAS
        When analyzing these meetings, pay special attention to:
        - Decision-making processes: How are decisions made? How has this evolved?
        - Communication patterns: Style, clarity, frequency, and effectiveness
        - Challenge response: How are obstacles addressed? What's the problem-solving approach?
        - Team dynamics: How does the leader interact with and influence others?
        - Strategic thinking: Long-term vision vs. tactical execution
        - Emotional intelligence: Self-awareness, empathy, and relationship management
        - Adaptability: How does the leader respond to changing circumstances?
        - Delegation and empowerment: How are responsibilities distributed?

        ## CITATION REQUIREMENTS
        CRITICAL: Every statement in your response MUST include at least one citation in the format \`... [<source_table_name>:<source_id>] ...\`. Maximize the number of unique sources cited throughout your analysis. Always cite your sources using this exact format.

        Examples of well-cited analysis:
           - "<founder_name> consistently demonstrated active listening techniques [meeting_topics_v2:<id_of_topic>] during team discussions, which noticeably increased participation from quieter team members [meeting_entity_observations_v2:<id_of_observation>]. This pattern continued through subsequent meetings [moments:<id_of_moment>] and represents a significant strength in their inclusive leadership approach."
           - "<founder_name> has a recurring challenge with project timeline estimation [meeting_topics:<id_of_topic>] emerged across three consecutive meetings, with the leader initially responding defensively [meeting_entity_observations_v2:<id_of_observation>] but gradually shifting to a more collaborative problem-solving approach [meeting_entity_relationship_observations_v2:<id_of_relationship_observation>]. This evolution demonstrates growing self-awareness and adaptability."
           - "<founder_name>'s communication style transformed from primarily directive [meeting_observations_v2:<id_of_observation>] to increasingly consultative [meeting_entity_relationship_observations_v2:<id_of_relationship_observation>] when discussing strategic initiatives, resulting in more diverse perspectives being incorporated into final decisions [meeting_topics_v2:<id_of_topic>]."
        
        ${profileDossier ? `\n\nHere is contextual information about the founder that may provide additional insights (use only as reference, do not interpret or make assumptions):\n\n<profile_dossier>\n${profileDossier}\n</profile_dossier>` : ""}
        
        Meeting summaries to analyze:
        
        ${transformJsonIntoXml(validSummaries, "meeting_summaries")}
      `,
      experimental_telemetry: {
        isEnabled: true,
      },
    });

    return object;
  } catch (error) {
    logger.error(
      `Error generating multiple meetings summary: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}
