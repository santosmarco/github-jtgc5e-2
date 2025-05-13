import { z } from "zod";

import { JsonValue as Json } from "~/lib/schemas/utils";

export const EmailTemplateType = z.union([
  z.literal("skill-report-ready-founder"),
  z.literal("skill-report-ready-manager"),
]);
export type EmailTemplateType = z.infer<typeof EmailTemplateType>;

export const EventType = z.union([
  z.literal("meeting"),
  z.literal("coaching_session"),
  z.literal("one_on_one"),
  z.literal("external"),
  z.literal("team"),
]);
export type EventType = z.infer<typeof EventType>;

export const GoalSignalDirectionType = z.union([
  z.literal("positive"),
  z.literal("negative"),
]);
export type GoalSignalDirectionType = z.infer<typeof GoalSignalDirectionType>;

export const IconEnum = z.union([
  z.literal("Brain"),
  z.literal("GitCommitHorizontal"),
  z.literal("Heart"),
  z.literal("MessageSquare"),
  z.literal("Goal"),
  z.literal("Users"),
  z.literal("UserCheck"),
  z.literal("MessageCircle"),
  z.literal("Scissors"),
  z.literal("Activity"),
  z.literal("SendToBack"),
]);
export type IconEnum = z.infer<typeof IconEnum>;

export const MeetingBotErrorCodeType = z.union([
  z.literal("CannotJoinMeeting"),
  z.literal("TimeoutWaitingToStart"),
  z.literal("BotNotAccepted"),
  z.literal("InternalError"),
  z.literal("InvalidMeetingUrl"),
]);
export type MeetingBotErrorCodeType = z.infer<typeof MeetingBotErrorCodeType>;

export const MeetingBotReportingStatus = z.union([
  z.literal("failed"),
  z.literal("partial"),
  z.literal("pending"),
  z.literal("skipped"),
  z.literal("completed"),
  z.literal("plsfix"),
]);
export type MeetingBotReportingStatus = z.infer<
  typeof MeetingBotReportingStatus
>;

export const MeetingBotStatusType = z.union([
  z.literal("joining_call"),
  z.literal("in_waiting_room"),
  z.literal("in_call_not_recording"),
  z.literal("in_call_recording"),
  z.literal("call_ended"),
  z.literal("ready"),
  z.literal("recording_permission_allowed"),
  z.literal("recording_permission_denied"),
  z.literal("done"),
  z.literal("fatal"),
  z.literal("analysis_done"),
  z.literal("analysis_failed"),
  z.literal("media_expired"),
  z.literal("recording_done"),
  z.literal("in_waiting_for_host"),
]);
export type MeetingBotStatusType = z.infer<typeof MeetingBotStatusType>;

export const MeetingBotsProviderEnum = z.union([
  z.literal("meeting_baas"),
  z.literal("recall"),
]);
export type MeetingBotsProviderEnum = z.infer<typeof MeetingBotsProviderEnum>;

export const MeetingPlatformEnum = z.union([
  z.literal("zoom"),
  z.literal("google_meet"),
  z.literal("goto_meeting"),
  z.literal("microsoft_teams"),
  z.literal("microsoft_teams_live"),
  z.literal("webex"),
  z.literal("chime_sdk"),
  z.literal("webrtc"),
  z.literal("slack_huddle_observer"),
]);
export type MeetingPlatformEnum = z.infer<typeof MeetingPlatformEnum>;

export const MomentReactionType = z.union([
  z.literal("thumbs_up"),
  z.literal("thumbs_down"),
]);
export type MomentReactionType = z.infer<typeof MomentReactionType>;

export const NoteColor = z.union([
  z.literal("yellow"),
  z.literal("blue"),
  z.literal("green"),
  z.literal("pink"),
  z.literal("purple"),
]);
export type NoteColor = z.infer<typeof NoteColor>;

export const OnboardingTaskNameEnum = z.union([
  z.literal("explore_team_conflict_chat"),
  z.literal("explore_feedback_chat"),
  z.literal("explore_discovery_chat"),
  z.literal("ask_follow_up"),
  z.literal("watch_moment"),
  z.literal("use_moments_command"),
  z.literal("reset_chat"),
]);
export type OnboardingTaskNameEnum = z.infer<typeof OnboardingTaskNameEnum>;

export const ProcessingStatus = z.union([
  z.literal("pending"),
  z.literal("completed"),
  z.literal("failed"),
  z.literal("partial"),
  z.literal("skipped"),
]);
export type ProcessingStatus = z.infer<typeof ProcessingStatus>;

export const ProfileStatusEnum = z.union([
  z.literal("active"),
  z.literal("pending"),
  z.literal("inactive"),
]);
export type ProfileStatusEnum = z.infer<typeof ProfileStatusEnum>;

export const RecallCalendarPlatformType = z.union([
  z.literal("google_calendar"),
  z.literal("microsoft_outlook"),
]);
export type RecallCalendarPlatformType = z.infer<
  typeof RecallCalendarPlatformType
>;

export const ReportProcessingStatusType = z.union([
  z.literal("pending"),
  z.literal("completed"),
  z.literal("failed"),
]);
export type ReportProcessingStatusType = z.infer<
  typeof ReportProcessingStatusType
>;

export const SourceType = z.literal("moment");
export type SourceType = z.infer<typeof SourceType>;

export const UserRoleEnum = z.union([
  z.literal("user"),
  z.literal("coach"),
  z.literal("admin"),
]);
export type UserRoleEnum = z.infer<typeof UserRoleEnum>;

export const CalendarEventsInsert = z.object({
  created_at: z.string(),
  end_time: z.string(),
  event_type: EventType.optional().nullable(),
  ical_uid: z.string(),
  id: z.string().optional(),
  is_deleted: z.boolean(),
  meeting_platform: MeetingPlatformEnum.optional().nullable(),
  meeting_url: z.string().optional().nullable(),
  platform: RecallCalendarPlatformType.optional().nullable(),
  platform_id: z.string(),
  raw: Json.optional().nullable(),
  recall_calendar_id: z.string(),
  start_time: z.string(),
  updated_at: z.string(),
});
export type CalendarEventsInsert = z.infer<typeof CalendarEventsInsert>;

export const CalendarEventsUpdate = z.object({
  created_at: z.string().optional(),
  end_time: z.string().optional(),
  event_type: EventType.optional().nullable(),
  ical_uid: z.string().optional(),
  id: z.string().optional(),
  is_deleted: z.boolean().optional(),
  meeting_platform: MeetingPlatformEnum.optional().nullable(),
  meeting_url: z.string().optional().nullable(),
  platform: RecallCalendarPlatformType.optional().nullable(),
  platform_id: z.string().optional(),
  raw: Json.optional().nullable(),
  recall_calendar_id: z.string().optional(),
  start_time: z.string().optional(),
  updated_at: z.string().optional(),
});
export type CalendarEventsUpdate = z.infer<typeof CalendarEventsUpdate>;

export const CalendarEventsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("calendar_events_recall_calendar_id_fkey"),
    columns: z.tuple([z.literal("recall_calendar_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("recall_calendars"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type CalendarEventsRelationships = z.infer<
  typeof CalendarEventsRelationships
>;

export const CalendarEventsV2Row = z.object({
  created_at: z.string(),
  end_time: z.string(),
  event_type: EventType.nullable(),
  ical_uid: z.string(),
  id: z.string(),
  is_deleted: z.boolean(),
  meeting_platform: MeetingPlatformEnum.nullable(),
  meeting_url: z.string().nullable(),
  platform: RecallCalendarPlatformType.nullable(),
  platform_id: z.string(),
  profile_id: z.string(),
  raw: Json.nullable(),
  recall_calendar_id: z.string(),
  should_join_user_override: z.boolean().nullable(),
  start_time: z.string(),
  tags: z.array(z.string()).nullable(),
  updated_at: z.string(),
});
export type CalendarEventsV2Row = z.infer<typeof CalendarEventsV2Row>;

export const CalendarEventsV2Insert = z.object({
  created_at: z.string(),
  end_time: z.string(),
  event_type: EventType.optional().nullable(),
  ical_uid: z.string(),
  id: z.string().optional(),
  is_deleted: z.boolean(),
  meeting_platform: MeetingPlatformEnum.optional().nullable(),
  meeting_url: z.string().optional().nullable(),
  platform: RecallCalendarPlatformType.optional().nullable(),
  platform_id: z.string(),
  profile_id: z.string(),
  raw: Json.optional().nullable(),
  recall_calendar_id: z.string(),
  should_join_user_override: z.boolean().optional().nullable(),
  start_time: z.string(),
  tags: z.array(z.string()).optional().nullable(),
  updated_at: z.string(),
});
export type CalendarEventsV2Insert = z.infer<typeof CalendarEventsV2Insert>;

export const CalendarEventsV2Update = z.object({
  created_at: z.string().optional(),
  end_time: z.string().optional(),
  event_type: EventType.optional().nullable(),
  ical_uid: z.string().optional(),
  id: z.string().optional(),
  is_deleted: z.boolean().optional(),
  meeting_platform: MeetingPlatformEnum.optional().nullable(),
  meeting_url: z.string().optional().nullable(),
  platform: RecallCalendarPlatformType.optional().nullable(),
  platform_id: z.string().optional(),
  profile_id: z.string().optional(),
  raw: Json.optional().nullable(),
  recall_calendar_id: z.string().optional(),
  should_join_user_override: z.boolean().optional().nullable(),
  start_time: z.string().optional(),
  tags: z.array(z.string()).optional().nullable(),
  updated_at: z.string().optional(),
});
export type CalendarEventsV2Update = z.infer<typeof CalendarEventsV2Update>;

export const CalendarEventsV2Relationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("calendar_events_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("calendar_events_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("calendar_events_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("calendar_events_v2_recall_calendar_id_fkey1"),
    columns: z.tuple([z.literal("recall_calendar_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("recall_calendars_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type CalendarEventsV2Relationships = z.infer<
  typeof CalendarEventsV2Relationships
>;

export const CalendarIntegrationsRow = z.object({
  email: z.string(),
  google_id: z.string(),
  id: z.string(),
  name: z.string(),
  resource_id: z.string().nullable(),
  user_id: z.string(),
  uuid: z.string().nullable(),
  watch_expiry: z.string().nullable(),
});
export type CalendarIntegrationsRow = z.infer<typeof CalendarIntegrationsRow>;

export const CalendarIntegrationsInsert = z.object({
  email: z.string(),
  google_id: z.string(),
  id: z.string().optional(),
  name: z.string(),
  resource_id: z.string().optional().nullable(),
  user_id: z.string(),
  uuid: z.string().optional().nullable(),
  watch_expiry: z.string().optional().nullable(),
});
export type CalendarIntegrationsInsert = z.infer<
  typeof CalendarIntegrationsInsert
>;

export const CalendarIntegrationsUpdate = z.object({
  email: z.string().optional(),
  google_id: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  resource_id: z.string().optional().nullable(),
  user_id: z.string().optional(),
  uuid: z.string().optional().nullable(),
  watch_expiry: z.string().optional().nullable(),
});
export type CalendarIntegrationsUpdate = z.infer<
  typeof CalendarIntegrationsUpdate
>;

export const CalendarIntegrationsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("calendar_integrations_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("calendar_integrations_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("calendar_integrations_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type CalendarIntegrationsRelationships = z.infer<
  typeof CalendarIntegrationsRelationships
>;

export const ChatsRow = z.object({
  created_at: z.string(),
  id: z.string(),
  latest: z.boolean(),
  messages: Json,
  topic: z.string().nullable(),
  updated_at: z.string(),
  user_id: z.string(),
});
export type ChatsRow = z.infer<typeof ChatsRow>;

export const ChatsInsert = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  messages: Json,
  topic: z.string().optional().nullable(),
  updated_at: z.string().optional(),
  user_id: z.string(),
});
export type ChatsInsert = z.infer<typeof ChatsInsert>;

export const ChatsUpdate = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  messages: Json.optional(),
  topic: z.string().optional().nullable(),
  updated_at: z.string().optional(),
  user_id: z.string().optional(),
});
export type ChatsUpdate = z.infer<typeof ChatsUpdate>;

export const ChatsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("chats_user_id_fkey1"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("chats_user_id_fkey1"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("chats_user_id_fkey1"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ChatsRelationships = z.infer<typeof ChatsRelationships>;

export const ChunksRow = z.object({
  end_segment: z.number().nullable(),
  focus_person_analysis: z.string().nullable(),
  id: z.string(),
  reasoning: z.string().nullable(),
  start_segment: z.number().nullable(),
  summary: z.string().nullable(),
  video_api_id: z.string().nullable(),
});
export type ChunksRow = z.infer<typeof ChunksRow>;

export const ChunksInsert = z.object({
  end_segment: z.number().optional().nullable(),
  focus_person_analysis: z.string().optional().nullable(),
  id: z.string(),
  reasoning: z.string().optional().nullable(),
  start_segment: z.number().optional().nullable(),
  summary: z.string().optional().nullable(),
  video_api_id: z.string().optional().nullable(),
});
export type ChunksInsert = z.infer<typeof ChunksInsert>;

export const ChunksUpdate = z.object({
  end_segment: z.number().optional().nullable(),
  focus_person_analysis: z.string().optional().nullable(),
  id: z.string().optional(),
  reasoning: z.string().optional().nullable(),
  start_segment: z.number().optional().nullable(),
  summary: z.string().optional().nullable(),
  video_api_id: z.string().optional().nullable(),
});
export type ChunksUpdate = z.infer<typeof ChunksUpdate>;

export const ChunksRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("chunks_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("chunks_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("chunks_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("chunks_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
]);
export type ChunksRelationships = z.infer<typeof ChunksRelationships>;

export const CoachingFrameworksRow = z.object({
  created_at: z.string(),
  definition_prompt: z.string(),
  description: z.string().nullable(),
  icon: IconEnum.nullable(),
  id: z.string(),
  title: z.string(),
});
export type CoachingFrameworksRow = z.infer<typeof CoachingFrameworksRow>;

export const CoachingFrameworksInsert = z.object({
  created_at: z.string().optional(),
  definition_prompt: z.string(),
  description: z.string().optional().nullable(),
  icon: IconEnum.optional().nullable(),
  id: z.string().optional(),
  title: z.string(),
});
export type CoachingFrameworksInsert = z.infer<typeof CoachingFrameworksInsert>;

export const CoachingFrameworksUpdate = z.object({
  created_at: z.string().optional(),
  definition_prompt: z.string().optional(),
  description: z.string().optional().nullable(),
  icon: IconEnum.optional().nullable(),
  id: z.string().optional(),
  title: z.string().optional(),
});
export type CoachingFrameworksUpdate = z.infer<typeof CoachingFrameworksUpdate>;

export const DeletionProcessingStatusRow = z.object({
  chats_supabase: z.string().nullable(),
  chats_supabase_affected_row: z.number().nullable(),
  chunks_pinecone: z.string().nullable(),
  chunks_pinecone_affected_row: z.number().nullable(),
  chunks_supabase: z.string().nullable(),
  chunks_supabase_affected_row: z.number().nullable(),
  id: z.string(),
  meeting_notes_pinecone: z.string().nullable(),
  meeting_notes_pinecone_affected_row: z.number().nullable(),
  meeting_notes_supabase: z.string().nullable(),
  meeting_notes_supabase_affected_row: z.number().nullable(),
  meeting_supabase: z.string().nullable(),
  meeting_supabase_affected_row: z.number().nullable(),
  moments_meta_supabase: z.string().nullable(),
  moments_meta_supabase_affected_row: z.number().nullable(),
  moments_pinecone: z.string().nullable(),
  moments_pinecone_affected_row: z.number().nullable(),
  moments_supabase: z.string().nullable(),
  moments_supabase_affected_row: z.number().nullable(),
  observation_prompts_supabase: z.string().nullable(),
  observation_prompts_supabase_affected_row: z.number().nullable(),
  profile_id: z.string().nullable(),
  qna_chunks_pinecone: z.string().nullable(),
  qna_chunks_pinecone_affected_row: z.number().nullable(),
  qna_chunks_supabase: z.string().nullable(),
  qna_chunks_supabase_affected_row: z.number().nullable(),
  segments_supabase: z.string().nullable(),
  segments_supabase_affected_row: z.number().nullable(),
  status: z.string().nullable(),
  video: z.string().nullable(),
  video_affected_row: z.number().nullable(),
  video_id: z.string().nullable(),
});
export type DeletionProcessingStatusRow = z.infer<
  typeof DeletionProcessingStatusRow
>;

export const DeletionProcessingStatusInsert = z.object({
  chats_supabase: z.string().optional().nullable(),
  chats_supabase_affected_row: z.number().optional().nullable(),
  chunks_pinecone: z.string().optional().nullable(),
  chunks_pinecone_affected_row: z.number().optional().nullable(),
  chunks_supabase: z.string().optional().nullable(),
  chunks_supabase_affected_row: z.number().optional().nullable(),
  id: z.string(),
  meeting_notes_pinecone: z.string().optional().nullable(),
  meeting_notes_pinecone_affected_row: z.number().optional().nullable(),
  meeting_notes_supabase: z.string().optional().nullable(),
  meeting_notes_supabase_affected_row: z.number().optional().nullable(),
  meeting_supabase: z.string().optional().nullable(),
  meeting_supabase_affected_row: z.number().optional().nullable(),
  moments_meta_supabase: z.string().optional().nullable(),
  moments_meta_supabase_affected_row: z.number().optional().nullable(),
  moments_pinecone: z.string().optional().nullable(),
  moments_pinecone_affected_row: z.number().optional().nullable(),
  moments_supabase: z.string().optional().nullable(),
  moments_supabase_affected_row: z.number().optional().nullable(),
  observation_prompts_supabase: z.string().optional().nullable(),
  observation_prompts_supabase_affected_row: z.number().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  qna_chunks_pinecone: z.string().optional().nullable(),
  qna_chunks_pinecone_affected_row: z.number().optional().nullable(),
  qna_chunks_supabase: z.string().optional().nullable(),
  qna_chunks_supabase_affected_row: z.number().optional().nullable(),
  segments_supabase: z.string().optional().nullable(),
  segments_supabase_affected_row: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
  video: z.string().optional().nullable(),
  video_affected_row: z.number().optional().nullable(),
  video_id: z.string().optional().nullable(),
});
export type DeletionProcessingStatusInsert = z.infer<
  typeof DeletionProcessingStatusInsert
>;

export const DeletionProcessingStatusUpdate = z.object({
  chats_supabase: z.string().optional().nullable(),
  chats_supabase_affected_row: z.number().optional().nullable(),
  chunks_pinecone: z.string().optional().nullable(),
  chunks_pinecone_affected_row: z.number().optional().nullable(),
  chunks_supabase: z.string().optional().nullable(),
  chunks_supabase_affected_row: z.number().optional().nullable(),
  id: z.string().optional(),
  meeting_notes_pinecone: z.string().optional().nullable(),
  meeting_notes_pinecone_affected_row: z.number().optional().nullable(),
  meeting_notes_supabase: z.string().optional().nullable(),
  meeting_notes_supabase_affected_row: z.number().optional().nullable(),
  meeting_supabase: z.string().optional().nullable(),
  meeting_supabase_affected_row: z.number().optional().nullable(),
  moments_meta_supabase: z.string().optional().nullable(),
  moments_meta_supabase_affected_row: z.number().optional().nullable(),
  moments_pinecone: z.string().optional().nullable(),
  moments_pinecone_affected_row: z.number().optional().nullable(),
  moments_supabase: z.string().optional().nullable(),
  moments_supabase_affected_row: z.number().optional().nullable(),
  observation_prompts_supabase: z.string().optional().nullable(),
  observation_prompts_supabase_affected_row: z.number().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  qna_chunks_pinecone: z.string().optional().nullable(),
  qna_chunks_pinecone_affected_row: z.number().optional().nullable(),
  qna_chunks_supabase: z.string().optional().nullable(),
  qna_chunks_supabase_affected_row: z.number().optional().nullable(),
  segments_supabase: z.string().optional().nullable(),
  segments_supabase_affected_row: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
  video: z.string().optional().nullable(),
  video_affected_row: z.number().optional().nullable(),
  video_id: z.string().optional().nullable(),
});
export type DeletionProcessingStatusUpdate = z.infer<
  typeof DeletionProcessingStatusUpdate
>;

export const EmbeddingJobsRow = z.object({
  content_to_embed: z.string().nullable(),
  created_at: z.string().nullable(),
  error: z.string().nullable(),
  id: z.number(),
  row_id: z.string(),
  status: z.string().nullable(),
  table_name: z.string(),
  updated_at: z.string().nullable(),
});
export type EmbeddingJobsRow = z.infer<typeof EmbeddingJobsRow>;

export const EmbeddingJobsInsert = z.object({
  content_to_embed: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
  id: z.number().optional(),
  row_id: z.string(),
  status: z.string().optional().nullable(),
  table_name: z.string(),
  updated_at: z.string().optional().nullable(),
});
export type EmbeddingJobsInsert = z.infer<typeof EmbeddingJobsInsert>;

export const EmbeddingJobsUpdate = z.object({
  content_to_embed: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
  id: z.number().optional(),
  row_id: z.string().optional(),
  status: z.string().optional().nullable(),
  table_name: z.string().optional(),
  updated_at: z.string().optional().nullable(),
});
export type EmbeddingJobsUpdate = z.infer<typeof EmbeddingJobsUpdate>;

export const EntitiesRow = z.object({
  attributes: Json.nullable(),
  created_at: z.string(),
  id: z.string(),
  is_test: z.boolean(),
  master_profile_id: z.string(),
  name: z.string(),
  type: z.string().nullable(),
});
export type EntitiesRow = z.infer<typeof EntitiesRow>;

export const EntitiesInsert = z.object({
  attributes: Json.optional().nullable(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  is_test: z.boolean().optional(),
  master_profile_id: z.string(),
  name: z.string(),
  type: z.string().optional().nullable(),
});
export type EntitiesInsert = z.infer<typeof EntitiesInsert>;

export const EntitiesUpdate = z.object({
  attributes: Json.optional().nullable(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  is_test: z.boolean().optional(),
  master_profile_id: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional().nullable(),
});
export type EntitiesUpdate = z.infer<typeof EntitiesUpdate>;

export const EntitiesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("entities_master_profile_id_fkey"),
    columns: z.tuple([z.literal("master_profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("entities_master_profile_id_fkey"),
    columns: z.tuple([z.literal("master_profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("entities_master_profile_id_fkey"),
    columns: z.tuple([z.literal("master_profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type EntitiesRelationships = z.infer<typeof EntitiesRelationships>;

export const EntityProfileEntitiesRow = z.object({
  entity_id: z.string(),
  entity_profile_id: z.string(),
});
export type EntityProfileEntitiesRow = z.infer<typeof EntityProfileEntitiesRow>;

export const EntityProfileEntitiesInsert = z.object({
  entity_id: z.string(),
  entity_profile_id: z.string(),
});
export type EntityProfileEntitiesInsert = z.infer<
  typeof EntityProfileEntitiesInsert
>;

export const EntityProfileEntitiesUpdate = z.object({
  entity_id: z.string().optional(),
  entity_profile_id: z.string().optional(),
});
export type EntityProfileEntitiesUpdate = z.infer<
  typeof EntityProfileEntitiesUpdate
>;

export const EntityProfileEntitiesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("entity_profile_entities_entity_id_fkey"),
    columns: z.tuple([z.literal("entity_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_entities_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("entity_profile_entities_entity_profile_id_fkey"),
    columns: z.tuple([z.literal("entity_profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("entity_profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type EntityProfileEntitiesRelationships = z.infer<
  typeof EntityProfileEntitiesRelationships
>;

export const EntityProfilesRow = z.object({
  alliance_structure: z.array(z.string()),
  communication_architecture: z.array(z.string()),
  conflict_patterns: z.array(z.string()),
  conversational_system_prompt: z.string().nullable(),
  created_at: z.string(),
  decision_making_style: z.array(z.string()),
  entity_description: z.string(),
  entity_name: z.string(),
  environment: z.array(z.string()),
  goals: z.array(z.string()),
  guardrails: z.array(z.string()),
  id: z.string(),
  interpersonal_effectiveness: z.array(z.string()),
  organizational_influence: z.array(z.string()),
  performance_issues: z.array(z.string()),
  personality: z.array(z.string()),
  professional_network: z.array(z.string()),
  profile_id: z.string(),
  profile_version: z.number(),
  project_portfolio: z.array(z.string()),
  psychological_framework: z.array(z.string()),
  raw_business_profile: Json.nullable(),
  raw_personal_profile: Json.nullable(),
  raw_relationships_profile: Json.nullable(),
  relationship_health: z.array(z.string()),
  relationship_with_user: z.array(z.string()),
  relationships: z.array(z.string()),
  role_and_responsibilities: z.array(z.string()),
  source_data_hash: z.string(),
  speech_patterns: z.array(z.string()),
  stress_responses: z.array(z.string()),
  tone: z.array(z.string()),
  tools: z.array(z.string()),
  traits: z.array(z.string()),
  typical_phrases: z.array(z.string()),
  updated_at: z.string(),
  value_creation: z.array(z.string()),
});
export type EntityProfilesRow = z.infer<typeof EntityProfilesRow>;

export const EntityProfilesInsert = z.object({
  alliance_structure: z.array(z.string()),
  communication_architecture: z.array(z.string()),
  conflict_patterns: z.array(z.string()),
  conversational_system_prompt: z.string().optional().nullable(),
  created_at: z.string().optional(),
  decision_making_style: z.array(z.string()),
  entity_description: z.string(),
  entity_name: z.string(),
  environment: z.array(z.string()),
  goals: z.array(z.string()),
  guardrails: z.array(z.string()),
  id: z.string().optional(),
  interpersonal_effectiveness: z.array(z.string()),
  organizational_influence: z.array(z.string()),
  performance_issues: z.array(z.string()),
  personality: z.array(z.string()),
  professional_network: z.array(z.string()),
  profile_id: z.string(),
  profile_version: z.number().optional(),
  project_portfolio: z.array(z.string()),
  psychological_framework: z.array(z.string()),
  raw_business_profile: Json.optional().nullable(),
  raw_personal_profile: Json.optional().nullable(),
  raw_relationships_profile: Json.optional().nullable(),
  relationship_health: z.array(z.string()),
  relationship_with_user: z.array(z.string()),
  relationships: z.array(z.string()),
  role_and_responsibilities: z.array(z.string()),
  source_data_hash: z.string(),
  speech_patterns: z.array(z.string()),
  stress_responses: z.array(z.string()),
  tone: z.array(z.string()),
  tools: z.array(z.string()),
  traits: z.array(z.string()),
  typical_phrases: z.array(z.string()),
  updated_at: z.string().optional(),
  value_creation: z.array(z.string()),
});
export type EntityProfilesInsert = z.infer<typeof EntityProfilesInsert>;

export const EntityProfilesUpdate = z.object({
  alliance_structure: z.array(z.string()).optional(),
  communication_architecture: z.array(z.string()).optional(),
  conflict_patterns: z.array(z.string()).optional(),
  conversational_system_prompt: z.string().optional().nullable(),
  created_at: z.string().optional(),
  decision_making_style: z.array(z.string()).optional(),
  entity_description: z.string().optional(),
  entity_name: z.string().optional(),
  environment: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  guardrails: z.array(z.string()).optional(),
  id: z.string().optional(),
  interpersonal_effectiveness: z.array(z.string()).optional(),
  organizational_influence: z.array(z.string()).optional(),
  performance_issues: z.array(z.string()).optional(),
  personality: z.array(z.string()).optional(),
  professional_network: z.array(z.string()).optional(),
  profile_id: z.string().optional(),
  profile_version: z.number().optional(),
  project_portfolio: z.array(z.string()).optional(),
  psychological_framework: z.array(z.string()).optional(),
  raw_business_profile: Json.optional().nullable(),
  raw_personal_profile: Json.optional().nullable(),
  raw_relationships_profile: Json.optional().nullable(),
  relationship_health: z.array(z.string()).optional(),
  relationship_with_user: z.array(z.string()).optional(),
  relationships: z.array(z.string()).optional(),
  role_and_responsibilities: z.array(z.string()).optional(),
  source_data_hash: z.string().optional(),
  speech_patterns: z.array(z.string()).optional(),
  stress_responses: z.array(z.string()).optional(),
  tone: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  traits: z.array(z.string()).optional(),
  typical_phrases: z.array(z.string()).optional(),
  updated_at: z.string().optional(),
  value_creation: z.array(z.string()).optional(),
});
export type EntityProfilesUpdate = z.infer<typeof EntityProfilesUpdate>;

export const EntityProfilesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("entity_profiles_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("entity_profiles_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("entity_profiles_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type EntityProfilesRelationships = z.infer<
  typeof EntityProfilesRelationships
>;

export const FeedbacksRow = z.object({
  created_at: z.string(),
  criticality: z.string(),
  description: z.string(),
  id: z.number(),
  screenshot: z.string().nullable(),
  type: z.string(),
  updated_at: z.string(),
  user_id: z.string(),
});
export type FeedbacksRow = z.infer<typeof FeedbacksRow>;

export const FeedbacksInsert = z.object({
  created_at: z.string().optional(),
  criticality: z.string(),
  description: z.string(),
  id: z.never().optional(),
  screenshot: z.string().optional().nullable(),
  type: z.string(),
  updated_at: z.string().optional(),
  user_id: z.string(),
});
export type FeedbacksInsert = z.infer<typeof FeedbacksInsert>;

export const FeedbacksUpdate = z.object({
  created_at: z.string().optional(),
  criticality: z.string().optional(),
  description: z.string().optional(),
  id: z.never().optional(),
  screenshot: z.string().optional().nullable(),
  type: z.string().optional(),
  updated_at: z.string().optional(),
  user_id: z.string().optional(),
});
export type FeedbacksUpdate = z.infer<typeof FeedbacksUpdate>;

export const FeedbacksRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("feedbacks_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("feedbacks_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("feedbacks_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type FeedbacksRelationships = z.infer<typeof FeedbacksRelationships>;

export const GoalSignalTemplatesRow = z.object({
  activity: z.string().nullable(),
  activity_type: z.string().nullable(),
  created_at: z.string(),
  direction: GoalSignalDirectionType,
  goal_template_id: z.string(),
  id: z.string(),
  is_current: z.boolean(),
  tag: z.string().nullable(),
  target_person_type: z.string().nullable(),
  text: z.string(),
});
export type GoalSignalTemplatesRow = z.infer<typeof GoalSignalTemplatesRow>;

export const GoalSignalTemplatesInsert = z.object({
  activity: z.string().optional().nullable(),
  activity_type: z.string().optional().nullable(),
  created_at: z.string().optional(),
  direction: GoalSignalDirectionType,
  goal_template_id: z.string(),
  id: z.string().optional(),
  is_current: z.boolean().optional(),
  tag: z.string().optional().nullable(),
  target_person_type: z.string().optional().nullable(),
  text: z.string(),
});
export type GoalSignalTemplatesInsert = z.infer<
  typeof GoalSignalTemplatesInsert
>;

export const GoalSignalTemplatesUpdate = z.object({
  activity: z.string().optional().nullable(),
  activity_type: z.string().optional().nullable(),
  created_at: z.string().optional(),
  direction: GoalSignalDirectionType.optional(),
  goal_template_id: z.string().optional(),
  id: z.string().optional(),
  is_current: z.boolean().optional(),
  tag: z.string().optional().nullable(),
  target_person_type: z.string().optional().nullable(),
  text: z.string().optional(),
});
export type GoalSignalTemplatesUpdate = z.infer<
  typeof GoalSignalTemplatesUpdate
>;

export const GoalSignalTemplatesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("goal_signal_templates_goal_template_id_fkey"),
    columns: z.tuple([z.literal("goal_template_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("goal_templates"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type GoalSignalTemplatesRelationships = z.infer<
  typeof GoalSignalTemplatesRelationships
>;

export const GoalSignalsRow = z.object({
  activity: z.string().nullable(),
  activity_type: z.string().nullable(),
  created_at: z.string(),
  direction: GoalSignalDirectionType,
  goal_id: z.string(),
  hidden_text: z.string().nullable(),
  id: z.string(),
  is_current: z.boolean(),
  previous_goal_signal_id: z.string().nullable(),
  tag: z.string().nullable(),
  target_person_type: z.string().nullable(),
  text: z.string(),
});
export type GoalSignalsRow = z.infer<typeof GoalSignalsRow>;

export const GoalSignalsInsert = z.object({
  activity: z.string().optional().nullable(),
  activity_type: z.string().optional().nullable(),
  created_at: z.string().optional(),
  direction: GoalSignalDirectionType,
  goal_id: z.string(),
  hidden_text: z.string().optional().nullable(),
  id: z.string().optional(),
  is_current: z.boolean().optional(),
  previous_goal_signal_id: z.string().optional().nullable(),
  tag: z.string().optional().nullable(),
  target_person_type: z.string().optional().nullable(),
  text: z.string(),
});
export type GoalSignalsInsert = z.infer<typeof GoalSignalsInsert>;

export const GoalSignalsUpdate = z.object({
  activity: z.string().optional().nullable(),
  activity_type: z.string().optional().nullable(),
  created_at: z.string().optional(),
  direction: GoalSignalDirectionType.optional(),
  goal_id: z.string().optional(),
  hidden_text: z.string().optional().nullable(),
  id: z.string().optional(),
  is_current: z.boolean().optional(),
  previous_goal_signal_id: z.string().optional().nullable(),
  tag: z.string().optional().nullable(),
  target_person_type: z.string().optional().nullable(),
  text: z.string().optional(),
});
export type GoalSignalsUpdate = z.infer<typeof GoalSignalsUpdate>;

export const GoalSignalsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("goal_signals_goal_id_fkey"),
    columns: z.tuple([z.literal("goal_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("goals"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("goal_signals_previous_goal_signal_id_fkey"),
    columns: z.tuple([z.literal("previous_goal_signal_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("goal_signals"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type GoalSignalsRelationships = z.infer<typeof GoalSignalsRelationships>;

export const GoalTemplatesRow = z.object({
  context: z.string().nullable(),
  created_at: z.string(),
  id: z.string(),
  is_current: z.boolean(),
  skill_id: z.string(),
  text: z.string(),
});
export type GoalTemplatesRow = z.infer<typeof GoalTemplatesRow>;

export const GoalTemplatesInsert = z.object({
  context: z.string().optional().nullable(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  is_current: z.boolean().optional(),
  skill_id: z.string(),
  text: z.string(),
});
export type GoalTemplatesInsert = z.infer<typeof GoalTemplatesInsert>;

export const GoalTemplatesUpdate = z.object({
  context: z.string().optional().nullable(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  is_current: z.boolean().optional(),
  skill_id: z.string().optional(),
  text: z.string().optional(),
});
export type GoalTemplatesUpdate = z.infer<typeof GoalTemplatesUpdate>;

export const GoalTemplatesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("goal_templates_skill_id_fkey"),
    columns: z.tuple([z.literal("skill_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("skills"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type GoalTemplatesRelationships = z.infer<
  typeof GoalTemplatesRelationships
>;

export const GoalsRow = z.object({
  completed_at: z.string().nullable(),
  created_at: z.string(),
  deleted_at: z.string().nullable(),
  hidden_text: z.string().nullable(),
  id: z.string(),
  is_current: z.boolean(),
  is_default: z.boolean(),
  previous_goal_id: z.string().nullable(),
  profile_id: z.string(),
  progress: z.number(),
  skill_id: z.string(),
  text: z.string(),
  user_provided_context: z.string().nullable(),
});
export type GoalsRow = z.infer<typeof GoalsRow>;

export const GoalsInsert = z.object({
  completed_at: z.string().optional().nullable(),
  created_at: z.string().optional(),
  deleted_at: z.string().optional().nullable(),
  hidden_text: z.string().optional().nullable(),
  id: z.string().optional(),
  is_current: z.boolean(),
  is_default: z.boolean().optional(),
  previous_goal_id: z.string().optional().nullable(),
  profile_id: z.string(),
  progress: z.number().optional(),
  skill_id: z.string(),
  text: z.string(),
  user_provided_context: z.string().optional().nullable(),
});
export type GoalsInsert = z.infer<typeof GoalsInsert>;

export const GoalsUpdate = z.object({
  completed_at: z.string().optional().nullable(),
  created_at: z.string().optional(),
  deleted_at: z.string().optional().nullable(),
  hidden_text: z.string().optional().nullable(),
  id: z.string().optional(),
  is_current: z.boolean().optional(),
  is_default: z.boolean().optional(),
  previous_goal_id: z.string().optional().nullable(),
  profile_id: z.string().optional(),
  progress: z.number().optional(),
  skill_id: z.string().optional(),
  text: z.string().optional(),
  user_provided_context: z.string().optional().nullable(),
});
export type GoalsUpdate = z.infer<typeof GoalsUpdate>;

export const GoalsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("goals_previous_goal_id_fkey"),
    columns: z.tuple([z.literal("previous_goal_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("goals"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("goals_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("goals_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("goals_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("goals_skill_id_fkey"),
    columns: z.tuple([z.literal("skill_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("skills"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type GoalsRelationships = z.infer<typeof GoalsRelationships>;

export const GroupReportProcessingStatusRow = z.object({
  created_at: z.string(),
  goal_ids: z.array(z.string()).nullable(),
  id: z.string(),
  profile_id: z.string().nullable(),
  skill_id: z.string().nullable(),
  status: ProcessingStatus.nullable(),
});
export type GroupReportProcessingStatusRow = z.infer<
  typeof GroupReportProcessingStatusRow
>;

export const GroupReportProcessingStatusInsert = z.object({
  created_at: z.string().optional(),
  goal_ids: z.array(z.string()).optional().nullable(),
  id: z.string(),
  profile_id: z.string().optional().nullable(),
  skill_id: z.string().optional().nullable(),
  status: ProcessingStatus.optional().nullable(),
});
export type GroupReportProcessingStatusInsert = z.infer<
  typeof GroupReportProcessingStatusInsert
>;

export const GroupReportProcessingStatusUpdate = z.object({
  created_at: z.string().optional(),
  goal_ids: z.array(z.string()).optional().nullable(),
  id: z.string().optional(),
  profile_id: z.string().optional().nullable(),
  skill_id: z.string().optional().nullable(),
  status: ProcessingStatus.optional().nullable(),
});
export type GroupReportProcessingStatusUpdate = z.infer<
  typeof GroupReportProcessingStatusUpdate
>;

export const GroupReportProcessingStatusRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("group_report_processing_status_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("group_report_processing_status_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("group_report_processing_status_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("group_report_processing_status_skill_id_fkey"),
    columns: z.tuple([z.literal("skill_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("skills"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type GroupReportProcessingStatusRelationships = z.infer<
  typeof GroupReportProcessingStatusRelationships
>;

export const IntegrationCredentialsRow = z.object({
  access_token: z.string().nullable(),
  created_at: z.string(),
  expiry_date: z.string().nullable(),
  id: z.string(),
  last_refresh_attempt: z.string().nullable(),
  provider: z.string().nullable(),
  refresh_error: z.string().nullable(),
  refresh_token: z.string().nullable(),
  requires_reauth: z.boolean().nullable(),
  updated_at: z.string(),
  user_id: z.string(),
});
export type IntegrationCredentialsRow = z.infer<
  typeof IntegrationCredentialsRow
>;

export const IntegrationCredentialsInsert = z.object({
  access_token: z.string().optional().nullable(),
  created_at: z.string().optional(),
  expiry_date: z.string().optional().nullable(),
  id: z.string().optional(),
  last_refresh_attempt: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  refresh_error: z.string().optional().nullable(),
  refresh_token: z.string().optional().nullable(),
  requires_reauth: z.boolean().optional().nullable(),
  updated_at: z.string().optional(),
  user_id: z.string(),
});
export type IntegrationCredentialsInsert = z.infer<
  typeof IntegrationCredentialsInsert
>;

export const IntegrationCredentialsUpdate = z.object({
  access_token: z.string().optional().nullable(),
  created_at: z.string().optional(),
  expiry_date: z.string().optional().nullable(),
  id: z.string().optional(),
  last_refresh_attempt: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  refresh_error: z.string().optional().nullable(),
  refresh_token: z.string().optional().nullable(),
  requires_reauth: z.boolean().optional().nullable(),
  updated_at: z.string().optional(),
  user_id: z.string().optional(),
});
export type IntegrationCredentialsUpdate = z.infer<
  typeof IntegrationCredentialsUpdate
>;

export const IntegrationCredentialsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("integration_credentials_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("integration_credentials_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("integration_credentials_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type IntegrationCredentialsRelationships = z.infer<
  typeof IntegrationCredentialsRelationships
>;

export const JobsRow = z.object({
  created_at: z.string(),
  id: z.string(),
  logs: Json.nullable(),
  status: z.string().nullable(),
  type: z.string().nullable(),
  video_api_id: z.string().nullable(),
});
export type JobsRow = z.infer<typeof JobsRow>;

export const JobsInsert = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  logs: Json.optional().nullable(),
  status: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  video_api_id: z.string().optional().nullable(),
});
export type JobsInsert = z.infer<typeof JobsInsert>;

export const JobsUpdate = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  logs: Json.optional().nullable(),
  status: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  video_api_id: z.string().optional().nullable(),
});
export type JobsUpdate = z.infer<typeof JobsUpdate>;

export const MeetingActionItemAssigneesRow = z.object({
  assignee_id: z.string(),
  meeting_action_item_id: z.string(),
});
export type MeetingActionItemAssigneesRow = z.infer<
  typeof MeetingActionItemAssigneesRow
>;

export const MeetingActionItemAssigneesInsert = z.object({
  assignee_id: z.string(),
  meeting_action_item_id: z.string(),
});
export type MeetingActionItemAssigneesInsert = z.infer<
  typeof MeetingActionItemAssigneesInsert
>;

export const MeetingActionItemAssigneesUpdate = z.object({
  assignee_id: z.string().optional(),
  meeting_action_item_id: z.string().optional(),
});
export type MeetingActionItemAssigneesUpdate = z.infer<
  typeof MeetingActionItemAssigneesUpdate
>;

export const MeetingActionItemAssigneesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_action_item_assignees_assignee_id_fkey"),
    columns: z.tuple([z.literal("assignee_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("entities"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_action_item_assignees_meeting_action_item_id_fkey",
    ),
    columns: z.tuple([z.literal("meeting_action_item_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("action_items_with_assignees"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_action_item_assignees_meeting_action_item_id_fkey",
    ),
    columns: z.tuple([z.literal("meeting_action_item_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_action_items"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingActionItemAssigneesRelationships = z.infer<
  typeof MeetingActionItemAssigneesRelationships
>;

export const MeetingActionItemsRow = z.object({
  api_video_id: z.string(),
  completed: z.boolean().nullable(),
  completed_at: z.string().nullable(),
  completed_date: z.string().nullable(),
  created_at: z.string(),
  deleted_at: z.string().nullable(),
  due_date: z.string().nullable(),
  id: z.string(),
  server_deleted_at: z.string().nullable(),
  text: z.string(),
  vtt_end_segment_id: z.number().nullable(),
  vtt_start_segment_id: z.number().nullable(),
});
export type MeetingActionItemsRow = z.infer<typeof MeetingActionItemsRow>;

export const MeetingActionItemsInsert = z.object({
  api_video_id: z.string(),
  completed: z.boolean().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  completed_date: z.string().optional().nullable(),
  created_at: z.string().optional(),
  deleted_at: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  id: z.string().optional(),
  server_deleted_at: z.string().optional().nullable(),
  text: z.string(),
  vtt_end_segment_id: z.number().optional().nullable(),
  vtt_start_segment_id: z.number().optional().nullable(),
});
export type MeetingActionItemsInsert = z.infer<typeof MeetingActionItemsInsert>;

export const MeetingActionItemsUpdate = z.object({
  api_video_id: z.string().optional(),
  completed: z.boolean().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  completed_date: z.string().optional().nullable(),
  created_at: z.string().optional(),
  deleted_at: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  id: z.string().optional(),
  server_deleted_at: z.string().optional().nullable(),
  text: z.string().optional(),
  vtt_end_segment_id: z.number().optional().nullable(),
  vtt_start_segment_id: z.number().optional().nullable(),
});
export type MeetingActionItemsUpdate = z.infer<typeof MeetingActionItemsUpdate>;

export const MeetingActionItemsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_action_items_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_action_items_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_action_items_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_action_items_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
]);
export type MeetingActionItemsRelationships = z.infer<
  typeof MeetingActionItemsRelationships
>;

export const MeetingBotsRow = z.object({
  api_video_id: z.string().nullable(),
  created_at: z.string(),
  deduplication_key: z.string().nullable(),
  error_code: z.string().nullable(),
  event_id: z.string().nullable(),
  id: z.string(),
  message: z.string().nullable(),
  mp4_source_url: z.string().nullable(),
  profile_id: z.string().nullable(),
  provider: MeetingBotsProviderEnum.nullable(),
  raw_data: Json.nullable(),
  recall_calendar_id: z.string().nullable(),
  recording_id: z.string().nullable(),
  speakers: z.array(z.string()).nullable(),
  status: z.string().nullable(),
  sub_code: z.string().nullable(),
  title: z.string().nullable(),
});
export type MeetingBotsRow = z.infer<typeof MeetingBotsRow>;

export const MeetingBotsInsert = z.object({
  api_video_id: z.string().optional().nullable(),
  created_at: z.string().optional(),
  deduplication_key: z.string().optional().nullable(),
  error_code: z.string().optional().nullable(),
  event_id: z.string().optional().nullable(),
  id: z.string(),
  message: z.string().optional().nullable(),
  mp4_source_url: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  provider: MeetingBotsProviderEnum.optional().nullable(),
  raw_data: Json.optional().nullable(),
  recall_calendar_id: z.string().optional().nullable(),
  recording_id: z.string().optional().nullable(),
  speakers: z.array(z.string()).optional().nullable(),
  status: z.string().optional().nullable(),
  sub_code: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
});
export type MeetingBotsInsert = z.infer<typeof MeetingBotsInsert>;

export const MeetingBotsUpdate = z.object({
  api_video_id: z.string().optional().nullable(),
  created_at: z.string().optional(),
  deduplication_key: z.string().optional().nullable(),
  error_code: z.string().optional().nullable(),
  event_id: z.string().optional().nullable(),
  id: z.string().optional(),
  message: z.string().optional().nullable(),
  mp4_source_url: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  provider: MeetingBotsProviderEnum.optional().nullable(),
  raw_data: Json.optional().nullable(),
  recall_calendar_id: z.string().optional().nullable(),
  recording_id: z.string().optional().nullable(),
  speakers: z.array(z.string()).optional().nullable(),
  status: z.string().optional().nullable(),
  sub_code: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
});
export type MeetingBotsUpdate = z.infer<typeof MeetingBotsUpdate>;

export const MeetingBotsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_bots_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_bots_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_bots_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_bots_recall_calendar_id_fkey"),
    columns: z.tuple([z.literal("recall_calendar_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("recall_calendars"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingBotsRelationships = z.infer<typeof MeetingBotsRelationships>;

export const MeetingBotsV2Row = z.object({
  api_video_id: z.string().nullable(),
  created_at: z.string(),
  deduplication_key: z.string().nullable(),
  error_code: z.string().nullable(),
  event_id: z.string().nullable(),
  id: z.string(),
  is_removed: z.boolean(),
  message: z.string().nullable(),
  mp4_source_url: z.string().nullable(),
  profile_id: z.string().nullable(),
  provider: MeetingBotsProviderEnum,
  raw_data: Json.nullable(),
  recall_calendar_id: z.string().nullable(),
  recording_id: z.string().nullable(),
  reporting_status: MeetingBotReportingStatus.nullable(),
  speakers: z.array(z.string()).nullable(),
  status: z.string().nullable(),
  sub_code: z.string().nullable(),
  title: z.string().nullable(),
  updated_at: z.string().nullable(),
});
export type MeetingBotsV2Row = z.infer<typeof MeetingBotsV2Row>;

export const MeetingBotsV2Insert = z.object({
  api_video_id: z.string().optional().nullable(),
  created_at: z.string().optional(),
  deduplication_key: z.string().optional().nullable(),
  error_code: z.string().optional().nullable(),
  event_id: z.string().optional().nullable(),
  id: z.string(),
  is_removed: z.boolean().optional(),
  message: z.string().optional().nullable(),
  mp4_source_url: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  provider: MeetingBotsProviderEnum,
  raw_data: Json.optional().nullable(),
  recall_calendar_id: z.string().optional().nullable(),
  recording_id: z.string().optional().nullable(),
  reporting_status: MeetingBotReportingStatus.optional().nullable(),
  speakers: z.array(z.string()).optional().nullable(),
  status: z.string().optional().nullable(),
  sub_code: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});
export type MeetingBotsV2Insert = z.infer<typeof MeetingBotsV2Insert>;

export const MeetingBotsV2Update = z.object({
  api_video_id: z.string().optional().nullable(),
  created_at: z.string().optional(),
  deduplication_key: z.string().optional().nullable(),
  error_code: z.string().optional().nullable(),
  event_id: z.string().optional().nullable(),
  id: z.string().optional(),
  is_removed: z.boolean().optional(),
  message: z.string().optional().nullable(),
  mp4_source_url: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  provider: MeetingBotsProviderEnum.optional(),
  raw_data: Json.optional().nullable(),
  recall_calendar_id: z.string().optional().nullable(),
  recording_id: z.string().optional().nullable(),
  reporting_status: MeetingBotReportingStatus.optional().nullable(),
  speakers: z.array(z.string()).optional().nullable(),
  status: z.string().optional().nullable(),
  sub_code: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});
export type MeetingBotsV2Update = z.infer<typeof MeetingBotsV2Update>;

export const MeetingBotsV2Relationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_bots_v2_event_id_fkey"),
    columns: z.tuple([z.literal("event_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("calendar_event_details_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_bots_v2_event_id_fkey"),
    columns: z.tuple([z.literal("event_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("calendar_events_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_bots_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_bots_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_bots_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_bots_v2_recall_calendar_id_fkey1"),
    columns: z.tuple([z.literal("recall_calendar_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("recall_calendars_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingBotsV2Relationships = z.infer<
  typeof MeetingBotsV2Relationships
>;

export const MeetingEntitiesV2Row = z.object({
  api_video_id: z.string(),
  created_at: z.string(),
  description: z.string().nullable(),
  embedding: z.unknown().nullable(),
  id: z.string(),
  latest: z.boolean(),
  meeting_topic_id: z.string(),
  name: z.string(),
  profile_id: z.string(),
  type: z.string(),
});
export type MeetingEntitiesV2Row = z.infer<typeof MeetingEntitiesV2Row>;

export const MeetingEntitiesV2Insert = z.object({
  api_video_id: z.string(),
  created_at: z.string().optional(),
  description: z.string().optional().nullable(),
  embedding: z.unknown().optional().nullable(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  meeting_topic_id: z.string(),
  name: z.string(),
  profile_id: z.string(),
  type: z.string(),
});
export type MeetingEntitiesV2Insert = z.infer<typeof MeetingEntitiesV2Insert>;

export const MeetingEntitiesV2Update = z.object({
  api_video_id: z.string().optional(),
  created_at: z.string().optional(),
  description: z.string().optional().nullable(),
  embedding: z.unknown().optional().nullable(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  meeting_topic_id: z.string().optional(),
  name: z.string().optional(),
  profile_id: z.string().optional(),
  type: z.string().optional(),
});
export type MeetingEntitiesV2Update = z.infer<typeof MeetingEntitiesV2Update>;

export const MeetingEntitiesV2Relationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_entities_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entities_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entities_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entities_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entities_v2_meeting_topic_id_fkey"),
    columns: z.tuple([z.literal("meeting_topic_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_topics_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entities_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entities_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entities_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingEntitiesV2Relationships = z.infer<
  typeof MeetingEntitiesV2Relationships
>;

export const MeetingEntityObservationsV2Row = z.object({
  api_video_id: z.string(),
  created_at: z.string(),
  id: z.string(),
  latest: z.boolean(),
  meeting_entity_id: z.string(),
  meeting_topic_id: z.string(),
  observation: z.string(),
  profile_id: z.string(),
});
export type MeetingEntityObservationsV2Row = z.infer<
  typeof MeetingEntityObservationsV2Row
>;

export const MeetingEntityObservationsV2Insert = z.object({
  api_video_id: z.string(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  meeting_entity_id: z.string(),
  meeting_topic_id: z.string(),
  observation: z.string(),
  profile_id: z.string(),
});
export type MeetingEntityObservationsV2Insert = z.infer<
  typeof MeetingEntityObservationsV2Insert
>;

export const MeetingEntityObservationsV2Update = z.object({
  api_video_id: z.string().optional(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  meeting_entity_id: z.string().optional(),
  meeting_topic_id: z.string().optional(),
  observation: z.string().optional(),
  profile_id: z.string().optional(),
});
export type MeetingEntityObservationsV2Update = z.infer<
  typeof MeetingEntityObservationsV2Update
>;

export const MeetingEntityObservationsV2Relationships = z.tuple([
  z.object({
    foreignKeyName: z.literal(
      "meeting_entity_observations_v2_api_video_id_fkey",
    ),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_entity_observations_v2_api_video_id_fkey",
    ),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_entity_observations_v2_api_video_id_fkey",
    ),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_entity_observations_v2_api_video_id_fkey",
    ),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_entity_observations_v2_meeting_entity_id_fkey",
    ),
    columns: z.tuple([z.literal("meeting_entity_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_entities_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_entity_observations_v2_meeting_topic_id_fkey",
    ),
    columns: z.tuple([z.literal("meeting_topic_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_topics_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entity_observations_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entity_observations_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entity_observations_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingEntityObservationsV2Relationships = z.infer<
  typeof MeetingEntityObservationsV2Relationships
>;

export const MeetingEntityParticipantsRow = z.object({
  created_at: z.string(),
  entity_id: z.string(),
  id: z.string(),
  meeting_id: z.string(),
});
export type MeetingEntityParticipantsRow = z.infer<
  typeof MeetingEntityParticipantsRow
>;

export const MeetingEntityParticipantsInsert = z.object({
  created_at: z.string().optional(),
  entity_id: z.string(),
  id: z.string().optional(),
  meeting_id: z.string(),
});
export type MeetingEntityParticipantsInsert = z.infer<
  typeof MeetingEntityParticipantsInsert
>;

export const MeetingEntityParticipantsUpdate = z.object({
  created_at: z.string().optional(),
  entity_id: z.string().optional(),
  id: z.string().optional(),
  meeting_id: z.string().optional(),
});
export type MeetingEntityParticipantsUpdate = z.infer<
  typeof MeetingEntityParticipantsUpdate
>;

export const MeetingEntityParticipantsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_entity_participants_entity_id_fkey"),
    columns: z.tuple([z.literal("entity_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("entities"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entity_participants_meeting_id_fkey"),
    columns: z.tuple([z.literal("meeting_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entity_participants_meeting_id_fkey"),
    columns: z.tuple([z.literal("meeting_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entity_participants_meeting_id_fkey"),
    columns: z.tuple([z.literal("meeting_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entity_participants_meeting_id_fkey"),
    columns: z.tuple([z.literal("meeting_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
]);
export type MeetingEntityParticipantsRelationships = z.infer<
  typeof MeetingEntityParticipantsRelationships
>;

export const MeetingEntityRelationshipObservationsV2Row = z.object({
  api_video_id: z.string(),
  created_at: z.string(),
  id: z.string(),
  latest: z.boolean(),
  meeting_entity_relationship_id: z.string(),
  meeting_topic_id: z.string(),
  observation: z.string(),
  profile_id: z.string(),
});
export type MeetingEntityRelationshipObservationsV2Row = z.infer<
  typeof MeetingEntityRelationshipObservationsV2Row
>;

export const MeetingEntityRelationshipObservationsV2Insert = z.object({
  api_video_id: z.string(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  meeting_entity_relationship_id: z.string(),
  meeting_topic_id: z.string(),
  observation: z.string(),
  profile_id: z.string(),
});
export type MeetingEntityRelationshipObservationsV2Insert = z.infer<
  typeof MeetingEntityRelationshipObservationsV2Insert
>;

export const MeetingEntityRelationshipObservationsV2Update = z.object({
  api_video_id: z.string().optional(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  meeting_entity_relationship_id: z.string().optional(),
  meeting_topic_id: z.string().optional(),
  observation: z.string().optional(),
  profile_id: z.string().optional(),
});
export type MeetingEntityRelationshipObservationsV2Update = z.infer<
  typeof MeetingEntityRelationshipObservationsV2Update
>;

export const MeetingEntityRelationshipObservationsV2Relationships = z.tuple([
  z.object({
    foreignKeyName: z.literal(
      "meeting_entity_relationship_o_meeting_entity_relationship__fkey",
    ),
    columns: z.tuple([z.literal("meeting_entity_relationship_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_entity_relationships_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_relationship_observations_v2_api_video_id_fkey",
    ),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_relationship_observations_v2_api_video_id_fkey",
    ),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_relationship_observations_v2_api_video_id_fkey",
    ),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_relationship_observations_v2_api_video_id_fkey",
    ),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_relationship_observations_v2_meeting_topic_id_fkey",
    ),
    columns: z.tuple([z.literal("meeting_topic_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_topics_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_relationship_observations_v2_profile_id_fkey",
    ),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_relationship_observations_v2_profile_id_fkey",
    ),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_relationship_observations_v2_profile_id_fkey",
    ),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingEntityRelationshipObservationsV2Relationships = z.infer<
  typeof MeetingEntityRelationshipObservationsV2Relationships
>;

export const MeetingEntityRelationshipsV2Row = z.object({
  api_video_id: z.string(),
  created_at: z.string(),
  embedding: z.unknown().nullable(),
  id: z.string(),
  latest: z.boolean(),
  meeting_topic_id: z.string(),
  object_entity_name: z.string(),
  profile_id: z.string(),
  relationship_type: z.string(),
  subject_entity_name: z.string(),
});
export type MeetingEntityRelationshipsV2Row = z.infer<
  typeof MeetingEntityRelationshipsV2Row
>;

export const MeetingEntityRelationshipsV2Insert = z.object({
  api_video_id: z.string(),
  created_at: z.string().optional(),
  embedding: z.unknown().optional().nullable(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  meeting_topic_id: z.string(),
  object_entity_name: z.string(),
  profile_id: z.string(),
  relationship_type: z.string(),
  subject_entity_name: z.string(),
});
export type MeetingEntityRelationshipsV2Insert = z.infer<
  typeof MeetingEntityRelationshipsV2Insert
>;

export const MeetingEntityRelationshipsV2Update = z.object({
  api_video_id: z.string().optional(),
  created_at: z.string().optional(),
  embedding: z.unknown().optional().nullable(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  meeting_topic_id: z.string().optional(),
  object_entity_name: z.string().optional(),
  profile_id: z.string().optional(),
  relationship_type: z.string().optional(),
  subject_entity_name: z.string().optional(),
});
export type MeetingEntityRelationshipsV2Update = z.infer<
  typeof MeetingEntityRelationshipsV2Update
>;

export const MeetingEntityRelationshipsV2Relationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_entity_relationships_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entity_relationships_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entity_relationships_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entity_relationships_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "meeting_entity_relationships_meeting_topic_id_fkey",
    ),
    columns: z.tuple([z.literal("meeting_topic_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_topics_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entity_relationships_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entity_relationships_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_entity_relationships_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingEntityRelationshipsV2Relationships = z.infer<
  typeof MeetingEntityRelationshipsV2Relationships
>;

export const MeetingNotesChunksRow = z.object({
  chunk_id: z.string().nullable(),
  clear_text: z.string().nullable(),
  end_segment: z.number().nullable(),
  id: z.string(),
  start_segment: z.number().nullable(),
  video_api_id: z.string().nullable(),
});
export type MeetingNotesChunksRow = z.infer<typeof MeetingNotesChunksRow>;

export const MeetingNotesChunksInsert = z.object({
  chunk_id: z.string().optional().nullable(),
  clear_text: z.string().optional().nullable(),
  end_segment: z.number().optional().nullable(),
  id: z.string(),
  start_segment: z.number().optional().nullable(),
  video_api_id: z.string().optional().nullable(),
});
export type MeetingNotesChunksInsert = z.infer<typeof MeetingNotesChunksInsert>;

export const MeetingNotesChunksUpdate = z.object({
  chunk_id: z.string().optional().nullable(),
  clear_text: z.string().optional().nullable(),
  end_segment: z.number().optional().nullable(),
  id: z.string().optional(),
  start_segment: z.number().optional().nullable(),
  video_api_id: z.string().optional().nullable(),
});
export type MeetingNotesChunksUpdate = z.infer<typeof MeetingNotesChunksUpdate>;

export const MeetingObservationsV2Row = z.object({
  api_video_id: z.string(),
  created_at: z.string(),
  id: z.string(),
  latest: z.boolean(),
  meeting_topic_id: z.string(),
  observation: z.string(),
  profile_id: z.string(),
});
export type MeetingObservationsV2Row = z.infer<typeof MeetingObservationsV2Row>;

export const MeetingObservationsV2Insert = z.object({
  api_video_id: z.string(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  meeting_topic_id: z.string(),
  observation: z.string(),
  profile_id: z.string(),
});
export type MeetingObservationsV2Insert = z.infer<
  typeof MeetingObservationsV2Insert
>;

export const MeetingObservationsV2Update = z.object({
  api_video_id: z.string().optional(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  meeting_topic_id: z.string().optional(),
  observation: z.string().optional(),
  profile_id: z.string().optional(),
});
export type MeetingObservationsV2Update = z.infer<
  typeof MeetingObservationsV2Update
>;

export const MeetingObservationsV2Relationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_observations_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_observations_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_observations_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_observations_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_observations_v2_meeting_topic_id_fkey"),
    columns: z.tuple([z.literal("meeting_topic_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_topics_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_observations_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_observations_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_observations_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingObservationsV2Relationships = z.infer<
  typeof MeetingObservationsV2Relationships
>;

export const MeetingParticipantsRow = z.object({
  created_at: z.string(),
  id: z.string(),
  meeting_id: z.string(),
  profile_id: z.string(),
});
export type MeetingParticipantsRow = z.infer<typeof MeetingParticipantsRow>;

export const MeetingParticipantsInsert = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  meeting_id: z.string(),
  profile_id: z.string(),
});
export type MeetingParticipantsInsert = z.infer<
  typeof MeetingParticipantsInsert
>;

export const MeetingParticipantsUpdate = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  meeting_id: z.string().optional(),
  profile_id: z.string().optional(),
});
export type MeetingParticipantsUpdate = z.infer<
  typeof MeetingParticipantsUpdate
>;

export const MeetingParticipantsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_participants_meeting_id_fkey"),
    columns: z.tuple([z.literal("meeting_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_participants_meeting_id_fkey"),
    columns: z.tuple([z.literal("meeting_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_participants_meeting_id_fkey"),
    columns: z.tuple([z.literal("meeting_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_participants_meeting_id_fkey"),
    columns: z.tuple([z.literal("meeting_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_participants_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_participants_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_participants_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingParticipantsRelationships = z.infer<
  typeof MeetingParticipantsRelationships
>;

export const MeetingProcessingStatusRow = z.object({
  action_items_status: z.string().nullable(),
  backend_call_status: ProcessingStatus.nullable(),
  created_at: z.string().nullable(),
  embed_meeting_status: z.string().nullable(),
  embed_moments_status: z.string().nullable(),
  entity_extraction_status: ProcessingStatus,
  id: z.string(),
  interestingness_status: z.string().nullable(),
  internal: z.boolean().nullable(),
  meeting_bot_id: z.string().nullable(),
  meetings_status: z.string().nullable(),
  meta_data_status: ProcessingStatus.nullable(),
  moments_status: z.string().nullable(),
  observation_status: z.string().nullable(),
  origin: z.string().nullable(),
  segments_status: z.string().nullable(),
  supabase_video_upload_status: ProcessingStatus.nullable(),
  topic_segmentation_status: ProcessingStatus,
  topics_status: z.string().nullable(),
  transcript_slice_words_status: ProcessingStatus.nullable(),
  updated_at: z.string().nullable(),
  video_api_upload_status: ProcessingStatus.nullable(),
  video_id: z.string().nullable(),
});
export type MeetingProcessingStatusRow = z.infer<
  typeof MeetingProcessingStatusRow
>;

export const MeetingProcessingStatusInsert = z.object({
  action_items_status: z.string().optional().nullable(),
  backend_call_status: ProcessingStatus.optional().nullable(),
  created_at: z.string().optional().nullable(),
  embed_meeting_status: z.string().optional().nullable(),
  embed_moments_status: z.string().optional().nullable(),
  entity_extraction_status: ProcessingStatus.optional(),
  id: z.string().optional(),
  interestingness_status: z.string().optional().nullable(),
  internal: z.boolean().optional().nullable(),
  meeting_bot_id: z.string().optional().nullable(),
  meetings_status: z.string().optional().nullable(),
  meta_data_status: ProcessingStatus.optional().nullable(),
  moments_status: z.string().optional().nullable(),
  observation_status: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  segments_status: z.string().optional().nullable(),
  supabase_video_upload_status: ProcessingStatus.optional().nullable(),
  topic_segmentation_status: ProcessingStatus.optional(),
  topics_status: z.string().optional().nullable(),
  transcript_slice_words_status: ProcessingStatus.optional().nullable(),
  updated_at: z.string().optional().nullable(),
  video_api_upload_status: ProcessingStatus.optional().nullable(),
  video_id: z.string().optional().nullable(),
});
export type MeetingProcessingStatusInsert = z.infer<
  typeof MeetingProcessingStatusInsert
>;

export const MeetingProcessingStatusUpdate = z.object({
  action_items_status: z.string().optional().nullable(),
  backend_call_status: ProcessingStatus.optional().nullable(),
  created_at: z.string().optional().nullable(),
  embed_meeting_status: z.string().optional().nullable(),
  embed_moments_status: z.string().optional().nullable(),
  entity_extraction_status: ProcessingStatus.optional(),
  id: z.string().optional(),
  interestingness_status: z.string().optional().nullable(),
  internal: z.boolean().optional().nullable(),
  meeting_bot_id: z.string().optional().nullable(),
  meetings_status: z.string().optional().nullable(),
  meta_data_status: ProcessingStatus.optional().nullable(),
  moments_status: z.string().optional().nullable(),
  observation_status: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  segments_status: z.string().optional().nullable(),
  supabase_video_upload_status: ProcessingStatus.optional().nullable(),
  topic_segmentation_status: ProcessingStatus.optional(),
  topics_status: z.string().optional().nullable(),
  transcript_slice_words_status: ProcessingStatus.optional().nullable(),
  updated_at: z.string().optional().nullable(),
  video_api_upload_status: ProcessingStatus.optional().nullable(),
  video_id: z.string().optional().nullable(),
});
export type MeetingProcessingStatusUpdate = z.infer<
  typeof MeetingProcessingStatusUpdate
>;

export const MeetingProcessingStatusRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_processing_status_meeting_bot_id_fkey"),
    columns: z.tuple([z.literal("meeting_bot_id")]),
    isOneToOne: z.literal(true),
    referencedRelation: z.literal("meeting_bots_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingProcessingStatusRelationships = z.infer<
  typeof MeetingProcessingStatusRelationships
>;

export const MeetingTopicEventsV2Row = z.object({
  api_video_id: z.string(),
  created_at: z.string(),
  event: z.string(),
  id: z.string(),
  latest: z.boolean(),
  meeting_topic_id: z.string(),
  profile_id: z.string(),
  timestamp: z.string(),
});
export type MeetingTopicEventsV2Row = z.infer<typeof MeetingTopicEventsV2Row>;

export const MeetingTopicEventsV2Insert = z.object({
  api_video_id: z.string(),
  created_at: z.string().optional(),
  event: z.string(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  meeting_topic_id: z.string(),
  profile_id: z.string(),
  timestamp: z.string(),
});
export type MeetingTopicEventsV2Insert = z.infer<
  typeof MeetingTopicEventsV2Insert
>;

export const MeetingTopicEventsV2Update = z.object({
  api_video_id: z.string().optional(),
  created_at: z.string().optional(),
  event: z.string().optional(),
  id: z.string().optional(),
  latest: z.boolean().optional(),
  meeting_topic_id: z.string().optional(),
  profile_id: z.string().optional(),
  timestamp: z.string().optional(),
});
export type MeetingTopicEventsV2Update = z.infer<
  typeof MeetingTopicEventsV2Update
>;

export const MeetingTopicEventsV2Relationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_topic_events_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topic_events_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topic_events_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topic_events_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topic_events_v2_meeting_topic_id_fkey"),
    columns: z.tuple([z.literal("meeting_topic_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_topics_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topic_events_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topic_events_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topic_events_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingTopicEventsV2Relationships = z.infer<
  typeof MeetingTopicEventsV2Relationships
>;

export const MeetingTopicsRow = z.object({
  api_video_id: z.string(),
  created_at: z.string(),
  id: z.string(),
  server_deleted_at: z.string().nullable(),
  summary: z.string(),
  title: z.string(),
  vtt_end_segment_id: z.number().nullable(),
  vtt_start_segment_id: z.number().nullable(),
});
export type MeetingTopicsRow = z.infer<typeof MeetingTopicsRow>;

export const MeetingTopicsInsert = z.object({
  api_video_id: z.string(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  server_deleted_at: z.string().optional().nullable(),
  summary: z.string(),
  title: z.string(),
  vtt_end_segment_id: z.number().optional().nullable(),
  vtt_start_segment_id: z.number().optional().nullable(),
});
export type MeetingTopicsInsert = z.infer<typeof MeetingTopicsInsert>;

export const MeetingTopicsUpdate = z.object({
  api_video_id: z.string().optional(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  server_deleted_at: z.string().optional().nullable(),
  summary: z.string().optional(),
  title: z.string().optional(),
  vtt_end_segment_id: z.number().optional().nullable(),
  vtt_start_segment_id: z.number().optional().nullable(),
});
export type MeetingTopicsUpdate = z.infer<typeof MeetingTopicsUpdate>;

export const MeetingTopicsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_topics_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topics_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topics_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topics_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
]);
export type MeetingTopicsRelationships = z.infer<
  typeof MeetingTopicsRelationships
>;

export const MeetingTopicsV2Row = z.object({
  api_video_id: z.string(),
  created_at: z.string(),
  end_segment_id: z.number(),
  id: z.string(),
  index: z.number(),
  latest: z.boolean(),
  profile_id: z.string(),
  start_segment_id: z.number(),
  summary: z.string(),
  title: z.string(),
});
export type MeetingTopicsV2Row = z.infer<typeof MeetingTopicsV2Row>;

export const MeetingTopicsV2Insert = z.object({
  api_video_id: z.string(),
  created_at: z.string().optional(),
  end_segment_id: z.number(),
  id: z.string().optional(),
  index: z.number(),
  latest: z.boolean().optional(),
  profile_id: z.string(),
  start_segment_id: z.number(),
  summary: z.string(),
  title: z.string(),
});
export type MeetingTopicsV2Insert = z.infer<typeof MeetingTopicsV2Insert>;

export const MeetingTopicsV2Update = z.object({
  api_video_id: z.string().optional(),
  created_at: z.string().optional(),
  end_segment_id: z.number().optional(),
  id: z.string().optional(),
  index: z.number().optional(),
  latest: z.boolean().optional(),
  profile_id: z.string().optional(),
  start_segment_id: z.number().optional(),
  summary: z.string().optional(),
  title: z.string().optional(),
});
export type MeetingTopicsV2Update = z.infer<typeof MeetingTopicsV2Update>;

export const MeetingTopicsV2Relationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_topics_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topics_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topics_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topics_v2_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topics_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topics_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_topics_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingTopicsV2Relationships = z.infer<
  typeof MeetingTopicsV2Relationships
>;

export const MeetingsRow = z.object({
  clean_vtt_file: z.string().nullable(),
  created_at: z.string(),
  date: z.string().nullable(),
  db_created_at: z.string().nullable(),
  duration_in_ms: z.number(),
  duration_in_seconds: z.number(),
  meeting_baas_original_json: Json.nullable(),
  name: z.string().nullable(),
  original_vtt_file: z.string().nullable(),
  preprocessing_payload: Json.nullable(),
  profile_id: z.string().nullable(),
  provider: MeetingBotsProviderEnum.nullable(),
  searchable: z.unknown().nullable(),
  speaker: z.string().nullable(),
  speaker_time_percentage: z.number().nullable(),
  summary: z.string().nullable(),
  tags: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  type: EventType.nullable(),
  updated_at: z.string(),
  vectorized: z.boolean(),
  video_api_id: z.string(),
});
export type MeetingsRow = z.infer<typeof MeetingsRow>;

export const MeetingsInsert = z.object({
  clean_vtt_file: z.string().optional().nullable(),
  created_at: z.string().optional(),
  date: z.string().optional().nullable(),
  db_created_at: z.string().optional().nullable(),
  duration_in_ms: z.number(),
  duration_in_seconds: z.number(),
  meeting_baas_original_json: Json.optional().nullable(),
  name: z.string().optional().nullable(),
  original_vtt_file: z.string().optional().nullable(),
  preprocessing_payload: Json.optional().nullable(),
  profile_id: z.string().optional().nullable(),
  provider: MeetingBotsProviderEnum.optional().nullable(),
  searchable: z.unknown().optional().nullable(),
  speaker: z.string().optional().nullable(),
  speaker_time_percentage: z.number().optional().nullable(),
  summary: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  thumbnail_url: z.string().optional().nullable(),
  type: EventType.optional().nullable(),
  updated_at: z.string().optional(),
  vectorized: z.boolean().optional(),
  video_api_id: z.string(),
});
export type MeetingsInsert = z.infer<typeof MeetingsInsert>;

export const MeetingsUpdate = z.object({
  clean_vtt_file: z.string().optional().nullable(),
  created_at: z.string().optional(),
  date: z.string().optional().nullable(),
  db_created_at: z.string().optional().nullable(),
  duration_in_ms: z.number().optional(),
  duration_in_seconds: z.number().optional(),
  meeting_baas_original_json: Json.optional().nullable(),
  name: z.string().optional().nullable(),
  original_vtt_file: z.string().optional().nullable(),
  preprocessing_payload: Json.optional().nullable(),
  profile_id: z.string().optional().nullable(),
  provider: MeetingBotsProviderEnum.optional().nullable(),
  searchable: z.unknown().optional().nullable(),
  speaker: z.string().optional().nullable(),
  speaker_time_percentage: z.number().optional().nullable(),
  summary: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  thumbnail_url: z.string().optional().nullable(),
  type: EventType.optional().nullable(),
  updated_at: z.string().optional(),
  vectorized: z.boolean().optional(),
  video_api_id: z.string().optional(),
});
export type MeetingsUpdate = z.infer<typeof MeetingsUpdate>;

export const MeetingsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meetings_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meetings_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meetings_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingsRelationships = z.infer<typeof MeetingsRelationships>;

export const MomentCommentsRow = z.object({
  content: z.string(),
  created_at: z.string(),
  id: z.string(),
  moment_id: z.string(),
  updated_at: z.string(),
  user_id: z.string(),
});
export type MomentCommentsRow = z.infer<typeof MomentCommentsRow>;

export const MomentCommentsInsert = z.object({
  content: z.string(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  moment_id: z.string(),
  updated_at: z.string().optional(),
  user_id: z.string(),
});
export type MomentCommentsInsert = z.infer<typeof MomentCommentsInsert>;

export const MomentCommentsUpdate = z.object({
  content: z.string().optional(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  moment_id: z.string().optional(),
  updated_at: z.string().optional(),
  user_id: z.string().optional(),
});
export type MomentCommentsUpdate = z.infer<typeof MomentCommentsUpdate>;

export const MomentCommentsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("moment_comments_moment_id_fkey"),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_comments_moment_id_fkey"),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments_with_score"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_comments_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_comments_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_comments_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MomentCommentsRelationships = z.infer<
  typeof MomentCommentsRelationships
>;

export const MomentProfileDevelopmentThemesRow = z.object({
  connection_strength_score: z.number().nullable(),
  created_at: z.string(),
  id: z.string(),
  moment_id: z.string().nullable(),
  profile_development_theme_id: z.string().nullable(),
});
export type MomentProfileDevelopmentThemesRow = z.infer<
  typeof MomentProfileDevelopmentThemesRow
>;

export const MomentProfileDevelopmentThemesInsert = z.object({
  connection_strength_score: z.number().optional().nullable(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  moment_id: z.string().optional().nullable(),
  profile_development_theme_id: z.string().optional().nullable(),
});
export type MomentProfileDevelopmentThemesInsert = z.infer<
  typeof MomentProfileDevelopmentThemesInsert
>;

export const MomentProfileDevelopmentThemesUpdate = z.object({
  connection_strength_score: z.number().optional().nullable(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  moment_id: z.string().optional().nullable(),
  profile_development_theme_id: z.string().optional().nullable(),
});
export type MomentProfileDevelopmentThemesUpdate = z.infer<
  typeof MomentProfileDevelopmentThemesUpdate
>;

export const MomentProfileDevelopmentThemesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal(
      "moment_profile_development_th_profile_development_theme_id_fkey",
    ),
    columns: z.tuple([z.literal("profile_development_theme_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profile_development_themes"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "moment_profile_development_themes_moment_id_fkey",
    ),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal(
      "moment_profile_development_themes_moment_id_fkey",
    ),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments_with_score"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MomentProfileDevelopmentThemesRelationships = z.infer<
  typeof MomentProfileDevelopmentThemesRelationships
>;

export const MomentReactionsRow = z.object({
  created_at: z.string(),
  id: z.string(),
  moment_id: z.string(),
  reaction_type: MomentReactionType,
  user_id: z.string(),
});
export type MomentReactionsRow = z.infer<typeof MomentReactionsRow>;

export const MomentReactionsInsert = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  moment_id: z.string(),
  reaction_type: MomentReactionType,
  user_id: z.string(),
});
export type MomentReactionsInsert = z.infer<typeof MomentReactionsInsert>;

export const MomentReactionsUpdate = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  moment_id: z.string().optional(),
  reaction_type: MomentReactionType.optional(),
  user_id: z.string().optional(),
});
export type MomentReactionsUpdate = z.infer<typeof MomentReactionsUpdate>;

export const MomentReactionsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("moment_reactions_moment_id_fkey"),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_reactions_moment_id_fkey"),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments_with_score"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_reactions_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_reactions_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_reactions_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MomentReactionsRelationships = z.infer<
  typeof MomentReactionsRelationships
>;

export const MomentSubtagsRow = z.object({
  confidence: z.number().nullable(),
  created_at: z.string(),
  id: z.string(),
  moment_id: z.string().nullable(),
  profile_id: z.string().nullable(),
  reasoning: z.string().nullable(),
  tag: z.string(),
});
export type MomentSubtagsRow = z.infer<typeof MomentSubtagsRow>;

export const MomentSubtagsInsert = z.object({
  confidence: z.number().optional().nullable(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  moment_id: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  reasoning: z.string().optional().nullable(),
  tag: z.string(),
});
export type MomentSubtagsInsert = z.infer<typeof MomentSubtagsInsert>;

export const MomentSubtagsUpdate = z.object({
  confidence: z.number().optional().nullable(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  moment_id: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  reasoning: z.string().optional().nullable(),
  tag: z.string().optional(),
});
export type MomentSubtagsUpdate = z.infer<typeof MomentSubtagsUpdate>;

export const MomentSubtagsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("moment_subtags_moment_id_fkey"),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_subtags_moment_id_fkey"),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments_with_score"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_subtags_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_subtags_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_subtags_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MomentSubtagsRelationships = z.infer<
  typeof MomentSubtagsRelationships
>;

export const MomentSubtagsQaRow = z.object({
  created_at: z.string(),
  decision: z.boolean().nullable(),
  id: z.string(),
  moment_id: z.string().nullable(),
  note: z.string().nullable(),
  profile_id: z.string().nullable(),
  tag: z.string().nullable(),
});
export type MomentSubtagsQaRow = z.infer<typeof MomentSubtagsQaRow>;

export const MomentSubtagsQaInsert = z.object({
  created_at: z.string().optional(),
  decision: z.boolean().optional().nullable(),
  id: z.string().optional(),
  moment_id: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  tag: z.string().optional().nullable(),
});
export type MomentSubtagsQaInsert = z.infer<typeof MomentSubtagsQaInsert>;

export const MomentSubtagsQaUpdate = z.object({
  created_at: z.string().optional(),
  decision: z.boolean().optional().nullable(),
  id: z.string().optional(),
  moment_id: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  tag: z.string().optional().nullable(),
});
export type MomentSubtagsQaUpdate = z.infer<typeof MomentSubtagsQaUpdate>;

export const MomentSubtagsQaRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("moment_subtags_qa_moment_id_fkey"),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_subtags_qa_moment_id_fkey"),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments_with_score"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_subtags_qa_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_subtags_qa_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moment_subtags_qa_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MomentSubtagsQaRelationships = z.infer<
  typeof MomentSubtagsQaRelationships
>;

export const MomentTypesRow = z.object({
  color: z.string().nullable(),
  created_at: z.string(),
  icon: IconEnum,
  name: z.string(),
  slug: z.string(),
});
export type MomentTypesRow = z.infer<typeof MomentTypesRow>;

export const MomentTypesInsert = z.object({
  color: z.string().optional().nullable(),
  created_at: z.string().optional(),
  icon: IconEnum,
  name: z.string(),
  slug: z.string(),
});
export type MomentTypesInsert = z.infer<typeof MomentTypesInsert>;

export const MomentTypesUpdate = z.object({
  color: z.string().optional().nullable(),
  created_at: z.string().optional(),
  icon: IconEnum.optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
});
export type MomentTypesUpdate = z.infer<typeof MomentTypesUpdate>;

export const MomentsRow = z.object({
  _internal_comment: z.string().nullable(),
  _internal_thumbs_down: z.number(),
  _internal_thumbs_up: z.number(),
  activity: z.string().nullable(),
  activity_reasoning: z.string().nullable(),
  activity_type: z.string().nullable(),
  activity_type_confidence: z.number().nullable(),
  altitude_reasoning: z.string().nullable(),
  altitude_score: z.number().nullable(),
  altitude_score_reasoning: z.string().nullable(),
  altitude_score_reasoning_not_higher: z.string().nullable(),
  altitude_score_reasoning_not_lower: z.string().nullable(),
  altitude_type: z.string().nullable(),
  coaching_theme_summary: z.string().nullable(),
  coaching_themes_analyses: z.string().nullable(),
  created_at: z.string(),
  final_score: z.number().nullable(),
  id: z.string(),
  intensity: z.number().nullable(),
  interestingness_reasoning: z.string().nullable(),
  interestingness_reasoning_not_higher: z.string().nullable(),
  interestingness_reasoning_not_lower: z.string().nullable(),
  interestingness_score: z.number().nullable(),
  latest: z.boolean(),
  moment_url: z.string().nullable(),
  profile_id: z.string().nullable(),
  qa_reasoning: z.string().nullable(),
  qa_reasoning_not_higher: z.string().nullable(),
  qa_reasoning_not_lower: z.string().nullable(),
  qa_score: z.number().nullable(),
  relevant: z.boolean(),
  search_vector: z.unknown().nullable(),
  segment_end_timestamp: z.string().nullable(),
  segment_end_timestamp_in_seconds: z.number().nullable(),
  segment_id_sequence_end: z.number().nullable(),
  segment_id_sequence_start: z.number().nullable(),
  segment_id_sequence_start_ideal: z.number().nullable(),
  segment_id_sequence_start_ideal_algorithm: z.number().nullable(),
  segment_start_timestamp: z.string().nullable(),
  segment_start_timestamp_in_seconds: z.number().nullable(),
  segment_start_timestamp_in_seconds_ideal: z.number().nullable(),
  segment_start_timestamp_in_seconds_ideal_algorithm: z.number().nullable(),
  summary: z.string().nullable(),
  target_person_confidence: z.number().nullable(),
  target_person_reasoning: z.string().nullable(),
  target_person_score: z.number().nullable(),
  target_person_type: z.string().nullable(),
  title: z.string().nullable(),
  topic_id: z.string().nullable(),
  updated_at: z.string().nullable(),
  version: z.number().nullable(),
  video_api_id: z.string().nullable(),
  vtt: z.string().nullable(),
});
export type MomentsRow = z.infer<typeof MomentsRow>;

export const MomentsInsert = z.object({
  _internal_comment: z.string().optional().nullable(),
  _internal_thumbs_down: z.number().optional(),
  _internal_thumbs_up: z.number().optional(),
  activity: z.string().optional().nullable(),
  activity_reasoning: z.string().optional().nullable(),
  activity_type: z.string().optional().nullable(),
  activity_type_confidence: z.number().optional().nullable(),
  altitude_reasoning: z.string().optional().nullable(),
  altitude_score: z.number().optional().nullable(),
  altitude_score_reasoning: z.string().optional().nullable(),
  altitude_score_reasoning_not_higher: z.string().optional().nullable(),
  altitude_score_reasoning_not_lower: z.string().optional().nullable(),
  altitude_type: z.string().optional().nullable(),
  coaching_theme_summary: z.string().optional().nullable(),
  coaching_themes_analyses: z.string().optional().nullable(),
  created_at: z.string().optional(),
  final_score: z.number().optional().nullable(),
  id: z.string(),
  intensity: z.number().optional().nullable(),
  interestingness_reasoning: z.string().optional().nullable(),
  interestingness_reasoning_not_higher: z.string().optional().nullable(),
  interestingness_reasoning_not_lower: z.string().optional().nullable(),
  interestingness_score: z.number().optional().nullable(),
  latest: z.boolean().optional(),
  moment_url: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  qa_reasoning: z.string().optional().nullable(),
  qa_reasoning_not_higher: z.string().optional().nullable(),
  qa_reasoning_not_lower: z.string().optional().nullable(),
  qa_score: z.number().optional().nullable(),
  relevant: z.boolean().optional(),
  search_vector: z.unknown().optional().nullable(),
  segment_end_timestamp: z.string().optional().nullable(),
  segment_end_timestamp_in_seconds: z.number().optional().nullable(),
  segment_id_sequence_end: z.number().optional().nullable(),
  segment_id_sequence_start: z.number().optional().nullable(),
  segment_id_sequence_start_ideal: z.number().optional().nullable(),
  segment_id_sequence_start_ideal_algorithm: z.number().optional().nullable(),
  segment_start_timestamp: z.string().optional().nullable(),
  segment_start_timestamp_in_seconds: z.number().optional().nullable(),
  segment_start_timestamp_in_seconds_ideal: z.number().optional().nullable(),
  segment_start_timestamp_in_seconds_ideal_algorithm: z
    .number()
    .optional()
    .nullable(),
  summary: z.string().optional().nullable(),
  target_person_confidence: z.number().optional().nullable(),
  target_person_reasoning: z.string().optional().nullable(),
  target_person_score: z.number().optional().nullable(),
  target_person_type: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  topic_id: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  version: z.number().optional().nullable(),
  video_api_id: z.string().optional().nullable(),
  vtt: z.string().optional().nullable(),
});
export type MomentsInsert = z.infer<typeof MomentsInsert>;

export const MomentsUpdate = z.object({
  _internal_comment: z.string().optional().nullable(),
  _internal_thumbs_down: z.number().optional(),
  _internal_thumbs_up: z.number().optional(),
  activity: z.string().optional().nullable(),
  activity_reasoning: z.string().optional().nullable(),
  activity_type: z.string().optional().nullable(),
  activity_type_confidence: z.number().optional().nullable(),
  altitude_reasoning: z.string().optional().nullable(),
  altitude_score: z.number().optional().nullable(),
  altitude_score_reasoning: z.string().optional().nullable(),
  altitude_score_reasoning_not_higher: z.string().optional().nullable(),
  altitude_score_reasoning_not_lower: z.string().optional().nullable(),
  altitude_type: z.string().optional().nullable(),
  coaching_theme_summary: z.string().optional().nullable(),
  coaching_themes_analyses: z.string().optional().nullable(),
  created_at: z.string().optional(),
  final_score: z.number().optional().nullable(),
  id: z.string().optional(),
  intensity: z.number().optional().nullable(),
  interestingness_reasoning: z.string().optional().nullable(),
  interestingness_reasoning_not_higher: z.string().optional().nullable(),
  interestingness_reasoning_not_lower: z.string().optional().nullable(),
  interestingness_score: z.number().optional().nullable(),
  latest: z.boolean().optional(),
  moment_url: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  qa_reasoning: z.string().optional().nullable(),
  qa_reasoning_not_higher: z.string().optional().nullable(),
  qa_reasoning_not_lower: z.string().optional().nullable(),
  qa_score: z.number().optional().nullable(),
  relevant: z.boolean().optional(),
  search_vector: z.unknown().optional().nullable(),
  segment_end_timestamp: z.string().optional().nullable(),
  segment_end_timestamp_in_seconds: z.number().optional().nullable(),
  segment_id_sequence_end: z.number().optional().nullable(),
  segment_id_sequence_start: z.number().optional().nullable(),
  segment_id_sequence_start_ideal: z.number().optional().nullable(),
  segment_id_sequence_start_ideal_algorithm: z.number().optional().nullable(),
  segment_start_timestamp: z.string().optional().nullable(),
  segment_start_timestamp_in_seconds: z.number().optional().nullable(),
  segment_start_timestamp_in_seconds_ideal: z.number().optional().nullable(),
  segment_start_timestamp_in_seconds_ideal_algorithm: z
    .number()
    .optional()
    .nullable(),
  summary: z.string().optional().nullable(),
  target_person_confidence: z.number().optional().nullable(),
  target_person_reasoning: z.string().optional().nullable(),
  target_person_score: z.number().optional().nullable(),
  target_person_type: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  topic_id: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  version: z.number().optional().nullable(),
  video_api_id: z.string().optional().nullable(),
  vtt: z.string().optional().nullable(),
});
export type MomentsUpdate = z.infer<typeof MomentsUpdate>;

export const MomentsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("moments_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_topic_id_fkey"),
    columns: z.tuple([z.literal("topic_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_topics_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
]);
export type MomentsRelationships = z.infer<typeof MomentsRelationships>;

export const MomentsQaRow = z.object({
  activity: z.boolean().nullable(),
  activity_borderline: z.boolean().nullable(),
  activity_borderline_note: z.string().nullable(),
  activity_note: z.string().nullable(),
  activity_type: z.string().nullable(),
  activity_type_note: z.string().nullable(),
  altitude_note: z.string().nullable(),
  altitude_score: z.number().nullable(),
  created_at: z.string().nullable(),
  id: z.string(),
  ideal_time_stamp_index: z.number().nullable(),
  moment_id: z.string().nullable(),
  profile_id: z.string(),
  skip_flag: z.boolean().nullable(),
  target_person: z.string().nullable(),
  target_person_note: z.string().nullable(),
});
export type MomentsQaRow = z.infer<typeof MomentsQaRow>;

export const MomentsQaInsert = z.object({
  activity: z.boolean().optional().nullable(),
  activity_borderline: z.boolean().optional().nullable(),
  activity_borderline_note: z.string().optional().nullable(),
  activity_note: z.string().optional().nullable(),
  activity_type: z.string().optional().nullable(),
  activity_type_note: z.string().optional().nullable(),
  altitude_note: z.string().optional().nullable(),
  altitude_score: z.number().optional().nullable(),
  created_at: z.string().optional().nullable(),
  id: z.string().optional(),
  ideal_time_stamp_index: z.number().optional().nullable(),
  moment_id: z.string().optional().nullable(),
  profile_id: z.string().optional(),
  skip_flag: z.boolean().optional().nullable(),
  target_person: z.string().optional().nullable(),
  target_person_note: z.string().optional().nullable(),
});
export type MomentsQaInsert = z.infer<typeof MomentsQaInsert>;

export const MomentsQaUpdate = z.object({
  activity: z.boolean().optional().nullable(),
  activity_borderline: z.boolean().optional().nullable(),
  activity_borderline_note: z.string().optional().nullable(),
  activity_note: z.string().optional().nullable(),
  activity_type: z.string().optional().nullable(),
  activity_type_note: z.string().optional().nullable(),
  altitude_note: z.string().optional().nullable(),
  altitude_score: z.number().optional().nullable(),
  created_at: z.string().optional().nullable(),
  id: z.string().optional(),
  ideal_time_stamp_index: z.number().optional().nullable(),
  moment_id: z.string().optional().nullable(),
  profile_id: z.string().optional(),
  skip_flag: z.boolean().optional().nullable(),
  target_person: z.string().optional().nullable(),
  target_person_note: z.string().optional().nullable(),
});
export type MomentsQaUpdate = z.infer<typeof MomentsQaUpdate>;

export const MomentsQaRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("moments_qa_moment_id_fkey"),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_qa_moment_id_fkey"),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments_with_score"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_qa_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_qa_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_qa_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MomentsQaRelationships = z.infer<typeof MomentsQaRelationships>;

export const MomentsV2Row = z.object({
  activity: z.string().nullable(),
  activity_reasoning: z.string().nullable(),
  activity_type: z.string().nullable(),
  altitude_reasoning: z.string().nullable(),
  altitude_score: z.number().nullable(),
  altitude_score_reasoning: z.string().nullable(),
  altitude_score_reasoning_not_higher: z.string().nullable(),
  altitude_score_reasoning_not_lower: z.string().nullable(),
  altitude_type: z.string().nullable(),
  created_at: z.string().nullable(),
  final_score: z.number().nullable(),
  id: z.string(),
  intensity: z.number().nullable(),
  interestingness_reasoning: z.string().nullable(),
  interestingness_reasoning_not_higher: z.string().nullable(),
  interestingness_reasoning_not_lower: z.string().nullable(),
  interestingness_score: z.number().nullable(),
  latest: z.string().nullable(),
  moment_url: z.string().nullable(),
  profile_id: z.string().nullable(),
  qa_reasoning: z.string().nullable(),
  qa_reasoning_not_higher: z.string().nullable(),
  qa_reasoning_not_lower: z.string().nullable(),
  qa_score: z.number().nullable(),
  relevant: z.boolean(),
  search_vector: z.unknown().nullable(),
  segment_end_timestamp: z.string().nullable(),
  segment_end_timestamp_in_seconds: z.number().nullable(),
  segment_id_sequence_end: z.number().nullable(),
  segment_id_sequence_start: z.number().nullable(),
  segment_start_timestamp: z.string().nullable(),
  segment_start_timestamp_in_seconds: z.number().nullable(),
  summary: z.string().nullable(),
  target_person_reasoning: z.string().nullable(),
  target_person_role_reasoning: z.string().nullable(),
  target_person_role_score: z.number().nullable(),
  target_person_role_type: z.string().nullable(),
  target_person_score: z.number().nullable(),
  target_person_type: z.string().nullable(),
  title: z.string().nullable(),
  topic_id: z.string().nullable(),
  updated_at: z.string().nullable(),
  version: z.number(),
  video_api_id: z.string().nullable(),
  vtt: z.string().nullable(),
});
export type MomentsV2Row = z.infer<typeof MomentsV2Row>;

export const MomentsV2Insert = z.object({
  activity: z.string().optional().nullable(),
  activity_reasoning: z.string().optional().nullable(),
  activity_type: z.string().optional().nullable(),
  altitude_reasoning: z.string().optional().nullable(),
  altitude_score: z.number().optional().nullable(),
  altitude_score_reasoning: z.string().optional().nullable(),
  altitude_score_reasoning_not_higher: z.string().optional().nullable(),
  altitude_score_reasoning_not_lower: z.string().optional().nullable(),
  altitude_type: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  final_score: z.number().optional().nullable(),
  id: z.string().optional(),
  intensity: z.number().optional().nullable(),
  interestingness_reasoning: z.string().optional().nullable(),
  interestingness_reasoning_not_higher: z.string().optional().nullable(),
  interestingness_reasoning_not_lower: z.string().optional().nullable(),
  interestingness_score: z.number().optional().nullable(),
  latest: z.string().optional().nullable(),
  moment_url: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  qa_reasoning: z.string().optional().nullable(),
  qa_reasoning_not_higher: z.string().optional().nullable(),
  qa_reasoning_not_lower: z.string().optional().nullable(),
  qa_score: z.number().optional().nullable(),
  relevant: z.boolean().optional(),
  search_vector: z.unknown().optional().nullable(),
  segment_end_timestamp: z.string().optional().nullable(),
  segment_end_timestamp_in_seconds: z.number().optional().nullable(),
  segment_id_sequence_end: z.number().optional().nullable(),
  segment_id_sequence_start: z.number().optional().nullable(),
  segment_start_timestamp: z.string().optional().nullable(),
  segment_start_timestamp_in_seconds: z.number().optional().nullable(),
  summary: z.string().optional().nullable(),
  target_person_reasoning: z.string().optional().nullable(),
  target_person_role_reasoning: z.string().optional().nullable(),
  target_person_role_score: z.number().optional().nullable(),
  target_person_role_type: z.string().optional().nullable(),
  target_person_score: z.number().optional().nullable(),
  target_person_type: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  topic_id: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  version: z.number().optional(),
  video_api_id: z.string().optional().nullable(),
  vtt: z.string().optional().nullable(),
});
export type MomentsV2Insert = z.infer<typeof MomentsV2Insert>;

export const MomentsV2Update = z.object({
  activity: z.string().optional().nullable(),
  activity_reasoning: z.string().optional().nullable(),
  activity_type: z.string().optional().nullable(),
  altitude_reasoning: z.string().optional().nullable(),
  altitude_score: z.number().optional().nullable(),
  altitude_score_reasoning: z.string().optional().nullable(),
  altitude_score_reasoning_not_higher: z.string().optional().nullable(),
  altitude_score_reasoning_not_lower: z.string().optional().nullable(),
  altitude_type: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  final_score: z.number().optional().nullable(),
  id: z.string().optional(),
  intensity: z.number().optional().nullable(),
  interestingness_reasoning: z.string().optional().nullable(),
  interestingness_reasoning_not_higher: z.string().optional().nullable(),
  interestingness_reasoning_not_lower: z.string().optional().nullable(),
  interestingness_score: z.number().optional().nullable(),
  latest: z.string().optional().nullable(),
  moment_url: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  qa_reasoning: z.string().optional().nullable(),
  qa_reasoning_not_higher: z.string().optional().nullable(),
  qa_reasoning_not_lower: z.string().optional().nullable(),
  qa_score: z.number().optional().nullable(),
  relevant: z.boolean().optional(),
  search_vector: z.unknown().optional().nullable(),
  segment_end_timestamp: z.string().optional().nullable(),
  segment_end_timestamp_in_seconds: z.number().optional().nullable(),
  segment_id_sequence_end: z.number().optional().nullable(),
  segment_id_sequence_start: z.number().optional().nullable(),
  segment_start_timestamp: z.string().optional().nullable(),
  segment_start_timestamp_in_seconds: z.number().optional().nullable(),
  summary: z.string().optional().nullable(),
  target_person_reasoning: z.string().optional().nullable(),
  target_person_role_reasoning: z.string().optional().nullable(),
  target_person_role_score: z.number().optional().nullable(),
  target_person_role_type: z.string().optional().nullable(),
  target_person_score: z.number().optional().nullable(),
  target_person_type: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  topic_id: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  version: z.number().optional(),
  video_api_id: z.string().optional().nullable(),
  vtt: z.string().optional().nullable(),
});
export type MomentsV2Update = z.infer<typeof MomentsV2Update>;

export const ObservationPromptsRow = z.object({
  created_at: z.string(),
  id: z.string(),
  latest: z.boolean().nullable(),
  profile_id: z.string().nullable(),
  prompt: z.string(),
  result: z.string().nullable(),
  type: z.string().nullable(),
});
export type ObservationPromptsRow = z.infer<typeof ObservationPromptsRow>;

export const ObservationPromptsInsert = z.object({
  created_at: z.string().optional(),
  id: z.string(),
  latest: z.boolean().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  prompt: z.string(),
  result: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
});
export type ObservationPromptsInsert = z.infer<typeof ObservationPromptsInsert>;

export const ObservationPromptsUpdate = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  latest: z.boolean().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  prompt: z.string().optional(),
  result: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
});
export type ObservationPromptsUpdate = z.infer<typeof ObservationPromptsUpdate>;

export const ObservationPromptsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("observation_prompts_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("observation_prompts_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("observation_prompts_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ObservationPromptsRelationships = z.infer<
  typeof ObservationPromptsRelationships
>;

export const OnboardingTaskCompletionsRow = z.object({
  completed_at: z.string(),
  id: z.string(),
  profile_id: z.string(),
  task_name: OnboardingTaskNameEnum,
});
export type OnboardingTaskCompletionsRow = z.infer<
  typeof OnboardingTaskCompletionsRow
>;

export const OnboardingTaskCompletionsInsert = z.object({
  completed_at: z.string().optional(),
  id: z.string().optional(),
  profile_id: z.string(),
  task_name: OnboardingTaskNameEnum,
});
export type OnboardingTaskCompletionsInsert = z.infer<
  typeof OnboardingTaskCompletionsInsert
>;

export const OnboardingTaskCompletionsUpdate = z.object({
  completed_at: z.string().optional(),
  id: z.string().optional(),
  profile_id: z.string().optional(),
  task_name: OnboardingTaskNameEnum.optional(),
});
export type OnboardingTaskCompletionsUpdate = z.infer<
  typeof OnboardingTaskCompletionsUpdate
>;

export const OnboardingTaskCompletionsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("onboarding_task_completions_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("onboarding_task_completions_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("onboarding_task_completions_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type OnboardingTaskCompletionsRelationships = z.infer<
  typeof OnboardingTaskCompletionsRelationships
>;

export const ProfileDevelopmentThemesRow = z.object({
  created_at: z.string().nullable(),
  deleted_at: z.string().nullable(),
  description: z.string(),
  icon: z.string(),
  id: z.string(),
  is_enabled: z.boolean(),
  key_points: z.array(z.string()),
  order: z.number(),
  parent_theme: z.string().nullable(),
  profile_id: z.string(),
  title: z.string(),
  updated_at: z.string().nullable(),
});
export type ProfileDevelopmentThemesRow = z.infer<
  typeof ProfileDevelopmentThemesRow
>;

export const ProfileDevelopmentThemesInsert = z.object({
  created_at: z.string().optional().nullable(),
  deleted_at: z.string().optional().nullable(),
  description: z.string(),
  icon: z.string(),
  id: z.string().optional(),
  is_enabled: z.boolean(),
  key_points: z.array(z.string()),
  order: z.number(),
  parent_theme: z.string().optional().nullable(),
  profile_id: z.string(),
  title: z.string(),
  updated_at: z.string().optional().nullable(),
});
export type ProfileDevelopmentThemesInsert = z.infer<
  typeof ProfileDevelopmentThemesInsert
>;

export const ProfileDevelopmentThemesUpdate = z.object({
  created_at: z.string().optional().nullable(),
  deleted_at: z.string().optional().nullable(),
  description: z.string().optional(),
  icon: z.string().optional(),
  id: z.string().optional(),
  is_enabled: z.boolean().optional(),
  key_points: z.array(z.string()).optional(),
  order: z.number().optional(),
  parent_theme: z.string().optional().nullable(),
  profile_id: z.string().optional(),
  title: z.string().optional(),
  updated_at: z.string().optional().nullable(),
});
export type ProfileDevelopmentThemesUpdate = z.infer<
  typeof ProfileDevelopmentThemesUpdate
>;

export const ProfileDevelopmentThemesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("profile_development_themes_parent_theme_fkey"),
    columns: z.tuple([z.literal("parent_theme")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profile_development_themes"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("profile_development_themes_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("profile_development_themes_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("profile_development_themes_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ProfileDevelopmentThemesRelationships = z.infer<
  typeof ProfileDevelopmentThemesRelationships
>;

export const ProfileEnhancementsRow = z.object({
  created_at: z.string(),
  dossier: z.string().nullable(),
  id: z.string(),
  org_chart: Json.nullable(),
  profile_id: z.string().nullable(),
});
export type ProfileEnhancementsRow = z.infer<typeof ProfileEnhancementsRow>;

export const ProfileEnhancementsInsert = z.object({
  created_at: z.string().optional(),
  dossier: z.string().optional().nullable(),
  id: z.string().optional(),
  org_chart: Json.optional().nullable(),
  profile_id: z.string().optional().nullable(),
});
export type ProfileEnhancementsInsert = z.infer<
  typeof ProfileEnhancementsInsert
>;

export const ProfileEnhancementsUpdate = z.object({
  created_at: z.string().optional(),
  dossier: z.string().optional().nullable(),
  id: z.string().optional(),
  org_chart: Json.optional().nullable(),
  profile_id: z.string().optional().nullable(),
});
export type ProfileEnhancementsUpdate = z.infer<
  typeof ProfileEnhancementsUpdate
>;

export const ProfileEnhancementsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("profile_enhancements_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("profile_enhancements_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("profile_enhancements_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ProfileEnhancementsRelationships = z.infer<
  typeof ProfileEnhancementsRelationships
>;

export const ProfileSignalsRow = z.object({
  created_at: z.string(),
  direction: GoalSignalDirectionType,
  id: z.string(),
  is_enabled: z.boolean(),
  profile_id: z.string(),
  text: z.string(),
  updated_at: z.string(),
});
export type ProfileSignalsRow = z.infer<typeof ProfileSignalsRow>;

export const ProfileSignalsInsert = z.object({
  created_at: z.string().optional(),
  direction: GoalSignalDirectionType,
  id: z.string().optional(),
  is_enabled: z.boolean().optional(),
  profile_id: z.string(),
  text: z.string(),
  updated_at: z.string().optional(),
});
export type ProfileSignalsInsert = z.infer<typeof ProfileSignalsInsert>;

export const ProfileSignalsUpdate = z.object({
  created_at: z.string().optional(),
  direction: GoalSignalDirectionType.optional(),
  id: z.string().optional(),
  is_enabled: z.boolean().optional(),
  profile_id: z.string().optional(),
  text: z.string().optional(),
  updated_at: z.string().optional(),
});
export type ProfileSignalsUpdate = z.infer<typeof ProfileSignalsUpdate>;

export const ProfileSignalsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("profile_signals_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("profile_signals_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("profile_signals_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ProfileSignalsRelationships = z.infer<
  typeof ProfileSignalsRelationships
>;

export const ProfilesRow = z.object({
  coach_id: z.string().nullable(),
  company: z.string().nullable(),
  created_at: z.string().nullable(),
  did_complete_onboarding: z.boolean(),
  did_complete_post_ten_meeting_onboarding: z.boolean(),
  email: z.string(),
  explore_email_sent: z.boolean().nullable(),
  force_post_ten_meeting_onboarding: z.boolean(),
  id: z.string(),
  image_url: z.string().nullable(),
  is_admin: z.boolean(),
  nickname: z.string().nullable(),
  role: UserRoleEnum,
  status: ProfileStatusEnum,
  updated_at: z.string(),
  viewing_as_id: z.string().nullable(),
});
export type ProfilesRow = z.infer<typeof ProfilesRow>;

export const ProfilesInsert = z.object({
  coach_id: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  did_complete_onboarding: z.boolean().optional(),
  did_complete_post_ten_meeting_onboarding: z.boolean().optional(),
  email: z.string(),
  explore_email_sent: z.boolean().optional().nullable(),
  force_post_ten_meeting_onboarding: z.boolean().optional(),
  id: z.string(),
  image_url: z.string().optional().nullable(),
  is_admin: z.boolean().optional(),
  nickname: z.string().optional().nullable(),
  role: UserRoleEnum.optional(),
  status: ProfileStatusEnum.optional(),
  updated_at: z.string().optional(),
  viewing_as_id: z.string().optional().nullable(),
});
export type ProfilesInsert = z.infer<typeof ProfilesInsert>;

export const ProfilesUpdate = z.object({
  coach_id: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  did_complete_onboarding: z.boolean().optional(),
  did_complete_post_ten_meeting_onboarding: z.boolean().optional(),
  email: z.string().optional(),
  explore_email_sent: z.boolean().optional().nullable(),
  force_post_ten_meeting_onboarding: z.boolean().optional(),
  id: z.string().optional(),
  image_url: z.string().optional().nullable(),
  is_admin: z.boolean().optional(),
  nickname: z.string().optional().nullable(),
  role: UserRoleEnum.optional(),
  status: ProfileStatusEnum.optional(),
  updated_at: z.string().optional(),
  viewing_as_id: z.string().optional().nullable(),
});
export type ProfilesUpdate = z.infer<typeof ProfilesUpdate>;

export const ProfilesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("profiles_coach_id_fkey"),
    columns: z.tuple([z.literal("coach_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("profiles_coach_id_fkey"),
    columns: z.tuple([z.literal("coach_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("profiles_coach_id_fkey"),
    columns: z.tuple([z.literal("coach_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("profiles_viewing_as_id_fkey"),
    columns: z.tuple([z.literal("viewing_as_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("profiles_viewing_as_id_fkey"),
    columns: z.tuple([z.literal("viewing_as_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("profiles_viewing_as_id_fkey"),
    columns: z.tuple([z.literal("viewing_as_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ProfilesRelationships = z.infer<typeof ProfilesRelationships>;

export const QnaChunksRow = z.object({
  chunk_id: z.string().nullable(),
  clear_text: z.string().nullable(),
  created_at: z.string(),
  id: z.string(),
  sources: Json.nullable(),
  video_api_id: z.string().nullable(),
});
export type QnaChunksRow = z.infer<typeof QnaChunksRow>;

export const QnaChunksInsert = z.object({
  chunk_id: z.string().optional().nullable(),
  clear_text: z.string().optional().nullable(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  sources: Json.optional().nullable(),
  video_api_id: z.string().optional().nullable(),
});
export type QnaChunksInsert = z.infer<typeof QnaChunksInsert>;

export const QnaChunksUpdate = z.object({
  chunk_id: z.string().optional().nullable(),
  clear_text: z.string().optional().nullable(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  sources: Json.optional().nullable(),
  video_api_id: z.string().optional().nullable(),
});
export type QnaChunksUpdate = z.infer<typeof QnaChunksUpdate>;

export const QnaChunksRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("qna_chunks_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("qna_chunks_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("qna_chunks_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("qna_chunks_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
]);
export type QnaChunksRelationships = z.infer<typeof QnaChunksRelationships>;

export const RecallCalendarsRow = z.object({
  created_at: z.string(),
  id: z.string(),
  platform: RecallCalendarPlatformType,
  profile_id: z.string(),
});
export type RecallCalendarsRow = z.infer<typeof RecallCalendarsRow>;

export const RecallCalendarsInsert = z.object({
  created_at: z.string().optional(),
  id: z.string(),
  platform: RecallCalendarPlatformType,
  profile_id: z.string(),
});
export type RecallCalendarsInsert = z.infer<typeof RecallCalendarsInsert>;

export const RecallCalendarsUpdate = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  platform: RecallCalendarPlatformType.optional(),
  profile_id: z.string().optional(),
});
export type RecallCalendarsUpdate = z.infer<typeof RecallCalendarsUpdate>;

export const RecallCalendarsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("recall_calendars_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("recall_calendars_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("recall_calendars_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type RecallCalendarsRelationships = z.infer<
  typeof RecallCalendarsRelationships
>;

export const RecallCalendarsV2Row = z.object({
  created_at: z.string(),
  id: z.string(),
  platform: RecallCalendarPlatformType,
  profile_id: z.string(),
  updated_at: z.string(),
});
export type RecallCalendarsV2Row = z.infer<typeof RecallCalendarsV2Row>;

export const RecallCalendarsV2Insert = z.object({
  created_at: z.string().optional(),
  id: z.string(),
  platform: RecallCalendarPlatformType,
  profile_id: z.string(),
  updated_at: z.string(),
});
export type RecallCalendarsV2Insert = z.infer<typeof RecallCalendarsV2Insert>;

export const RecallCalendarsV2Update = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  platform: RecallCalendarPlatformType.optional(),
  profile_id: z.string().optional(),
  updated_at: z.string().optional(),
});
export type RecallCalendarsV2Update = z.infer<typeof RecallCalendarsV2Update>;

export const RecallCalendarsV2Relationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("recall_calendars_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("recall_calendars_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("recall_calendars_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type RecallCalendarsV2Relationships = z.infer<
  typeof RecallCalendarsV2Relationships
>;

export const ReportCommentsRow = z.object({
  content: z.string(),
  created_at: z.string(),
  id: z.string(),
  profile_id: z.string(),
  report_id: z.string(),
});
export type ReportCommentsRow = z.infer<typeof ReportCommentsRow>;

export const ReportCommentsInsert = z.object({
  content: z.string(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  profile_id: z.string(),
  report_id: z.string(),
});
export type ReportCommentsInsert = z.infer<typeof ReportCommentsInsert>;

export const ReportCommentsUpdate = z.object({
  content: z.string().optional(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  profile_id: z.string().optional(),
  report_id: z.string().optional(),
});
export type ReportCommentsUpdate = z.infer<typeof ReportCommentsUpdate>;

export const ReportCommentsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("report_comments_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("report_comments_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("report_comments_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("report_comments_report_id_fkey"),
    columns: z.tuple([z.literal("report_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("reports"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ReportCommentsRelationships = z.infer<
  typeof ReportCommentsRelationships
>;

export const ReportGoalSignalsRow = z.object({
  activity: z.string().nullable(),
  activity_type: z.string().nullable(),
  created_at: z.string(),
  direction: GoalSignalDirectionType,
  goal_signal_id: z.string(),
  hidden_text: z.string().nullable(),
  id: z.string(),
  report_id: z.string(),
  tag: z.string().nullable(),
  target_person_type: z.string().nullable(),
  text: z.string().nullable(),
});
export type ReportGoalSignalsRow = z.infer<typeof ReportGoalSignalsRow>;

export const ReportGoalSignalsInsert = z.object({
  activity: z.string().optional().nullable(),
  activity_type: z.string().optional().nullable(),
  created_at: z.string().optional(),
  direction: GoalSignalDirectionType,
  goal_signal_id: z.string(),
  hidden_text: z.string().optional().nullable(),
  id: z.string().optional(),
  report_id: z.string(),
  tag: z.string().optional().nullable(),
  target_person_type: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
});
export type ReportGoalSignalsInsert = z.infer<typeof ReportGoalSignalsInsert>;

export const ReportGoalSignalsUpdate = z.object({
  activity: z.string().optional().nullable(),
  activity_type: z.string().optional().nullable(),
  created_at: z.string().optional(),
  direction: GoalSignalDirectionType.optional(),
  goal_signal_id: z.string().optional(),
  hidden_text: z.string().optional().nullable(),
  id: z.string().optional(),
  report_id: z.string().optional(),
  tag: z.string().optional().nullable(),
  target_person_type: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
});
export type ReportGoalSignalsUpdate = z.infer<typeof ReportGoalSignalsUpdate>;

export const ReportGoalSignalsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("report_goal_signals_goal_signal_id_fkey"),
    columns: z.tuple([z.literal("goal_signal_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("goal_signals"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("report_goal_signals_report_id_fkey"),
    columns: z.tuple([z.literal("report_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("reports"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ReportGoalSignalsRelationships = z.infer<
  typeof ReportGoalSignalsRelationships
>;

export const ReportGoalsRow = z.object({
  created_at: z.string().nullable(),
  goal_id: z.string(),
  hidden_text: z.string().nullable(),
  id: z.string(),
  is_reviewed: z.boolean(),
  report_id: z.string(),
  text: z.string().nullable(),
  updated_at: z.string().nullable(),
  user_provided_context: z.string().nullable(),
});
export type ReportGoalsRow = z.infer<typeof ReportGoalsRow>;

export const ReportGoalsInsert = z.object({
  created_at: z.string().optional().nullable(),
  goal_id: z.string(),
  hidden_text: z.string().optional().nullable(),
  id: z.string().optional(),
  is_reviewed: z.boolean().optional(),
  report_id: z.string(),
  text: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  user_provided_context: z.string().optional().nullable(),
});
export type ReportGoalsInsert = z.infer<typeof ReportGoalsInsert>;

export const ReportGoalsUpdate = z.object({
  created_at: z.string().optional().nullable(),
  goal_id: z.string().optional(),
  hidden_text: z.string().optional().nullable(),
  id: z.string().optional(),
  is_reviewed: z.boolean().optional(),
  report_id: z.string().optional(),
  text: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  user_provided_context: z.string().optional().nullable(),
});
export type ReportGoalsUpdate = z.infer<typeof ReportGoalsUpdate>;

export const ReportGoalsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("report_goals_goal_id_fkey"),
    columns: z.tuple([z.literal("goal_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("goals"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("report_goals_report_id_fkey"),
    columns: z.tuple([z.literal("report_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("reports"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ReportGoalsRelationships = z.infer<typeof ReportGoalsRelationships>;

export const ReportMomentsRow = z.object({
  created_at: z.string(),
  id: z.string(),
  is_visible: z.boolean(),
  moment_id: z.string(),
  omission_reason: z.string().nullable(),
  report_goal_signal_id: z.string(),
  report_id: z.string(),
  report_section_above_threshold: z.boolean().nullable(),
  report_section_confidence: z.number().nullable(),
  report_section_id: z.string().nullable(),
  report_section_reasoning: z.string().nullable(),
  score: z.number().nullable(),
  updated_at: z.string().nullable(),
  VTT: z.string().nullable(),
});
export type ReportMomentsRow = z.infer<typeof ReportMomentsRow>;

export const ReportMomentsInsert = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  is_visible: z.boolean().optional(),
  moment_id: z.string(),
  omission_reason: z.string().optional().nullable(),
  report_goal_signal_id: z.string(),
  report_id: z.string(),
  report_section_above_threshold: z.boolean().optional().nullable(),
  report_section_confidence: z.number().optional().nullable(),
  report_section_id: z.string().optional().nullable(),
  report_section_reasoning: z.string().optional().nullable(),
  score: z.number().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  VTT: z.string().optional().nullable(),
});
export type ReportMomentsInsert = z.infer<typeof ReportMomentsInsert>;

export const ReportMomentsUpdate = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  is_visible: z.boolean().optional(),
  moment_id: z.string().optional(),
  omission_reason: z.string().optional().nullable(),
  report_goal_signal_id: z.string().optional(),
  report_id: z.string().optional(),
  report_section_above_threshold: z.boolean().optional().nullable(),
  report_section_confidence: z.number().optional().nullable(),
  report_section_id: z.string().optional().nullable(),
  report_section_reasoning: z.string().optional().nullable(),
  score: z.number().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  VTT: z.string().optional().nullable(),
});
export type ReportMomentsUpdate = z.infer<typeof ReportMomentsUpdate>;

export const ReportMomentsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("report_moments_moment_id_fkey"),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("report_moments_moment_id_fkey"),
    columns: z.tuple([z.literal("moment_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("moments_with_score"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("report_moments_report_goal_signal_id_fkey"),
    columns: z.tuple([z.literal("report_goal_signal_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("report_goal_signals"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("report_moments_report_id_fkey"),
    columns: z.tuple([z.literal("report_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("reports"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("report_moments_report_section_id_fkey"),
    columns: z.tuple([z.literal("report_section_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("report_sections"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ReportMomentsRelationships = z.infer<
  typeof ReportMomentsRelationships
>;

export const ReportProcessingStatusRow = z.object({
  created_at: z.string(),
  error_msg: z.string().nullable(),
  group_processing_status_id: z.string(),
  id: z.string(),
  report_id: z.string().nullable(),
  status: ReportProcessingStatusType,
});
export type ReportProcessingStatusRow = z.infer<
  typeof ReportProcessingStatusRow
>;

export const ReportProcessingStatusInsert = z.object({
  created_at: z.string().optional(),
  error_msg: z.string().optional().nullable(),
  group_processing_status_id: z.string(),
  id: z.string(),
  report_id: z.string().optional().nullable(),
  status: ReportProcessingStatusType.optional(),
});
export type ReportProcessingStatusInsert = z.infer<
  typeof ReportProcessingStatusInsert
>;

export const ReportProcessingStatusUpdate = z.object({
  created_at: z.string().optional(),
  error_msg: z.string().optional().nullable(),
  group_processing_status_id: z.string().optional(),
  id: z.string().optional(),
  report_id: z.string().optional().nullable(),
  status: ReportProcessingStatusType.optional(),
});
export type ReportProcessingStatusUpdate = z.infer<
  typeof ReportProcessingStatusUpdate
>;

export const ReportProcessingStatusRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal(
      "report_processing_status_group_processing_status_id_fkey",
    ),
    columns: z.tuple([z.literal("group_processing_status_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("group_report_processing_status"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("report_processing_status_report_id_fkey"),
    columns: z.tuple([z.literal("report_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("reports"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ReportProcessingStatusRelationships = z.infer<
  typeof ReportProcessingStatusRelationships
>;

export const ReportSectionsRow = z.object({
  created_at: z.string(),
  direction: GoalSignalDirectionType.nullable(),
  id: z.string(),
  index: z.number().nullable(),
  report_id: z.string().nullable(),
  summary: z.string().nullable(),
  title: z.string().nullable(),
});
export type ReportSectionsRow = z.infer<typeof ReportSectionsRow>;

export const ReportSectionsInsert = z.object({
  created_at: z.string().optional(),
  direction: GoalSignalDirectionType.optional().nullable(),
  id: z.string().optional(),
  index: z.number().optional().nullable(),
  report_id: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
});
export type ReportSectionsInsert = z.infer<typeof ReportSectionsInsert>;

export const ReportSectionsUpdate = z.object({
  created_at: z.string().optional(),
  direction: GoalSignalDirectionType.optional().nullable(),
  id: z.string().optional(),
  index: z.number().optional().nullable(),
  report_id: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
});
export type ReportSectionsUpdate = z.infer<typeof ReportSectionsUpdate>;

export const ReportSectionsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("report_sections_report_id_fkey"),
    columns: z.tuple([z.literal("report_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("reports"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ReportSectionsRelationships = z.infer<
  typeof ReportSectionsRelationships
>;

export const ReportsRow = z.object({
  created_at: z.string(),
  end_date: z.string(),
  id: z.string(),
  is_hidden: z.boolean(),
  personality_badges: z.array(z.string()).nullable(),
  personality_color: z.string().nullable(),
  personality_description: z.string().nullable(),
  personality_icon: z.string().nullable(),
  personality_text: z.string().nullable(),
  profile_id: z.string().nullable(),
  skill_id: z.string().nullable(),
  start_date: z.string(),
  summary: z.string().nullable(),
  updated_at: z.string().nullable(),
});
export type ReportsRow = z.infer<typeof ReportsRow>;

export const ReportsInsert = z.object({
  created_at: z.string().optional(),
  end_date: z.string(),
  id: z.string().optional(),
  is_hidden: z.boolean().optional(),
  personality_badges: z.array(z.string()).optional().nullable(),
  personality_color: z.string().optional().nullable(),
  personality_description: z.string().optional().nullable(),
  personality_icon: z.string().optional().nullable(),
  personality_text: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  skill_id: z.string().optional().nullable(),
  start_date: z.string(),
  summary: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});
export type ReportsInsert = z.infer<typeof ReportsInsert>;

export const ReportsUpdate = z.object({
  created_at: z.string().optional(),
  end_date: z.string().optional(),
  id: z.string().optional(),
  is_hidden: z.boolean().optional(),
  personality_badges: z.array(z.string()).optional().nullable(),
  personality_color: z.string().optional().nullable(),
  personality_description: z.string().optional().nullable(),
  personality_icon: z.string().optional().nullable(),
  personality_text: z.string().optional().nullable(),
  profile_id: z.string().optional().nullable(),
  skill_id: z.string().optional().nullable(),
  start_date: z.string().optional(),
  summary: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});
export type ReportsUpdate = z.infer<typeof ReportsUpdate>;

export const ReportsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("reports_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("reports_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("reports_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("reports_skill_id_fkey"),
    columns: z.tuple([z.literal("skill_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("skills"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ReportsRelationships = z.infer<typeof ReportsRelationships>;

export const ScheduledMeetingsRow = z.object({
  calendar_id: z.string(),
  conference_id: z.string().nullable(),
  created_at: z.string().nullable(),
  event_id: z.string(),
  id: z.string(),
  meet_link: z.string().nullable(),
  notification_time: z.string(),
  start_time: z.string(),
  status: z.string(),
  summary: z.string().nullable(),
  updated_at: z.string().nullable(),
});
export type ScheduledMeetingsRow = z.infer<typeof ScheduledMeetingsRow>;

export const ScheduledMeetingsInsert = z.object({
  calendar_id: z.string(),
  conference_id: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  event_id: z.string(),
  id: z.string().optional(),
  meet_link: z.string().optional().nullable(),
  notification_time: z.string(),
  start_time: z.string(),
  status: z.string().optional(),
  summary: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});
export type ScheduledMeetingsInsert = z.infer<typeof ScheduledMeetingsInsert>;

export const ScheduledMeetingsUpdate = z.object({
  calendar_id: z.string().optional(),
  conference_id: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  event_id: z.string().optional(),
  id: z.string().optional(),
  meet_link: z.string().optional().nullable(),
  notification_time: z.string().optional(),
  start_time: z.string().optional(),
  status: z.string().optional(),
  summary: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});
export type ScheduledMeetingsUpdate = z.infer<typeof ScheduledMeetingsUpdate>;

export const ScheduledMeetingsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("scheduled_meetings_calendar_id_fkey"),
    columns: z.tuple([z.literal("calendar_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("calendar_integrations"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type ScheduledMeetingsRelationships = z.infer<
  typeof ScheduledMeetingsRelationships
>;

export const SearchCacheRow = z.object({
  cache_key: z.string(),
  created_at: z.string(),
  expires_at: z.string(),
  id: z.string(),
  results: Json,
});
export type SearchCacheRow = z.infer<typeof SearchCacheRow>;

export const SearchCacheInsert = z.object({
  cache_key: z.string(),
  created_at: z.string().optional(),
  expires_at: z.string(),
  id: z.string().optional(),
  results: Json,
});
export type SearchCacheInsert = z.infer<typeof SearchCacheInsert>;

export const SearchCacheUpdate = z.object({
  cache_key: z.string().optional(),
  created_at: z.string().optional(),
  expires_at: z.string().optional(),
  id: z.string().optional(),
  results: Json.optional(),
});
export type SearchCacheUpdate = z.infer<typeof SearchCacheUpdate>;

export const SegmentsRow = z.object({
  duration: z.number().nullable(),
  end_timestamp: z.string().nullable(),
  hard_filler_word_count: z.number().nullable(),
  id: z.string(),
  index: z.number().nullable(),
  profanity_count: z.number().nullable(),
  question_count: z.number().nullable(),
  sentence_count: z.number().nullable(),
  soft_filler_word_count: z.number().nullable(),
  speaker_name: z.string().nullable(),
  start_timestamp: z.string().nullable(),
  text: z.string().nullable(),
  total_arousal: z.number().nullable(),
  total_dominance: z.number().nullable(),
  total_valence: z.number().nullable(),
  vad_word_count: z.number().nullable(),
  video_api_id: z.string().nullable(),
  word_count: z.number().nullable(),
});
export type SegmentsRow = z.infer<typeof SegmentsRow>;

export const SegmentsInsert = z.object({
  duration: z.number().optional().nullable(),
  end_timestamp: z.string().optional().nullable(),
  hard_filler_word_count: z.number().optional().nullable(),
  id: z.string(),
  index: z.number().optional().nullable(),
  profanity_count: z.number().optional().nullable(),
  question_count: z.number().optional().nullable(),
  sentence_count: z.number().optional().nullable(),
  soft_filler_word_count: z.number().optional().nullable(),
  speaker_name: z.string().optional().nullable(),
  start_timestamp: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
  total_arousal: z.number().optional().nullable(),
  total_dominance: z.number().optional().nullable(),
  total_valence: z.number().optional().nullable(),
  vad_word_count: z.number().optional().nullable(),
  video_api_id: z.string().optional().nullable(),
  word_count: z.number().optional().nullable(),
});
export type SegmentsInsert = z.infer<typeof SegmentsInsert>;

export const SegmentsUpdate = z.object({
  duration: z.number().optional().nullable(),
  end_timestamp: z.string().optional().nullable(),
  hard_filler_word_count: z.number().optional().nullable(),
  id: z.string().optional(),
  index: z.number().optional().nullable(),
  profanity_count: z.number().optional().nullable(),
  question_count: z.number().optional().nullable(),
  sentence_count: z.number().optional().nullable(),
  soft_filler_word_count: z.number().optional().nullable(),
  speaker_name: z.string().optional().nullable(),
  start_timestamp: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
  total_arousal: z.number().optional().nullable(),
  total_dominance: z.number().optional().nullable(),
  total_valence: z.number().optional().nullable(),
  vad_word_count: z.number().optional().nullable(),
  video_api_id: z.string().optional().nullable(),
  word_count: z.number().optional().nullable(),
});
export type SegmentsUpdate = z.infer<typeof SegmentsUpdate>;

export const SessionAnnotationReactionsRow = z.object({
  created_at: z.string(),
  id: z.string(),
  reaction_type: MomentReactionType,
  session_annotation_id: z.string(),
  user_id: z.string(),
});
export type SessionAnnotationReactionsRow = z.infer<
  typeof SessionAnnotationReactionsRow
>;

export const SessionAnnotationReactionsInsert = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  reaction_type: MomentReactionType,
  session_annotation_id: z.string(),
  user_id: z.string(),
});
export type SessionAnnotationReactionsInsert = z.infer<
  typeof SessionAnnotationReactionsInsert
>;

export const SessionAnnotationReactionsUpdate = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  reaction_type: MomentReactionType.optional(),
  session_annotation_id: z.string().optional(),
  user_id: z.string().optional(),
});
export type SessionAnnotationReactionsUpdate = z.infer<
  typeof SessionAnnotationReactionsUpdate
>;

export const SessionAnnotationReactionsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal(
      "session_annotation_reactions_session_annotation_id_fkey",
    ),
    columns: z.tuple([z.literal("session_annotation_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("session_annotations"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("session_annotation_reactions_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("session_annotation_reactions_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("session_annotation_reactions_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type SessionAnnotationReactionsRelationships = z.infer<
  typeof SessionAnnotationReactionsRelationships
>;

export const SessionAnnotationSourcesRow = z.object({
  created_at: z.string(),
  id: z.string(),
  session_annotation_id: z.string(),
  source_id: z.string(),
  source_type: z.string(),
});
export type SessionAnnotationSourcesRow = z.infer<
  typeof SessionAnnotationSourcesRow
>;

export const SessionAnnotationSourcesInsert = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  session_annotation_id: z.string(),
  source_id: z.string(),
  source_type: z.string(),
});
export type SessionAnnotationSourcesInsert = z.infer<
  typeof SessionAnnotationSourcesInsert
>;

export const SessionAnnotationSourcesUpdate = z.object({
  created_at: z.string().optional(),
  id: z.string().optional(),
  session_annotation_id: z.string().optional(),
  source_id: z.string().optional(),
  source_type: z.string().optional(),
});
export type SessionAnnotationSourcesUpdate = z.infer<
  typeof SessionAnnotationSourcesUpdate
>;

export const SessionAnnotationSourcesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal(
      "session_annotation_sources_session_annotation_id_fkey",
    ),
    columns: z.tuple([z.literal("session_annotation_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("session_annotations"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type SessionAnnotationSourcesRelationships = z.infer<
  typeof SessionAnnotationSourcesRelationships
>;

export const SessionAnnotationsRow = z.object({
  created_at: z.string(),
  description: z.string().nullable(),
  id: z.string(),
  session_id: z.string(),
  thumbs_down: z.number(),
  thumbs_up: z.number(),
  title: z.string().nullable(),
  title_summarized: z.string().nullable(),
  type: z.string().nullable(),
});
export type SessionAnnotationsRow = z.infer<typeof SessionAnnotationsRow>;

export const SessionAnnotationsInsert = z.object({
  created_at: z.string().optional(),
  description: z.string().optional().nullable(),
  id: z.string().optional(),
  session_id: z.string(),
  thumbs_down: z.number().optional(),
  thumbs_up: z.number().optional(),
  title: z.string().optional().nullable(),
  title_summarized: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
});
export type SessionAnnotationsInsert = z.infer<typeof SessionAnnotationsInsert>;

export const SessionAnnotationsUpdate = z.object({
  created_at: z.string().optional(),
  description: z.string().optional().nullable(),
  id: z.string().optional(),
  session_id: z.string().optional(),
  thumbs_down: z.number().optional(),
  thumbs_up: z.number().optional(),
  title: z.string().optional().nullable(),
  title_summarized: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
});
export type SessionAnnotationsUpdate = z.infer<typeof SessionAnnotationsUpdate>;

export const SessionAnnotationsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("session_annotations_session_id_fkey"),
    columns: z.tuple([z.literal("session_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("sessions"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type SessionAnnotationsRelationships = z.infer<
  typeof SessionAnnotationsRelationships
>;

export const SessionNotesRow = z.object({
  attachment_url: z.string().nullable(),
  author_id: z.string(),
  color: NoteColor,
  content: z.string(),
  created_at: z.string(),
  id: z.string(),
  minimized: z.boolean(),
  position_x: z.number(),
  position_y: z.number(),
  session_id: z.string(),
  updated_at: z.string(),
  z_index: z.number(),
});
export type SessionNotesRow = z.infer<typeof SessionNotesRow>;

export const SessionNotesInsert = z.object({
  attachment_url: z.string().optional().nullable(),
  author_id: z.string(),
  color: NoteColor.optional(),
  content: z.string(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  minimized: z.boolean().optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
  session_id: z.string(),
  updated_at: z.string().optional(),
  z_index: z.number().optional(),
});
export type SessionNotesInsert = z.infer<typeof SessionNotesInsert>;

export const SessionNotesUpdate = z.object({
  attachment_url: z.string().optional().nullable(),
  author_id: z.string().optional(),
  color: NoteColor.optional(),
  content: z.string().optional(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  minimized: z.boolean().optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
  session_id: z.string().optional(),
  updated_at: z.string().optional(),
  z_index: z.number().optional(),
});
export type SessionNotesUpdate = z.infer<typeof SessionNotesUpdate>;

export const SessionNotesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("session_notes_author_id_fkey"),
    columns: z.tuple([z.literal("author_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("session_notes_author_id_fkey"),
    columns: z.tuple([z.literal("author_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("session_notes_author_id_fkey"),
    columns: z.tuple([z.literal("author_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("session_notes_session_id_fkey"),
    columns: z.tuple([z.literal("session_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("sessions"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type SessionNotesRelationships = z.infer<
  typeof SessionNotesRelationships
>;

export const SessionsRow = z.object({
  api_video_id: z.string().nullable(),
  coach_id: z.string().nullable(),
  created_at: z.string(),
  date: z.string().nullable(),
  event_id: z.string().nullable(),
  id: z.string(),
  summary: z.string().nullable(),
  title: z.string().nullable(),
  user_id: z.string().nullable(),
});
export type SessionsRow = z.infer<typeof SessionsRow>;

export const SessionsInsert = z.object({
  api_video_id: z.string().optional().nullable(),
  coach_id: z.string().optional().nullable(),
  created_at: z.string().optional(),
  date: z.string().optional().nullable(),
  event_id: z.string().optional().nullable(),
  id: z.string().optional(),
  summary: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  user_id: z.string().optional().nullable(),
});
export type SessionsInsert = z.infer<typeof SessionsInsert>;

export const SessionsUpdate = z.object({
  api_video_id: z.string().optional().nullable(),
  coach_id: z.string().optional().nullable(),
  created_at: z.string().optional(),
  date: z.string().optional().nullable(),
  event_id: z.string().optional().nullable(),
  id: z.string().optional(),
  summary: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  user_id: z.string().optional().nullable(),
});
export type SessionsUpdate = z.infer<typeof SessionsUpdate>;

export const SessionsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("coach_sessions_coach_id_fkey"),
    columns: z.tuple([z.literal("coach_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("coach_sessions_coach_id_fkey"),
    columns: z.tuple([z.literal("coach_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("coach_sessions_coach_id_fkey"),
    columns: z.tuple([z.literal("coach_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("coach_sessions_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("coach_sessions_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("coach_sessions_user_id_fkey"),
    columns: z.tuple([z.literal("user_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("sessions_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("sessions_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("sessions_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("sessions_api_video_id_fkey"),
    columns: z.tuple([z.literal("api_video_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("sessions_event_id_fkey"),
    columns: z.tuple([z.literal("event_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("calendar_event_details_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("sessions_event_id_fkey"),
    columns: z.tuple([z.literal("event_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("calendar_events_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type SessionsRelationships = z.infer<typeof SessionsRelationships>;

export const SkillScalesRow = z.object({
  id: z.string(),
  negative_tag_description: z.string().nullable(),
  negative_tag_title: z.string(),
  positive_tag_description: z.string().nullable(),
  positive_tag_title: z.string(),
  skill_id: z.string(),
});
export type SkillScalesRow = z.infer<typeof SkillScalesRow>;

export const SkillScalesInsert = z.object({
  id: z.string().optional(),
  negative_tag_description: z.string().optional().nullable(),
  negative_tag_title: z.string(),
  positive_tag_description: z.string().optional().nullable(),
  positive_tag_title: z.string(),
  skill_id: z.string(),
});
export type SkillScalesInsert = z.infer<typeof SkillScalesInsert>;

export const SkillScalesUpdate = z.object({
  id: z.string().optional(),
  negative_tag_description: z.string().optional().nullable(),
  negative_tag_title: z.string().optional(),
  positive_tag_description: z.string().optional().nullable(),
  positive_tag_title: z.string().optional(),
  skill_id: z.string().optional(),
});
export type SkillScalesUpdate = z.infer<typeof SkillScalesUpdate>;

export const SkillScalesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("skill_scales_skill_id_fkey"),
    columns: z.tuple([z.literal("skill_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("skills"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type SkillScalesRelationships = z.infer<typeof SkillScalesRelationships>;

export const SkillsRow = z.object({
  created_at: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  id: z.string(),
  internal_title: z.string(),
  is_enabled: z.boolean(),
  title: z.string(),
});
export type SkillsRow = z.infer<typeof SkillsRow>;

export const SkillsInsert = z.object({
  created_at: z.string().optional(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  id: z.string().optional(),
  internal_title: z.string(),
  is_enabled: z.boolean().optional(),
  title: z.string(),
});
export type SkillsInsert = z.infer<typeof SkillsInsert>;

export const SkillsUpdate = z.object({
  created_at: z.string().optional(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  id: z.string().optional(),
  internal_title: z.string().optional(),
  is_enabled: z.boolean().optional(),
  title: z.string().optional(),
});
export type SkillsUpdate = z.infer<typeof SkillsUpdate>;

export const TranscriptSlicesRow = z.object({
  bot_id: z.string(),
  created_at: z.string(),
  id: z.string(),
  index: z.number(),
  speaker_name: z.string().nullable(),
});
export type TranscriptSlicesRow = z.infer<typeof TranscriptSlicesRow>;

export const TranscriptSlicesInsert = z.object({
  bot_id: z.string(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  index: z.number(),
  speaker_name: z.string().optional().nullable(),
});
export type TranscriptSlicesInsert = z.infer<typeof TranscriptSlicesInsert>;

export const TranscriptSlicesUpdate = z.object({
  bot_id: z.string().optional(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  index: z.number().optional(),
  speaker_name: z.string().optional().nullable(),
});
export type TranscriptSlicesUpdate = z.infer<typeof TranscriptSlicesUpdate>;

export const TranscriptSlicesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_bot_transcript_slices_bot_id_fkey"),
    columns: z.tuple([z.literal("bot_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_bot_transcripts"),
    referencedColumns: z.tuple([z.literal("bot_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_bot_transcript_slices_bot_id_fkey"),
    columns: z.tuple([z.literal("bot_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_bots"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type TranscriptSlicesRelationships = z.infer<
  typeof TranscriptSlicesRelationships
>;

export const TranscriptSlicesV2Row = z.object({
  bot_id: z.string(),
  created_at: z.string(),
  id: z.string(),
  index: z.number(),
  speaker_name: z.string().nullable(),
});
export type TranscriptSlicesV2Row = z.infer<typeof TranscriptSlicesV2Row>;

export const TranscriptSlicesV2Insert = z.object({
  bot_id: z.string(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  index: z.number(),
  speaker_name: z.string().optional().nullable(),
});
export type TranscriptSlicesV2Insert = z.infer<typeof TranscriptSlicesV2Insert>;

export const TranscriptSlicesV2Update = z.object({
  bot_id: z.string().optional(),
  created_at: z.string().optional(),
  id: z.string().optional(),
  index: z.number().optional(),
  speaker_name: z.string().optional().nullable(),
});
export type TranscriptSlicesV2Update = z.infer<typeof TranscriptSlicesV2Update>;

export const TranscriptSlicesV2Relationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("transcript_slices_v2_bot_id_fkey"),
    columns: z.tuple([z.literal("bot_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_bots_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type TranscriptSlicesV2Relationships = z.infer<
  typeof TranscriptSlicesV2Relationships
>;

export const TranscriptWordsRow = z.object({
  bot_id: z.string(),
  content: z.string().nullable(),
  created_at: z.string(),
  end_time: z.number().nullable(),
  id: z.string(),
  index: z.number().nullable(),
  start_time: z.number().nullable(),
  transcript_slice_id: z.string(),
});
export type TranscriptWordsRow = z.infer<typeof TranscriptWordsRow>;

export const TranscriptWordsInsert = z.object({
  bot_id: z.string().optional(),
  content: z.string().optional().nullable(),
  created_at: z.string().optional(),
  end_time: z.number().optional().nullable(),
  id: z.string().optional(),
  index: z.number().optional().nullable(),
  start_time: z.number().optional().nullable(),
  transcript_slice_id: z.string().optional(),
});
export type TranscriptWordsInsert = z.infer<typeof TranscriptWordsInsert>;

export const TranscriptWordsUpdate = z.object({
  bot_id: z.string().optional(),
  content: z.string().optional().nullable(),
  created_at: z.string().optional(),
  end_time: z.number().optional().nullable(),
  id: z.string().optional(),
  index: z.number().optional().nullable(),
  start_time: z.number().optional().nullable(),
  transcript_slice_id: z.string().optional(),
});
export type TranscriptWordsUpdate = z.infer<typeof TranscriptWordsUpdate>;

export const TranscriptWordsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("transcript_words_bot_id_fkey"),
    columns: z.tuple([z.literal("bot_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_bot_transcripts"),
    referencedColumns: z.tuple([z.literal("bot_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("transcript_words_bot_id_fkey"),
    columns: z.tuple([z.literal("bot_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_bots"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("transcript_words_transcript_slice_id_fkey"),
    columns: z.tuple([z.literal("transcript_slice_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("transcript_slices"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type TranscriptWordsRelationships = z.infer<
  typeof TranscriptWordsRelationships
>;

export const TranscriptWordsV2Row = z.object({
  bot_id: z.string(),
  content: z.string().nullable(),
  created_at: z.string(),
  end_time: z.number().nullable(),
  id: z.string(),
  index: z.number().nullable(),
  start_time: z.number().nullable(),
  transcript_slice_id: z.string(),
});
export type TranscriptWordsV2Row = z.infer<typeof TranscriptWordsV2Row>;

export const TranscriptWordsV2Insert = z.object({
  bot_id: z.string(),
  content: z.string().optional().nullable(),
  created_at: z.string().optional(),
  end_time: z.number().optional().nullable(),
  id: z.string().optional(),
  index: z.number().optional().nullable(),
  start_time: z.number().optional().nullable(),
  transcript_slice_id: z.string(),
});
export type TranscriptWordsV2Insert = z.infer<typeof TranscriptWordsV2Insert>;

export const TranscriptWordsV2Update = z.object({
  bot_id: z.string().optional(),
  content: z.string().optional().nullable(),
  created_at: z.string().optional(),
  end_time: z.number().optional().nullable(),
  id: z.string().optional(),
  index: z.number().optional().nullable(),
  start_time: z.number().optional().nullable(),
  transcript_slice_id: z.string().optional(),
});
export type TranscriptWordsV2Update = z.infer<typeof TranscriptWordsV2Update>;

export const TranscriptWordsV2Relationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("transcript_words_v2_bot_id_fkey"),
    columns: z.tuple([z.literal("bot_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_bots_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("transcript_words_v2_transcript_slice_id_fkey1"),
    columns: z.tuple([z.literal("transcript_slice_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("transcript_slices_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type TranscriptWordsV2Relationships = z.infer<
  typeof TranscriptWordsV2Relationships
>;

export const UserInvitesRow = z.object({
  company: z.string().nullable(),
  created_at: z.string(),
  email: z.string(),
  first_name: z.string(),
  id: z.string(),
  invited_by: z.string(),
  last_name: z.string().nullable(),
  role: UserRoleEnum.nullable(),
});
export type UserInvitesRow = z.infer<typeof UserInvitesRow>;

export const UserInvitesInsert = z.object({
  company: z.string().optional().nullable(),
  created_at: z.string().optional(),
  email: z.string(),
  first_name: z.string(),
  id: z.string().optional(),
  invited_by: z.string(),
  last_name: z.string().optional().nullable(),
  role: UserRoleEnum.optional().nullable(),
});
export type UserInvitesInsert = z.infer<typeof UserInvitesInsert>;

export const UserInvitesUpdate = z.object({
  company: z.string().optional().nullable(),
  created_at: z.string().optional(),
  email: z.string().optional(),
  first_name: z.string().optional(),
  id: z.string().optional(),
  invited_by: z.string().optional(),
  last_name: z.string().optional().nullable(),
  role: UserRoleEnum.optional().nullable(),
});
export type UserInvitesUpdate = z.infer<typeof UserInvitesUpdate>;

export const UserInvitesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("user_invites_invited_by_fkey"),
    columns: z.tuple([z.literal("invited_by")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("user_invites_invited_by_fkey"),
    columns: z.tuple([z.literal("invited_by")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("user_invites_invited_by_fkey"),
    columns: z.tuple([z.literal("invited_by")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type UserInvitesRelationships = z.infer<typeof UserInvitesRelationships>;

export const UserSettingsRow = z.object({
  action_items_email: z.boolean().nullable(),
  bot_name: z.string().nullable(),
  created_at: z.string(),
  has_ai_coaching_enabled: z.boolean(),
  id: z.number(),
  profile_id: z.string(),
  recap_email: z.boolean().nullable(),
  report_email_template: EmailTemplateType,
  report_frequency_in_days: z.number(),
  should_join_external_meetings: z.boolean(),
  should_join_team_meetings: z.boolean(),
  should_not_join_coaching_sessions: z.boolean(),
  should_not_join_owned_by_others_meetings: z.boolean(),
  should_not_join_pending_meetings: z.boolean(),
});
export type UserSettingsRow = z.infer<typeof UserSettingsRow>;

export const UserSettingsInsert = z.object({
  action_items_email: z.boolean().optional().nullable(),
  bot_name: z.string().optional().nullable(),
  created_at: z.string().optional(),
  has_ai_coaching_enabled: z.boolean().optional(),
  id: z.number().optional(),
  profile_id: z.string(),
  recap_email: z.boolean().optional().nullable(),
  report_email_template: EmailTemplateType.optional(),
  report_frequency_in_days: z.number().optional(),
  should_join_external_meetings: z.boolean().optional(),
  should_join_team_meetings: z.boolean().optional(),
  should_not_join_coaching_sessions: z.boolean().optional(),
  should_not_join_owned_by_others_meetings: z.boolean().optional(),
  should_not_join_pending_meetings: z.boolean().optional(),
});
export type UserSettingsInsert = z.infer<typeof UserSettingsInsert>;

export const UserSettingsUpdate = z.object({
  action_items_email: z.boolean().optional().nullable(),
  bot_name: z.string().optional().nullable(),
  created_at: z.string().optional(),
  has_ai_coaching_enabled: z.boolean().optional(),
  id: z.number().optional(),
  profile_id: z.string().optional(),
  recap_email: z.boolean().optional().nullable(),
  report_email_template: EmailTemplateType.optional(),
  report_frequency_in_days: z.number().optional(),
  should_join_external_meetings: z.boolean().optional(),
  should_join_team_meetings: z.boolean().optional(),
  should_not_join_coaching_sessions: z.boolean().optional(),
  should_not_join_owned_by_others_meetings: z.boolean().optional(),
  should_not_join_pending_meetings: z.boolean().optional(),
});
export type UserSettingsUpdate = z.infer<typeof UserSettingsUpdate>;

export const UserSettingsRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("user_settings_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("user_settings_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("user_settings_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type UserSettingsRelationships = z.infer<
  typeof UserSettingsRelationships
>;

export const ActionItemsWithAssigneesRow = z.object({
  assignee_entity_ids: z.array(z.string()).nullable(),
  assignee_names: z.array(z.string()).nullable(),
  completed: z.boolean().nullable(),
  completed_date: z.string().nullable(),
  created_at: z.string().nullable(),
  due_date: z.string().nullable(),
  id: z.string().nullable(),
  meeting_date: z.string().nullable(),
  meeting_id: z.string().nullable(),
  meeting_title: z.string().nullable(),
  participant_entity_ids: z.array(z.string()).nullable(),
  participant_names: z.array(z.string()).nullable(),
  title: z.string().nullable(),
});
export type ActionItemsWithAssigneesRow = z.infer<
  typeof ActionItemsWithAssigneesRow
>;

export const ActionItemsWithAssigneesRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_action_items_api_video_id_fkey"),
    columns: z.tuple([z.literal("meeting_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_action_items_api_video_id_fkey"),
    columns: z.tuple([z.literal("meeting_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_action_items_api_video_id_fkey"),
    columns: z.tuple([z.literal("meeting_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("meeting_action_items_api_video_id_fkey"),
    columns: z.tuple([z.literal("meeting_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
]);
export type ActionItemsWithAssigneesRelationships = z.infer<
  typeof ActionItemsWithAssigneesRelationships
>;

export const CalendarEventDetailsV2Row = z.object({
  attendees: Json.nullable(),
  created: z.string().nullable(),
  created_at: z.string().nullable(),
  creator_email: z.string().nullable(),
  end_date_time: z.string().nullable(),
  end_time: z.string().nullable(),
  event_id: z.string().nullable(),
  html_link: z.string().nullable(),
  ical_uid: z.string().nullable(),
  id: z.string().nullable(),
  is_deleted: z.boolean().nullable(),
  meeting_platform: MeetingPlatformEnum.nullable(),
  meeting_url: z.string().nullable(),
  platform: RecallCalendarPlatformType.nullable(),
  platform_id: z.string().nullable(),
  profile_id: z.string().nullable(),
  raw: Json.nullable(),
  recall_calendar_id: z.string().nullable(),
  should_join_user_override: z.boolean().nullable(),
  start_date_time: z.string().nullable(),
  start_time: z.string().nullable(),
  status: z.string().nullable(),
  summary: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  updated_at: z.string().nullable(),
});
export type CalendarEventDetailsV2Row = z.infer<
  typeof CalendarEventDetailsV2Row
>;

export const CalendarEventDetailsV2Relationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("calendar_events_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("calendar_events_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("calendar_events_v2_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("calendar_events_v2_recall_calendar_id_fkey1"),
    columns: z.tuple([z.literal("recall_calendar_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("recall_calendars_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type CalendarEventDetailsV2Relationships = z.infer<
  typeof CalendarEventDetailsV2Relationships
>;

export const MeetingBotTranscriptsRow = z.object({
  bot_id: z.string().nullable(),
  transcripts: z.array(Json).nullable(),
});
export type MeetingBotTranscriptsRow = z.infer<typeof MeetingBotTranscriptsRow>;

export const MeetingProcessingStatusViewRow = z.object({
  action_items_status: z.string().nullable(),
  backend_call_status: ProcessingStatus.nullable(),
  created_at: z.string().nullable(),
  email: z.string().nullable(),
  embed_meeting_status: z.string().nullable(),
  embed_moments_status: z.string().nullable(),
  entity_extraction_status: ProcessingStatus.nullable(),
  id: z.string().nullable(),
  interestingness_status: z.string().nullable(),
  internal: z.boolean().nullable(),
  meeting_bot_id: z.string().nullable(),
  meeting_created_at: z.string().nullable(),
  meeting_name: z.string().nullable(),
  meeting_summary: z.string().nullable(),
  meeting_video_api_id: z.string().nullable(),
  meetings_status: z.string().nullable(),
  moments_status: z.string().nullable(),
  nickname: z.string().nullable(),
  observation_status: z.string().nullable(),
  origin: z.string().nullable(),
  profile_id: z.string().nullable(),
  segments_status: z.string().nullable(),
  supabase_video_upload_status: ProcessingStatus.nullable(),
  topic_segmentation_status: ProcessingStatus.nullable(),
  topics_status: z.string().nullable(),
  transcript_slice_words_status: ProcessingStatus.nullable(),
  updated_at: z.string().nullable(),
  video_api_upload_status: ProcessingStatus.nullable(),
  video_id: z.string().nullable(),
});
export type MeetingProcessingStatusViewRow = z.infer<
  typeof MeetingProcessingStatusViewRow
>;

export const MeetingProcessingStatusViewRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("meeting_processing_status_meeting_bot_id_fkey"),
    columns: z.tuple([z.literal("meeting_bot_id")]),
    isOneToOne: z.literal(true),
    referencedRelation: z.literal("meeting_bots_v2"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
]);
export type MeetingProcessingStatusViewRelationships = z.infer<
  typeof MeetingProcessingStatusViewRelationships
>;

export const MeetingsWithProfileRow = z.object({
  clean_vtt_file: z.string().nullable(),
  created_at: z.string().nullable(),
  date: z.string().nullable(),
  db_created_at: z.string().nullable(),
  duration_in_ms: z.number().nullable(),
  meeting_baas_original_json: Json.nullable(),
  name: z.string().nullable(),
  original_vtt_file: z.string().nullable(),
  profile_id: z.string().nullable(),
  searchable: z.unknown().nullable(),
  speaker: z.string().nullable(),
  summary: z.string().nullable(),
  tags: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  vectorized: z.boolean().nullable(),
  video_api_id: z.string().nullable(),
});
export type MeetingsWithProfileRow = z.infer<typeof MeetingsWithProfileRow>;

export const MomentsWithScoreRow = z.object({
  activity: z.string().nullable(),
  activity_reasoning: z.string().nullable(),
  activity_type: z.string().nullable(),
  created_at: z.string().nullable(),
  date: z.string().nullable(),
  id: z.string().nullable(),
  intensity: z.number().nullable(),
  latest: z.boolean().nullable(),
  moment_url: z.string().nullable(),
  profile_id: z.string().nullable(),
  relevant: z.boolean().nullable(),
  score: z.number().nullable(),
  search_vector: z.unknown().nullable(),
  segment_end_timestamp: z.string().nullable(),
  segment_end_timestamp_in_seconds: z.number().nullable(),
  segment_id_sequence_end: z.number().nullable(),
  segment_id_sequence_start: z.number().nullable(),
  segment_start_timestamp: z.string().nullable(),
  segment_start_timestamp_in_seconds: z.number().nullable(),
  summary: z.string().nullable(),
  target_person_reasoning: z.string().nullable(),
  target_person_type: z.string().nullable(),
  title: z.string().nullable(),
  updated_at: z.string().nullable(),
  version: z.number().nullable(),
  video_api_id: z.string().nullable(),
});
export type MomentsWithScoreRow = z.infer<typeof MomentsWithScoreRow>;

export const MomentsWithScoreRelationships = z.tuple([
  z.object({
    foreignKeyName: z.literal("moments_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("profile_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_profile_id_fkey"),
    columns: z.tuple([z.literal("profile_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("profiles"),
    referencedColumns: z.tuple([z.literal("id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meeting_processing_status_view"),
    referencedColumns: z.tuple([z.literal("meeting_video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("meetings_with_profile"),
    referencedColumns: z.tuple([z.literal("video_api_id")]),
  }),
  z.object({
    foreignKeyName: z.literal("moments_video_api_id_fkey"),
    columns: z.tuple([z.literal("video_api_id")]),
    isOneToOne: z.literal(false),
    referencedRelation: z.literal("upcoming_meetings_with_action_items"),
    referencedColumns: z.tuple([z.literal("meeting_id")]),
  }),
]);
export type MomentsWithScoreRelationships = z.infer<
  typeof MomentsWithScoreRelationships
>;

export const UpcomingMeetingsWithActionItemsRow = z.object({
  incomplete_action_items: z.number().nullable(),
  meeting_date: z.string().nullable(),
  meeting_id: z.string().nullable(),
  meeting_title: z.string().nullable(),
  participant_names: z.array(z.string()).nullable(),
  total_action_items: z.number().nullable(),
});
export type UpcomingMeetingsWithActionItemsRow = z.infer<
  typeof UpcomingMeetingsWithActionItemsRow
>;

export const BackfillMeetingProfileIdArgs = z.object({});
export type BackfillMeetingProfileIdArgs = z.infer<
  typeof BackfillMeetingProfileIdArgs
>;

export const BackfillMeetingProfileIdReturns = z.undefined();
export type BackfillMeetingProfileIdReturns = z.infer<
  typeof BackfillMeetingProfileIdReturns
>;

export const BeginTransactionArgs = z.object({});
export type BeginTransactionArgs = z.infer<typeof BeginTransactionArgs>;

export const BeginTransactionReturns = z.undefined();
export type BeginTransactionReturns = z.infer<typeof BeginTransactionReturns>;

export const BinaryQuantizeArgs = z.union([
  z.object({
    "": z.string(),
  }),
  z.object({
    "": z.unknown(),
  }),
]);
export type BinaryQuantizeArgs = z.infer<typeof BinaryQuantizeArgs>;

export const BinaryQuantizeReturns = z.unknown();
export type BinaryQuantizeReturns = z.infer<typeof BinaryQuantizeReturns>;

export const CheckUserPermissionsArgs = z.object({
  user_id: z.string(),
});
export type CheckUserPermissionsArgs = z.infer<typeof CheckUserPermissionsArgs>;

export const CheckUserPermissionsReturns = z.boolean();
export type CheckUserPermissionsReturns = z.infer<
  typeof CheckUserPermissionsReturns
>;

export const CommitTransactionArgs = z.object({});
export type CommitTransactionArgs = z.infer<typeof CommitTransactionArgs>;

export const CommitTransactionReturns = z.undefined();
export type CommitTransactionReturns = z.infer<typeof CommitTransactionReturns>;

export const GetActionItemsForEntityArgs = z.object({
  entity_id: z.string(),
});
export type GetActionItemsForEntityArgs = z.infer<
  typeof GetActionItemsForEntityArgs
>;

export const GetActionItemsForEntityReturns = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    meeting_id: z.string(),
    meeting_title: z.string(),
    due_date: z.string(),
    completed: z.boolean(),
    is_assignee: z.boolean(),
    is_participant: z.boolean(),
  }),
);
export type GetActionItemsForEntityReturns = z.infer<
  typeof GetActionItemsForEntityReturns
>;

export const GetActionItemsForMeetingArgs = z.object({
  meeting_id: z.string(),
});
export type GetActionItemsForMeetingArgs = z.infer<
  typeof GetActionItemsForMeetingArgs
>;

export const GetActionItemsForMeetingReturns = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    due_date: z.string(),
    completed: z.boolean(),
    assignee_entity_ids: z.array(z.string()),
    assignee_names: z.array(z.string()),
  }),
);
export type GetActionItemsForMeetingReturns = z.infer<
  typeof GetActionItemsForMeetingReturns
>;

export const GetActionItemsForNextMeetingArgs = z.object({
  entity_name: z.string(),
});
export type GetActionItemsForNextMeetingArgs = z.infer<
  typeof GetActionItemsForNextMeetingArgs
>;

export const GetActionItemsForNextMeetingReturns = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    meeting_id: z.string(),
    meeting_title: z.string(),
    meeting_date: z.string(),
    due_date: z.string(),
    completed: z.boolean(),
    assignee_entity_ids: z.array(z.string()),
    assignee_names: z.array(z.string()),
  }),
);
export type GetActionItemsForNextMeetingReturns = z.infer<
  typeof GetActionItemsForNextMeetingReturns
>;

export const GetMomentsWithMetadataArgs = z.object({
  p_limit: z.number(),
  p_cursor: z.string().optional(),
});
export type GetMomentsWithMetadataArgs = z.infer<
  typeof GetMomentsWithMetadataArgs
>;

export const MomentReactionWithUser = z.object({
  id: z.string().nullable(),
  moment_id: z.string().nullable(),
  reaction_type: z.string().nullable(),
  created_at: z.string().nullable(),
  user_id: z.string().nullable(),
  user_nickname: z.string().nullable(),
  user_avatar_url: z.string().nullable(),
  user_is_admin: z.boolean().nullable(),
});
export type MomentReactionWithUser = z.infer<typeof MomentReactionWithUser>;

export const MomentCommentWithUser = z.object({
  id: z.string().nullable(),
  moment_id: z.string().nullable(),
  user_id: z.string().nullable(),
  content: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  user_nickname: z.string().nullable(),
  user_avatar_url: z.string().nullable(),
  user_is_admin: z.boolean().nullable(),
});
export type MomentCommentWithUser = z.infer<typeof MomentCommentWithUser>;

export const HalfvecAvgArgs = z.object({
  "": z.array(z.number()),
});
export type HalfvecAvgArgs = z.infer<typeof HalfvecAvgArgs>;

export const HalfvecAvgReturns = z.unknown();
export type HalfvecAvgReturns = z.infer<typeof HalfvecAvgReturns>;

export const HalfvecOutArgs = z.object({
  "": z.unknown(),
});
export type HalfvecOutArgs = z.infer<typeof HalfvecOutArgs>;

export const HalfvecOutReturns = z.unknown();
export type HalfvecOutReturns = z.infer<typeof HalfvecOutReturns>;

export const HalfvecSendArgs = z.object({
  "": z.unknown(),
});
export type HalfvecSendArgs = z.infer<typeof HalfvecSendArgs>;

export const HalfvecSendReturns = z.string();
export type HalfvecSendReturns = z.infer<typeof HalfvecSendReturns>;

export const HalfvecTypmodInArgs = z.object({
  "": z.array(z.unknown()),
});
export type HalfvecTypmodInArgs = z.infer<typeof HalfvecTypmodInArgs>;

export const HalfvecTypmodInReturns = z.number();
export type HalfvecTypmodInReturns = z.infer<typeof HalfvecTypmodInReturns>;

export const HnswBitSupportArgs = z.object({
  "": z.unknown(),
});
export type HnswBitSupportArgs = z.infer<typeof HnswBitSupportArgs>;

export const HnswBitSupportReturns = z.unknown();
export type HnswBitSupportReturns = z.infer<typeof HnswBitSupportReturns>;

export const HnswHalfvecSupportArgs = z.object({
  "": z.unknown(),
});
export type HnswHalfvecSupportArgs = z.infer<typeof HnswHalfvecSupportArgs>;

export const HnswHalfvecSupportReturns = z.unknown();
export type HnswHalfvecSupportReturns = z.infer<
  typeof HnswHalfvecSupportReturns
>;

export const HnswSparsevecSupportArgs = z.object({
  "": z.unknown(),
});
export type HnswSparsevecSupportArgs = z.infer<typeof HnswSparsevecSupportArgs>;

export const HnswSparsevecSupportReturns = z.unknown();
export type HnswSparsevecSupportReturns = z.infer<
  typeof HnswSparsevecSupportReturns
>;

export const HnswhandlerArgs = z.object({
  "": z.unknown(),
});
export type HnswhandlerArgs = z.infer<typeof HnswhandlerArgs>;

export const HnswhandlerReturns = z.unknown();
export type HnswhandlerReturns = z.infer<typeof HnswhandlerReturns>;

export const IsAdminUserArgs = z.object({
  user_id: z.string(),
});
export type IsAdminUserArgs = z.infer<typeof IsAdminUserArgs>;

export const IsAdminUserReturns = z.boolean();
export type IsAdminUserReturns = z.infer<typeof IsAdminUserReturns>;

export const IvfflatBitSupportArgs = z.object({
  "": z.unknown(),
});
export type IvfflatBitSupportArgs = z.infer<typeof IvfflatBitSupportArgs>;

export const IvfflatBitSupportReturns = z.unknown();
export type IvfflatBitSupportReturns = z.infer<typeof IvfflatBitSupportReturns>;

export const IvfflatHalfvecSupportArgs = z.object({
  "": z.unknown(),
});
export type IvfflatHalfvecSupportArgs = z.infer<
  typeof IvfflatHalfvecSupportArgs
>;

export const IvfflatHalfvecSupportReturns = z.unknown();
export type IvfflatHalfvecSupportReturns = z.infer<
  typeof IvfflatHalfvecSupportReturns
>;

export const IvfflathandlerArgs = z.object({
  "": z.unknown(),
});
export type IvfflathandlerArgs = z.infer<typeof IvfflathandlerArgs>;

export const IvfflathandlerReturns = z.unknown();
export type IvfflathandlerReturns = z.infer<typeof IvfflathandlerReturns>;

export const L2NormArgs = z.union([
  z.object({
    "": z.unknown(),
  }),
  z.object({
    "": z.unknown(),
  }),
]);
export type L2NormArgs = z.infer<typeof L2NormArgs>;

export const L2NormReturns = z.number();
export type L2NormReturns = z.infer<typeof L2NormReturns>;

export const L2NormalizeArgs = z.union([
  z.object({
    "": z.string(),
  }),
  z.object({
    "": z.unknown(),
  }),
  z.object({
    "": z.unknown(),
  }),
]);
export type L2NormalizeArgs = z.infer<typeof L2NormalizeArgs>;

export const L2NormalizeReturns = z.string();
export type L2NormalizeReturns = z.infer<typeof L2NormalizeReturns>;

export const ParseSearchQueryArgs = z.object({
  search_input: z.string(),
});
export type ParseSearchQueryArgs = z.infer<typeof ParseSearchQueryArgs>;

export const ParseSearchQueryReturns = z.string();
export type ParseSearchQueryReturns = z.infer<typeof ParseSearchQueryReturns>;

export const RollbackTransactionArgs = z.object({});
export type RollbackTransactionArgs = z.infer<typeof RollbackTransactionArgs>;

export const RollbackTransactionReturns = z.undefined();
export type RollbackTransactionReturns = z.infer<
  typeof RollbackTransactionReturns
>;

export const SearchMeetingsArgs = z.object({
  search_input: z.string(),
});
export type SearchMeetingsArgs = z.infer<typeof SearchMeetingsArgs>;

export const SearchMeetingsReturns = z.array(
  z.object({
    clean_vtt_file: z.string().nullable(),
    created_at: z.string(),
    date: z.string().nullable(),
    db_created_at: z.string().nullable(),
    duration_in_ms: z.number(),
    duration_in_seconds: z.number(),
    meeting_baas_original_json: Json.nullable(),
    name: z.string().nullable(),
    original_vtt_file: z.string().nullable(),
    preprocessing_payload: Json.nullable(),
    profile_id: z.string().nullable(),
    provider: MeetingBotsProviderEnum.nullable(),
    searchable: z.unknown().nullable(),
    speaker: z.string().nullable(),
    speaker_time_percentage: z.number().nullable(),
    summary: z.string().nullable(),
    tags: z.string().nullable(),
    thumbnail_url: z.string().nullable(),
    type: EventType.nullable(),
    updated_at: z.string(),
    vectorized: z.boolean(),
    video_api_id: z.string(),
  }),
);
export type SearchMeetingsReturns = z.infer<typeof SearchMeetingsReturns>;

export const SearchMomentsArgs = z.object({
  search_query: z.string(),
});
export type SearchMomentsArgs = z.infer<typeof SearchMomentsArgs>;

export const SearchMomentsReturns = z.array(
  z.object({
    id: z.string(),
    rank: z.number(),
  }),
);
export type SearchMomentsReturns = z.infer<typeof SearchMomentsReturns>;

export const SparsevecOutArgs = z.object({
  "": z.unknown(),
});
export type SparsevecOutArgs = z.infer<typeof SparsevecOutArgs>;

export const SparsevecOutReturns = z.unknown();
export type SparsevecOutReturns = z.infer<typeof SparsevecOutReturns>;

export const SparsevecSendArgs = z.object({
  "": z.unknown(),
});
export type SparsevecSendArgs = z.infer<typeof SparsevecSendArgs>;

export const SparsevecSendReturns = z.string();
export type SparsevecSendReturns = z.infer<typeof SparsevecSendReturns>;

export const SparsevecTypmodInArgs = z.object({
  "": z.array(z.unknown()),
});
export type SparsevecTypmodInArgs = z.infer<typeof SparsevecTypmodInArgs>;

export const SparsevecTypmodInReturns = z.number();
export type SparsevecTypmodInReturns = z.infer<typeof SparsevecTypmodInReturns>;

export const SqlQueryRunnerArgs = z.object({
  query: z.string(),
});
export type SqlQueryRunnerArgs = z.infer<typeof SqlQueryRunnerArgs>;

export const SqlQueryRunnerReturns = z.string();
export type SqlQueryRunnerReturns = z.infer<typeof SqlQueryRunnerReturns>;

export const UpdateProfileIdOnMomentsArgs = z.object({});
export type UpdateProfileIdOnMomentsArgs = z.infer<
  typeof UpdateProfileIdOnMomentsArgs
>;

export const UpdateProfileIdOnMomentsReturns = z.undefined();
export type UpdateProfileIdOnMomentsReturns = z.infer<
  typeof UpdateProfileIdOnMomentsReturns
>;

export const VectorAvgArgs = z.object({
  "": z.array(z.number()),
});
export type VectorAvgArgs = z.infer<typeof VectorAvgArgs>;

export const VectorAvgReturns = z.string();
export type VectorAvgReturns = z.infer<typeof VectorAvgReturns>;

export const VectorDimsArgs = z.union([
  z.object({
    "": z.string(),
  }),
  z.object({
    "": z.unknown(),
  }),
]);
export type VectorDimsArgs = z.infer<typeof VectorDimsArgs>;

export const VectorDimsReturns = z.number();
export type VectorDimsReturns = z.infer<typeof VectorDimsReturns>;

export const VectorNormArgs = z.object({
  "": z.string(),
});
export type VectorNormArgs = z.infer<typeof VectorNormArgs>;

export const VectorNormReturns = z.number();
export type VectorNormReturns = z.infer<typeof VectorNormReturns>;

export const VectorOutArgs = z.object({
  "": z.string(),
});
export type VectorOutArgs = z.infer<typeof VectorOutArgs>;

export const VectorOutReturns = z.unknown();
export type VectorOutReturns = z.infer<typeof VectorOutReturns>;

export const VectorSendArgs = z.object({
  "": z.string(),
});
export type VectorSendArgs = z.infer<typeof VectorSendArgs>;

export const VectorSendReturns = z.string();
export type VectorSendReturns = z.infer<typeof VectorSendReturns>;

export const VectorTypmodInArgs = z.object({
  "": z.array(z.unknown()),
});
export type VectorTypmodInArgs = z.infer<typeof VectorTypmodInArgs>;

export const VectorTypmodInReturns = z.number();
export type VectorTypmodInReturns = z.infer<typeof VectorTypmodInReturns>;

export const GetMomentsWithMetadataReturns = z.array(
  z.object({
    moment_data: MomentsRow,
    reactions: z.array(MomentReactionWithUser),
    comments: z.array(MomentCommentWithUser),
  }),
);
export type GetMomentsWithMetadataReturns = z.infer<
  typeof GetMomentsWithMetadataReturns
>;
