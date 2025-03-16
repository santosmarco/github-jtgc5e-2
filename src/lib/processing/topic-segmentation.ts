import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { dedent as s } from "ts-dedent";
import { z } from "zod";

import { createClient } from "../supabase/client";
import type { ProcessingContext } from "./steps";
import { cleanVtt } from "./vtt-utils";

export const TopicSegmentationPromptVariables = z.object({
  vtt: z.string(),
});
export type TopicSegmentationPromptVariables = z.infer<
  typeof TopicSegmentationPromptVariables
>;

export const TopicSegment = z
  .object({
    title: z.string().describe("The title of the topic segment."),
    start_segment_id: z
      .number()
      .describe("The starting VTT segment ID of the topic segment."),
    end_segment_id: z
      .number()
      .describe("The ending VTT segment ID of the topic segment."),
    detailed_summary: z
      .string()
      .describe("A detailed summary of the topic segment."),
    timeline: z
      .array(
        z
          .object({
            timestamp: z.string().describe("The timestamp of the event."),
            event: z
              .string()
              .describe("Detailed description of the event that occurred."),
          })
          .describe("An event in the timeline."),
      )
      .describe("List of timeline events within the topic segment."),
  })
  .describe("A topic segment of the analyzed content.");
export type TopicSegment = z.infer<typeof TopicSegment>;

export const TopicSegmentationOutput = z.object({
  topics: z
    .array(TopicSegment)
    .describe("List of topics analyzed with details."),
});
export type TopicSegmentationOutput = z.infer<typeof TopicSegmentationOutput>;

export async function topicSegmentation(
  variables: TopicSegmentationPromptVariables,
  ctx: ProcessingContext,
): Promise<TopicSegmentationOutput> {
  const { vtt } = variables;

  const cleanedVtt = cleanVtt(vtt);

  return await ctx.logger.trace("🧠 AI topic segmentation", async (span) => {
    span.setAttribute("vtt.length", cleanedVtt.length);
    span.setAttribute("model.name", "openai/o3-mini");

    ctx.logger.info("Starting AI topic segmentation", {
      vttLength: cleanedVtt.length,
      modelName: "openai/o3-mini",
    });

    const systemMessage = getTopicSegmentationSystemMessage();
    const examples = getTopicSegmentationExamples();
    const prompt = getTopicSegmentationPrompt({ vtt: cleanedVtt });

    const generation = await generateObject({
      model: openai("o3-mini"),
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

export async function runTopicSegmentation(
  { video_api_id }: { video_api_id: string },
  ctx: ProcessingContext,
): Promise<void> {
  const supabase = createClient();

  return await ctx.logger.trace(
    "🔍 Topic segmentation process",
    async (span) => {
      span.setAttribute("video_api_id", video_api_id);
      span.setAttribute("step", "topic-segmentation");

      ctx.logger.info("Starting topic segmentation process", {
        video_api_id,
        step: "topic-segmentation",
      });

      try {
        ctx.logger.info("Fetching meeting data", { video_api_id });
        const { data: meeting, error: meetingError } = await supabase
          .from("meetings")
          .select("*")
          .eq("video_api_id", video_api_id)
          .single();

        if (meetingError) {
          span.setAttribute("error", true);
          span.setAttribute("error.message", meetingError.message);
          span.setStatus({
            code: 2,
            message: meetingError.message,
          });

          ctx.logger.error("Error fetching meeting data", {
            video_api_id,
            error: meetingError,
          });
          throw meetingError;
        }

        span.setAttribute("profile_id", meeting.profile_id ?? "");

        ctx.logger.info("Fetching existing topics", {
          video_api_id,
          profile_id: meeting.profile_id,
        });

        const { data: existingTopics, error: fetchTopicsError } = await supabase
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
            video_api_id,
            error: fetchTopicsError,
          });
          throw fetchTopicsError;
        }

        span.setAttribute("existing_topics.count", existingTopics.length);

        ctx.logger.info("Found existing topics", {
          video_api_id,
          count: existingTopics.length,
        });

        if (existingTopics.length > 0) {
          const topicIds = existingTopics.map((topic) => topic.id);

          ctx.logger.info("Updating existing topics to latest=false", {
            video_api_id,
            topicsCount: existingTopics.length,
          });

          const { error: updateTopicsError } = await supabase
            .from("meeting_topics_v2")
            .update({ latest: false })
            .in("id", topicIds);

          if (updateTopicsError) {
            span.setStatus({
              code: 2,
              message: updateTopicsError.message,
            });

            ctx.logger.error("Error updating existing topics", {
              video_api_id,
              error: updateTopicsError,
            });
            throw updateTopicsError;
          }

          ctx.logger.info("Updating existing topic events to latest=false", {
            video_api_id,
            topicsCount: existingTopics.length,
          });

          const { error: updateEventsError } = await supabase
            .from("meeting_topic_events_v2")
            .update({ latest: false })
            .in("meeting_topic_id", topicIds);

          if (updateEventsError) {
            span.setStatus({
              code: 2,
              message: updateEventsError.message,
            });

            ctx.logger.error("Error updating existing topic events", {
              video_api_id,
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

          ctx.logger.error(errorMessage, { video_api_id });
          throw new Error(errorMessage);
        }

        span.setAttribute("vtt.length", meeting.clean_vtt_file.length);

        ctx.logger.info("Calling AI topic segmentation", {
          video_api_id,
          vttLength: meeting.clean_vtt_file.length,
        });

        const topicSegmentationResult = await topicSegmentation(
          {
            vtt: meeting.clean_vtt_file,
          },
          ctx,
        );

        const { topics } = topicSegmentationResult;
        const firstTopic = topics[0]?.title ?? "";
        const lastTopic = topics[topics.length - 1]?.title ?? "";

        span.setAttribute("topics.count", topics.length);
        span.setAttribute("topics.first", firstTopic);
        span.setAttribute("topics.last", lastTopic);

        ctx.logger.info("Saving topic segmentation results to database", {
          video_api_id,
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
                  await supabase
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
                    video_api_id,
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
                    const { error: eventInsertionError } = await supabase
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
                        video_api_id,
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
          video_api_id,
          topicsProcessed: topics.length,
        });
      } catch (error) {
        span.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : String(error),
        });

        ctx.logger.error("Error in topic segmentation process", {
          video_api_id,
          error,
        });
        throw error;
      }
    },
  );
}

export function getTopicSegmentationSystemMessage() {
  return s`
    You are a specialized AI system that analyzes meeting transcripts to identify distinct topics, extract key moments, and create structured summaries with precise timestamps - delivering results in clean JSON format optimized for meeting navigation and content discovery.
  `;
}

export function getTopicSegmentationPrompt({
  vtt,
}: TopicSegmentationPromptVariables) {
  return s`
    You are an expert AI system specializing in precise video content analysis. Your task is to analyze a VTT (Video Text Tracks) file and segment it into distinct topics with exceptional accuracy and detail.

    Here is the VTT content to analyze:
    <vtt_content>
    ${vtt}
    </vtt_content>

    ## ANALYSIS INSTRUCTIONS

    First, perform a comprehensive multi-pass analysis:

    1. INITIAL SCAN: Read the entire transcript to understand the complete narrative arc, key participants, and overall content structure.

    2. SEMANTIC BOUNDARY DETECTION: Identify natural topic boundaries by recognizing:
      - Explicit transitions ("moving on to", "let's discuss", "changing topics")
      - Implicit transitions (significant pauses, speaker changes, tonal shifts)
      - Conceptual shifts (new terminology, different subject matter)
      - Contextual cues (questions that redirect conversation, introductions of new ideas)

    3. TOPIC CLUSTERING: Group related segments using semantic similarity, temporal proximity, and speaker continuity.

    4. HIERARCHICAL ORGANIZATION: Identify main topics and subtopics, ensuring logical nesting and relationship mapping.

    5. BOUNDARY REFINEMENT: Fine-tune segment boundaries to ensure clean transitions and complete thought capture.

    Before providing your final output, wrap your analysis inside <vtt_analysis> tags in your thinking block. In this analysis, include:

    - A list of all timestamps and corresponding text extracted from the VTT file.
    - A list of potential topic boundaries based on content shifts, speaker changes, or time gaps.
    - Initial draft of topic segments.
    - For each identified topic:
      a. Your reasoning for choosing this as a topic boundary.
      b. How you determined the start and end VTT segment IDs.
      c. Your process for creating the detailed summary.
      d. How you identified key events and their timestamps for the timeline.
    - Any refinements you made to your initial topic segmentation.
    - A final check to confirm that your topics cover the entire VTT file without overlaps or gaps.

    This will ensure a thorough interpretation of the data. It's OK for this section to be quite long.

    ## OUTPUT FORMAT

    Provide your analysis as a JSON object with the following structure:

    \`\`\`json
    {
      "topics": [
        {
          "index": 0, // Start at 0
          "title": "Concise, descriptive topic title",
          "start_segment_id": 1,
          "end_segment_id": 10,
          "detailed_summary": "Comprehensive summary capturing all key points, context, and significance of this topic",
          "timeline": [
            {
              "timestamp": "00:00:15",
              "event": "Detailed description including WHO (specific speaker), WHAT (precise content/action), HOW (manner/tone), and WHY (purpose/context)"
            }
          ]
        }
      ]
    }
    \`\`\`

    ## QUALITY STANDARDS

    Your topic segmentation must meet these exacting standards:

    1. PRECISION: Topic boundaries must align perfectly with natural conversation shifts
    2. COMPREHENSIVENESS: Every segment of the VTT must be included
    3. COHERENCE: Each topic must represent a unified, logically connected discussion
    4. DETAIL: Summaries must capture all substantive content, not just high-level themes
    5. CONTEXT: Timeline events must include speaker identity, specific content, and relevant context
    6. INSIGHT: Identify subtle topic shifts that might be missed by casual listening
    7. CLARITY: Titles must be descriptive yet concise, immediately conveying topic essence

    Your analysis should demonstrate expert-level understanding of conversation dynamics, subject matter recognition, and narrative structure. Produce output that would satisfy the most demanding content analyst.
  `;
}

export function getTopicSegmentationExamples() {
  return s`
    <examples>
      <example>
        <vtt_content>
        WEBVTT
        X-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:900000

        1
        00:00:02.623 --> 00:00:02.751
        <v Johnny Sengelmann> All

        2
        00:00:02.751 --> 00:00:12.154
        <v Megan Solly> right. I don't know actually like when you decide to. to leave? Like I don't know how that works. Really

        3
        00:00:12.234 --> 00:00:20.608
        <v Johnny Sengelmann> good question. logistics around when you yeah When you bounce out, but are you fit, you know, like what's your anticipated due date?

        4
        00:00:22.238 --> 00:00:24.874
        <v Megan Solly> April 14th, so I have like two months exactly.

        5
        00:00:25.654 --> 00:00:26.741
        <v Johnny Sengelmann> April 14th. Okay.

        6
        00:00:26.963 --> 00:00:34.096
        <v Megan Solly> Yeah. Yeah, yeah. Crazy. I know. It's coming up. Very

        7
        00:00:34.257 --> 00:00:39.678
        <v Johnny Sengelmann> soon. I'm like two I think I'm two months behind you pretty much

        8
        00:00:41.003 --> 00:00:42.720
        <v Megan Solly> Yeah, that's what you said. That's it.

        9
        00:00:43.601 --> 00:00:45.318
        <v Jimmy Shang> I'm not sure I realize you're not a kid.

        10
        00:00:45.975 --> 00:00:47.368
        <v Johnny Sengelmann> Yeah, soon.

        11
        00:00:48.708 --> 00:00:49.673
        <v Jimmy Shang> Congratulations.

        12
        00:00:50.216 --> 00:00:52.969
        <v Johnny Sengelmann> Thank you. Yeah, just what I need and more chaos, right?

        13
        00:00:54.445 --> 00:00:54.707
        <v Jimmy Shang> Hold on

        14
        00:00:54.707 --> 00:00:59.876
        <v Johnny Sengelmann> a second. 20 kids I feel like at my company that I work with every day.

        15
        00:01:01.791 --> 00:01:04.064
        <v Megan Solly> If you don't have this is your first one right Johnny.

        16
        00:01:04.587 --> 00:01:11.073
        <v Johnny Sengelmann> Yeah, I got Yeah, it was my first one, exactly. We'll see. I don't know

        17
        00:01:11.093 --> 00:01:12.480
        <v Megan Solly> why my camera's not working.

        18
        00:01:13.350 --> 00:01:15.907
        <v Johnny Sengelmann> I don't I feel like kind of get some standoff camera

        19
        00:01:16.640 --> 00:01:20.120
        <v Megan Solly> Okay. That's weird. Cool,

        20
        00:01:20.683 --> 00:01:21.165
        <v Abdallah Gaballah> cool.

        21
        00:01:21.912 --> 00:01:24.021
        <v Megan Solly> Abdel is the only one showing. That's

        22
        00:01:24.322 --> 00:01:25.989
        <v Abdallah Gaballah> ironic.

        23
        00:01:27.026 --> 00:01:31.804
        <v Jimmy Shang> I'll turn off my camera. I'll turn off my camera just a second. Well, I won't leave it all out.

        24
        00:01:32.939 --> 00:01:34.884
        <v Megan Solly> I'm trying but mine's not working, it's weird.

        25
        00:01:35.834 --> 00:01:43.134
        <v Abdallah Gaballah> It's fine. Cool. Are we waiting on anyone else from your? team guys from the Numa team. I

        26
        00:01:43.134 --> 00:01:43.556
        <v Johnny Sengelmann> think we're good.

        27
        00:01:44.259 --> 00:01:46.149
        <v Megan Solly> Don't think so. Cool

        28
        00:01:46.229 --> 00:02:43.956
        <v Abdallah Gaballah> cool, let me take things off them. Thank Okay, look. Can you guys see my screen? Cool. for basically in the past week. I'll just go quickly through what we finished. what we're working on. if what we need from you all. So what we finished, basically we tried to. close every single outstanding item from Project Roots. And the only thing left, that's basically us like QAing literally every single task. that was in QA making sure that we close every single one. And the only one left is that MRR and ARR combination, which is dependent on you guys sending us the add-ons. that coupons can apply to. That's

        29
        00:02:43.956 --> 00:02:48.146
        <v Jimmy Shang> it. And we can pause the MRR part too as we talked about last year. So that's okay.

        30
        00:02:48.849 --> 00:02:54.888
        <v Abdallah Gaballah> Yeah, yeah, yeah, yeah. So it's, I know it's not a hybridity. It's not like. Well, that's the only thing left from that conversation.

        31
        00:02:56.052 --> 00:02:56.896
        <v Jimmy Shang> So

        32
        00:02:58.120 --> 00:03:11.187
        <v Johnny Sengelmann> on On that note, PC2, Jimmy, I just have like a... On our side, I just have like a note that says like Talk to Jimmy about PCT. What is what do we need to start kicking off that and so we can start making moves there?

        33
        00:03:12.277 --> 00:03:35.426
        <v Jimmy Shang> Yeah, so basically what's happening on that front is we've already spun up a test site for our current teams internally to deal with. Most of the work is on Numa's end. So we have a whole group of customers that you don't touch, which is our SMB audience. that actually uses. the charge the native integration to provision or unprovisioned accounts. Like if people stop

        34
        00:03:35.487 --> 00:03:35.828
        <v Johnny Sengelmann> paying, you

        35
        00:03:35.888 --> 00:03:37.338
        <v Jimmy Shang> turn off their access. And

        36
        00:03:37.338 --> 00:03:37.439
        <v Johnny Sengelmann> so

        37
        00:03:37.520 --> 00:04:59.372
        <v Jimmy Shang> engineering can have to do work to ensure that. The rest of it though. It's basically a their new mother is charge bees internal nomenclature, like not even their schema changing. And ostensibly, it doesn't change anything on sort of like the... the like actual mechanics like the the back end what they've done is they've inserted this thing called so it's really confusing Right now today, every plan in ChargeB has what's called a plan ID. Beep. That is going to become what is in PC2 going to be referred to as like a subscription price ID. It's the same thing. They're just calling it something different. because they've made space for another thing called a plan ID. This is classic charge, making things more conceiving than they need to be. So we will be inserting a new plan ID. that is tied to the existing subscription price ID. Now, based on that schema shift, a couple of things can happen. So for example, today something is priced in US dollars and in in Canadian dollars? You need to create two plans with two different plan IDs. In the future, the subscription price ID will be the Canadian and the US versions of it, but both of this will nest under the plan ID, a unified plan ID.

        38
        00:04:59.813 --> 00:05:00.335
        <v Johnny Sengelmann> Okay, so

        39
        00:05:00.837 --> 00:05:21.768
        <v Jimmy Shang> when Megan and I go do billing It changes the UI, the UX, because we could just sort of go to the right plan and within that plan, select US dollars or Canadian dollars or, you know, we can. and create packages for like one month and three months and six months payment terms like that could all fit under one plan under different sort of like. packages or price IDs underneath that.

        40
        00:05:21.832 --> 00:05:23.574
        <v Johnny Sengelmann> Yeah. However,

        41
        00:05:24.236 --> 00:05:49.401
        <v Jimmy Shang> what that does shift though, potentially... is how your zaps work. And that's the part that I don't know. that I'll give you guys, I think you guys actually already have access. to the test site, which is when things write via the work that you do for project roots, write from. charge me into HubSpot. What does the zap? pick up. That's what I don't know. Do you need to change the schema to say?

        42
        00:05:49.923 --> 00:05:50.185
        <v Johnny Sengelmann> Well, a

        43
        00:05:50.205 --> 00:05:55.735
        <v Jimmy Shang> whole price subscription idea as opposed to plan ID like That's what I don't know and I think I need you guys to investigate.

        44
        00:05:55.985 --> 00:06:05.346
        <v Johnny Sengelmann> So to be clear, can I? intake a task that says start to investigate the test site for PC2 to identify

        45
        00:06:05.366 --> 00:06:05.486
        <v Jimmy Shang> the

        46
        00:06:05.526 --> 00:06:06.968
        <v Johnny Sengelmann> iterations needed. I can

        47
        00:06:07.269 --> 00:06:07.611
        <v Jimmy Shang> do that?

        48
        00:06:07.972 --> 00:06:13.002
        <v Johnny Sengelmann> Okay, got it. Abdallah, save any questions.

        49
        00:06:14.563 --> 00:06:37.097
        <v Abdallah Gaballah> Yeah, I don't know about that. I didn't understand this. When you guys were Jimmy and the church B team. we're talking, but that might raise a concern. around this app's breaking because the fields that we're utilizing to. the unique identifiers are basically changing. those are the ID fields.

        50
        00:06:37.444 --> 00:06:44.424
        <v Jimmy Shang> Oh So that's what I was saying is worth is the investigation is I don't know. They are and they aren't, right?

        51
        00:06:44.685 --> 00:06:44.906
        <v Abdallah Gaballah> In

        52
        00:06:44.906 --> 00:06:57.370
        <v Jimmy Shang> the back end of charge, in the back end of charge B, they're technically not changing. However, you label it something different and Is this, you know, organized the schema to that difference? That's what I don't know.

        53
        00:06:58.651 --> 00:07:05.865
        <v Abdallah Gaballah> I'm sure it will break. If if. Zapier is very annoying about these things and it will break.

        54
        00:07:06.806 --> 00:07:07.307
        <v Jimmy Shang> And then the

        55
        00:07:07.427 --> 00:07:07.627
        <v Abdallah Gaballah> other

        56
        00:07:07.707 --> 00:07:44.833
        <v Jimmy Shang> part of it is that there's a number of native functionalities now. So, for example, today Joel has written a bunch of zaps that If something is billed, we move it from Pilot Live to Closed One and the automotive sales pipeline using a zap. Those are the kinds of things because they don't touch custom objects. can simply just be done. from Charge me to HubSpot directly. And those would be like, I would like us to get off of those zaps. onto the native capabilities and remove unnecessary zaps. Again, these are breaking things. These aren't right, but like. These are the kinds of things that want to make sure that we take advantage of in PC2. Thank you.

        57
        00:07:47.856 --> 00:08:06.738
        <v Johnny Sengelmann> Okay, so Dala I'm basically just to intaking right now that we're going to do an analysis on the PC to 2.0 instance and identify like what we think might need to be updated so that we can go to an initial analysis. This is for our project Roots apps as well as for Joel's apps. Sound good?

        58
        00:08:07.040 --> 00:08:08.047
        <v Abdallah Gaballah> Correct.

        59
        00:08:08.651 --> 00:08:10.096
        <v Jimmy Shang> Thank you. Yeah.

        60
        00:08:11.125 --> 00:08:14.612
        <v Johnny Sengelmann> Cool. That's a big unlock for us. It

        61
        00:08:14.692 --> 00:08:52.379
        <v Jimmy Shang> is and for timing why is just so you know the product so like I said the test night is spun up now The product team is tentatively targeting a March 14th launch date for that. The other thing that they're doing that is going to add some complexity that we'll have to talk about later is we are going to introduce a usage-based pricing model on a a new sort of. Product feature. And so. So how that pulsed, it was maybe going to be potentially a little bit of a nightmare, but there's not a current. live use cases going to be a future. Moose kicks. Ciao.

        62
        00:08:55.154 --> 00:08:59.422
        <v Johnny Sengelmann> Cool. All right, Abdullah, keep going, sorry.

        63
        00:09:00.755 --> 00:09:22.750
        <v Abdallah Gaballah> Another thing that we were working on is to add a former customer lifecycle stitch. and create a workflow to maintain it. Another thing that we're working on or. We done, sorry. Is the sync between. Company ownership and customer deal ownership. If you remember, we flagged that last week.

        64
        00:09:23.661 --> 00:09:26.693
        <v Jimmy Shang> Company ownership and customer deal ownership. Yep

        65
        00:09:27.495 --> 00:09:52.206
        <v Abdallah Gaballah> Yep, that's done. And the last thing is the second version of lists. If you recall, there were two messages. where we requested lists. This was the one with. DMS with no add on. for it or move without inboxes. I know that we were going back and forth on multiple threads, so I'll have Save collect all lists into one message and send it to you guys.

        66
        00:09:53.210 --> 00:10:19.899
        <v Jimmy Shang> But I do actually, I don't, I mean, appreciate that. Feel free to do that. But I actually think that we have what we need on that. We're actually pretty good. Like I'm clear on what all those things are. And I think I told Johnny on the sidebar, but that there's, or maybe even the public reach channel, the light. That sparked a lot of good internal conversation as to. that we're broken that. You know, we have now sort of. that you guys helped uncover.

        67
        00:10:22.739 --> 00:10:43.843
        <v Abdallah Gaballah> Okay, it sounds. on the payment method. there was a request. Now we're done with everything that we finished for last week. of the are currently in QA. and we're targeting to finish within the next couple of days. today or tomorrow. We have the.

        68
        00:10:44.962 --> 00:10:48.968
        <v Jimmy Shang> Sorry, just to make sure this is the payment method entered or the payment first payment made.

        69
        00:10:50.031 --> 00:10:53.744
        <v Abdallah Gaballah> the credit card has been added or the debit card has been

        70
        00:10:53.825 --> 00:10:58.370
        <v Jimmy Shang> added. How is that? What alert is that?

        71
        00:10:59.692 --> 00:11:12.537
        <v Abdallah Gaballah> That was not an alert. As per your request, it was a field at Chugbox. that gets unchecked when the contact with the. person removes the payment method.

        72
        00:11:14.707 --> 00:11:14.867
        <v Jimmy Shang> Okay,

        73
        00:11:15.207 --> 00:11:15.748
        <v Abdallah Gaballah> that's

        74
        00:11:15.788 --> 00:11:16.830
        <v Jimmy Shang> correct. Perfect.

        75
        00:11:16.970 --> 00:11:30.985
        <v Abdallah Gaballah> Yeah, so we initially created. A checkbox with an alert, Joel said remove the alert. We removed it, which is the second test in here. and an edit from our last call was to uncheck when someone removes the payment.

        76
        00:11:31.546 --> 00:11:36.859
        <v Jimmy Shang> That's it. Okay, fantastic. And then what about the payments made portion of it?

        77
        00:11:37.784 --> 00:11:52.290
        <v Abdallah Gaballah> The payment made and payment date are two fields that. has been synced between George B and the subscription, the coupon, and the automotive sales deal.

        78
        00:11:53.016 --> 00:11:53.358
        <v Jimmy Shang> Okay, he

        79
        00:11:53.438 --> 00:11:59.707
        <v Abdallah Gaballah> shouldn't be showing up on all. And I believe SAVE has enriched the legacy on all. Right Tiff?

        80
        00:11:59.707 --> 00:12:04.012
        <v Jimmy Shang> Okay. Uh, I'll

        81
        00:12:04.072 --> 00:12:04.999
        <v Seif Muhammed> say good. So

        82
        00:12:06.866 --> 00:12:07.350
        <v Abdallah Gaballah> Go ahead, sir.

        83
        00:12:08.733 --> 00:12:33.956
        <v Jimmy Shang> I believe now a new request, well, we made a new request for. that actually triggering a real alert for the first time that gets. like when the first payment actually gets made. for the account owner to receive or the deal owner to receive a notification. Hubsan spot notification is fine.

        84
        00:12:36.826 --> 00:12:56.696
        <v Abdallah Gaballah> I don't have a request for that. The thing we agreed on is to make it visible to the deal owner and limited to managerial edits. but I can't show that the owner can see it but they cannot edit it. And we can. They can only see that not edited, but I can add.

        85
        00:12:57.664 --> 00:13:20.045
        <v Jimmy Shang> Okay, let's add that and can we make that what I know like Everything's fast, but can we make that sort of happen on the quick side of things? As you all know, now that we've made something like that available, then the sales team is now asking me and Megan. and hey, can I see and learn for this like every day? So. Oh, it's not this. I was hits. Urgent per se, but it is annoying that we're getting

        86
        00:13:20.125 --> 00:13:27.909
        <v Abdallah Gaballah> around. That would be to edit the payment made. that

        87
        00:13:28.090 --> 00:13:28.211
        <v Johnny Sengelmann> to

        88
        00:13:28.613 --> 00:13:41.093
        <v Abdallah Gaballah> include on that in app notification. And safe, we don't need to make it an editor. This app, we can just make it. and added to the copying workflow upon

        89
        00:13:41.133 --> 00:13:44.009
        <v Seif Muhammed> being. Can I make a half-pawed yet?

        90
        00:13:44.582 --> 00:13:45.604
        <v Abdallah Gaballah> Yeah,

        91
        00:13:45.624 --> 00:13:45.924
        <v Seif Muhammed> I actually

        92
        00:13:45.924 --> 00:13:49.769
        <v Jimmy Shang> don't even think it needs to be a zap. I think I sorry it doesn't need to be a slack I think it should just be

        93
        00:13:50.884 --> 00:15:27.246
        <v Abdallah Gaballah> Yeah, we're doing an in-app notification. Cool. The other thing that we. We have done, but we're still queueing, is analyzing your direct traffic data. So, two weeks ago, we discussed that there were two workflows kicking up. kicking off at the same time the RIV Dojo So last touch and that Last such attribution slash with dodo. and the last one, distribution. Dash that are traffic and people that were coming from riff dojo that are getting redirected to. Do meeting link and submitting or requesting a meeting in the. be in market as their traffic instead of for the dojo So we've analyzed all of the data, all of the contacts and companies and deals that are marketed as direct traffic. So Go. Oh to get two things. First thing is how... How common is that scenario happening and what other? attribution values are being overwritten and the second thing is to understand the level of the impact. and how to clear or clean. the underlying data. So we're still. QA'ing that sheet, but once it's QA'd... and we'll clean the underlying data and fix the workflows associated with that problem. Two other requests were. regarding lists there was a request. with Chris about contacts. or sorry, accounts with no activity in the past 30. 365. which

        94
        00:15:29.068 --> 00:15:29.309
        <v Johnny Sengelmann> he

        95
        00:15:29.349 --> 00:15:41.740
        <v Abdallah Gaballah> sent out to Chris yesterday. He requested a bunch of edits. we're processing the edits. The second request was to... to minimize or limit the count of marketing contacts or clean. the marketing contacts, which is...

        96
        00:15:42.262 --> 00:15:42.482
        <v Johnny Sengelmann> That's

        97
        00:15:42.522 --> 00:15:44.528
        <v Abdallah Gaballah> our great conference. Yeah, that's right.

        98
        00:15:44.874 --> 00:15:49.917
        <v Johnny Sengelmann> Those are tied together. The activity and the marketing contacts are the same thing.

        99
        00:15:52.555 --> 00:15:52.735
        <v Abdallah Gaballah> Okay.

        100
        00:15:53.357 --> 00:16:02.730
        <v Johnny Sengelmann> Chris is using activity as a proxy to identify what should and what shouldn't be marketing contacts. So it's the same thing, FYI?

        101
        00:16:03.611 --> 00:16:08.924
        <v Abdallah Gaballah> Technically one is on the contact and one of them is on the company. Well, yeah, I get you.

        102
        00:16:09.428 --> 00:16:09.548
        <v Johnny Sengelmann> OK.

        103
        00:16:12.348 --> 00:16:42.596
        <v Abdallah Gaballah> So. So that is being processed. Now, while I'm stuck on you guys on, now we are finished with stuff that work. QA work in progress what I'm stuck on you guys on is the list of. And it's a little priority thing if you want to push it. It's fine if you don't it's fine That's the list of add-ons that Couponsign can apply to. So, again, use it to test. the look of function that we're going to publish for. the V2 of project

        104
        00:16:43.883 --> 00:16:45.135
        <v Jimmy Shang> roots. So.

        105
        00:16:46.790 --> 00:16:47.919
        <v Megan Solly> Or charge me

        106
        00:16:49.150 --> 00:17:10.531
        <v Abdallah Gaballah> That's add-ons that coupons can apply to. If you recall, on the last call we were saying that some coupons can apply to subscriptions only. and others can apply to subscriptions and coupons. And add-ons and you said actually that's a limited count. There's like two or three add-ons that coupons can apply to.

        107
        00:17:12.503 --> 00:17:13.906
        <v Megan Solly> Okay, that's correct. Yes.

        108
        00:17:15.009 --> 00:17:18.317
        <v Abdallah Gaballah> So we need you just to send us the names of these add-ons.

        109
        00:17:18.927 --> 00:17:19.830
        <v Megan Solly> and

        110
        00:17:20.914 --> 00:17:31.140
        <v Abdallah Gaballah> I'll just need to account for them when I'm doing V2 off these apps. Just to make sure. It's not just for the NLR calculations.

        111
        00:17:35.354 --> 00:17:35.474
        <v Jimmy Shang> I

        112
        00:17:36.175 --> 00:17:36.475
        <v Abdallah Gaballah> think a

        113
        00:17:36.535 --> 00:18:39.376
        <v Jimmy Shang> new ask on the Numa end. Megan, I think you're here about this maybe for the first time. So there's that list of folks who are techie on users that were not billing. Derek has asked us to, well, I'm gonna work with Joel and Derek to figure out what to do with that. But for example, all the four stores that are long go to the long go stores the longer Toyota stores Derek has confirmed that they receive 100% off. in perpetuity. And so I'll work with you to sort of figure out which ones need to be billed, which ones need to be couponed. But I think this is two parts. One. It's a good opportunity for us to test to make sure that adding coupons and you know, to add-ons and all this kind of stuff after the fact. does trigger the right workflows. And then the other thing would be. The Megan there may be the creation of new kinds of coupons and if we do that we do need to let. Abdullah and safe know that we're creating new coupons with new blog. You know logic,

        114
        00:18:40.221 --> 00:18:46.198
        <v Megan Solly> okay Thank you

        115
        00:18:47.727 --> 00:19:17.793
        <v Abdallah Gaballah> Another thing that we are. Stuff on you guys on is a meeting with a lineup So the meeting with the ladder was pushed a couple of times and then on the day we agreed on it. the unsafe life. In Egypt, they changed the time. like for some reason. So our calendar is. shifted like an hour and we missed that meeting. I've been trying to follow up on Alana's sense but she's not responding. I don't know if she's mad. that we

        116
        00:19:17.833 --> 00:19:21.352
        <v Jimmy Shang> missed the meeting. Remind me.

        117
        00:19:22.555 --> 00:19:40.606
        <v Abdallah Gaballah> That was to understand the bodily integration. and we wanted to include you in the conversation. to ensure what's the. and to end process and how it should work. and how the integration should work and why there were discrepancies between HubSpot and Vitality to begin with.

        118
        00:19:41.127 --> 00:19:48.778
        <v Jimmy Shang> Why don't you put that on me? I'll drive that. Maybe funnel your questions to me and then I'll figure out either the answers or I will set up time with Alana first.

        119
        00:19:49.602 --> 00:19:52.816
        <v Abdallah Gaballah> Perfect. No worries. I'll send you the rest of the questions then.

        120
        00:19:53.078 --> 00:19:53.500
        <v Jimmy Shang> Thanks.

        121
        00:19:54.899 --> 00:20:36.709
        <v Abdallah Gaballah> The three things that we're currently working on. or the attribution. I'm slash Lee campaign. project and the enrichment of contacts using Breeze, contacts and companies using Breeze. And the. reports motion which is to help you understand. the end to end. marketing and sales funnel all combined into like a set of reports. You understand all of your data sources, how many contacts it's generating, how many deals that translates to. How much revenue does that translate to? Those are the three motions that we're working on currently.

        122
        00:20:39.569 --> 00:20:47.769
        <v Johnny Sengelmann> A couple questions for you, Jimmy. Jimmy, number one is, the forms cleanup. It's been flagged, but I didn't know where you wanted me to go there.

        123
        00:20:49.689 --> 00:21:08.632
        <v Jimmy Shang> I guess my question is, I mean, I don't. I'm not a fan of having a bunch of like dead archived forms just sort of the appear, right, in our, I don't want to delete them, but I don't think we need to be. the the Um sort of visible or easily visible. What is HubSpot's archive function or capabilities?

        124
        00:21:10.873 --> 00:21:12.969
        <v Johnny Sengelmann> of dollars for you on forums.

        125
        00:21:14.268 --> 00:21:18.198
        <v Abdallah Gaballah> Give me a sec. I believe we can archive forms.

        126
        00:21:20.117 --> 00:21:33.617
        <v Jimmy Shang> If we can, let's archive the ones that are not actively in use on all the demo stuff. If not, can we at least just change the name to star, star, star, We can either do it the smart way or the dumb way.

        127
        00:21:35.380 --> 00:21:35.501
        <v Abdallah Gaballah> But

        128
        00:21:35.521 --> 00:21:46.157
        <v Jimmy Shang> yeah, I want to make sure that we are clear because there should be At least for now, one demo form. one get in touch form or contact us form. One learn about AI agents form

        129
        00:21:46.278 --> 00:21:57.218
        <v Johnny Sengelmann> and then I'm assuming you guys police internally because We've Early on, we recommended that you guys use one form for every... exactly what you're saying and then.

        130
        00:21:59.122 --> 00:22:21.568
        <v Jimmy Shang> Yes, that is on me and us. I was actually where I was gonna go next is Chris then you and I can decide on whether or not there's like a, hey fill out the demo request form but this is used for email campaigns only not, you know, not Numa.com version of it and we should. come up with a nomenclature, tag it, label it, and then just sort of be able to report on that distinctly and separately. But let's we can cross those bridges when we get there.

        131
        00:22:22.255 --> 00:22:22.596
        <v Chris Van Wagoner> Sounds good.

        132
        00:22:26.602 --> 00:22:37.799
        <v Jimmy Shang> A couple of other things I think related to this Johnny you would ask about is it okay to run the update that the logic I haven't looked at the work the workflow yet, but updating people to live customer.

        133
        00:22:38.619 --> 00:22:38.900
        <v Johnny Sengelmann> But

        134
        00:22:39.081 --> 00:22:45.283
        <v Jimmy Shang> I think we can do it. barring there being a mistake in the the creation of it, but I'll take a

        135
        00:22:45.283 --> 00:22:47.606
        <v Johnny Sengelmann> look at that. Yeah, it should it should be good

        136
        00:22:48.821 --> 00:23:04.871
        <v Jimmy Shang> Yeah, Chris, my thought is. right now. I think HubSpot says we have something like 2,000 customers. This is the companies. That's not correct. but I would rather there be false positives than false negatives. So let's

        137
        00:23:04.932 --> 00:23:05.393
        <v Johnny Sengelmann> get in.

        138
        00:23:05.590 --> 00:23:32.261
        <v Jimmy Shang> All the ones that we know for sure are paying customers and mark them customers and mark all the connected contacts. customers and then we can figure out how to. unmark people who aren't paying customers. Like I have to get into an SB as a B list for like there's like like a whole world of hurt there but Uh. incorrectly marking someone unpaid as a customer is less of a pain than... not barking someone who is a paying customer for our suppression, this stuff like that.

        139
        00:23:32.574 --> 00:23:36.288
        <v Johnny Sengelmann> Jimmy, it also might make sense to add a suppression list of former customers.

        140
        00:23:37.558 --> 00:23:44.960
        <v Jimmy Shang> Right, I actually think Abhila and Saif did that. I think that was one of the intakes. Or at least I had a sidebar was safe about that. Okay.

        141
        00:23:45.895 --> 00:23:47.401
        <v Johnny Sengelmann> I will intake it if not now.

        142
        00:23:47.863 --> 00:23:56.672
        <v Abdallah Gaballah> We had a time for... for adding customers to creating a suppression list. I think we sent you the suppression list. I think

        143
        00:23:57.859 --> 00:24:31.365
        <v Jimmy Shang> it's current customers. paying customers, then it's. Anyone who is actively in pipeline right now in any way, shape or form. and then the third one would be former customers. And then Chris, I think between those three things. depending on whatever campaign you and broader marketing team are running. you can pick and choose, right? Like I'm assuming most of the time is select all. But I'm sure there are times where it's like. Anyone who's not buying NUMA should buy NUMA whether you were formerly paying or not. Right.

        144
        00:24:31.365 --> 00:24:32.908
        <v Seif Muhammed> So, yeah, I remember.

        145
        00:24:33.689 --> 00:24:33.809
        <v Johnny Sengelmann> We

        146
        00:24:33.829 --> 00:24:40.999
        <v Seif Muhammed> didn't perform a customer thing yet because the workflow is not live yet. However, yeah, we have that. I have that.

        147
        00:24:41.308 --> 00:24:43.433
        <v Jimmy Shang> Yeah, no problem. It's a request at this point. I get

        148
        00:24:43.433 --> 00:25:19.153
        <v Johnny Sengelmann> it. All right, so I added that in and then um The other the other one that was kind of floating out there that you had sent over was about. cross-referencing the data. a between What you guys what? What is their names? your SDR firm. Yeah, Rev Dojo claims us as meetings and what we have in our system. and we need to clarify like what you want us like Do you want us to go in and find every single meeting related to that and attribute that?

        149
        00:25:20.181 --> 00:25:21.983
        <v Jimmy Shang> Let me own that, I'll get back to you on that one. I

        150
        00:25:21.983 --> 00:25:22.405
        <v Johnny Sengelmann> think that when

        151
        00:25:22.626 --> 00:25:28.307
        <v Jimmy Shang> let's bump that down a few much as a priority spring now I think you also asked me a question about the lead score.

        152
        00:25:28.790 --> 00:25:35.078
        <v Johnny Sengelmann> Yeah, yeah, you're well attribution you still owe me you I sent you that video and you haven't-

        153
        00:25:35.260 --> 00:25:43.001
        <v Jimmy Shang> Oh! I'm sorry. I thought our conversation the other day covered it, but I do have thoughts. I'm happy to send. Maybe actually we should have a a quick

        154
        00:25:43.101 --> 00:26:06.432
        <v Johnny Sengelmann> sync on that. Perfect. I was just going to say because lead score falls into that in the sense that if people get lead score then they should be thrown under the lead score campaign and added into the leads object probably and I think that's why we were originally talking about lead score so So that can come after, but I'm just, these are little. Little things you've talked about and that I'm trying to move forward.

        155
        00:26:06.553 --> 00:26:22.551
        <v Jimmy Shang> I appreciate it. Can we add CVW as optional to that meeting? Chris, I think you'll be interested in that. Because I think you know given the new world order of things we've talked about maybe I'll take over You're hammering out the lead score, but I still think you are. the very least informed but probably consulted.

        156
        00:26:23.133 --> 00:26:23.875
        <v Chris Van Wagoner> Yeah, no, I would agree.

        157
        00:26:24.400 --> 00:26:24.743
        <v Jimmy Shang> Okay, please

        158
        00:26:24.985 --> 00:26:25.550
        <v Chris Van Wagoner> go ahead, Hank.

        159
        00:26:28.076 --> 00:27:52.343
        <v Jimmy Shang> Okay. And then on our side, you heard that techie on billing thing. The other thing that we're doing is we have a. Basically this PC2 migration conversation has sparked us to look at our current product catalog and offering. And we have a few. Who plans that have onesie twosies stragglers on it, you know, like five people on a legacy plan that we don't offer anymore So Megan and I are going to shift them. from one subscription to another. I think I'll go and say if this will also put some of those APR stuff. that you guys have built to a test. This is not a scenario that we've asked you to account for, but I'm curious as to how this plays out. And again. Like, I don't know, Megan, there's like... 50 of these maybe or 30 of these across all of the plans that we're going to touch for now. So we're gonna just onesie and twosie them for now and work with you. So So just expect a lot of back and forth Slack communication if something doesn't work. and do know that there's no expectation that it does work. But it is sort of an interesting scenario of like what happened to someone comes off of one plan out to another I do actually think 85% of these will fire just fine. I think the ones that are gonna be funky are the ones that have like... multi coupons or I think because of this legacy switch we're gonna have to Create. fake one-time coupons to make the prices match. So just a heads up.

        160
        00:27:54.616 --> 00:27:54.817
        <v Johnny Sengelmann> Cool.

        161
        00:27:54.857 --> 00:28:04.097
        <v Abdallah Gaballah> Makes sense. Just before you guys go, or before we depart. A couple of things. Do you guys need our help on the commissions?

        162
        00:28:05.442 --> 00:28:09.555
        <v Jimmy Shang> No, we are good on that front. Everything is, thank you for everything you've built that's been helpful.

        163
        00:28:10.221 --> 00:28:16.465
        <v Abdallah Gaballah> No worries, second thing. You mentioned that you were going to send us a loom regarding that. attributions

        164
        00:28:16.566 --> 00:28:19.734
        <v Johnny Sengelmann> already. We're using Thursday for it. That's what he just said.

        165
        00:28:20.544 --> 00:28:20.890
        <v Abdallah Gaballah> Okay.

        166
        00:28:21.951 --> 00:28:26.344
        <v Jimmy Shang> And then Chris, any other marketing priorities that I missed in all this? Sorry for picking up all the time.

        167
        00:28:29.092 --> 00:28:51.225
        <v Chris Van Wagoner> I think maybe the only thing that comes to mind is. You know, Johnny, after we. you get the marketing contacts list. Sort it out. I wonder if maybe as a fast follow we segment using the. The closed, lost and missed meeting. lists that you all put together a while back. So maybe that's something that we can talk about as soon as we get past this initial cleanup.

        168
        00:28:51.796 --> 00:29:16.127
        <v Johnny Sengelmann> So you want to do correct me if I'm wrong. You want to go. Oh set everyone correctly at. marketing versus non marketing contact and then you want to start identifying those lists and then starting to. We could also probably throw those in our attribution and spread those out across your team and then start to action those on a campaign. By campaign basis is that we're thinking Are you thinking working with that?

        169
        00:29:17.818 --> 00:29:28.632
        <v Chris Van Wagoner> So those are such valuable lists and we need to get going on those. So like I said, I think that that's the next step after getting the. marketing list cleanup taken care of.

        170
        00:29:30.429 --> 00:29:30.631
        <v Johnny Sengelmann> Cool.

        171
        00:29:31.604 --> 00:29:43.273
        <v Jimmy Shang> Chris, I don't need to be like read in or anything like, like I don't need to be involved, but I would be good to sort of like. wrap my head around, understand what you guys are working on so just I can... index that and wrap that into any other sort of project that I might be touching.

        172
        00:29:43.733 --> 00:29:44.474
        <v Chris Van Wagoner> Yeah, absolutely.

        173
        00:29:45.232 --> 00:29:48.323
        <v Jimmy Shang> Cool. Megan, did I miss anything from your list?

        174
        00:29:49.552 --> 00:29:52.520
        <v Megan Solly> Nope, you just spoke about it. Cool.

        175
        00:29:53.452 --> 00:29:53.555
        <v Jimmy Shang> All right.

        176
        00:29:53.555 --> 00:29:54.378
        <v Megan Solly> All right, everyone, guys.

        177
        00:29:54.880 --> 00:29:56.587
        <v Jimmy Shang> Yep, same here. Thanks, everyone.

        178
        00:29:56.587 --> 00:29:57.410
        <v Megan Solly> All right. Bye.

        179
        00:29:57.511 --> 00:29:57.792
        <v Jimmy Shang> Bye.

        180
        00:29:58.303 --> 00:29:58.587
        <v Seif Muhammed> Thanks.

        181
        00:30:15.451 --> 00:30:31.701
        <v Abdallah Gaballah> Thank you Thanks. Peace.
        </vtt_content>
        <ideal_output>
        I'll analyze this meeting transcript to identify distinct topics, create summaries, and extract key moments with timestamps.

        <vtt_analysis>
        This transcript captures a business meeting between team members from Numa and what appears to be an external consulting/implementation team. The meeting covers various ongoing projects, tasks, and upcoming changes.

        ## Initial Topic Identification
        After analyzing the full transcript, I can identify these main topics:

        1. **Personal updates and introductions** (segments 1-19)
          - Discussion of personal matters like pregnancy due dates
          - Camera issues for meeting participants

        2. **Project Roots status update** (segments 20-31)
          - Abdallah providing updates on completed items
          - Discussion of outstanding items

        3. **PC2/PCT migration planning** (segments 32-62)
          - Detailed technical discussion about ChargeB schema changes
          - Planning for upcoming migration/changes
          - Impact on zaps and integrations

        4. **Former customer lifecycle and workflow tasks** (segments 63-73)
          - Discussion about adding former customer lifecycle stages
          - Sync between company ownership and deal ownership

        5. **Payment method tracking implementation** (segments 74-97)
          - Discussion about payment method tracking fields
          - Need for notifications when payments are made

        6. **Direct traffic analysis & attribution** (segments 98-121)
          - Analysis of traffic attribution issues with Riff Dojo
          - Plans to clean underlying data

        7. **Marketing contacts cleanup and lists** (segments 122-146)
          - Discussion about forms cleanup
          - Customer marking workflow
          - Suppression lists for different customer statuses

        8. **Cross-referencing meeting data and attribution** (segments 147-158)
          - Discussion about Rev Dojo meeting data
          - Lead scoring implementation

        9. **Product catalog updates and testing** (segments 159-162)
          - Plans to migrate customers from legacy plans
          - Testing impact on workflows

        10. **Wrap-up and next steps** (segments 163-181)
            - Final questions and action items
            - Meeting conclusion

        ## Boundary Analysis and Refinement

        Looking more closely at the natural transitions:

        - The transition from personal updates to business occurs around segment 20 when Abdallah asks if they're waiting for anyone else and then begins the project update.

        - Segment 32 clearly marks the transition to the PC2/PCT migration topic with Johnny asking directly about this topic.

        - Around segment 63, the meeting shifts to discussing former customer lifecycle and workflow updates.

        - The payment method discussion begins around segment 68 with Jimmy asking for clarification about what's being discussed.

        - Segment 98 marks a shift to discussing direct traffic data analysis.

        - Around segment 122, the conversation shifts to discussions about marketing contacts and forms cleanup.

        - At segment 147, Johnny brings up cross-referencing meeting data, shifting the topic.

        - Segment 159 introduces the topic of product catalog updates and testing.

        - The wrap-up begins around segment 163 with final questions and next steps.

        ## Timeline Events

        For each topic, I've identified key moments that provide insight into the discussion, decisions made, or action items created. These will include the timestamp from the VTT and a description of what occurred.
        </vtt_analysis>

        \`\`\`json
        {
          "topics": [
            {
              "index": 0,
              "title": "Meeting Introduction and Personal Updates",
              "start_segment_id": 1,
              "end_segment_id": 19,
              "detailed_summary": "The meeting begins with casual personal conversation as participants join. Megan discusses her pregnancy with a due date of April 14th, about two months away. Johnny shares that his due date is about two months after Megan's. Jimmy congratulates Johnny on his upcoming first child. There's some discussion about camera issues with several participants noting problems with their cameras working in the meeting. Abdallah, who appears to be leading the meeting, asks if they're waiting for anyone else from the Numa team before beginning the formal agenda.",
              "timeline": [
                {
                  "timestamp": "00:00:12",
                  "event": "Megan shares her pregnancy due date is April 14th, exactly two months away"
                },
                {
                  "timestamp": "00:00:34",
                  "event": "Johnny mentions his baby is due about two months after Megan's"
                },
                {
                  "timestamp": "00:00:48",
                  "event": "Jimmy congratulates Johnny on his first child"
                },
                {
                  "timestamp": "00:01:11",
                  "event": "Participants discuss camera issues with several noting their cameras aren't working properly"
                },
                {
                  "timestamp": "00:01:35",
                  "event": "Abdallah asks if they're waiting for anyone else from the Numa team before starting"
                }
              ]
            },
            {
              "index": 1,
              "title": "Project Roots Status Update",
              "start_segment_id": 20,
              "end_segment_id": 31,
              "detailed_summary": "Abdallah begins the formal meeting by providing a status update on Project Roots. He reports that his team has worked to close every outstanding item from the project, with only one remaining issue: the MRR and ARR combination functionality, which is dependent on receiving information about add-ons that coupons can apply to. Jimmy acknowledges this pending item and notes they can pause the MRR part as previously discussed. This leads into a conversation about the upcoming PCT (Product Catalog Transformation) project that needs to be initiated.",
              "timeline": [
                {
                  "timestamp": "00:01:46",
                  "event": "Abdallah begins formal meeting with Project Roots status update, confirming they've closed most outstanding items"
                },
                {
                  "timestamp": "00:02:43",
                  "event": "Jimmy notes they can pause the MRR part of the project as previously discussed"
                },
                {
                  "timestamp": "00:02:58",
                  "event": "Johnny asks Jimmy about initiating the PCT project and what they need to do to start making progress"
                }
              ]
            },
            {
              "index": 2,
              "title": "PC2/PCT Migration Planning Discussion",
              "start_segment_id": 32,
              "end_segment_id": 62,
              "detailed_summary": "The team discusses the upcoming Product Catalog Transformation (PCT or PC2) project in detail. Jimmy explains that most of the work will be on Numa's end and that a test site has already been set up. He elaborates on the technical changes happening in ChargeB's schema, where the current \"plan ID\" will become a \"subscription price ID\" in PC2, with a new higher-level \"plan ID\" being introduced. This restructuring will allow more flexible pricing options under unified plans. Jimmy explains that the team needs to investigate how these schema changes might impact their existing Zapier integrations and workflows. He notes that the target launch date is March 14th. Abdallah expresses concern that the schema changes will likely break the Zapier integrations, and the team agrees to investigate the test site to identify potential issues. Jimmy also mentions that ChargeB will introduce usage-based pricing, adding future complexity.",
              "timeline": [
                {
                  "timestamp": "00:03:12",
                  "event": "Jimmy explains most PC2 work will be on Numa's end and that a test site has already been set up"
                },
                {
                  "timestamp": "00:03:35",
                  "event": "Jimmy details ChargeB's schema changes where \"plan ID\" will become \"subscription price ID\" with a new parent-level \"plan ID\""
                },
                {
                  "timestamp": "00:04:59",
                  "event": "Jimmy explains how the new schema will allow more flexible pricing options under unified plans"
                },
                {
                  "timestamp": "00:05:49",
                  "event": "Jimmy asks the team to investigate how schema changes might impact existing Zapier integrations"
                },
                {
                  "timestamp": "00:06:37",
                  "event": "Abdallah expresses concern that schema changes will likely break Zapier integrations"
                },
                {
                  "timestamp": "00:07:07",
                  "event": "Johnny confirms they'll intake a task to analyze PC2 test instance and identify needed updates"
                },
                {
                  "timestamp": "00:08:14",
                  "event": "Jimmy shares that the target launch date for PC2 is March 14th"
                },
                {
                  "timestamp": "00:08:28",
                  "event": "Jimmy mentions ChargeB will introduce usage-based pricing, adding future complexity"
                }
              ]
            },
            {
              "index": 3,
              "title": "Former Customer Lifecycle and Workflow Updates",
              "start_segment_id": 63,
              "end_segment_id": 73,
              "detailed_summary": "Abdallah continues his update with several completed workflow items. The team has added a former customer lifecycle stage and created a workflow to maintain it. They've also completed the sync between company ownership and customer deal ownership, which was flagged in a previous meeting. Additionally, they've processed the second version of requested lists, including DMS with no add-ons or NUMA without inboxes. Jimmy acknowledges that the lists provided have sparked good internal conversations about some broken processes that need fixing. Abdallah confirms they have completed all items from the previous week and are now in the QA phase, targeting completion within the next couple of days.",
              "timeline": [
                {
                  "timestamp": "00:09:00",
                  "event": "Abdallah reports they've added a former customer lifecycle stage with maintenance workflow"
                },
                {
                  "timestamp": "00:09:09",
                  "event": "Abdallah confirms completion of sync between company ownership and customer deal ownership"
                },
                {
                  "timestamp": "00:09:27",
                  "event": "Abdallah mentions they've processed the second version of requested lists"
                },
                {
                  "timestamp": "00:09:53",
                  "event": "Jimmy acknowledges that the lists have sparked useful internal conversations about broken processes"
                },
                {
                  "timestamp": "00:10:22",
                  "event": "Abdallah confirms all items from previous week are complete and in QA phase"
                }
              ]
            },
            {
              "index": 4,
              "title": "Payment Method Tracking Implementation",
              "start_segment_id": 74,
              "end_segment_id": 97,
              "detailed_summary": "The discussion moves to payment method tracking implementation. Abdallah explains they've implemented a checkbox field that gets unchecked when a contact removes their payment method. Jimmy confirms this is correct but also asks about a notification feature for when a first payment is made. Abdallah clarifies they've synced payment made and payment date fields between ChargeB and various HubSpot objects, but didn't have a request for notifications. Jimmy requests adding an in-app notification for when the first payment is made, as the sales team has been asking for this feature. The team agrees to implement this as part of the existing payment workflow rather than creating a new Slack notification. Abdallah confirms they'll add the in-app notification functionality.",
              "timeline": [
                {
                  "timestamp": "00:10:44",
                  "event": "Jimmy asks for clarification if they're discussing payment method entered or first payment made"
                },
                {
                  "timestamp": "00:10:50",
                  "event": "Abdallah confirms it's about tracking when payment methods (credit/debit cards) are added or removed"
                },
                {
                  "timestamp": "00:11:16",
                  "event": "Abdallah explains they've created a checkbox that gets unchecked when payment methods are removed"
                },
                {
                  "timestamp": "00:11:37",
                  "event": "Jimmy asks about the payments made tracking portion"
                },
                {
                  "timestamp": "00:12:08",
                  "event": "Jimmy requests an in-app notification for when first payment is made"
                },
                {
                  "timestamp": "00:12:57",
                  "event": "Jimmy emphasizes the notification is important as sales team is frequently asking about this"
                },
                {
                  "timestamp": "00:13:28",
                  "event": "Abdallah confirms they'll add an in-app notification without needing a new Slack integration"
                }
              ]
            },
            {
              "index": 5,
              "title": "Direct Traffic Data Analysis and Attribution",
              "start_segment_id": 98,
              "end_segment_id": 121,
              "detailed_summary": "Abdallah provides an update on analyzing direct traffic data to address an issue where two workflows were executing simultaneously - \"RIP Dojo So Last Touch\" and \"Last Touch Attribution Slash With Dojo.\" The problem involves users coming from Riff Dojo being redirected to meeting links and then being incorrectly attributed as direct traffic rather than properly traced to Riff Dojo. The team has analyzed all contacts, companies, and deals marked as direct traffic to understand: (1) how common this misattribution scenario is, (2) what other attribution values are being overwritten, and (3) the impact level and how to clean the underlying data. The analysis is still in QA, but once complete, they'll clean the data and fix the workflows causing the problem. Abdallah also mentions two list-related requests they're processing: one for accounts with no activity in the past 365 days, and another to clean marketing contacts, which Johnny clarifies are related since activity is being used as a proxy to identify what should be marketing contacts.",
              "timeline": [
                {
                  "timestamp": "00:15:29",
                  "event": "Abdallah explains they're analyzing direct traffic data where Riff Dojo traffic is incorrectly attributed"
                },
                {
                  "timestamp": "00:15:42",
                  "event": "Abdallah details how people coming from Riff Dojo are getting redirected to meeting links and then misattributed as direct traffic"
                },
                {
                  "timestamp": "00:16:15",
                  "event": "Abdallah shares they've analyzed all contacts, companies and deals marked as direct traffic to understand the problem scope"
                },
                {
                  "timestamp": "00:16:42",
                  "event": "Abdallah mentions they'll clean the data and fix the workflows once analysis is complete"
                },
                {
                  "timestamp": "00:15:52",
                  "event": "Abdallah notes two list-related requests in progress: accounts with no activity in past 365 days and marketing contacts cleanup"
                },
                {
                  "timestamp": "00:15:44",
                  "event": "Johnny clarifies that activity and marketing contacts lists are related since activity is being used as a proxy"
                }
              ]
            },
            {
              "index": 6,
              "title": "Marketing Contacts and Forms Cleanup",
              "start_segment_id": 122,
              "end_segment_id": 146,
              "detailed_summary": "Johnny raises a question about forms cleanup, which Jimmy confirms needs attention. They discuss archiving or renaming unused forms to better organize their HubSpot instance. Jimmy wants to ensure they maintain one demo form, one contact form, and one \"learn about AI agents\" form, while cleaning up the rest. Jimmy also mentions that Chris and Johnny should decide on form naming conventions for different use cases (like email campaigns vs. website forms). The conversation then shifts to customer marking in HubSpot, with Jimmy preferring to err on the side of marking more customers as paying customers rather than missing actual customers. He notes there are about 2,000 companies marked as customers in HubSpot, which isn't correct, but he'd rather have false positives than false negatives for suppression lists. Johnny suggests adding a suppression list for former customers, which Abdallah and Seif confirm they're working on. Jimmy clarifies they need three suppression lists: current paying customers, active pipeline prospects, and former customers. Seif notes they haven't performed the former customer workflow yet since it's not live.",
              "timeline": [
                {
                  "timestamp": "00:20:39",
                  "event": "Johnny asks about forms cleanup that had been flagged previously"
                },
                {
                  "timestamp": "00:20:49",
                  "event": "Jimmy requests archiving or renaming unused forms to better organize their HubSpot instance"
                },
                {
                  "timestamp": "00:21:35",
                  "event": "Jimmy specifies they should maintain one demo form, one contact form, and one AI agents form while cleaning up the rest"
                },
                {
                  "timestamp": "00:21:59",
                  "event": "Jimmy suggests Chris and Johnny decide on form naming conventions for different use cases"
                },
                {
                  "timestamp": "00:22:22",
                  "event": "Jimmy discusses the customer marking workflow, preferring false positives over missing actual customers"
                },
                {
                  "timestamp": "00:23:05",
                  "event": "Johnny suggests adding a suppression list for former customers"
                },
                {
                  "timestamp": "00:23:45",
                  "event": "Jimmy clarifies they need three suppression lists: current customers, active pipeline prospects, and former customers"
                },
                {
                  "timestamp": "00:24:33",
                  "event": "Seif notes they haven't performed the former customer workflow yet since it's not live"
                }
              ]
            },
            {
              "index": 7,
              "title": "Meeting Data Cross-Reference and Lead Scoring",
              "start_segment_id": 147,
              "end_segment_id": 158,
              "detailed_summary": "Johnny brings up a pending request about cross-referencing meeting data between what Rev Dojo (Numa's SDR firm) claims as meetings versus what's recorded in their system. Jimmy offers to own this task but suggests bumping it down in priority. They also discuss lead scoring implementation, with Johnny mentioning that if people receive a lead score, they should be added to the lead score campaign and likely the leads object. Jimmy acknowledges he still owes Johnny feedback on the attribution video Johnny sent earlier. They agree to set up a separate meeting to discuss attribution and lead scoring, with Chris Van Wagoner to be optionally included since he should at least be informed about lead scoring changes even if Jimmy is taking over that responsibility.",
              "timeline": [
                {
                  "timestamp": "00:24:41",
                  "event": "Johnny raises the pending request about cross-referencing Rev Dojo meeting data with their system"
                },
                {
                  "timestamp": "00:25:20",
                  "event": "Jimmy offers to own the task but suggests lowering its priority"
                },
                {
                  "timestamp": "00:25:28",
                  "event": "Jimmy mentions that Johnny had asked about lead scoring implementation"
                },
                {
                  "timestamp": "00:25:35",
                  "event": "Johnny notes Jimmy still owes feedback on an attribution video"
                },
                {
                  "timestamp": "00:25:43",
                  "event": "Jimmy suggests setting up a separate meeting to discuss attribution and lead scoring"
                },
                {
                  "timestamp": "00:26:06",
                  "event": "Johnny explains that lead scoring ties to adding people to lead score campaign and leads object"
                },
                {
                  "timestamp": "00:26:23",
                  "event": "Jimmy requests adding Chris Van Wagoner as optional to the meeting since he should be informed about lead scoring"
                }
              ]
            },
            {
              "index": 8,
              "title": "Product Catalog Updates and Testing",
              "start_segment_id": 159,
              "end_segment_id": 162,
              "detailed_summary": "Jimmy updates the team about planned changes to the product catalog, prompted by the PC2 migration discussion. He explains that they've identified several legacy plans with only a few customers each (\"onesie twosies\") that they plan to migrate to newer plans. Jimmy and Megan will be shifting these customers from one subscription to another, which will test the Zapier workflows the team has built. Jimmy notes this wasn't a scenario they specifically asked the team to account for, but he's curious to see how the workflows handle it. He estimates there are about 30-50 customers across various plans that will be migrated. While he expects most transitions to work fine, he anticipates potential issues with customers that have multiple coupons or where they'll need to create fake one-time coupons to match prices during the legacy switch.",
              "timeline": [
                {
                  "timestamp": "00:27:28",
                  "event": "Jimmy explains they're reviewing their product catalog due to the PC2 migration"
                },
                {
                  "timestamp": "00:27:38",
                  "event": "Jimmy details they've identified several legacy plans with only a few customers each that need migration"
                },
                {
                  "timestamp": "00:27:52",
                  "event": "Jimmy notes this will test the Zapier workflows the team has built, though this wasn't a planned test scenario"
                },
                {
                  "timestamp": "00:28:04",
                  "event": "Jimmy estimates 30-50 customers across various plans will be migrated"
                },
                {
                  "timestamp": "00:28:24",
                  "event": "Jimmy anticipates potential issues with customers having multiple coupons or needing price-matching solutions"
                }
              ]
            },
            {
              "index": 9,
              "title": "Wrap-up and Next Steps",
              "start_segment_id": 163,
              "end_segment_id": 181,
              "detailed_summary": "As the meeting wraps up, Abdallah asks if they need help with commissions, which Jimmy confirms they don't. Abdallah then reiterates the pending request for attribution discussion that Johnny and Jimmy have arranged to address in their Thursday meeting. Jimmy asks Chris if there are any marketing priorities they missed, and Chris mentions wanting to work on the closed-lost and missed meeting lists after completing the marketing contacts cleanup. Johnny suggests they could incorporate these into attribution tracking and spread them across teams for campaign-by-campaign action. Jimmy requests to be informed about this work to coordinate with other projects he's managing. Before concluding, everyone confirms there are no other pending items, and the meeting ends with thank-yous and goodbyes.",
              "timeline": [
                {
                  "timestamp": "00:28:04",
                  "event": "Abdallah asks if they need help with commissions, which Jimmy confirms they don't"
                },
                {
                  "timestamp": "00:28:16",
                  "event": "Abdallah reiterates the pending attribution discussion"
                },
                {
                  "timestamp": "00:28:21",
                  "event": "Jimmy asks Chris if they missed any marketing priorities"
                },
                {
                  "timestamp": "00:28:29",
                  "event": "Chris mentions wanting to work on closed-lost and missed meeting lists after marketing contacts cleanup"
                },
                {
                  "timestamp": "00:28:51",
                  "event": "Johnny suggests incorporating these into attribution tracking for campaign-by-campaign action"
                },
                {
                  "timestamp": "00:29:31",
                  "event": "Jimmy requests to be informed about this work to coordinate with his other projects"
                },
                {
                  "timestamp": "00:29:49",
                  "event": "Participants confirm no other pending items and exchange goodbyes"
                },
                {
                  "timestamp": "00:30:15",
                  "event": "Meeting concludes with final thank-yous"
                }
              ]
            }
          ]
        }
        \`\`\`
        </ideal_output>
      </example>
    </examples>
  `;
}
