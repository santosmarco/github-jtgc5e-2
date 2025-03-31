import type { MeetingBotsServiceDependencies } from "../types";

export function createBotService(deps: MeetingBotsServiceDependencies) {
  const { supabase, recall, logger } = deps;

  async function getOrCreateBotById(botId: string) {
    const { data: meetingBotV2 } = await supabase
      .from("meeting_bots_v2")
      .select(
        "*, profile:profiles(*), calendar:recall_calendars_v2(*), event:calendar_events_v2(*)",
      )
      .eq("id", botId)
      .maybeSingle();

    if (meetingBotV2) {
      return { bot: meetingBotV2, version: "v2" } as const;
    }

    const { data: meetingBotV1 } = await supabase
      .from("meeting_bots")
      .select("*, profile:profiles(*), calendar:recall_calendars(*)")
      .eq("id", botId)
      .maybeSingle();

    if (meetingBotV1) {
      return { bot: meetingBotV1, version: "v1" } as const;
    }

    const recallBot = await getRecallBotById(botId);

    if (recallBot) {
      const { user_id: userId, event_id: eventId } = recallBot.metadata ?? {};

      let recallCalendarId: string | undefined;

      if (userId) {
        const { data: recallCalendar } = await supabase
          .from("recall_calendars")
          .select("id")
          .eq("profile_id", userId)
          .maybeSingle();

        recallCalendarId = recallCalendar?.id;
      }

      const { data: newMeetingBot } = await supabase
        .from("meeting_bots_v2")
        .insert({
          id: botId,
          profile_id: userId,
          provider: "recall",
          event_id: eventId,
          recall_calendar_id: recallCalendarId,
          is_removed: false,
        })
        .select(
          "*, profile:profiles(*), calendar:recall_calendars_v2(*), event:calendar_events_v2(*)",
        )
        .single();

      return { bot: newMeetingBot, version: "v2" } as const;
    }

    logger.error("❌ Meeting bot not found in database or Recall API", {
      bot_id: botId,
    });

    return { bot: null, version: null } as const;
  }

  async function getRecallBotById(botId: string) {
    try {
      const recallBot = await recall.bot.bot_retrieve({
        params: { id: botId },
      });

      return recallBot;
    } catch (err) {
      logger.warn("⚠️ Failed to fetch bot from Recall", {
        bot_id: botId,
        error: err,
      });

      return undefined;
    }
  }

  return {
    getOrCreateBotById,
    getRecallBotById,
  } as const;
}
