import { z } from "zod";

export const Platform = z.enum(["google_calendar", "microsoft_outlook"]);
export type Platform = z.infer<typeof Platform>;

export const MeetingPlatform = z.enum([
  "chime_sdk",
  "google_meet",
  "goto_meeting",
  "microsoft_teams_live",
  "microsoft_teams",
  "slack_huddle_observer",
  "webex",
  "webrtc",
  "zoom",
]);
export type MeetingPlatform = z.infer<typeof MeetingPlatform>;

export const BotStatusCode = z
  .enum([
    // Recall
    "analysis_done",
    "analysis_failed",
    "call_ended", // also MeetingBaas
    "done",
    "fatal",
    "in_call_not_recording", // also MeetingBaas
    "in_call_recording", // also MeetingBaas
    "in_waiting_room", // also MeetingBaas
    "joining_call", // also MeetingBaas
    "media_expired",
    "ready",
    "recording_done",
    "recording_permission_allowed",
    "recording_permission_denied",

    // MeetingBaas
    "in_waiting_for_host",
    "invalid_meeting_url", // The provided meeting URL was invalid.
    "waiting_room_timeout", // The bot timed out while waiting to be admitted.
    "recording_paused", // The recording has been temporarily paused.
    "recording_resumed", // The recording has resumed after being paused.
    "bot_removed", // The bot was removed from the meeting.
    "bot_rejected", // The bot was rejected from joining the meeting.
    "meeting_error", // An unexpected error occurred during the meeting.
  ])
  .or(z.string());
export type BotStatusCode = z.infer<typeof BotStatusCode>;

export const MeetingBaasErrorType = z
  .enum([
    "CannotJoinMeeting", // Meeting URL only accessible for logged-in users invited to the meeting
    "TimeoutWaitingToStart", // Bot quit after waiting to be accepted (default 10 minutes)
    "BotNotAccepted", // Bot was refused in the meeting
    "BotRemoved", // Bot was removed from the meeting by a participant
    "InternalError", // An unexpected error occurred
    "InvalidMeetingUrl", // The meeting URL provided is not valid
  ])
  .or(z.string());
export type MeetingBaasErrorType = z.infer<typeof MeetingBaasErrorType>;

export const CalendarSyncEventData = z
  .object({
    calendar_id: z.string(),
    last_updated_ts: z.string(),
  })
  .passthrough();
export type CalendarSyncEventData = z.infer<typeof CalendarSyncEventData>;

export const CalendarSyncEvent = z
  .object({
    event: z.literal("calendar.sync_events"),
    data: CalendarSyncEventData,
  })
  .passthrough();
export type CalendarSyncEvent = z.infer<typeof CalendarSyncEvent>;

export const CalendarSyncEventQuery = z.object({
  full: z.enum(["true", "false"]).default("false"),
});
export type CalendarSyncEventQuery = z.infer<typeof CalendarSyncEventQuery>;

export const BotStatusChangeEventDataStatus = z
  .object({
    code: BotStatusCode,
    created_at: z.string(),
    sub_code: z.string().nullish(),
    message: z.string().nullish(),
    recording_id: z.string().nullish(),
  })
  .passthrough();
export type BotStatusChangeEventDataStatus = z.infer<
  typeof BotStatusChangeEventDataStatus
>;

export const BotStatusChangeEventData = z
  .object({
    bot_id: z.string(),
    status: BotStatusChangeEventDataStatus,
  })
  .passthrough();
export type BotStatusChangeEventData = z.infer<typeof BotStatusChangeEventData>;

export const BotStatusChangeEvent = z
  .object({
    event: z.literal("bot.status_change"),
    data: BotStatusChangeEventData,
  })
  .passthrough();
export type BotStatusChangeEvent = z.infer<typeof BotStatusChangeEvent>;

export const MeetingBaasTranscriptWord = z
  .object({
    start: z.number(),
    end: z.number(),
    word: z.string(),
  })
  .passthrough();
export type MeetingBaasTranscriptWord = z.infer<
  typeof MeetingBaasTranscriptWord
>;

export const MeetingBaasTranscriptPart = z
  .object({
    speaker: z.string(),
    words: z.array(MeetingBaasTranscriptWord),
  })
  .passthrough();
export type MeetingBaasTranscriptPart = z.infer<
  typeof MeetingBaasTranscriptPart
>;

export const MeetingBaasCompleteEventData = z
  .object({
    bot_id: z.string(),
    mp4: z.string().url(),
    speakers: z.array(z.string()),
    transcript: z.array(MeetingBaasTranscriptPart).optional(),
  })
  .passthrough();
export type MeetingBaasCompleteEventData = z.infer<
  typeof MeetingBaasCompleteEventData
>;

export const MeetingBaasCompleteEvent = z
  .object({
    event: z.literal("complete"),
    data: MeetingBaasCompleteEventData,
  })
  .passthrough();
export type MeetingBaasCompleteEvent = z.infer<typeof MeetingBaasCompleteEvent>;

export const MeetingBaasFailedEventData = z
  .object({
    bot_id: z.string(),
    error: z
      .string()
      .transform((str) =>
        str === "Waiting room timeout"
          ? ("TimeoutWaitingToStart" satisfies MeetingBaasErrorType)
          : str,
      )
      .pipe(MeetingBaasErrorType),
  })
  .passthrough();
export type MeetingBaasFailedEventData = z.infer<
  typeof MeetingBaasFailedEventData
>;

export const MeetingBaasFailedEvent = z
  .object({
    event: z.literal("failed"),
    data: MeetingBaasFailedEventData,
  })
  .passthrough();
export type MeetingBaasFailedEvent = z.infer<typeof MeetingBaasFailedEvent>;

export const ProviderAgnosticBotStatusChangeEvent = z.union([
  BotStatusChangeEvent,
  MeetingBaasCompleteEvent,
  MeetingBaasFailedEvent,
]);
export type ProviderAgnosticBotStatusChangeEvent = z.infer<
  typeof ProviderAgnosticBotStatusChangeEvent
>;

export const MeetingBotsWebhookRequest = z.union([
  CalendarSyncEvent,
  ProviderAgnosticBotStatusChangeEvent,
]);
export type MeetingBotsWebhookRequest = z.infer<
  typeof MeetingBotsWebhookRequest
>;
