import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { BOT_AUTOMATIC_LEAVE } from "../constants";
import type { MeetingBotsServiceDependencies } from "../types";

dayjs.extend(utc);

export type LaunchLiveMeetingInput = {
  userId: string;
  meetingUrl: string;
  meetingTitle: string;
};

export function createLiveMeetingService(deps: MeetingBotsServiceDependencies) {
  const { supabase, recall, meetingBaas, logger } = deps;

  async function launchLiveMeeting(input: LaunchLiveMeetingInput) {
    try {
      const userDetails = await getUserDetails(input.userId);

      if (!userDetails) {
        logger.error("❌ User details not found", {
          user_id: input.userId,
          meeting_url: input.meetingUrl,
        });
        return {
          success: false,
          error: "User details not found",
        };
      }

      const now = dayjs().utc().format();
      const nowRoundedToTheFifthMinute =
        dayjs(now).minute() % 5 === 0
          ? dayjs(now).second(0).millisecond(0)
          : dayjs(now)
              .minute(Math.floor(dayjs(now).minute() / 5) * 5)
              .second(0)
              .millisecond(0); // e.g., 12:00:00.000 stays 12:00:00.000, 12:01:30.500 -> 12:00:00.000, 12:02:15.200 -> 12:00:00.000, 12:03:45.800 -> 12:00:00.000, 12:04:20.100 -> 12:00:00.000, 12:05:10.900 -> 12:05:00.000, 12:06:40.300 -> 12:05:00.000, etc.

      // Generate a default title if none is provided
      const meetingTitle =
        input.meetingTitle.trim() ||
        `Untitled Meeting (${dayjs().format("MMMM D, YYYY [at] h:mm A")})`;

      const botName = userDetails.settings.bot_name ?? "Notetaker";
      const botDeduplicationKey = `${dayjs(nowRoundedToTheFifthMinute).format("YYYY-MM-DDTHH:mm:ss[Z]")}-${input.meetingUrl}-${userDetails.profile.id}`;
      const botMetadata = {
        user_id: userDetails.profile.id,
        meeting_title: meetingTitle,
      };

      const isZoomMeeting = input.meetingUrl.includes("zoom.us");

      logger.info("🤖 Preparing bot configuration", {
        user_id: userDetails.profile.id,
        bot_name: botName,
        deduplication_key: botDeduplicationKey,
        provider: isZoomMeeting ? "meeting_baas" : "recall",
        meeting_title: meetingTitle,
      });

      if (
        isZoomMeeting &&
        !userDetails.user.email?.includes("zoom") /* &&
        !userDetails.user.app_metadata?.integration_providers?.includes("zoom") */
      ) {
        const meetingJoinResult = await meetingBaas.meetings
          .join({
            bot_name: botName,
            bot_image: "https://i.ibb.co/jbZmcsG/Slide-16-9-1.jpg",
            meeting_url: input.meetingUrl,
            reserved: false,
            deduplication_key: botDeduplicationKey,
            recording_mode: "speaker_view",
            speech_to_text: {
              provider: "Default",
            },
            automatic_leave: {
              waiting_room_timeout:
                BOT_AUTOMATIC_LEAVE.WAITING_ROOM_TIMEOUT_IN_SECONDS,
              noone_joined_timeout:
                BOT_AUTOMATIC_LEAVE.NOONE_JOINED_TIMEOUT_IN_SECONDS,
            },
            extra: botMetadata,
          })
          .catch((error) => {
            logger.error("❌ Failed to join Meeting Baas meeting", {
              error,
              user_id: userDetails.profile.id,
            });
            return null;
          });

        if (!meetingJoinResult) {
          return {
            success: false,
            error: "Failed to join meeting",
          };
        }

        logger.info("✅ Successfully joined Meeting Baas meeting", {
          bot_id: meetingJoinResult.bot_id,
          user_id: userDetails.profile.id,
        });

        const { data: meetingBot, error: meetingBotError } = await supabase
          .from("meeting_bots_v2")
          .insert({
            id: meetingJoinResult.bot_id,
            profile_id: userDetails.profile.id,
            provider: "meeting_baas",
            deduplication_key: botDeduplicationKey,
            title: meetingTitle,
          });

        if (meetingBotError) {
          logger.error("❌ Failed to create meeting bot record", {
            error: meetingBotError,
            user_id: userDetails.profile.id,
            bot_id: meetingJoinResult.bot_id,
          });
          return {
            success: false,
            error: "Failed to create meeting bot",
          };
        }

        logger.info("💾 Successfully created meeting bot record", {
          bot_id: meetingJoinResult.bot_id,
          user_id: userDetails.profile.id,
        });

        return {
          success: true,
          data: meetingBot,
        };
      }

      const botResult = await recall.bot
        .bot_create({
          deduplication_key: botDeduplicationKey,
          meeting_url: input.meetingUrl,
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
          meeting_metadata: {
            title: meetingTitle,
          },
        })
        .catch((error) => {
          logger.error("❌ Failed to create recall meeting bot", {
            error,
            user_id: userDetails.profile.id,
          });
          return null;
        });

      if (!botResult) {
        return {
          success: false,
          error: "Failed to create meeting bot",
        };
      }

      logger.info("✅ Successfully created Recall bot", {
        bot_id: botResult.id,
        user_id: userDetails.profile.id,
      });

      const { data: meetingBot, error: meetingBotError } = await supabase
        .from("meeting_bots_v2")
        .insert({
          id: botResult.id,
          profile_id: userDetails.profile.id,
          provider: "recall",
          deduplication_key: botDeduplicationKey,
          title: meetingTitle,
        });

      if (meetingBotError) {
        logger.error("❌ Failed to create meeting bot record", {
          error: meetingBotError,
          user_id: userDetails.profile.id,
          bot_id: botResult.id,
        });
        return {
          success: false,
          error: "Failed to create meeting bot",
        };
      }

      logger.info("💾 Successfully created meeting bot record", {
        bot_id: botResult.id,
        user_id: userDetails.profile.id,
      });

      return {
        success: true,
        data: meetingBot,
      };
    } catch (error) {
      logger.error("❌ Failed to launch live meeting", {
        error,
        user_id: input.userId,
        meeting_url: input.meetingUrl,
      });
      return {
        success: false,
        error: "Failed to launch live meeting",
      };
    }
  }

  async function getUserDetails(userId: string) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.admin.getUserById(userId);

    if (userError) {
      logger.error("❌ Failed to get user details", {
        error: userError,
        user_id: userId,
      });
      return null;
    }

    if (!user) {
      logger.error("❓ User not found", {
        user_id: userId,
      });
      return null;
    }

    const { data: userDetails, error: userDetailsError } = await supabase
      .from("user_settings")
      .select("*, profile:profiles!inner(*)")
      .eq("profile_id", userId)
      .maybeSingle();

    if (userDetailsError) {
      logger.error("❌ Failed to get user details", {
        error: userDetailsError,
        user_id: userId,
      });
      return null;
    }

    if (!userDetails) {
      logger.error("❓ User details not found", {
        user_id: userId,
      });
      return null;
    }

    const { profile, ...settings } = userDetails;

    logger.info("✅ Successfully retrieved user details", {
      user_id: userId,
    });

    return {
      user,
      profile,
      settings,
    };
  }

  return {
    launchLiveMeeting,
  } as const;
}
