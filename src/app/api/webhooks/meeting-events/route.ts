import type { calendar_v3 } from "googleapis";
import _ from "lodash";
import { type NextRequest, NextResponse } from "next/server";
import type { SetRequired } from "type-fest";
import { z } from "zod";

import { processVideo } from "~/lib/api/meetings";
import { logger } from "~/lib/logging/server";
import { meetingBaas } from "~/lib/meeting-baas/client";
import type { MeetingBaasBotData } from "~/lib/meeting-baas/schemas";
import { validateBotDeduplicationKey } from "~/lib/meeting-bots/utils";
import { createClient as createRecallClient } from "~/lib/recall/client";
import { slack } from "~/lib/slack";
import type { Json, TablesInsert } from "~/lib/supabase/database.types";
import { createClient, type SupabaseServerClient } from "~/lib/supabase/server";
import { isTruthy } from "~/lib/utils";
import { apiVideo } from "~/server/api/services/api-video";

export const dynamic = "force-static";

const log = logger.with({
  service: "meeting-events",
  provider: "meeting_baas",
});

const MeetingBaasWebhookRequestBody = z.union([
  z.object({
    event: z.literal("bot.status_change"),
    data: z.object({
      bot_id: z.string().describe("The identifier of the bot"),
      status: z.object({
        code: z
          .enum([
            "joining_call", // Bot acknowledged request to join
            "in_waiting_room", // Bot is in meeting waiting room
            "in_call_not_recording", // Bot joined but not recording
            "in_call_recording", // Bot is recording audio/video
            "call_ended", // Bot has left the call
            "in_waiting_for_host", // Bot is waiting for host to start the meeting
          ])
          .describe("The current status of the bot in the meeting"),
        created_at: z.string().describe("ISO timestamp of the status change"),
      }),
    }),
  }),
  z.object({
    event: z.literal("complete"),
    data: z.object({
      bot_id: z.string().describe("The identifier of the bot"),
      mp4: z
        .string()
        .url()
        .describe("AWS S3 URL of the meeting recording (valid for 1 hour)"),
      speakers: z
        .array(z.string())
        .describe("List of speakers identified in the meeting"),
      transcript: z
        .array(
          z.object({
            speaker: z.string().describe("Name of the speaker"),
            words: z
              .array(
                z.object({
                  start: z
                    .number()
                    .describe("Start time of the word in seconds"),
                  end: z.number().describe("End time of the word in seconds"),
                  word: z.string().describe("The transcribed word"),
                }),
              )
              .describe("Array of words spoken by this speaker"),
          }),
        )
        .default([])
        .describe(
          "Complete transcript of the meeting with speaker identification",
        ),
    }),
  }),
  z.object({
    event: z.literal("failed"),
    data: z.object({
      bot_id: z.string().describe("The identifier of the bot"),
      error: z
        .string()
        .transform((str) =>
          str === "Waiting room timeout" ? "TimeoutWaitingToStart" : str,
        )
        .pipe(
          z.enum([
            "CannotJoinMeeting", // Bot unable to join the provided meeting URL
            "TimeoutWaitingToStart", // Bot quit after waiting room timeout
            "BotNotAccepted", // Bot was refused entry to meeting
            "InternalError", // Unexpected error occurred
            "InvalidMeetingUrl", // Invalid meeting URL provided
          ]),
        )
        .describe("Type of error that caused the meeting to fail"),
    }),
  }),
]);
type MeetingBaasWebhookRequestBody = z.infer<
  typeof MeetingBaasWebhookRequestBody
>;

async function uploadVideoToStorage(
  botId: string,
  videoUrl: string,
  supabase: SupabaseServerClient,
): Promise<string> {
  log.info(`Starting video upload to storage for bot ${botId}`, {
    videoUrl,
  });
  try {
    // Fetch the video from the temporary AWS S3 URL
    const response = await fetch(videoUrl);
    log.info(`Fetch response status: ${response.status}`, {
      headers: response.headers,
    });

    if (!response.ok) throw new Error("Failed to fetch video from AWS S3");

    const blob = await response.blob();
    log.info(`Video blob size: ${blob.size} bytes`);

    const fileName = `${botId}.mp4`;
    log.info(`Uploading to Supabase Storage with filename: ${fileName}`);

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from("meetings")
      .upload(fileName, blob, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("meetings").getPublicUrl(fileName);

    log.info(`Successfully uploaded video, public URL: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    log.error("Error uploading video:", {
      error: error,
      botId,
      videoUrl,
    });
    throw new Error("Failed to upload video to storage");
  }
}

async function uploadToApiVideo(
  botId: string,
  videoUrl: string,
  botData: MeetingBaasBotData,
): Promise<string | null> {
  log.info(`Starting API.video upload for bot ${botId}`, {
    botData: botData,
  });

  const {
    bot: { extra: extra_ },
    transcripts,
  } = botData;

  const extra = extra_ as
    | {
        event?: { raw?: calendar_v3.Schema$Event } | string;
        google_calendar_raw_data?: { raw?: calendar_v3.Schema$Event } | string;
        user_id?: string;
        event_id?: string;
      }
    | undefined;

  const existingVideo = await apiVideo.videos.list({
    metadata: {
      meeting_bot_id: botId,
    },
  });

  if (existingVideo.data?.length && existingVideo.data.length > 0) {
    log.info("🎥 API.video video already exists", {
      videos: existingVideo.data,
    });
    return existingVideo.data?.[0]?.videoId ?? null;
  }

  const tags = _.uniq(
    extra?.user_id
      ? [
          ...transcripts.map(({ speaker }) => speaker.trim()),
          extra.user_id.startsWith('"')
            ? extra.user_id.slice(1, -1)
            : extra.user_id,
        ]
      : transcripts.map(({ speaker }) => speaker.trim()),
  );
  log.info(`Detected speakers/tags: ${tags.join(", ")}`, { tags });

  // Skip API video upload if no speakers/tags
  if (tags.length === 0) {
    log.warn(`No speakers detected for meeting ${botId}`);
    await slack.warn({
      text: `Skipping API video upload for meeting ${botId} - No speakers detected`,
    });
    return null;
  }

  const userId = extra?.user_id;
  const event =
    extra?.event_id && typeof extra.event_id === "string"
      ? JSON.stringify(
          await createRecallClient().calendarV2.calendar_events_retrieve({
            params: { id: extra.event_id },
          }),
        )
      : extra?.event
        ? typeof extra.event === "string"
          ? extra.event
          : JSON.stringify(extra.event)
        : extra?.google_calendar_raw_data
          ? typeof extra.google_calendar_raw_data === "string"
            ? extra.google_calendar_raw_data
            : JSON.stringify(extra.google_calendar_raw_data)
          : undefined;

  const eventParsed = (() => {
    try {
      return event
        ? (JSON.parse(event) as { raw?: calendar_v3.Schema$Event })
        : undefined;
    } catch {
      return undefined;
    }
  })();

  log.info("Calendar event data:", { event: eventParsed ?? event });

  const metadata = [
    botId && { key: "meeting_bot_id", value: botId },
    botData && { key: "meeting_baas_raw_data", value: JSON.stringify(botData) },
    event && { key: "google_calendar_raw_data", value: event },
    userId && { key: "user_id", value: userId },
  ].filter(isTruthy);

  log.info("Prepared metadata:", { metadata });

  try {
    await slack.send({
      text: `🎥 Starting video upload to api.video for meeting ${botId}`,
    });

    const video = await apiVideo.videos.create({
      title: eventParsed?.raw?.summary ?? `Meeting Recording - ${botId}`,
      description: eventParsed?.raw?.description ?? undefined,
      source: videoUrl,
      mp4Support: true,
      tags,
      metadata,
    });

    log.info("API.video upload successful", {
      videoId: video.videoId,
      videoDetails: video,
    });

    await slack.success({
      text: `Successfully uploaded video to api.video for meeting ${botId}`,
    });

    return video.videoId;
  } catch (error) {
    await slack.error({
      text: `Failed to upload video to api.video for meeting ${botId}: ${(error as Error).message}`,
    });
    log.error("Error uploading to api.video:", {
      fullError: error,
      botId,
      videoUrl,
    });
    throw new Error("Failed to upload video to api.video");
  }
}

async function updateMeetingBot(
  supabase: SupabaseServerClient,
  data: SetRequired<Partial<TablesInsert<"meeting_bots">>, "id">,
) {
  log.info("Updating meeting bot:", { data });

  const { data: meetingBot, error } = await supabase
    .from("meeting_bots")
    .update(data)
    .eq("id", data.id)
    .select("*")
    .maybeSingle();

  if (error) {
    log.error("Update error:", {
      fullError: error,
      data,
    });
    throw new Error(error.message);
  }

  log.info(`Successfully updated meeting bot ${data.id}`);

  return meetingBot;
}

async function handleTranscript(
  supabase: SupabaseServerClient,
  data: Extract<MeetingBaasWebhookRequestBody, { event: "complete" }>,
) {
  const {
    data: { bot_id: botId, transcript },
  } = data;

  log.info(`Processing transcript for bot ${botId}`, {
    transcriptLength: transcript.length,
    fullTranscript: transcript,
  });

  const { data: transcriptSlices, error: transcriptSlicesError } =
    await supabase
      .from("transcript_slices")
      .insert(
        transcript.map(
          (slice, index): TablesInsert<"transcript_slices"> => ({
            bot_id: botId,
            speaker_name: slice.speaker,
            index,
          }),
        ),
      )
      .select("*");

  if (transcriptSlicesError || !transcriptSlices) {
    log.error("Transcript slices error:", {
      fullError: transcriptSlicesError,
      botId,
    });
    throw new Error(
      transcriptSlicesError?.message ?? "Failed to insert transcript slices",
    );
  }

  log.info("Successfully inserted transcript slices", {
    slicesCount: transcriptSlices.length,
    slices: transcriptSlices,
  });

  const { error: wordsError } = await supabase.from("transcript_words").insert(
    transcript.flatMap((slice, transcriptSliceIndex) =>
      slice.words.map(
        (word, wordIndex): TablesInsert<"transcript_words"> => ({
          bot_id: botId,
          transcript_slice_id: transcriptSlices[transcriptSliceIndex]?.id,
          start_time: word.start,
          end_time: word.end,
          content: word.word,
          index: wordIndex,
        }),
      ),
    ),
  );

  if (wordsError) {
    log.error("Transcript words error:", {
      fullError: wordsError,
      botId,
    });
    throw new Error(wordsError.message);
  }

  log.info(`Successfully processed transcript words for bot ${botId}`);
}

export async function POST(request: NextRequest) {
  log.info("Received webhook request", {
    headers: request.headers,
  });

  try {
    const body = (await request.json()) as unknown;
    log.info("Webhook request body:", { body });

    const bodyParseResult = MeetingBaasWebhookRequestBody.safeParse(body);

    if (!bodyParseResult.success) {
      log.error("Validation error:", {
        receivedBody: body,
        error: bodyParseResult.error,
      });
    }

    const event = (bodyParseResult.data ?? body) as NonNullable<
      typeof bodyParseResult.data
    >;
    log.info("Parsed event:", { event });

    const supabase = await createClient();

    const { data: meetingBot } = await supabase
      .from("meeting_bots")
      .select("*")
      .eq("id", event.data.bot_id)
      .single();

    if (!meetingBot) {
      log.warn("Meeting bot not found", {
        botId: event.data.bot_id,
      });
      await meetingBaas.meetings.leave(event.data.bot_id).catch(() => {
        // do nothing
      });
      return new NextResponse("Meeting bot not found", { status: 200 });
    }

    const { bot_data: meetingBaasBot } = await meetingBaas.meetings
      .getMeetingData(event.data.bot_id)
      .catch((error: unknown) => {
        log.error("Error getting meeting data", {
          fullError: error,
          botId: event.data.bot_id,
        });
        return { bot_data: { bot: { deduplication_key: null } } };
      });

    if (!validateBotDeduplicationKey(meetingBaasBot.bot.deduplication_key)) {
      log.warn("Meeting Baas bot deduplication key is invalid; kicking", {
        botId: event.data.bot_id,
        deduplicationKey: meetingBaasBot.bot.deduplication_key,
      });
      await meetingBaas.meetings.leave(event.data.bot_id).catch(() => {
        // do nothing
      });
      return new NextResponse("Meeting Baas bot deduplication key is invalid", {
        status: 200,
      });
    }

    // Handle different event types
    try {
      if (event.event === "bot.status_change") {
        log.info(`Processing status change for bot ${event.data.bot_id}`, {
          status: event.data.status,
        });

        if (event.data.status.code === "in_call_recording") {
          await slack.send({
            text: `🎥 Started recording meeting ${event.data.bot_id}`,
          });
        } else if (event.data.status.code === "call_ended") {
          await slack.send({
            text: `🎬 Finished recording meeting ${event.data.bot_id}`,
          });
        } else if (event.data.status.code === "in_waiting_room") {
          await slack.send({
            text: `⏳ Bot is in waiting room for meeting ${event.data.bot_id}`,
          });
        }

        const { error } = await supabase
          .from("meeting_bots")
          .upsert(
            { id: event.data.bot_id, status: event.data.status.code },
            { onConflict: "id" },
          );

        if (error) {
          log.error("Status change error:", {
            fullError: error,
            event,
          });
          throw new Error(error.message);
        }
      } else if (event.event === "failed") {
        log.info(`Processing failure for bot ${event.data.bot_id}`, {
          error: event.data.error,
        });

        await updateMeetingBot(supabase, {
          id: event.data.bot_id,
          error_code: event.data.error,
          provider: "meeting_baas",
        });
      } else if (event.event === "complete") {
        log.info(`Processing complete event for bot ${event.data.bot_id}`);

        await slack.send({
          text: `🎯 Processing complete event for meeting ${event.data.bot_id}`,
        });

        const { bot_data, mp4 } = await meetingBaas.meetings.getMeetingData(
          event.data.bot_id,
        );
        log.info("Retrieved meeting data:", {
          botData: bot_data,
          mp4Url: mp4,
        });

        // Start storage upload in background
        const storagePromise = uploadVideoToStorage(
          event.data.bot_id,
          mp4,
          supabase,
        ).catch((error) => {
          log.error("Background storage upload failed:", { error });
          return null;
        });

        const apiVideoId = await uploadToApiVideo(
          event.data.bot_id,
          mp4,
          bot_data,
        );

        log.info("Upload results:", {
          apiVideoId,
          botId: event.data.bot_id,
        });

        const updatedMeetingBot = await updateMeetingBot(supabase, {
          id: event.data.bot_id,
          mp4_source_url: `https://db.withtitan.com/storage/v1/object/public/meetings/${event.data.bot_id}.mp4`,
          api_video_id: apiVideoId,
          speakers: event.data.speakers,
          profile_id: bot_data.bot.extra?.user_id,
          event_id: bot_data.bot.extra?.event_id,
          provider: "meeting_baas",
          raw_data: {
            meeting_baas_raw_data: { bot_data, event },
            google_calendar_raw_data: bot_data.bot.extra?.event,
          } as Json,
        });

        // Update storage URL in background once upload completes
        void storagePromise.then(async (storageUrl) => {
          if (storageUrl) {
            await updateMeetingBot(supabase, {
              id: event.data.bot_id,
              mp4_source_url: storageUrl,
            });
          }
        });

        if (event.data.transcript?.length) {
          log.info("Found transcript data", {
            transcriptLength: event.data.transcript.length,
          });
          await slack.send({
            text: `📝 Processing transcript for meeting ${event.data.bot_id}`,
          });
          await handleTranscript(supabase, event);
        }

        if (updatedMeetingBot?.api_video_id) {
          await processVideo({ meetingBotId: updatedMeetingBot.id })
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

        await slack.done({
          text: `Successfully processed meeting ${event.data.bot_id}`,
        });
      }

      log.info("Successfully processed webhook request");
      return new NextResponse(null, { status: 200 });
    } catch (error) {
      log.error("Event handling error:", {
        fullError: error,
        event,
      });
      return new NextResponse((error as Error).message, { status: 200 });
    }
  } catch (error) {
    log.error("Unexpected error:", {
      fullError: error,
    });
    return new NextResponse("Internal server error", { status: 200 });
  }
}
