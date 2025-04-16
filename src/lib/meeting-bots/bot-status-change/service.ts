import { isAxiosError } from "axios";
import dayjs from "dayjs";
import _ from "lodash";
import type { Except } from "type-fest";

import { entityExtraction } from "~/jobs/preprocessing/steps/entity-extraction";
import { topicSegmentation } from "~/jobs/preprocessing/steps/topic-segmentation";
import { uploadVideoToSupabaseStorage } from "~/jobs/upload-video-to-supabase-storage";
import { processVideo } from "~/lib/api/meetings";
import { Vtt } from "~/lib/backend/services/vtt/vtt.service";
import type { Tables, TablesInsert } from "~/lib/supabase/database.types";
import { isTruthy } from "~/lib/utils";

import { createBotService } from "../bot/service";
import { BOT_AUTOMATIC_LEAVE } from "../constants";
import {
  BotStatusChangeEventDataStatus,
  MeetingBaasCompleteEventData,
  type ProviderAgnosticBotStatusChangeEvent,
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
  profile: Tables<"profiles"> | null;
  event?: Tables<"calendar_events_v2"> | Tables<"calendar_events"> | null;
};

export type MeetingBotWithProfileAndEventAndCalendar =
  MeetingBotWithProfileAndEvent & {
    calendar: Tables<"recall_calendars_v2"> | Tables<"recall_calendars"> | null;
  };

export type MeetingBotWithProfileAndEventAndCalendarAndTranscript =
  MeetingBotWithProfileAndEventAndCalendar & {
    transcript: RecallTranscript;
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

  const { getOrCreateBotById, getRecallBotById } = createBotService(deps);

  async function handleBotStatusChange(
    event: ProviderAgnosticBotStatusChangeEvent,
  ) {
    try {
      logger.info("🔄 Processing bot status change", {
        event,
      });

      if (event.event === "failed") {
        const botId = event.data.bot_id;
        const botError = event.data.error;

        const { bot: meetingBot, version: meetingBotVersion } =
          await getOrCreateBotById(botId);

        if (!meetingBot) {
          logger.error("❌ Failed to find or create bot", {
            bot_id: botId,
          });
          void slack.error({
            text: `❌ Failed to find or create bot ${botId}`,
          });
          return;
        }

        const { error: meetingBotUpdateError } = await supabase
          .from(meetingBotVersion === "v2" ? "meeting_bots_v2" : "meeting_bots")
          .update({
            status: "fatal",
            error_code: botError,
          })
          .eq("id", botId);

        if (meetingBotUpdateError) {
          logger.error("❌ Failed to update meeting bot status", {
            bot_id: botId,
            error: meetingBotUpdateError,
          });
          void slack.error({
            text: `❌ Failed to update meeting bot status ${botId}: ${meetingBotUpdateError.message}`,
          });
          return;
        }

        return;
      }

      const botId = event.data.bot_id;
      const status = BotStatusChangeEventDataStatus.safeParse(
        event.data?.status,
      ).data;

      let { bot: meetingBot, version: meetingBotVersion } =
        await getOrCreateBotById(botId);

      if (!meetingBot) {
        logger.error("❌ Failed to find or create bot", {
          bot_id: botId,
        });
        void slack.error({
          text: `❌ Failed to find or create bot ${botId}`,
        });
        return;
      }

      if (Object.keys(status ?? {}).length > 0) {
        const { error: meetingBotUpdateError } = await supabase
          .from(meetingBotVersion === "v2" ? "meeting_bots_v2" : "meeting_bots")
          .update({
            ...(status?.code && { status: status.code }),
            ...(status?.sub_code && { sub_code: status.sub_code }),
            ...(status?.message && { message: status.message }),
            ...(status?.recording_id && {
              recording_id: status.recording_id,
            }),
          })
          .eq("id", botId);

        if (meetingBotUpdateError) {
          logger.error("❌ Failed to update meeting bot status", {
            bot_id: botId,
            error: meetingBotUpdateError,
          });
          void slack.error({
            text: `❌ Failed to update meeting bot status ${botId}: ${meetingBotUpdateError.message}`,
          });
          return;
        }

        logger.info("✅ Successfully updated meeting bot status", {
          meeting_bot: meetingBot,
        });

        ({ bot: meetingBot, version: meetingBotVersion } =
          await getOrCreateBotById(botId));
      }

      if (!meetingBot) {
        logger.error("❌ Failed to find or create bot", {
          bot_id: botId,
        });
        void slack.error({
          text: `❌ Failed to find or create bot ${botId}`,
        });
        return;
      }

      const recallBot = await getRecallBotById(botId);

      if (recallBot) {
        logger.info("✅ Successfully fetched bot from Recall", {
          bot_id: event.data.bot_id,
          profile_id: meetingBot.profile_id,
          user_email: meetingBot.profile?.email,
          has_video_url: !!recallBot.video_url,
        });

        if (
          meetingBot.profile_id &&
          "event" in meetingBot &&
          recallBot.google_meet &&
          status?.sub_code === "timeout_exceeded_waiting_room"
        ) {
          const { data: userSettings } = await supabase
            .from("user_settings")
            .select("*")
            .eq("profile_id", meetingBot.profile_id)
            .single();

          if (!userSettings) {
            logger.error("❌ Failed to find user settings", {
              bot_id: meetingBot.id,
              profile_id: meetingBot.profile_id,
            });
            void slack.error({
              text: `❌ Failed to find user settings for bot ${meetingBot.id}, using default \`botName\``,
            });
          }

          const botName = userSettings?.bot_name ?? "Notetaker";
          const botMetadata = {
            user_id: meetingBot.profile_id,
            event_id: meetingBot.event_id,
          };

          const minutesSinceEventStart = dayjs().diff(
            dayjs(meetingBot.event?.start_time),
            "minutes",
          );
          const newDeduplicationKey = `${meetingBot.deduplication_key}-${Math.floor(minutesSinceEventStart / 10)}`;

          const newRecallBot = await recall.bot.bot_create({
            deduplication_key: newDeduplicationKey,
            meeting_url: recallBot.meeting_url,
            bot_name: botName,
            automatic_leave: {
              waiting_room_timeout:
                BOT_AUTOMATIC_LEAVE.WAITING_ROOM_TIMEOUT_IN_SECONDS,
              noone_joined_timeout:
                BOT_AUTOMATIC_LEAVE.NOONE_JOINED_TIMEOUT_IN_SECONDS,
            },
            transcription_options: {
              provider: "gladia",
            },
            metadata: botMetadata,
          });

          const { error: newMeetingBotInsertionError } = await supabase
            .from("meeting_bots_v2")
            .insert({
              id: newRecallBot.id,
              provider: "recall",
              profile_id: meetingBot.profile_id,
              recall_calendar_id: meetingBot.recall_calendar_id,
              event_id: meetingBot.event_id,
              deduplication_key: newDeduplicationKey,
            })
            .select("*");

          logger.info("✅ Successfully created new Recall bot", {
            bot_id: newRecallBot.id,
            profile_id: meetingBot.profile_id,
            user_email: meetingBot.profile?.email,
          });

          if (newMeetingBotInsertionError) {
            logger.error("❌ Failed to create new meeting bot", {
              error: newMeetingBotInsertionError,
            });
            void slack.error({
              text: `❌ Failed to create new meeting bot ${newRecallBot.id}: ${newMeetingBotInsertionError.message}`,
            });
          }

          return;
        }
      }

      if (status?.code === "done" || event.event === "complete") {
        void slack.done({
          text: formatSlackMessage(
            meetingBot,
            `🤖 Meeting bot completed${status?.sub_code ? ` (\`${status.sub_code}\`)` : ""}`,
          ),
        });

        const {
          data: meetingProcessingStatus,
          error: meetingProcessingStatusInsertionError,
        } = await supabase
          .from("meeting_processing_status")
          .upsert(
            {
              meeting_bot_id: meetingBot.id,
              action_items_status: "pending", // wont do
              backend_call_status: "pending", // handled
              embed_meeting_status: "pending", // wont do
              embed_moments_status: "pending", // wont do
              entity_extraction_status: "pending", // handled
              interestingness_status: "pending", // wont do
              meetings_status: "pending", // wont do
              moments_status: "pending", // wont do
              observation_status: "pending", // wont do
              segments_status: "pending", // wont do
              supabase_video_upload_status: "pending", // handled
              topic_segmentation_status: "pending", // handled
              topics_status: "pending", // wont do
              transcript_slice_words_status: "pending", // handled
              video_api_upload_status: "pending", // handled
            },
            { onConflict: "meeting_bot_id" },
          )
          .select("*")
          .single();

        if (meetingProcessingStatusInsertionError) {
          logger.error("❌ Failed to create meeting bot status", {
            error: meetingProcessingStatusInsertionError,
            bot_id: meetingBot.id,
            profile_id: meetingBot.profile_id,
            user_email: meetingBot.profile?.email,
          });
          void slack.error({
            text: `❌ Failed to create meeting bot status ${meetingBot.id}: ${meetingProcessingStatusInsertionError.message}`,
          });
          return;
        }

        logger.info("🎥 Starting meeting completion workflow", {
          bot_id: meetingBot.id,
          profile_id: meetingBot.profile_id,
          user_email: meetingBot.profile?.email,
        });

        const meetingBaasEventData = MeetingBaasCompleteEventData.safeParse(
          event.data,
        ).data;

        const participants = _.uniq(
          (
            recallBot?.meeting_participants.map(({ name }) => name?.trim()) ??
            meetingBaasEventData?.speakers
              ?.concat(
                (meetingBaasEventData.transcript ?? []).flatMap(
                  ({ speaker }) => speaker,
                ) ?? [],
              )
              .map((speaker) => speaker?.trim()) ??
            []
          ).filter(Boolean),
        );

        const { storageUrl, apiVideoId, speakers } = await handleVideoUpload(
          meetingBot,
          recallBot?.video_url ?? meetingBaasEventData?.mp4 ?? undefined,
          participants,
          meetingProcessingStatus.id,
        );

        logger.info("✅ Video upload completed successfully", {
          bot_id: meetingBot.id,
          storage_url: storageUrl,
          api_video_id: apiVideoId,
          speakers_count: speakers.length,
          profile_id: meetingBot.profile_id,
          user_email: meetingBot.profile?.email,
        });

        if (apiVideoId) {
          const { error: meetingProcessingStatusUpdateError } = await supabase
            .from("meeting_processing_status")
            .update({
              video_id: apiVideoId,
            })
            .eq("id", meetingProcessingStatus.id);

          if (meetingProcessingStatusUpdateError) {
            logger.error("❌ Failed to update meeting processing status", {
              error: meetingProcessingStatusUpdateError,
              bot_id: meetingBot.id,
              profile_id: meetingBot.profile_id,
              user_email: meetingBot.profile?.email,
            });
            void slack.error({
              text: `❌ Failed to update meeting processing status ${meetingBot.id}: ${meetingProcessingStatusUpdateError.message}`,
            });
          }
        }

        const { error: meetingBotUpdateError } = await supabase
          .from(meetingBotVersion === "v2" ? "meeting_bots_v2" : "meeting_bots")
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
            user_email: meetingBot.profile?.email,
          });
        }

        logger.info("📝 Fetching transcript from Recall", {
          bot_id: meetingBot.id,
          profile_id: meetingBot.profile_id,
          user_email: meetingBot.profile?.email,
        });

        const transcript = await (meetingBaasEventData?.transcript
          ? transformMeetingBaasTranscript(meetingBaasEventData.transcript)
          : recall.bot
              .bot_transcript_list({
                params: { id: meetingBot.id },
              })
              .catch((error: unknown): RecallTranscript => {
                logger.error("❌ Failed to fetch transcript from Recall", {
                  error,
                  bot_id: meetingBot.id,
                  profile_id: meetingBot.profile_id,
                  user_email: meetingBot.profile?.email,
                });
                return [];
              }));

        const cleanedTranscript = Vtt.fromRecallTranscript(transcript)
          .clean()
          .toRecallTranscript();

        logger.info("✅ Successfully fetched transcript", {
          bot_id: meetingBot.id,
          transcript_segments: cleanedTranscript.length,
          profile_id: meetingBot.profile_id,
          user_email: meetingBot.profile?.email,
        });

        await handleTranscript(
          meetingBot,
          cleanedTranscript,
          meetingBotVersion === "v2",
          meetingProcessingStatus.id,
        );

        if (apiVideoId && !meetingBotUpdateError) {
          /*
          await handleVideoPreprocessing(
            {
              ...meetingBot,
              transcript: cleanedTranscript,
              api_video_id: apiVideoId,
            },
            meetingProcessingStatus.id,
          );
          */

          await handleVideoProcessing(
            {
              ...meetingBot,
              transcript: cleanedTranscript,
              api_video_id: apiVideoId,
            },
            meetingProcessingStatus.id,
          );
        }
      } else {
        void slack.info({
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
      void slack.error({
        text: `Failed to handle bot status change: ${(error as Error).message}`,
      });
    }
  }

  async function handleVideoUpload(
    bot: MeetingBotWithProfileAndEventAndCalendar,
    videoUrl: string | undefined,
    participants: string[],
    meetingProcessingStatusId: string,
  ): Promise<VideoUploadResult> {
    try {
      logger.info("🎥 Starting video upload process", {
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
        video_url: videoUrl,
      });

      if (!videoUrl) {
        logger.warn("⚠️ Missing video URL for upload", {
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });

        void slack.warn({
          text: formatSlackMessage(
            bot,
            "🎥 Cannot upload video - Missing video URL",
          ),
        });

        const { error: meetingProcessingStatusUpdateError } = await supabase
          .from("meeting_processing_status")
          .update({
            video_api_upload_status: "skipped",
            supabase_video_upload_status: "skipped",
          })
          .eq("id", meetingProcessingStatusId);

        if (meetingProcessingStatusUpdateError) {
          logger.error("❌ Failed to update meeting processing status", {
            error: meetingProcessingStatusUpdateError,
            bot_id: bot.id,
            profile_id: bot.profile_id,
            user_email: bot.profile?.email,
          });
          void slack.error({
            text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
          });
        }

        return { storageUrl: undefined, apiVideoId: undefined, speakers: [] };
      }

      logger.info("🚀 Initiating parallel video uploads", {
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
        video_url: videoUrl,
      });

      const [{ storageUrl }, { apiVideoId, speakers }] = await Promise.all([
        uploadVideoToStorage(bot, videoUrl, meetingProcessingStatusId),
        uploadVideoToApiVideo(
          bot,
          videoUrl,
          participants,
          meetingProcessingStatusId,
        ),
      ]);

      logger.info("✅ Video upload completed", {
        bot_id: bot.id,
        storage_url: storageUrl,
        api_video_id: apiVideoId,
        speakers_count: speakers.length,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
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
        user_email: bot.profile?.email,
      });
      void slack.error({
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
    videoUrl: string | undefined,
    meetingProcessingStatusId: string,
  ): Promise<Pick<VideoUploadResult, "storageUrl">> {
    try {
      const fileName = `${bot.id}.mp4`;

      logger.info("📤 Initiating storage upload", {
        bot_id: bot.id,
        file_name: fileName,
        video_url: videoUrl,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });

      if (!videoUrl) {
        logger.warn("⚠️ No video URL found for storage upload, skipping...", {
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });

        void slack.error({
          text: formatSlackMessage(
            bot,
            "⚠️ No video URL found for storage upload, skipping...",
          ),
        });

        const { error: meetingProcessingStatusUpdateError } = await supabase
          .from("meeting_processing_status")
          .update({
            supabase_video_upload_status: "skipped",
          })
          .eq("id", meetingProcessingStatusId);

        if (meetingProcessingStatusUpdateError) {
          logger.error("❌ Failed to update meeting processing status", {
            error: meetingProcessingStatusUpdateError,
            bot_id: bot.id,
            profile_id: bot.profile_id,
            user_email: bot.profile?.email,
          });
          void slack.error({
            text: formatSlackMessage(
              bot,
              "❌ Failed to update meeting processing status",
            ),
          });
        }

        return { storageUrl: undefined };
      }

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
        user_email: bot.profile?.email,
      });

      const storageUrl = `https://db.withtitan.com/storage/v1/object/public/meetings/${fileName}`;

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          supabase_video_upload_status: "completed",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }

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
        user_email: bot.profile?.email,
      });
      void slack.error({
        text: formatSlackMessage(
          bot,
          `💾 Failed to upload video to storage: ${errorMessage}`,
        ),
      });

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          supabase_video_upload_status: "failed",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }

      return { storageUrl: undefined };
    }
  }

  async function uploadVideoToApiVideo(
    bot: MeetingBotWithProfileAndEventAndCalendar,
    videoUrl: string | undefined,
    participants: string[],
    meetingProcessingStatusId: string,
  ): Promise<Pick<VideoUploadResult, "apiVideoId" | "speakers">> {
    try {
      logger.info("📤 Starting API.video upload", {
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
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
          user_email: bot.profile?.email,
          videos_count: existingApiVideos.data.length,
        });

        const firstExistingApiVideo = existingApiVideos.data[0];

        const { error: meetingProcessingStatusUpdateError } = await supabase
          .from("meeting_processing_status")
          .update({
            video_api_upload_status: "skipped",
          })
          .eq("id", meetingProcessingStatusId);

        if (meetingProcessingStatusUpdateError) {
          logger.error("❌ Failed to update meeting processing status", {
            error: meetingProcessingStatusUpdateError,
            bot_id: bot.id,
            profile_id: bot.profile_id,
            user_email: bot.profile?.email,
          });
          void slack.error({
            text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
          });
        }

        return {
          apiVideoId: firstExistingApiVideo?.videoId,
          speakers: firstExistingApiVideo?.tags ?? [],
        };
      }

      if (participants.length === 0) {
        logger.warn("⚠️ No speakers detected for video upload", {
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
          participants,
        });

        void slack.info({
          text: formatSlackMessage(
            bot,
            "🎥 Skipping API.video upload - No speakers detected",
          ),
        });

        const { error: meetingProcessingStatusUpdateError } = await supabase
          .from("meeting_processing_status")
          .update({
            video_api_upload_status: "skipped",
          })
          .eq("id", meetingProcessingStatusId);

        if (meetingProcessingStatusUpdateError) {
          logger.error("❌ Failed to update meeting processing status", {
            error: meetingProcessingStatusUpdateError,
            bot_id: bot.id,
            profile_id: bot.profile_id,
            user_email: bot.profile?.email,
          });
          void slack.error({
            text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
          });
        }

        return { apiVideoId: undefined, speakers: [] };
      }

      const tags = [...participants, bot.profile_id].filter(
        (tag): tag is NonNullable<typeof tag> => tag !== null,
      );

      logger.info("👥 Detected meeting participants", {
        bot_id: bot.id,
        speakers: tags,
        speakers_count: tags.length,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });

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
        user_email: bot.profile?.email,
      });

      void slack.info({
        text: formatSlackMessage(bot, "🎥 Starting API.video upload"),
      });

      if (!videoUrl) {
        logger.error("❌ No video URL found for upload", {
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });

        void slack.error({
          text: formatSlackMessage(bot, "❌ No video URL found for upload"),
        });

        const { error: meetingProcessingStatusUpdateError } = await supabase
          .from("meeting_processing_status")
          .update({
            video_api_upload_status: "skipped",
          })
          .eq("id", meetingProcessingStatusId);

        if (meetingProcessingStatusUpdateError) {
          logger.error("❌ Failed to update meeting processing status", {
            error: meetingProcessingStatusUpdateError,
            bot_id: bot.id,
            profile_id: bot.profile_id,
            user_email: bot.profile?.email,
          });
        }

        return { apiVideoId: undefined, speakers: [] };
      }

      const video = await apiVideo.videos.create({
        title,
        description,
        source: videoUrl,
        mp4Support: true,
        tags,
        metadata,
        _public: false,
      });

      logger.info("✅ API.video upload successful", {
        bot_id: bot.id,
        video_id: video.videoId,
        title: video.title,
        tags_count: video.tags?.length ?? 0,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });

      void slack.success({
        text: formatSlackMessage(
          bot,
          `🎥 Successfully uploaded video to API.video\n\n<https://dashboard.api.video/videos/${video.videoId}|Watch now>`,
        ),
      });

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          video_api_upload_status: "completed",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }

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
        user_email: bot.profile?.email,
      });
      void slack.error({
        text: formatSlackMessage(
          bot,
          `🎥 Failed to upload to API.video: ${errorMessage}`,
        ),
      });

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          video_api_upload_status: "failed",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }

      return { apiVideoId: undefined, speakers: [] };
    }
  }

  async function getApiVideoMetadata(
    bot: MeetingBotWithProfileAndEventAndCalendar,
  ) {
    const metadataObject = {
      user_id: bot.profile?.id,
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
        user_email: bot.profile?.email,
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
        user_email: bot.profile?.email,
      });
      return undefined;
    }
  }

  async function handleVideoPreprocessing(
    bot: MeetingBotWithProfileAndEventAndCalendarAndTranscript,
    meetingProcessingStatusId: string,
  ) {
    if (!bot.api_video_id) {
      logger.warn("⚠️ No API.video ID found for bot", {
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });
      return;
    }

    const topicSegmentationResult = await topicSegmentation.triggerAndWait(
      bot,
      {
        tags: [
          `bot_id:${bot.id}`,
          bot.profile_id && `profile_id:${bot.profile_id}`,
          `video_id:${bot.api_video_id}`,
        ].filter(isTruthy),
      },
    );

    if (!topicSegmentationResult.ok) {
      logger.error("❌ Failed to segment topics", {
        error: topicSegmentationResult.error,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });
      void slack.error({
        text: formatSlackMessage(
          bot,
          `❌ Failed to segment topics: ${topicSegmentationResult.error instanceof Error ? topicSegmentationResult.error.message : String(topicSegmentationResult.error)}`,
        ),
      });

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          topic_segmentation_status: "failed",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }

      return;
    }

    const { error: meetingProcessingStatusTopicSegmentationUpdateError } =
      await supabase
        .from("meeting_processing_status")
        .update({
          topic_segmentation_status: "completed",
        })
        .eq("id", meetingProcessingStatusId);

    if (meetingProcessingStatusTopicSegmentationUpdateError) {
      logger.error("❌ Failed to update meeting processing status", {
        error: meetingProcessingStatusTopicSegmentationUpdateError,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });
      void slack.error({
        text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusTopicSegmentationUpdateError.message}`,
      });
    }

    const entityExtractionResult = await entityExtraction.triggerAndWait(
      {
        api_video_id: bot.api_video_id,
      },
      {
        tags: [
          `bot_id:${bot.id}`,
          bot.profile_id && `profile_id:${bot.profile_id}`,
          `video_id:${bot.api_video_id}`,
        ].filter(isTruthy),
      },
    );
    if (!entityExtractionResult.ok) {
      logger.error("❌ Failed to extract entities", {
        error: entityExtractionResult.error,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });
      void slack.error({
        text: formatSlackMessage(
          bot,
          `❌ Failed to extract entities: ${entityExtractionResult.error instanceof Error ? entityExtractionResult.error.message : String(entityExtractionResult.error)}`,
        ),
      });

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          entity_extraction_status: "failed",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }

      return;
    }

    const { error: meetingProcessingStatusEntityExtractionUpdateError } =
      await supabase
        .from("meeting_processing_status")
        .update({
          entity_extraction_status: "completed",
        })
        .eq("id", meetingProcessingStatusId);

    if (meetingProcessingStatusEntityExtractionUpdateError) {
      logger.error("❌ Failed to update meeting processing status", {
        error: meetingProcessingStatusEntityExtractionUpdateError,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });
      void slack.error({
        text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusEntityExtractionUpdateError.message}`,
      });
    }
  }

  async function handleVideoProcessing(
    bot: MeetingBotWithProfileAndEventAndCalendarAndTranscript,
    meetingProcessingStatusId: string,
  ) {
    try {
      logger.info("🎬 Starting video processing", {
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });

      void processVideo({
        meetingBotId: bot.id,
        processingId: meetingProcessingStatusId,
        steps: ["all"],
      });

      logger.info("✅ Video processing initiated", {
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          backend_call_status: "completed",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }
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
        user_email: bot.profile?.email,
      });

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          backend_call_status: "failed",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }

      void slack.error({
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
    return (transcript ?? []).map(({ speaker, words }) => ({
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
    meetingProcessingStatusId: string,
  ) {
    // Fail early if transcript is empty
    if (!transcript || transcript.length === 0) {
      const error = new Error("Empty transcript provided");
      logger.warn("⚠️ Empty transcript provided", {
        error,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });

      void slack.warn({
        text: formatSlackMessage(
          bot,
          `📝 Cannot process transcript: ${error.message}`,
        ),
      });

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          transcript_slice_words_status: "skipped",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }

      return;
    }

    logger.info("📝 Processing transcript", {
      bot_id: bot.id,
      profile_id: bot.profile_id,
      user_email: bot.profile?.email,
      transcript_length: transcript.length,
      total_words: transcript.reduce(
        (acc, slice) => acc + slice.words.length,
        0,
      ),
    });

    void slack.info({
      text: formatSlackMessage(
        bot,
        `📝 Processing transcript with \`${transcript.length}\` segments`,
      ),
    });

    // Tables to use based on version
    const slicesTable = isV2 ? "transcript_slices_v2" : "transcript_slices";
    const wordsTable = isV2 ? "transcript_words_v2" : "transcript_words";

    // First, backup existing data
    logger.info("📦 Backing up existing transcript data", {
      bot_id: bot.id,
      profile_id: bot.profile_id,
      user_email: bot.profile?.email,
    });

    const { data: existingSlices } = await supabase
      .from(slicesTable)
      .select("*")
      .eq("bot_id", bot.id);

    const { data: existingWords } = await supabase
      .from(wordsTable)
      .select("*")
      .eq("bot_id", bot.id);

    // Delete existing transcript data
    logger.info("🗑️ Deleting existing transcript data", {
      bot_id: bot.id,
      profile_id: bot.profile_id,
      user_email: bot.profile?.email,
    });

    // Delete words first (foreign key constraint)
    const { error: deleteWordsError } = await supabase
      .from(wordsTable)
      .delete()
      .eq("bot_id", bot.id);

    if (deleteWordsError) {
      logger.error("❌ Failed to delete existing transcript words", {
        error: deleteWordsError,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });
      void slack.error({
        text: formatSlackMessage(
          bot,
          `📝 Failed to delete existing transcript words: ${deleteWordsError.message}`,
        ),
      });

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          transcript_slice_words_status: "failed",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }

      return;
    }

    // Delete slices
    const { error: deleteSlicesError } = await supabase
      .from(slicesTable)
      .delete()
      .eq("bot_id", bot.id);

    if (deleteSlicesError) {
      logger.error("❌ Failed to delete existing transcript slices", {
        error: deleteSlicesError,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });

      // Restore words if slices deletion fails
      if (existingWords && existingWords.length > 0) {
        await supabase.from(wordsTable).insert(existingWords);
      }

      void slack.error({
        text: formatSlackMessage(
          bot,
          `📝 Failed to delete existing transcript slices: ${deleteSlicesError.message}`,
        ),
      });

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          transcript_slice_words_status: "failed",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }

      return;
    }

    // Insert new transcript slices
    const { data: transcriptSlices, error: transcriptSlicesError } =
      await supabase
        .from(slicesTable)
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
        user_email: bot.profile?.email,
      });

      // Restore original data
      if (existingSlices && existingSlices.length > 0) {
        await supabase.from(slicesTable).insert(existingSlices);
        if (existingWords && existingWords.length > 0) {
          await supabase.from(wordsTable).insert(existingWords);
        }
      }

      void slack.error({
        text: formatSlackMessage(
          bot,
          `📝 Failed to insert transcript slices: ${transcriptSlicesError.message}`,
        ),
      });

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          transcript_slice_words_status: "failed",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }

      return;
    }

    if (!transcriptSlices || transcriptSlices.length === 0) {
      const error = new Error("No transcript slices were inserted");
      logger.warn("⚠️ No transcript slices inserted", {
        error,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
        transcript_length: transcript.length,
      });

      // Restore original data
      if (existingSlices && existingSlices.length > 0) {
        await supabase.from(slicesTable).insert(existingSlices);
        if (existingWords && existingWords.length > 0) {
          await supabase.from(wordsTable).insert(existingWords);
        }
      }

      void slack.warn({
        text: formatSlackMessage(
          bot,
          `📝 Failed to insert transcript slices: ${error.message}`,
        ),
      });

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          transcript_slice_words_status: "completed",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }

      return;
    }

    logger.info("✅ Inserted transcript slices", {
      bot_id: bot.id,
      profile_id: bot.profile_id,
      user_email: bot.profile?.email,
      slices_count: transcriptSlices.length,
      unique_speakers: _.uniq(transcriptSlices.map((s) => s.speaker_name))
        .length,
    });

    // Calculate total words count for logging
    const totalWordsCount = transcript.reduce(
      (acc, slice) => acc + slice.words.length,
      0,
    );

    logger.info("📝 Inserting transcript words", {
      bot_id: bot.id,
      profile_id: bot.profile_id,
      user_email: bot.profile?.email,
      words_count: totalWordsCount,
    });

    // Process words in batches to avoid statement timeout
    const BATCH_SIZE = 1000;
    let successfulInserts = 0;
    let hasError = false;

    // Prepare all words first
    const allWords = transcript.flatMap((slice, transcriptSliceIndex) =>
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

    // Process in batches
    for (let i = 0; i < allWords.length; i += BATCH_SIZE) {
      const batch = allWords.slice(i, i + BATCH_SIZE);

      logger.info(
        `📝 Inserting words batch ${i / BATCH_SIZE + 1}/${Math.ceil(allWords.length / BATCH_SIZE)}`,
        {
          bot_id: bot.id,
          batch_size: batch.length,
          progress: `${i + batch.length}/${allWords.length}`,
        },
      );

      const { error: batchError } = await supabase
        .from(wordsTable)
        .insert(batch);

      if (batchError) {
        hasError = true;
        logger.error("❌ Failed to insert transcript words batch", {
          error: batchError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
          batch_index: i / BATCH_SIZE + 1,
          batch_size: batch.length,
        });

        void slack.error({
          text: formatSlackMessage(
            bot,
            `📝 Failed to insert transcript words: ${batchError.message}`,
          ),
        });

        break;
      }

      successfulInserts += batch.length;
    }

    if (hasError) {
      // Cleanup and restore original data if any batch failed
      logger.warn("⚠️ Rolling back due to batch insertion failure", {
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
        successful_inserts: successfulInserts,
        total_words: allWords.length,
      });

      // Delete all newly inserted data
      await supabase.from(wordsTable).delete().eq("bot_id", bot.id);
      await supabase.from(slicesTable).delete().eq("bot_id", bot.id);

      // Restore original data if available
      if (existingSlices && existingSlices.length > 0) {
        await supabase.from(slicesTable).insert(existingSlices);
        if (existingWords && existingWords.length > 0) {
          await supabase.from(wordsTable).insert(existingWords);
        }
      }

      const { error: meetingProcessingStatusUpdateError } = await supabase
        .from("meeting_processing_status")
        .update({
          transcript_slice_words_status: "failed",
        })
        .eq("id", meetingProcessingStatusId);

      if (meetingProcessingStatusUpdateError) {
        logger.error("❌ Failed to update meeting processing status", {
          error: meetingProcessingStatusUpdateError,
          bot_id: bot.id,
          profile_id: bot.profile_id,
          user_email: bot.profile?.email,
        });
        void slack.error({
          text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
        });
      }

      return;
    }

    logger.info("✨ Successfully processed transcript", {
      bot_id: bot.id,
      profile_id: bot.profile_id,
      user_email: bot.profile?.email,
      slices_count: transcriptSlices.length,
      words_count: successfulInserts,
      unique_speakers: _.uniq(transcriptSlices.map((s) => s.speaker_name))
        .length,
    });

    const { error: meetingProcessingStatusUpdateError } = await supabase
      .from("meeting_processing_status")
      .update({
        transcript_slice_words_status: "completed",
      })
      .eq("id", meetingProcessingStatusId);

    if (meetingProcessingStatusUpdateError) {
      logger.error("❌ Failed to update meeting processing status", {
        error: meetingProcessingStatusUpdateError,
        bot_id: bot.id,
        profile_id: bot.profile_id,
        user_email: bot.profile?.email,
      });
      void slack.error({
        text: `❌ Failed to update meeting processing status ${bot.id}: ${meetingProcessingStatusUpdateError.message}`,
      });
    }

    void slack.success({
      text: `[${bot.profile?.email}] Successfully processed transcript with ${transcriptSlices.length} slices and ${successfulInserts} words`,
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
          : `🎥 ${_.startCase(bot.event?.meeting_platform ?? "Unknown")}`,
      `*User:* \`${bot.profile?.email}\``,
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
