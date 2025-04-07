import axios from "axios";
import _ from "lodash";
import { NextResponse } from "next/server";
import { z } from "zod";

import { processVideo } from "~/lib/api/meetings";
import { GoogleCalendarEvent } from "~/lib/google-calendar/schemas";
import { logger } from "~/lib/logging/server";
import { meetingBaas } from "~/lib/meeting-baas/client";
import {
  type Bot,
  type CalendarEvent,
  createClient as createRecallClient,
  status__2 as BotStatuses,
} from "~/lib/recall/client";
import { slack } from "~/lib/slack";
import type { Json, Tables, TablesInsert } from "~/lib/supabase/database.types";
import {
  createClient as createSupabaseClient,
  type SupabaseServerClient,
} from "~/lib/supabase/server";
import { isTruthy } from "~/lib/utils";
import { apiVideo } from "~/server/api/services/api-video";

const log = logger.with({
  service: "recall",
  provider: "recall",
});

export const dynamic = "force-static";

const WAITING_ROOM_TIMEOUT = 60 * 60;
const NOONE_JOINED_TIMEOUT = 60 * 60;

const CalendarSyncEvent = z
  .object({
    event: z.literal("calendar.sync_events"),
    data: z
      .object({
        calendar_id: z.string(),
        last_updated_ts: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

const BotStatusChangeEvent = z
  .object({
    event: z.literal("bot.status_change"),
    data: z
      .object({
        bot_id: z.string(),
        status: z
          .object({
            code: BotStatuses.unwrap().unwrap().element.optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

const WebhookEvent = z.discriminatedUnion("event", [
  CalendarSyncEvent,
  BotStatusChangeEvent,
]);

type CalendarSyncEvent = z.infer<typeof CalendarSyncEvent>;
type BotStatusChangeEvent = z.infer<typeof BotStatusChangeEvent>;
type WebhookEvent = z.infer<typeof WebhookEvent>;

type BotMetadata = {
  event_id: string;
  user_id: string;
};

type RecallAPIError = {
  response: {
    status: number;
    data: {
      detail?: string;
      message?: string;
    };
  };
};

function isRecallAPIError(error: unknown): error is RecallAPIError {
  if (!error || typeof error !== "object") return false;

  const response = (error as RecallAPIError).response;
  return (
    response !== undefined &&
    typeof response === "object" &&
    typeof response.status === "number" &&
    (!("data" in response) || typeof response.data === "object")
  );
}

async function handleTranscript(
  bot: Bot,
  transcript: Awaited<
    ReturnType<
      ReturnType<typeof createRecallClient>["bot"]["bot_transcript_list"]
    >
  >,
  supabase: SupabaseServerClient,
) {
  log.info(`📝 Processing transcript for bot ${bot.id}`, {
    transcriptLength: transcript.length,
    fullTranscript: transcript,
  });

  const { data: transcriptSlices, error: transcriptSlicesError } =
    await supabase
      .from("transcript_slices")
      .insert(
        transcript.map(
          (slice, index): TablesInsert<"transcript_slices"> => ({
            bot_id: bot.id,
            speaker_name: slice.speaker,
            index,
          }),
        ),
      )
      .select("*");

  if (transcriptSlicesError || !transcriptSlices) {
    log.error("❌ Transcript slices error:", {
      fullError: transcriptSlicesError,
      botId: bot.id,
    });
    throw new Error(
      transcriptSlicesError?.message ?? "Failed to insert transcript slices",
    );
  }

  log.info("✅ Successfully inserted transcript slices", {
    slicesCount: transcriptSlices.length,
    slices: transcriptSlices,
  });

  const { error: wordsError } = await supabase.from("transcript_words").insert(
    transcript.flatMap((slice, transcriptSliceIndex) =>
      slice.words.map(
        (word, wordIndex): TablesInsert<"transcript_words"> => ({
          bot_id: bot.id,
          transcript_slice_id: transcriptSlices[transcriptSliceIndex]?.id,
          start_time: word.start_timestamp,
          end_time: word.end_timestamp,
          content: word.text,
          index: wordIndex,
        }),
      ),
    ),
  );

  if (wordsError) {
    log.error("❌ Transcript words error:", {
      fullError: wordsError,
      botId: bot.id,
    });
    throw new Error(wordsError.message);
  }

  log.info(`✨ Successfully processed transcript words for bot ${bot.id}`);
}

async function handleVideoUpload(
  bot: Bot,
  supabase: SupabaseServerClient,
  recallClient: ReturnType<typeof createRecallClient>,
) {
  if (!bot.video_url) return;

  log.info(`🎥 Starting video upload process for bot ${bot.id}`, {
    videoUrl: bot.video_url,
  });

  // Start storage upload in background and don't wait for it
  void uploadVideoToStorage(bot.video_url, bot.id, supabase);

  // Only wait for API video upload since it's faster
  const apiVideoId = await uploadVideoToApiVideo(bot, recallClient).catch(
    () => undefined,
  );

  log.info(`📊 Video upload results for bot ${bot.id}`, {
    apiVideoId,
  });

  return {
    storageUrl: `https://db.withtitan.com/storage/v1/object/public/meetings/${bot.id}.mp4`,
    apiVideoId,
  };
}

async function uploadVideoToStorage(
  videoUrl: string,
  botId: string,
  supabase: SupabaseServerClient,
) {
  // Start the upload process in the background
  void (async () => {
    log.info(`📤 Starting video upload to storage for bot ${botId}`, {
      videoUrl,
    });

    try {
      const response = await axios.get(videoUrl, {
        responseType: "blob",
      });
      log.info(`📡 Fetch response status: ${response.status}`, {
        botId,
      });

      if (response.status !== 200)
        throw new Error("Failed to fetch video from AWS S3");

      const blob = response.data as Blob;
      const fileName = `${botId}.mp4`;

      log.info(`💾 Uploading blob to storage for bot ${botId}`, {
        blobSize: blob.size,
        fileName,
      });

      const { error } = await supabase.storage
        .from("meetings")
        .upload(fileName, blob, {
          contentType: "video/mp4",
          upsert: true,
          metadata: {
            meeting_bot_id: botId,
            meeting_url: videoUrl,
          },
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("meetings").getPublicUrl(fileName);

      log.info(`✅ Successfully uploaded video to storage for bot ${botId}`, {
        publicUrl,
      });
    } catch (error) {
      log.error("❌ Error uploading video", {
        error: error as Error,
        botId,
        videoUrl,
      });

      // Log error to monitoring but don't throw since this is a background task
      await slack.error({
        text: `❌ Failed to upload video to storage for meeting ${botId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  })();

  // Return immediately since the upload is happening in the background
  return undefined;
}

async function uploadVideoToApiVideo(
  bot: Bot,
  recallClient: ReturnType<typeof createRecallClient>,
) {
  log.info(`🎬 Starting API.video upload for bot ${bot.id}`);

  const event =
    typeof bot.metadata?.event_id === "string"
      ? await recallClient.calendarV2.calendar_events_retrieve({
          params: { id: bot.metadata?.event_id },
        })
      : undefined;

  const existingVideo = await apiVideo.videos.list({
    metadata: {
      meeting_bot_id: bot.id,
    },
  });

  if (existingVideo.data?.length && existingVideo.data.length > 0) {
    log.info("🎥 API.video video already exists", {
      videoId: existingVideo.data?.[0]?.videoId,
    });
    return existingVideo.data?.[0]?.videoId;
  }

  const tags = _.uniq(
    (typeof bot.metadata?.user_id === "string"
      ? [
          ...bot.meeting_participants.map(({ name }) => name?.trim()),
          bot.metadata.user_id.startsWith('"')
            ? bot.metadata.user_id.slice(1, -1)
            : bot.metadata.user_id,
        ]
      : bot.meeting_participants.map(({ name }) => name?.trim())
    ).filter(isTruthy),
  );
  log.info(`🏷️ Detected speakers/tags: ${tags.join(", ")}`, { tags });

  if (tags.length === 0) {
    await slack.warn({
      text: `⚠️ Skipping API video upload for meeting ${bot.id} - No speakers detected`,
    });
    return null;
  }

  const metadata = [
    bot.id && { key: "meeting_bot_id", value: bot.id },
    event && { key: "google_calendar_raw_data", value: JSON.stringify(event) },
    bot.metadata?.user_id && { key: "user_id", value: bot.metadata.user_id },
  ].filter(isTruthy);

  log.info("📋 Prepared metadata:", { metadata });

  try {
    await slack.send({
      text: `🎥 Starting video upload to api.video for meeting ${bot.id}`,
    });

    const video = await apiVideo.videos.create({
      title: getVideoTitle(event, bot.id),
      description: getVideoDescription(event),
      source: bot.video_url,
      mp4Support: true,
      transcript: true,
      transcriptSummary: true,
      language: "en",
      tags,
      metadata,
      _public: false,
    });

    log.info("✅ API.video upload successful", {
      videoId: video.videoId,
      videoDetails: video,
    });

    await slack.success({
      text: `🎉 Successfully uploaded video to api.video for meeting ${bot.id}`,
    });

    return video.videoId;
  } catch (error) {
    await slack.error({
      text: `❌ Failed to upload video to api.video for meeting ${bot.id}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
    log.error("❌ Error uploading to api.video", {
      error,
      botId: bot.id,
    });
    throw new Error("Failed to upload video to api.video");
  }
}

function getVideoTitle(
  event: CalendarEvent | undefined,
  botId: string,
): string {
  return event?.raw &&
    typeof event.raw === "object" &&
    "summary" in event.raw &&
    typeof event.raw.summary === "string"
    ? event.raw.summary
    : `Meeting Recording - ${botId}`;
}

function getVideoDescription(
  event: CalendarEvent | undefined,
): string | undefined {
  return event?.raw &&
    typeof event.raw === "object" &&
    "description" in event.raw &&
    typeof event.raw.description === "string"
    ? event.raw.description
    : undefined;
}

async function handleBotStatusChange(
  payload: BotStatusChangeEvent,
  recallClient: ReturnType<typeof createRecallClient>,
) {
  const bot = await recallClient.bot.bot_retrieve({
    params: { id: payload.data.bot_id },
  });

  const event = bot.metadata?.event_id
    ? await recallClient.calendarV2.calendar_events_retrieve({
        params: { id: bot.metadata.event_id },
      })
    : undefined;

  const transcript = await recallClient.bot.bot_transcript_list({
    params: { id: bot.id },
  });

  return { bot, event, transcript };
}

async function handleCalendarSync(
  payload: CalendarSyncEvent,
  recallClient: ReturnType<typeof createRecallClient>,
  supabase: SupabaseServerClient,
) {
  const { data: calendarData, error: calendarError } = await supabase
    .from("recall_calendars")
    .select("*, profile:profiles(*)")
    .eq("id", payload.data.calendar_id)
    .maybeSingle();

  if (calendarError || !calendarData?.profile_id) {
    throw new Error("Could not find profile_id for calendar");
  }

  if (!calendarData.profile) {
    throw new Error("Could not find profile");
  }

  if (calendarData.profile.role === "coach") {
    log.info("Skipping calendar sync for coach", {
      profile: calendarData.profile,
    });
    return;
  }

  const calendarEvents = await recallClient.calendarV2.calendar_events_list({
    queries: {
      calendar_id: payload.data.calendar_id,
      updated_at__gte: payload.data.last_updated_ts,
    },
  });

  for (const event of calendarEvents.results ?? []) {
    await processCalendarEvent(
      event,
      payload,
      calendarData,
      recallClient,
      supabase,
    );
  }
}

async function processCalendarEvent(
  event: CalendarEvent,
  payload: CalendarSyncEvent,
  calendarData: Tables<"recall_calendars">,
  recallClient: ReturnType<typeof createRecallClient>,
  supabase: SupabaseServerClient,
) {
  const deduplicationKey = `${event.meeting_url}-${calendarData.profile_id}`;

  // Handle deleted or invalid meetings
  if (event.is_deleted || !event.meeting_url) {
    await cleanupExistingBots(event, recallClient, supabase);
    return;
  }

  try {
    const { data: existingMeetingBot } = await supabase
      .from("meeting_bots")
      .select("*")
      .eq("deduplication_key", `${event.start_time}-${deduplicationKey}`)
      .maybeSingle();

    const shouldScheduleBot = await evaluateShouldScheduleBot(
      event,
      calendarData.profile_id,
      supabase,
    );

    if (!shouldScheduleBot) return;

    if (existingMeetingBot?.status) {
      log.info("Meeting bot already exists", {
        existingMeetingBot,
      });
      return;
    }

    // Handle Zoom meetings differently from other platforms
    if (event.meeting_platform === "zoom") {
      await handleZoomMeeting(event, calendarData, deduplicationKey, supabase);
      return;
    }

    // Handle Google Meet meetings
    if (event.meeting_platform === "google_meet") {
      await handleGoogleMeetMeeting(
        event,
        calendarData,
        deduplicationKey,
        recallClient,
        supabase,
      );
      return;
    }
  } catch (error) {
    handleCalendarEventError(error, event);
  }
}

async function cleanupExistingBots(
  event: CalendarEvent,
  recallClient: ReturnType<typeof createRecallClient>,
  supabase: SupabaseServerClient,
) {
  const cleanupPromises: Promise<unknown>[] = [];

  if (event.bots && event.bots.length > 0) {
    cleanupPromises.push(
      recallClient.calendarV2.calendar_events_bot_destroy(undefined, {
        params: { id: event.id },
      }),
    );
  }

  const { data: meetingBots } = await supabase
    .from("meeting_bots")
    .delete()
    .eq("event_id", event.id)
    .select("*");

  if (meetingBots && meetingBots.length > 0) {
    cleanupPromises.push(
      ...meetingBots
        .filter((bot) => !bot.provider || bot.provider === "meeting_baas")
        .map((bot) => meetingBaas.meetings.leave(bot.id)),
    );
  }

  await Promise.allSettled(cleanupPromises);
}

async function evaluateShouldScheduleBot(
  event: CalendarEvent,
  profile_id: string,
  supabase: SupabaseServerClient,
) {
  const { data: userSettings } = await supabase
    .from("user_settings")
    .select("*, profile:profiles(*)")
    .eq("profile_id", profile_id)
    .maybeSingle();

  if (!userSettings?.profile) return false;

  // Parse raw event data against schema
  const parseResult = GoogleCalendarEvent.safeParse(event.raw);
  if (!parseResult.success) {
    log.error("Failed to parse event data", {
      error: parseResult.error,
      eventId: event.id,
    });
    return false;
  }

  const calendarEvent = parseResult.data;
  const userEmail = userSettings.profile.email;

  if (!userEmail) return false;

  // Get user's domain for internal/external check
  const userDomain = userEmail.split("@")[1];

  // Check if user is the organizer
  const isOrganizer = calendarEvent.organizer?.email === userEmail;

  // Check if user's response is pending
  const userAttendee = calendarEvent.attendees?.find(
    (attendee) => attendee.email === userEmail,
  );
  const isPending = userAttendee?.responseStatus === "needsAction";

  // Check if all attendees are internal
  const isInternalMeeting =
    calendarEvent.attendees?.every((attendee) => {
      const attendeeDomain = attendee.email?.split("@")[1];
      return attendeeDomain === userDomain;
    }) ?? true;

  // Apply exclusion rules first
  if (userSettings.should_not_join_pending_meetings && isPending) {
    return false;
  }

  if (userSettings.should_not_join_owned_by_others_meetings && !isOrganizer) {
    return false;
  }

  // Apply inclusion rules
  if (isInternalMeeting) {
    return userSettings.should_join_team_meetings;
  }

  return userSettings.should_join_external_meetings;
}

async function handleZoomMeeting(
  event: CalendarEvent,
  calendarData: Tables<"recall_calendars">,
  deduplicationKey: string,
  supabase: SupabaseServerClient,
) {
  if (!event.meeting_url) {
    await slack.warn({
      text: `Skipping Zoom meeting ${event.id} - No meeting URL found`,
    });
    return;
  }

  const botName = await getBotName(calendarData.profile_id, supabase);

  const startTimeUnix = event.start_time
    ? Math.floor(new Date(event.start_time).getTime() / 1000)
    : null;

  const metadata = {
    event_id: event.id,
    user_id: calendarData.profile_id,
  } satisfies BotMetadata;

  const botResult = await meetingBaas.meetings.join({
    bot_name: botName,
    bot_image: "https://i.ibb.co/X7QvTBN/Titan-Image-1600x900.png",
    meeting_url: event.meeting_url,
    start_time: startTimeUnix,
    reserved: true,
    deduplication_key: deduplicationKey,
    recording_mode: "speaker_view",
    speech_to_text: {
      provider: "Default",
    },
    automatic_leave: {
      waiting_room_timeout: WAITING_ROOM_TIMEOUT,
      noone_joined_timeout: NOONE_JOINED_TIMEOUT,
    },
    extra: metadata,
  });

  await supabase.from("meeting_bots").upsert(
    {
      id: botResult.bot_id,
      raw_data: {
        google_calendar_raw_data: event,
      } as Json,
      event_id: event.id,
      recall_calendar_id: calendarData.id,
      provider: "meeting_baas",
      profile_id: calendarData.profile_id,
      deduplication_key: `${event.start_time}-${deduplicationKey}`,
    },
    { onConflict: "id" },
  );
}

async function handleGoogleMeetMeeting(
  event: CalendarEvent,
  calendarData: Tables<"recall_calendars">,
  deduplicationKey: string,
  recallClient: ReturnType<typeof createRecallClient>,
  supabase: SupabaseServerClient,
) {
  const botName = await getBotName(calendarData.profile_id, supabase);

  const metadata = {
    event_id: event.id,
    user_id: calendarData.profile_id,
  } satisfies BotMetadata;

  const calendarEventResult =
    await recallClient.calendarV2.calendar_events_bot_create(
      {
        deduplication_key: deduplicationKey,
        bot_config: {
          bot_name: botName,
          automatic_leave: {
            waiting_room_timeout: WAITING_ROOM_TIMEOUT,
            noone_joined_timeout: NOONE_JOINED_TIMEOUT,
          },
          transcription_options: {
            provider: "gladia",
          },
          metadata,
        } satisfies Partial<Bot>,
      },
      {
        params: { id: event.id },
      },
    );

  await supabase.from("meeting_bots").upsert(
    calendarEventResult.bots.map(
      (bot) =>
        ({
          id: bot.bot_id,
          raw_data: {
            google_calendar_raw_data: event,
          } as Json,
          event_id: event.id,
          recall_calendar_id: calendarData.id,
          provider: "recall",
          profile_id: calendarData.profile_id,
          deduplication_key: `${event.start_time}-${deduplicationKey}`,
        }) satisfies TablesInsert<"meeting_bots">,
    ),
    { onConflict: "id" },
  );
}

async function getBotName(
  profile_id: string,
  supabase: SupabaseServerClient,
): Promise<string> {
  const { data: userSettings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("profile_id", profile_id)
    .maybeSingle();

  return userSettings?.bot_name ?? "Notetaker";
}

function handleCalendarEventError(error: unknown, event: CalendarEvent) {
  if (!isRecallAPIError(error)) throw new Error("Unknown error occurred");

  const status = error.response.status;
  const errorMessages = {
    409: `Conflict scheduling bot for event ${event.id}, will be retried`,
    507: `No bots available for pre-poned event ${event.id}, will be retried`,
    400: `Cannot schedule bot for event ${event.id}: ${JSON.stringify(
      error.response.data,
      null,
      2,
    )}`,
  };

  if (status in errorMessages) {
    log.error(errorMessages[status as keyof typeof errorMessages], {
      error,
    });
  } else {
    throw new Error(
      `Unexpected error status ${status}: ${JSON.stringify(error.response.data)}`,
    );
  }
}

export async function POST(request: Request) {
  log.info("📥 Received webhook request", {
    headers: request.headers,
  });

  const payloadParseResult = WebhookEvent.safeParse(await request.json());

  if (!payloadParseResult.success) {
    log.error("❌ Validation error:", {
      error: payloadParseResult.error,
    });
    return new NextResponse(payloadParseResult.error.message, { status: 200 });
  }

  const payload = payloadParseResult.data;
  log.info("✅ Parsed event:", { payload });

  const recallClient = createRecallClient();
  const supabase = await createSupabaseClient();

  try {
    if (payload.event === "bot.status_change") {
      log.info(`🤖 Processing bot status change for ${payload.data.bot_id}`);
      const { bot, event, transcript } = await handleBotStatusChange(
        payload,
        recallClient,
      );

      let videoUploadResult: Awaited<ReturnType<typeof handleVideoUpload>>;

      if (payload.data.status?.code === "done" && bot.video_url) {
        log.info(`🎯 Bot ${bot.id} is done, processing outputs`);
        videoUploadResult = await handleVideoUpload(
          bot,
          supabase,
          recallClient,
        );

        if (transcript.length > 0) {
          await handleTranscript(bot, transcript, supabase);
        }

        // void recallClient.bot
        //   .bot_analyze_create(
        //     {
        //       gladia_v2_async_transcription: {
        //         custom_vocabulary: bot.meeting_participants.map(
        //           ({ name }) => name,
        //         ),
        //         name_consistency: true,
        //         punctuation_enhanced: true,
        //       },
        //     },
        //     { params: { id: bot.id } },
        //   )
        //   .then((res) => {
        //     logger.info("🎯 Bot analysis started", {
        //       jobId: res.job_id,
        //     });
        //   })
        //   .catch((error: Error) => {
        //     logger.error("❌ Error starting bot analysis", {
        //       error,
        //     });
        //   });
      }

      const { data: meetingBot } = await supabase
        .from("meeting_bots")
        .update({
          ...(payload.data.status?.code && {
            status: payload.data.status?.code,
          }),
          ...(videoUploadResult?.storageUrl && {
            mp4_source_url: videoUploadResult?.storageUrl,
          }),
          ...(videoUploadResult?.apiVideoId && {
            api_video_id: videoUploadResult?.apiVideoId,
          }),
          ...(bot?.meeting_participants?.length && {
            speakers: bot.meeting_participants.map(({ name }) => name),
          }),
          raw_data: {
            meeting_baas_raw_data: { bot, event },
            google_calendar_raw_data: event,
          } as Json,
        })
        .eq("id", bot.id)
        .select("*")
        .maybeSingle();

      if (meetingBot?.api_video_id) {
        await processVideo({ meetingBotId: meetingBot.id })
          .then((res) => {
            log.info("🎯 /process_video response", {
              response: res,
            });
          })
          .catch((error) => {
            log.error("❌ Error calling /process_video", {
              error,
            });
          });
      }

      log.info("✨ Bot status change processed successfully", {
        bot,
        event,
        transcript,
      });
    } else if (payload.event === "calendar.sync_events") {
      log.info(`📅 Processing calendar sync for ${payload.data.calendar_id}`);
      await handleCalendarSync(payload, recallClient, supabase);
    }

    log.info("✅ Successfully processed webhook request");
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    log.error("❌ Error processing webhook event:", {
      error: error as Error,
    });
    return new NextResponse("Internal Server Error", { status: 200 });
  }
}
