import { openai } from "@ai-sdk/openai";
import { logger } from "@trigger.dev/sdk/v3";
import { generateObject } from "ai";
import _ from "lodash";
import { z } from "zod";

import type {
  MeetingBotWithProfileAndEventAndCalendar,
  MeetingBotWithProfileAndEventAndCalendarAndTranscript,
} from "~/lib/meeting-bots/bot-status-change/service";
import type { ProcessingContext } from "~/lib/processing/steps";

import { BackendService } from "../backend.service";
import { Vtt } from "../vtt/vtt.service";

import {
  type TopicSegmentationPromptVariables,
  getTopicSegmentationExamples,
  getTopicSegmentationPrompt,
  getTopicSegmentationSystemMessage,
} from "./topic-segmentation.prompts";
import { TopicSegment } from "./topic-segmentation.schemas";

export const TopicSegmentationOutput = z.object({
  topics: z
    .array(TopicSegment)
    .describe("List of topics analyzed with details."),
});

export type TopicSegmentationOutput = z.infer<typeof TopicSegmentationOutput>;

export class TopicSegmentationService extends BackendService {
  /**
   * Process a VTT file to extract topic segments using AI
   * @param variables Variables containing the VTT content
   * @param ctx Processing context for logging and tracing
   * @returns Structured topic segmentation output
   */
  async topicSegmentation(
    variables: TopicSegmentationPromptVariables,
    ctx: ProcessingContext,
  ): Promise<TopicSegmentationOutput> {
    const { vtt } = variables;
    const cleanedVtt = vtt.clean();

    return await ctx.logger.trace("🧠 AI topic segmentation", async (span) => {
      span.setAttribute("vtt.length", cleanedVtt.cues.length);
      span.setAttribute("model.name", "openai/o3-mini");

      ctx.logger.info("Starting AI topic segmentation", {
        vttLength: cleanedVtt.cues.length,
        modelName: "openai/o3-mini",
      });

      const systemMessage = getTopicSegmentationSystemMessage();
      const examples = getTopicSegmentationExamples();
      const prompt = getTopicSegmentationPrompt({ vtt: cleanedVtt });

      const generation = await generateObject({
        model: openai("o3-mini", { reasoningEffort: "high" }),
        messages: [
          { role: "system", content: systemMessage },
          {
            role: "user",
            content: [
              { type: "text", text: examples },
              { type: "text", text: prompt },
            ],
          },
        ],
        schema: TopicSegmentationOutput,
        experimental_telemetry: {
          isEnabled: true,
          functionId: "topic-segmentation",
        },
      });

      const { topics } = generation.object;
      const firstTopic = topics[0]?.title ?? "";
      const lastTopic = topics[topics.length - 1]?.title ?? "";

      span.setAttribute("topics.count", topics.length);
      span.setAttribute("topics.first", firstTopic);
      span.setAttribute("topics.last", lastTopic);

      ctx.logger.info("AI topic segmentation completed", {
        topicsGenerated: topics.length,
        firstTopic,
        lastTopic,
      });

      return generation.object;
    });
  }

  /**
   * Run topic segmentation for a specific meeting video
   * @param input Object containing the meeting bot data with transcript
   * @param ctx Processing context for logging and tracing
   */
  async runTopicSegmentation(
    input: MeetingBotWithProfileAndEventAndCalendarAndTranscript,
    ctx: ProcessingContext,
  ): Promise<void> {
    const vtt = Vtt.fromRecallTranscript(input.transcript).clean();
    const durationInMs = _.sumBy(vtt.cues, (cue) => cue.durationInMilliseconds);
    const durationInSeconds = Math.floor(durationInMs / 1000);

    return await ctx.logger.trace(
      "🔍 Topic segmentation process",
      async (span) => {
        span.setAttribute("video_api_id", input.api_video_id ?? "");
        span.setAttribute("step", "topic-segmentation");

        ctx.logger.info("Starting topic segmentation process", {
          video_api_id: input.api_video_id,
          step: "topic-segmentation",
        });

        try {
          ctx.logger.info("Fetching or creating meeting data", {
            video_api_id: input.api_video_id,
          });

          let { data: meeting, error: meetingError } = await this.supabase
            .from("meetings")
            .select("*")
            .eq("video_api_id", input.api_video_id ?? "")
            .maybeSingle();

          if (meetingError) {
            span.setAttribute("error", true);
            span.setAttribute("error.message", meetingError.message);
            span.setStatus({
              code: 2,
              message: meetingError.message,
            });

            ctx.logger.error("Error fetching meeting data", {
              video_api_id: input.api_video_id,
              error: meetingError,
            });

            throw meetingError;
          }

          if (!meeting) {
            const { data: newMeeting, error: newMeetingError } =
              await this.supabase
                .from("meetings")
                .insert({
                  video_api_id: input.api_video_id ?? "",
                  profile_id: input.profile_id,
                  clean_vtt_file: vtt.toString(),
                  date:
                    input.event?.start_time &&
                    new Date(input.event.start_time).toISOString(),
                  created_at:
                    input.event?.start_time &&
                    new Date(input.event.start_time).toISOString(),
                  duration_in_ms: durationInMs,
                  duration_in_seconds: durationInSeconds,
                  name: await getApiVideoTitle(input),
                  provider: input.provider,
                  speaker: input.profile?.nickname,
                })
                .select("*")
                .single();

            if (newMeetingError) {
              span.setAttribute("error", true);
              span.setAttribute("error.message", newMeetingError.message);
              span.setStatus({
                code: 2,
                message: newMeetingError.message,
              });

              ctx.logger.error("Error fetching meeting data", {
                video_api_id: input.api_video_id,
                error: newMeetingError,
              });

              throw newMeetingError;
            }

            meeting = newMeeting;
          }

          span.setAttribute("profile_id", meeting.profile_id ?? "");

          ctx.logger.info("Fetching existing topics", {
            video_api_id: meeting.video_api_id,
            profile_id: meeting.profile_id,
          });

          const { data: existingTopics, error: fetchTopicsError } =
            await this.supabase
              .from("meeting_topics_v2")
              .select("id")
              .eq("api_video_id", meeting.video_api_id)
              .eq("latest", true);

          if (fetchTopicsError) {
            span.setStatus({
              code: 2,
              message: fetchTopicsError.message,
            });

            ctx.logger.error("Error fetching existing topics", {
              video_api_id: meeting.video_api_id,
              error: fetchTopicsError,
            });

            throw fetchTopicsError;
          }

          span.setAttribute("existing_topics.count", existingTopics.length);

          ctx.logger.info("Found existing topics", {
            video_api_id: meeting.video_api_id,
            count: existingTopics.length,
          });

          if (existingTopics.length > 0) {
            const topicIds = existingTopics.map((topic) => topic.id);

            ctx.logger.info("Updating existing topics to latest=false", {
              video_api_id: meeting.video_api_id,
              topicsCount: existingTopics.length,
            });

            const { error: updateTopicsError } = await this.supabase
              .from("meeting_topics_v2")
              .update({ latest: false })
              .in("id", topicIds);

            if (updateTopicsError) {
              span.setStatus({
                code: 2,
                message: updateTopicsError.message,
              });

              ctx.logger.error("Error updating existing topics", {
                video_api_id: meeting.video_api_id,
                error: updateTopicsError,
              });

              throw updateTopicsError;
            }

            ctx.logger.info("Updating existing topic events to latest=false", {
              video_api_id: meeting.video_api_id,
              topicsCount: existingTopics.length,
            });

            const { error: updateEventsError } = await this.supabase
              .from("meeting_topic_events_v2")
              .update({ latest: false })
              .in("meeting_topic_id", topicIds);

            if (updateEventsError) {
              span.setStatus({
                code: 2,
                message: updateEventsError.message,
              });

              ctx.logger.error("Error updating existing topic events", {
                video_api_id: meeting.video_api_id,
                error: updateEventsError,
              });

              throw updateEventsError;
            }
          }

          if (!meeting.clean_vtt_file) {
            const errorMessage = "Meeting has no clean VTT file";
            span.setStatus({
              code: 2,
              message: errorMessage,
            });

            ctx.logger.error(errorMessage, {
              video_api_id: meeting.video_api_id,
            });

            throw new Error(errorMessage);
          }

          span.setAttribute("vtt.length", meeting.clean_vtt_file.length);

          ctx.logger.info("Calling AI topic segmentation", {
            video_api_id: meeting.video_api_id,
            vttLength: meeting.clean_vtt_file.length,
          });

          const topicSegmentationResult = await this.topicSegmentation(
            { vtt },
            ctx,
          );

          const { topics } = topicSegmentationResult;
          const firstTopic = topics[0]?.title ?? "";
          const lastTopic = topics[topics.length - 1]?.title ?? "";

          span.setAttribute("topics.count", topics.length);
          span.setAttribute("topics.first", firstTopic);
          span.setAttribute("topics.last", lastTopic);

          ctx.logger.info("Saving topic segmentation results to database", {
            video_api_id: meeting.video_api_id,
            topicsCount: topics.length,
            firstTopic,
            lastTopic,
          });

          await Promise.all(
            topics.map(async (topic, index) => {
              return await ctx.logger.trace(
                `💾 Saving topic ${index + 1}/${topics.length}`,
                async (topicSpan) => {
                  topicSpan.setAttribute("topic.index", index);
                  topicSpan.setAttribute("topic.title", topic.title);
                  topicSpan.setAttribute(
                    "topic.start_segment_id",
                    topic.start_segment_id,
                  );
                  topicSpan.setAttribute(
                    "topic.end_segment_id",
                    topic.end_segment_id,
                  );
                  topicSpan.setAttribute(
                    "topic.timeline_events",
                    topic.timeline.length,
                  );

                  ctx.logger.info("Saving topic to database", {
                    title: topic.title,
                    start_segment_id: topic.start_segment_id,
                    end_segment_id: topic.end_segment_id,
                    timelineEvents: topic.timeline.length,
                  });

                  const { data: topicData, error: topicInsertionError } =
                    await this.supabase
                      .from("meeting_topics_v2")
                      .insert({
                        api_video_id: meeting.video_api_id,
                        index,
                        title: topic.title,
                        summary: topic.detailed_summary,
                        start_segment_id: topic.start_segment_id,
                        end_segment_id: topic.end_segment_id,
                        profile_id: meeting.profile_id ?? "",
                        latest: true,
                      })
                      .select("id")
                      .single();

                  if (topicInsertionError) {
                    topicSpan.setStatus({
                      code: 2,
                      message: topicInsertionError.message,
                    });

                    ctx.logger.error("Error saving meeting topic", {
                      video_api_id: meeting.video_api_id,
                      title: topic.title,
                      error: topicInsertionError,
                    });

                    throw topicInsertionError;
                  }

                  topicSpan.setAttribute("topic.id", topicData.id);

                  ctx.logger.info("Saving topic timeline events", {
                    topic_id: topicData.id,
                    eventsCount: topic.timeline.length,
                  });

                  await Promise.all(
                    topic.timeline.map(async (event, eventIndex) => {
                      const { error: eventInsertionError } = await this.supabase
                        .from("meeting_topic_events_v2")
                        .insert({
                          meeting_topic_id: topicData.id,
                          timestamp: event.timestamp,
                          event: event.event,
                          api_video_id: meeting.video_api_id,
                          profile_id: meeting.profile_id ?? "",
                          latest: true,
                        });

                      if (eventInsertionError) {
                        topicSpan.setStatus({
                          code: 2,
                          message: eventInsertionError.message,
                        });

                        topicSpan.setAttribute("event.index", eventIndex);

                        ctx.logger.error("Error saving meeting topic event", {
                          video_api_id: meeting.video_api_id,
                          topic_id: topicData.id,
                          timestamp: event.timestamp,
                          error: eventInsertionError,
                        });

                        throw eventInsertionError;
                      }
                    }),
                  );

                  return topicData.id;
                },
              );
            }),
          );

          ctx.logger.info("Topic segmentation process completed successfully", {
            video_api_id: meeting.video_api_id,
            topicsProcessed: topics.length,
          });
        } catch (error) {
          span.setStatus({
            code: 2,
            message: error instanceof Error ? error.message : String(error),
          });

          ctx.logger.error("Error in topic segmentation process", {
            video_api_id: input.api_video_id,
            error,
          });

          throw error;
        }
      },
    );
  }
}

/**
 * Extracts a meaningful title for the API video from the meeting bot data
 * @param bot Meeting bot with profile, event and calendar data
 * @returns The best available title or a fallback
 */
async function getApiVideoTitle(
  bot: MeetingBotWithProfileAndEventAndCalendar,
): Promise<string> {
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
