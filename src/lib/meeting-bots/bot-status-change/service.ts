import { isAxiosError } from "axios";
import _ from "lodash";
import type { Except } from "type-fest";

import { uploadVideoToSupabaseStorage } from "~/jobs/upload-video-to-supabase-storage";
import { processVideo } from "~/lib/api/meetings";
import type { Tables, TablesInsert } from "~/lib/supabase/database.types";

import type {
  MeetingBaasCompleteEventData,
  ProviderAgnosticBotStatusChangeEvent,
} from "../schemas";
import type { MeetingBotsServiceDependencies } from "../types";

export type RecallTranscript = Except<
  Awaited<
    ReturnType<
      MeetingBotsServiceDependencies["recall"]["bot"]["bot_transcript_list"]
    >
  >[number],
  "language" | "speaker_id"
>[];

export type MeetingBotWithProfileAndEvent = (
  | Tables<"meeting_bots_v2">
  | Tables<"meeting_bots">
) & {
  profile: Tables<"profiles">;
  event: Tables<"calendar_events_v2"> | Tables<"calendar_events"> | null;
};

export type MeetingBotWithProfileAndEventAndCalendar =
  MeetingBotWithProfileAndEvent & {
    calendar: Tables<"recall_calendars_v2"> | Tables<"recall_calendars"> | null;
  };

export type ApiVideoMetadataObject = {
  user_id?: string;
  event_id?: string;
  meeting_bot_id?: string;
};

export type ApiVideoMetadataArray = [
  { key: "meeting_bot_id"; value: string },
  { key: "user_id"; value: string },
  { key: "event_id"; value: string },
];

export type VideoUploadResult = {
  storageUrl: string | undefined;
  apiVideoId: string | undefined;
  speakers: string[];
};

export function createBotStatusChangeService(
  deps: MeetingBotsServiceDependencies,
) {
  const { supabase, recall, apiVideo, logger, slack } = deps;

  async function handleBotStatusChange(
    event: ProviderAgnosticBotStatusChangeEvent,
  ) {
    try {
      logger.info("🔄 Processing bot status change", {
        event,
      });

      if (event.event === "failed") {
        logger.info("🔄 Processing failed bot status change", {
          event,
        });

        let { data: meetingBot } = await supabase
          .from("meeting_bots_v2")
          .select(
            "*, profile:profiles(*), calendar:recall_calendars_v2(*), event:calendar_events_v2(*)",
          )
          .eq("id", event.data.bot_id)
          .maybeSingle();

        if (meetingBot) {
          const { error: meetingBotUpdateError } = await supabase
            .from("meeting_bots_v2")
            .update({
              status: "fatal",
              error_code: event.data.error,
            })
            .eq("id", event.data.bot_id);

          if (meetingBotUpdateError) {
            logger.error("❌ Failed to update meeting bot status", {
              error: meetingBotUpdateError,
              bot_id: event.data.bot_id,
            });
            return;
          }
        } else {
          ({ data: meetingBot } = await supabase
            .from("meeting_bots")
            .select("*, profile:profiles(*), calendar:recall_calendars(*)")
            .eq("id", event.data.bot_id)
            .maybeSingle());

          if (meetingBot) {
            const { error: meetingBotUpdateError } = await supabase
              .from("meeting_bots")
              .update({
                status: "fatal",
                error_code: event.data.error,
              })
              .eq("id", event.data.bot_id);

            if (meetingBotUpdateError) {
              logger.error("❌ Failed to update meeting bot status", {
                error: meetingBotUpdateError,
                bot_id: event.data.bot_id,
              });
              return;
            }
          } else {
            logger.error("❌ Failed to find meeting bot", {
              bot_id: event.data.bot_id,
            });
            return;
          }
        }

        await slack.error({
          text: formatSlackMessage(
            meetingBot,
            `🤖 Meeting bot failed\n\n*Error:* \`${event.data.error}\``,
          ),
        });

        return;
      }

      const status = "status" in event.data ? event.data.status : undefined;

      let isV2 = true;

      let { data: meetingBot } = await supabase
        .from("meeting_bots_v2")
        .select(
          "*, profile:profiles(*), calendar:recall_calendars_v2(*), event:calendar_events_v2(*)",
        )
        .eq("id", event.data.bot_id)
        .maybeSingle();

      if (meetingBot) {
        if (Object.keys(status ?? {}).length > 0) {
          const { error: meetingBotUpdateError } = await supabase
            .from("meeting_bots_v2")
            .update({
              ...(status?.code && { status: status.code }),
              ...(status?.sub_code && { sub_code: status.sub_code }),
              ...(status?.message && { message: status.message }),
              ...(status?.recording_id && {
                recording_id: status.recording_id,
              }),
            })
            .eq("id", event.data.bot_id);

          if (meetingBotUpdateError) {
            logger.error("❌ Failed to update meeting bot status", {
              error: meetingBotUpdateError,
              event_id: event.data.bot_id,
              status,
            });
            return;
          }
        }
      } else {
        ({ data: meetingBot } = await supabase
          .from("meeting_bots")
          .select("*, profile:profiles(*), calendar:recall_calendars(*)")
          .eq("id", event.data.bot_id)
          .maybeSingle());

        if (meetingBot) {
          if (Object.keys(status ?? {}).length > 0) {
            const { error: meetingBotUpdateError } = await supabase
              .from("meeting_bots")
              .update({
                ...(status?.code && { status: status.code }),
                ...(status?.sub_code && { sub_code: status.sub_code }),
                ...(status?.message && { message: status.message }),
                ...(status?.recording_id && {
                  recording_id: status.recording_id,
                }),
              })
              .eq("id", event.data.bot_id);

            if (meetingBotUpdateError) {
              logger.error("❌ Failed to update meeting bot status", {
                error: meetingBotUpdateError,
                event_id: event.data.bot_id,
                status,
              });
              return;
            }
          }
        } else {
          logger.error("❌ Failed to find meeting bot", {
            bot_id: event.data.bot_id,
          });
          return;
        }

        isV2 = false;
      }

      logger.info("✅ Successfully updated meeting bot status", {
        meeting_bot: meetingBot,
      });

      const recallBot = await recall.bot
        .bot_retrieve({
          params: { id: event.data.bot_id },
        })
        .catch((error: unknown) => {
          logger.warn("⚠️ Failed to fetch bot from Recall", {
            error,
            bot_id: event.data.bot_id,
            profile_id: meetingBot.profile_id,
            user_email: meetingBot.profile.email,
          });
          return undefined;
        });

      if (recallBot) {
        logger.info("✅ Successfully fetched bot from Recall", {
          bot_id: event.data.bot_id,
          profile_id: meetingBot.profile_id,
          user_email: meetingBot.profile.email,
          has_video_url: !!recallBot.video_url,
        });
      }

      if (status?.code === "done" || event.event === "complete") {
        await slack.done({
          text: formatSlackMessage(
            meetingBot,
            `🤖 Meeting bot completed${status?.sub_code ? ` (\`${status.sub_code}\`)` : ""}`,
          ),
        });

        logger.info("🎥 Starting meeting completion workflow", {
          bot_id: meetingBot.id,
          profile_id: meetingBot.profile_id,
          user_email: meetingBot.profile.email,
        });

        const participants = _.uniq(
          recallBot?.meeting_participants.map(({ name }) => name.trim()) ??
            ("speakers" in event.data
              ? /* meeting_baas */ event.data.speakers.map((speaker) =>
                  speaker.trim(),
                )
              : []),
        );

        const { storageUrl, apiVideoId, speakers } = await handleVideoUpload(
          meetingBot,
          recallBot?.video_url ??
            ("mp4" in event.data
              ? /* meeting_baas */ event.data.mp4
              : undefined),
          participants,
        );

        logger.info("✅ Video upload completed successfully", {
          bot_id: meetingBot.id,
          storage_url: storageUrl,
          api_video_id: apiVideoId,
          speakers_count: speakers.length,
          profile_id: meetingBot.profile_id,
          user_email: meetingBot.profile.email,
        });

        const { error: meetingBotUpdateError } = await supabase
          .from(isV2 ? "meeting_bots_v2" : "meeting_bots")
          .update({
            speakers,
            ...(storageUrl && { mp4_source_url: storageUrl }),
            ...(apiVideoId && { api_video_id: apiVideoId }),
          })
          .eq("id", meetingBot.id);

        if (meetingBotUpdateError) {
          logger.error("❌ Failed to update meeting bot with video data", {
            error: meetingBotUpdateError,
            bot_id: meetingBot.id,
            profile_id: meetingBot.profile_id,
            user_email: meetingBot.profile.email,
          });
        }

        logger.info("📝 Fetching transcript from Recall", {
          bot_id: meetingBot.id,
          profile_id: meetingBot.profile_id,
          user_email: meetingBot.profile.email,
        });

        const transcript = await ("transcript" in event.data
          ? /* meeting_baas */ transformMeetingBaasTranscript(
              event.data.transcript,
            )
          : recall.bot
              .bot_transcript_list({
                params: { id: meetingBot.id },
              })
              .catch((error: unknown): RecallTranscript => {
                logger.error("❌ Failed to fetch transcript from Recall", {
                  error,
                  bot_id: meetingBot.id,
                  profile_id: meetingBot.profile_id,
                  user_email: meetingBot.profile.email,
                });
                return [];
              }));

        logger.info("✅ Successfully fetched transcript", {
          bot_id: meetingBot.id,
          transcript_segments: transcript.length,
          profile_id: meetingBot.profile_id,
          user_email: meetingBot.profile.email,
        });

        await handleTranscript(meetingBot, transcript, isV2);

        if (apiVideoId && !meetingBotUpdateError) {
          await handleVideoProcessing(meetingBot);
        }
      } else {
        await slack.info({
          text: formatSlackMessage(
            meetingBot,
            `🤖 Meeting bot status changed\n\n*New status:* \`${meetingBot.status}\`${
              status?.sub_code ? ` (\`${status.sub_code}\`)` : ""
            }`,
          ),
        });
      }
    } catch (error) {
      logger.error("❌ Failed to handle bot status change", {
        error,
        event,
      });
      await slack.error({
        text: `Failed to handle bot status change: ${(error as Error).message}`,
      });
    }
  }

  async function handleVideoUpload(
    bot: MeetingBotWithProfileAndEventAndCalendar,
    videoUrl: string | undefined,
    participants: string[],
  ): Promise<VideoUploadResult> {
    try {
      logger.info("🎥 Starting video upload process", {
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
        video_url: videoUrl,
      });

      if (!videoUrl) {
        logger.warn("⚠️ Missing video URL for upload", {
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile.email,
        });

        await slack.warn({
          text: formatSlackMessage(
            bot,
            "🎥 Cannot upload video - Missing video URL",
          ),
        });

        return { storageUrl: undefined, apiVideoId: undefined, speakers: [] };
      }

      logger.info("🚀 Initiating parallel video uploads", {
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
        video_url: videoUrl,
      });

      const [{ storageUrl }, { apiVideoId, speakers }] = await Promise.all([
        uploadVideoToStorage(bot, videoUrl),
        uploadVideoToApiVideo(bot, videoUrl, participants),
      ]);

      logger.info("✅ Video upload completed", {
        bot_id: bot.id,
        storage_url: storageUrl,
        api_video_id: apiVideoId,
        speakers_count: speakers.length,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });

      return { storageUrl, apiVideoId, speakers };
    } catch (error) {
      let errorMessage = (error as Error).message;
      if (isAxiosError(error)) {
        errorMessage = error.response?.data
          ? JSON.stringify(error.response.data)
          : errorMessage;
      }
      logger.error("❌ Failed to handle video upload", {
        error,
        error_message: errorMessage,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });
      await slack.error({
        text: formatSlackMessage(
          bot,
          `🎥 Failed to handle video upload: ${errorMessage}`,
        ),
      });
      return { storageUrl: undefined, apiVideoId: undefined, speakers: [] };
    }
  }

  async function uploadVideoToStorage(
    bot: MeetingBotWithProfileAndEventAndCalendar,
    videoUrl: string,
  ): Promise<Pick<VideoUploadResult, "storageUrl">> {
    try {
      const fileName = `${bot.id}.mp4`;

      logger.info("📤 Initiating storage upload", {
        bot_id: bot.id,
        file_name: fileName,
        video_url: videoUrl,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });

      void uploadVideoToSupabaseStorage.trigger({
        botId: bot.id,
        provider: bot.provider ?? "meeting_baas",
        videoUrl: videoUrl,
        fileName: fileName,
      });

      logger.info("✅ Storage upload job queued", {
        bot_id: bot.id,
        file_name: fileName,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });

      const storageUrl = `https://db.withtitan.com/storage/v1/object/public/meetings/${fileName}`;

      return { storageUrl };
    } catch (error) {
      let errorMessage = (error as Error).message;
      if (isAxiosError(error)) {
        errorMessage = error.response?.data
          ? JSON.stringify(error.response.data)
          : errorMessage;
      }
      logger.error("❌ Failed to upload video to storage", {
        error,
        error_message: errorMessage,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });
      await slack.error({
        text: formatSlackMessage(
          bot,
          `💾 Failed to upload video to storage: ${errorMessage}`,
        ),
      });
      return { storageUrl: undefined };
    }
  }

  async function uploadVideoToApiVideo(
    bot: MeetingBotWithProfileAndEventAndCalendar,
    videoUrl: string,
    participants: string[],
  ): Promise<Pick<VideoUploadResult, "apiVideoId" | "speakers">> {
    try {
      logger.info("📤 Starting API.video upload", {
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
        video_url: videoUrl,
      });

      const existingApiVideos = await apiVideo.videos.list({
        metadata: {
          meeting_bot_id: bot.id,
        } satisfies ApiVideoMetadataObject,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (existingApiVideos.data.length > 0) {
        logger.info("ℹ️ Found existing API.video upload", {
          bot_id: bot.id,
          video_id: existingApiVideos.data[0]?.videoId,
          profile_id: bot.profile_id,
          user_email: bot.profile.email,
          videos_count: existingApiVideos.data.length,
        });

        const firstExistingApiVideo = existingApiVideos.data[0];

        return {
          apiVideoId: firstExistingApiVideo?.videoId,
          speakers: firstExistingApiVideo?.tags ?? [],
        };
      }

      const tags = [...participants, bot.profile_id].filter(
        (tag): tag is NonNullable<typeof tag> => tag !== null,
      );

      logger.info("👥 Detected meeting participants", {
        bot_id: bot.id,
        speakers: tags,
        speakers_count: tags.length,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });

      if (tags.length === 0) {
        logger.warn("⚠️ No speakers detected for video upload", {
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile.email,
          participants,
        });

        await slack.info({
          text: formatSlackMessage(
            bot,
            "🎥 Skipping API.video upload - No speakers detected",
          ),
        });

        return { apiVideoId: undefined, speakers: [] };
      }

      const [metadata, title, description] = await Promise.all([
        getApiVideoMetadata(bot),
        getApiVideoTitle(bot),
        getApiVideoDescription(bot),
      ]);

      logger.info("📝 Prepared API.video metadata", {
        bot_id: bot.id,
        metadata,
        title,
        description_length: description?.length,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });

      await slack.info({
        text: formatSlackMessage(bot, "🎥 Starting API.video upload"),
      });

      const video = await apiVideo.videos.create({
        title,
        description,
        source: videoUrl,
        mp4Support: true,
        tags,
        metadata,
      });

      logger.info("✅ API.video upload successful", {
        bot_id: bot.id,
        video_id: video.videoId,
        title: video.title,
        tags_count: video.tags?.length ?? 0,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });

      await slack.success({
        text: formatSlackMessage(
          bot,
          `🎥 Successfully uploaded video to API.video\n\n<https://dashboard.api.video/videos/${video.videoId}|Watch now>`,
        ),
      });

      return { apiVideoId: video.videoId, speakers: tags };
    } catch (error) {
      let errorMessage = (error as Error).message;
      if (isAxiosError(error)) {
        errorMessage = error.response?.data
          ? JSON.stringify(error.response.data)
          : errorMessage;
      }
      logger.error("❌ Failed to upload to API.video", {
        error,
        error_message: errorMessage,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });
      await slack.error({
        text: formatSlackMessage(
          bot,
          `🎥 Failed to upload to API.video: ${errorMessage}`,
        ),
      });
      return { apiVideoId: undefined, speakers: [] };
    }
  }

  async function getApiVideoMetadata(
    bot: MeetingBotWithProfileAndEventAndCalendar,
  ) {
    const metadataObject = {
      user_id: bot.profile.id,
      event_id: bot.event?.id,
      meeting_bot_id: bot.id,
    } satisfies ApiVideoMetadataObject;

    return Object.entries(metadataObject)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => ({
        key,
        value,
      }));
  }

  async function getApiVideoTitle(
    bot: MeetingBotWithProfileAndEventAndCalendar,
  ) {
    const fallbackTitle = `Meeting Recording - ${bot.id}`;
    try {
      if (typeof bot.title === "string" && bot.title.trim() !== "") {
        return bot.title;
      }

      return bot.event?.raw &&
        typeof bot.event.raw === "object" &&
        "summary" in bot.event.raw &&
        typeof bot.event.raw.summary === "string"
        ? bot.event.raw.summary
        : fallbackTitle;
    } catch (error) {
      logger.error("❌ Failed to generate video title", {
        error,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });
      return fallbackTitle;
    }
  }

  async function getApiVideoDescription(
    bot: MeetingBotWithProfileAndEventAndCalendar,
  ) {
    try {
      return bot.event?.raw &&
        typeof bot.event.raw === "object" &&
        "description" in bot.event.raw &&
        typeof bot.event.raw.description === "string"
        ? bot.event.raw.description
        : undefined;
    } catch (error) {
      logger.error("❌ Failed to generate video description", {
        error,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });
      return undefined;
    }
  }

  async function handleVideoProcessing(
    bot: MeetingBotWithProfileAndEventAndCalendar,
  ) {
    try {
      logger.info("🎬 Starting video processing", {
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });

      await processVideo({
        meetingBotId: bot.id,
        steps: ["all"],
      });

      logger.info("✅ Video processing initiated", {
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });
    } catch (error) {
      let errorMessage = (error as Error).message;
      if (isAxiosError(error)) {
        errorMessage = error.response?.data
          ? JSON.stringify(error.response.data)
          : errorMessage;
      }
      logger.error("❌ Failed to process video", {
        error,
        error_message: errorMessage,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });
      await slack.error({
        text: formatSlackMessage(
          bot,
          `🎥 Failed to process video: ${errorMessage}`,
        ),
      });
    }
  }

  async function transformMeetingBaasTranscript(
    transcript: MeetingBaasCompleteEventData["transcript"],
  ): Promise<RecallTranscript> {
    return transcript.map(({ speaker, words }) => ({
      speaker,
      words: words.map(({ start, end, word }) => ({
        text: word,
        start_timestamp: start,
        end_timestamp: end,
      })),
    }));
  }

  async function handleTranscript(
    bot: MeetingBotWithProfileAndEventAndCalendar,
    transcript: RecallTranscript,
    isV2: boolean,
  ) {
    logger.info("📝 Processing transcript", {
      bot_id: bot.id,
      profile_id: bot.profile_id,
      user_email: bot.profile.email,
      transcript_length: transcript.length,
      total_words: transcript.reduce(
        (acc, slice) => acc + slice.words.length,
        0,
      ),
    });

    await slack.info({
      text: formatSlackMessage(
        bot,
        `📝 Processing transcript with \`${transcript.length}\` segments`,
      ),
    });

    const { data: transcriptSlices, error: transcriptSlicesError } =
      await supabase
        .from(isV2 ? "transcript_slices_v2" : "transcript_slices")
        .insert(
          transcript.map(
            (slice, index) =>
              ({
                bot_id: bot.id,
                speaker_name: slice.speaker,
                index,
              }) satisfies TablesInsert<"transcript_slices_v2"> &
                TablesInsert<"transcript_slices">,
          ),
        )
        .select("*");

    if (transcriptSlicesError) {
      logger.error("❌ Failed to insert transcript slices", {
        error: transcriptSlicesError,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
      });
      await slack.error({
        text: formatSlackMessage(
          bot,
          `📝 Failed to insert transcript slices: ${transcriptSlicesError.message}`,
        ),
      });
      return;
    }

    if (!transcriptSlices || transcriptSlices.length === 0) {
      const error = new Error("No transcript slices were inserted");
      logger.warn("⚠️ No transcript slices inserted", {
        error,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
        transcript_length: transcript.length,
      });
      await slack.warn({
        text: formatSlackMessage(
          bot,
          `📝 Failed to insert transcript slices: ${error.message}`,
        ),
      });
      return;
    }

    logger.info("✅ Inserted transcript slices", {
      bot_id: bot.id,
      profile_id: bot.profile_id,
      user_email: bot.profile.email,
      slices_count: transcriptSlices.length,
      unique_speakers: _.uniq(transcriptSlices.map((s) => s.speaker_name))
        .length,
    });

    const words = transcript.flatMap((slice, transcriptSliceIndex) =>
      slice.words
        .map(
          (word, wordIndex) =>
            ({
              bot_id: bot.id,
              transcript_slice_id:
                transcriptSlices[transcriptSliceIndex]?.id ?? "",
              start_time: word.start_timestamp,
              end_time: word.end_timestamp,
              content: word.text,
              index: wordIndex,
            }) satisfies TablesInsert<"transcript_words_v2"> &
              TablesInsert<"transcript_words">,
        )
        .filter((word) => !!word.transcript_slice_id),
    );

    logger.info("📝 Inserting transcript words", {
      bot_id: bot.id,
      profile_id: bot.profile_id,
      user_email: bot.profile.email,
      words_count: words.length,
    });

    const { error: wordsError } = await supabase
      .from(isV2 ? "transcript_words_v2" : "transcript_words")
      .insert(words);

    if (wordsError) {
      logger.error("❌ Failed to insert transcript words", {
        error: wordsError,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile.email,
        words_count: words.length,
      });
      await slack.error({
        text: formatSlackMessage(
          bot,
          `📝 Failed to insert transcript words: ${wordsError.message}`,
        ),
      });
      return;
    }

    logger.info("✨ Successfully processed transcript", {
      bot_id: bot.id,
      profile_id: bot.profile_id,
      user_email: bot.profile.email,
      slices_count: transcriptSlices.length,
      words_count: words.length,
      unique_speakers: _.uniq(transcriptSlices.map((s) => s.speaker_name))
        .length,
    });

    await slack.success({
      text: `[${bot.profile.email}] Successfully processed transcript with ${transcriptSlices.length} slices and ${words.length} words`,
    });
  }

  function formatSlackMessage(
    bot: MeetingBotWithProfileAndEvent,
    content: string,
  ) {
    const headerParts = [
      bot.event?.meeting_platform === "google_meet"
        ? "🎥 GMeet"
        : bot.event?.meeting_platform === "zoom"
          ? "🎥 Zoom"
          : "🎥 Unknown",
      `*User:* \`${bot.profile.email}\``,
      `*Bot:* <https://supabase.com/dashboard/project/gukeqqpzhaignmhdduma/editor/289720?schema=${encodeURIComponent("public")}&filter=${encodeURIComponent(`id:eq:${bot.id}`)}|${bot.id}>`,
      bot.event &&
        `*Event:* <https://supabase.com/dashboard/project/gukeqqpzhaignmhdduma/editor/287060?schema=${encodeURIComponent("public")}&filter=${encodeURIComponent(`id:eq:${bot.event.id}`)}|${bot.event.id}>`,
    ].filter(Boolean);

    const footer = `<https://supabase.com/dashboard/project/gukeqqpzhaignmhdduma/editor/289720?schema=${encodeURIComponent("public")}&filter=${encodeURIComponent(`id:eq:${bot.id}`)}|View in Supabase>`;

    return [headerParts.join(" | "), content, footer].join("\n\n");
  }

  return {
    handleBotStatusChange,
  } as const;
}
