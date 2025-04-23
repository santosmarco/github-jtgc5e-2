import { logger, schedules } from "@trigger.dev/sdk/v3";
import dayjs from "dayjs";

import { sendSuggestedTopicsEmail } from "~/lib/email";
import { handleGetAllSessionsForUser } from "~/lib/sessions/queries";
import { slack } from "~/lib/slack";
import { generateSuggestedTopics as generateSuggestedTopicsCore } from "~/lib/suggested-topics";
import { __dangerouslyCreateAdminClient__ } from "~/lib/supabase/admin";

export const generateSuggestedTopics = schedules.task({
  id: "generate-suggested-topics",
  cron: "0 4 * * *", // every day at 4am EST (8am UTC)
  run: async () => {
    const supabase = await __dangerouslyCreateAdminClient__();

    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "user");

    if (usersError) {
      logger.error("Failed to fetch users", {
        error: usersError,
      });
      throw usersError;
    }

    for (const user of users) {
      const sessions = await handleGetAllSessionsForUser(
        {
          profileId: user.id,
        },
        supabase,
      );

      const sessionsInTheNext48Hours = sessions.filter(
        (session) =>
          dayjs(session.date).isAfter(dayjs().add(1, "day")) &&
          dayjs(session.date).isBefore(dayjs().add(2, "days")),
      );

      if (sessionsInTheNext48Hours.length === 0) {
        continue;
      }

      // Generate topics for each upcoming session
      for (const session of sessionsInTheNext48Hours) {
        try {
          // Check if session already has topics
          const { data: existingTopics } = await supabase
            .from("session_annotations")
            .select("id")
            .eq("session_id", session.id)
            .limit(1);

          if (existingTopics && existingTopics.length > 0) {
            logger.info(`Session ${session.id} already has topics, skipping`);
            continue;
          }

          // Generate topics for this session
          logger.info(
            `Generating suggested topics for user ${user.id}, session ${session.id}`,
          );
          await generateSuggestedTopicsCore({
            profileId: user.id,
          });

          const { data: suggestedTopics } = await supabase
            .from("session_annotations")
            .select("*")
            .eq("session_id", session.id);
          const { data: meetingDurations } = await supabase
            .from("meetings")
            .select("duration_in_seconds")
            .eq("profile_id", user.id)
            .not("duration_in_seconds", "is", null);

          if (!suggestedTopics) {
            logger.error(`No suggested topics found for session ${session.id}`);
            continue;
          }

          await sendSuggestedTopicsEmail({
            profile: user,
            suggested_topics: suggestedTopics,
            meetingHours:
              meetingDurations?.reduce(
                (acc, duration) =>
                  acc + (duration.duration_in_seconds ?? 0) / 3600,
                0,
              ) ?? 0,
          });

          logger.info(`Triggered topic generation for session ${session.id}`);

          // Send notification to Slack about successful topic generation
          await slack.notifyTopicsGenerated({
            userId: user.id,
            sessionId: session.id,
            sessionDate: dayjs(session.date).format("MMMM D, YYYY [at] h:mm A"),
          });
        } catch (error) {
          logger.error(`Failed to generate topics for session ${session.id}`, {
            error,
          });

          // Notify about failure
          await slack.error({
            text: `Failed to generate topics for user ${user.id}, session ${session.id}`,
          });
        }
      }
    }
  },
});
