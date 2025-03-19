import { createClient } from "~/lib/supabase/client";
import { runMeetingProcessing } from "~/jobs/run-meeting-processing";

/**
 * Type definition for a moment object
 */
type Moment = {
  id: string;
  video_api_id: string | null;
  segment_id_sequence_start: number | null;
  segment_id_sequence_end: number | null;
  topic_id?: string | null;
};

/**
 * Type definition for a topic object
 */
type Topic = {
  id: string;
  start_segment_id: number;
  end_segment_id: number;
};

/**
 * Determines if a moment pertains to a topic based on segment overlap
 * A moment pertains to a topic when >80% of the moment's segments are inside the topic
 * @param moment The moment object with segment_id_sequence_start and segment_id_sequence_end
 * @param topic The topic object with start_segment_id and end_segment_id
 * @returns boolean indicating if the moment pertains to the topic
 */
function doesMomentPertainToTopic(
  moment: {
    segment_id_sequence_start: number | null;
    segment_id_sequence_end: number | null;
  },
  topic: {
    start_segment_id: number;
    end_segment_id: number;
  },
): boolean {
  // Handle null values in moment segments
  if (
    moment.segment_id_sequence_start === null ||
    moment.segment_id_sequence_end === null
  ) {
    return false;
  }

  // Calculate total segment count in moment
  const momentTotalSegments =
    moment.segment_id_sequence_end - moment.segment_id_sequence_start + 1;

  // Return false if moment has invalid segment range
  if (momentTotalSegments <= 0) {
    return false;
  }

  // Calculate overlap start and end
  const overlapStart = Math.max(
    moment.segment_id_sequence_start,
    topic.start_segment_id,
  );

  const overlapEnd = Math.min(
    moment.segment_id_sequence_end,
    topic.end_segment_id,
  );

  // Calculate number of overlapping segments
  const overlapSegments = Math.max(0, overlapEnd - overlapStart + 1);

  // Calculate overlap percentage
  const overlapPercentage = (overlapSegments / momentTotalSegments) * 100;

  // Return true if overlap > 80%
  return overlapPercentage > 80;
}

/**
 * Processes all moments that have latest=true and topic_id=null
 * Finds the appropriate topic for each moment by comparing segments
 * Updates the moment with the topic_id if found
 */
async function assignTopicsToMoments() {
  console.log("Starting to assign topics to moments...");

  const supabase = createClient();
  const BATCH_SIZE = 100; // Process 100 moments at a time

  // Get all moments that are latest but have no topic assigned
  const { data: moments, error } = await supabase
    .from("moments")
    .select(
      "id, video_api_id, segment_id_sequence_start, segment_id_sequence_end",
    )
    .eq("latest", true)
    .is("topic_id", null);

  if (error) {
    console.error("Error fetching moments:", error);
    return;
  }

  console.log(`Found ${moments?.length ?? 0} moments without assigned topics`);

  if (!moments?.length) {
    console.log("No moments to process");
    return;
  }

  // Group moments by video_api_id to avoid redundant topic fetching
  const momentsByVideo: Record<string, Moment[]> = {};
  for (const moment of moments) {
    // Skip moments without video_api_id
    if (!moment.video_api_id) continue;

    if (!momentsByVideo[moment.video_api_id]) {
      momentsByVideo[moment.video_api_id] = [];
    }
    momentsByVideo[moment.video_api_id].push(moment as Moment);
  }

  // Process each video's moments
  const videoIds = Object.keys(momentsByVideo);
  console.log(`Processing moments from ${videoIds.length} different videos`);

  for (const videoApiId of videoIds) {
    console.log(`Processing video ${videoApiId}...`);

    // Fetch all topics for this video
    const { data: topics, error: topicsError } = await supabase
      .from("meeting_topics_v2")
      .select("id, start_segment_id, end_segment_id")
      .eq("api_video_id", videoApiId);

    if (topicsError) {
      console.error(
        `Error fetching topics for video ${videoApiId}:`,
        topicsError,
      );
      continue;
    }

    console.log(`Found ${topics?.length ?? 0} topics for video ${videoApiId}`);

    if (!topics?.length) {
      console.log(`No topics found for video ${videoApiId}, skipping...`);
      continue;
    }

    const videoMoments = momentsByVideo[videoApiId] || [];
    let updatedCount = 0;

    // Process in batches to avoid overwhelming the database
    const momentBatches: Moment[][] = [];
    for (let i = 0; i < videoMoments.length; i += BATCH_SIZE) {
      momentBatches.push(videoMoments.slice(i, i + BATCH_SIZE));
    }

    const topicsArray = topics as Topic[];

    for (const [batchIndex, batchMoments] of momentBatches.entries()) {
      console.log(
        `Processing batch ${batchIndex + 1}/${momentBatches.length} for video ${videoApiId}...`,
      );

      await Promise.all(
        batchMoments.map(async (moment) => {
          // Find the first topic that the moment pertains to
          for (const topic of topicsArray) {
            if (doesMomentPertainToTopic(moment, topic)) {
              // Update the moment with the topic_id
              const { error: updateError } = await supabase
                .from("moments")
                .update({ topic_id: topic.id })
                .eq("id", moment.id);

              if (updateError) {
                console.error(
                  `Error updating moment ${moment.id}:`,
                  updateError,
                );
              } else {
                updatedCount++;
              }

              // Break after finding the first matching topic
              break;
            }
          }
        }),
      );

      // Add a small delay between batches
      if (batchIndex < momentBatches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`Updated ${updatedCount} moments for video ${videoApiId}`);
  }

  console.log("Finished assigning topics to moments");
}

const BATCH_SIZE = 5; // Process 5 meetings at a time

const main = async () => {
  console.log("Starting preprocessing payload creation...");

  const supabase = createClient();

  while (true) {
    const { data: meetings, error } = await supabase
      .from("meetings")
      .select("*")
      .or("preprocessing_payload->topics.eq.[],preprocessing_payload.is.null");

    if (error) {
      console.error("Error fetching meetings:", error);
      return;
    }

    if (!meetings?.length) {
      console.log("No more meetings to process");
      break;
    }

    console.log(`Found ${meetings.length} meetings to process`);

    // Process meetings in batches
    const meetingBatches = [];
    for (let i = 0; i < meetings.length; i += BATCH_SIZE) {
      meetingBatches.push(meetings.slice(i, i + BATCH_SIZE));
    }

    for (const batchMeetings of meetingBatches) {
      console.log(`Processing batch of ${batchMeetings.length} meetings...`);

      await Promise.all(
        batchMeetings.map(async (meeting) => {
          console.log(`Processing meeting ${meeting.video_api_id}...`);

          const { data: topics, error: topicsError } = await supabase
            .from("meeting_topics_v2")
            .select(
              "*, timeline:meeting_topic_events_v2(*), entities:meeting_entities_v2(*, observations:meeting_entity_observations_v2(*)), entity_relations:meeting_entity_relationships_v2(*, observations:meeting_entity_relationship_observations_v2(*)), observations:meeting_observations_v2(*)",
            )
            .eq("api_video_id", meeting.video_api_id);

          if (topicsError) {
            console.error(
              `Error fetching topics for meeting ${meeting.video_api_id}:`,
              topicsError,
            );
            return;
          }

          console.log(
            `Found ${topics?.length ?? 0} topics for meeting ${meeting.video_api_id}`,
          );

          const { data: moments, error: momentsError } = await supabase
            .from("moments")
            .select("*")
            .eq("video_api_id", meeting.video_api_id)
            .eq("latest", true);

          if (momentsError) {
            console.error(
              `Error fetching moments for meeting ${meeting.video_api_id}:`,
              momentsError,
            );
            return;
          }

          console.log(
            `Found ${moments?.length ?? 0} moments for meeting ${meeting.video_api_id}`,
          );

          await Promise.all(
            (moments ?? []).map(async (moment) => {
              if (moment.topic_id) return;

              await Promise.all(
                (topics ?? []).map(async (topic) => {
                  if (doesMomentPertainToTopic(moment, topic)) {
                    console.log(
                      `Moment ${moment.id} pertains to topic ${topic.id}`,
                    );
                    await supabase
                      .from("moments")
                      .update({ topic_id: topic.id })
                      .eq("id", moment.id);
                  }
                }),
              );
            }),
          );

          const { error: updateError } = await supabase
            .from("meetings")
            .update({
              preprocessing_payload: { topics },
            })
            .eq("video_api_id", meeting.video_api_id);

          if (updateError) {
            console.error(
              `Error updating meeting ${meeting.video_api_id}:`,
              updateError,
            );
          } else {
            console.log(`Successfully updated meeting ${meeting.video_api_id}`);
          }
        }),
      );

      // Add a small delay between batches to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }

    console.log(`Processed ${meetings.length} meetings`);

    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }

  console.log("Finished preprocessing payload creation");
};

// Alternative entry point to just assign topics to moments
if (process.argv.includes("--assign-topics")) {
  assignTopicsToMoments().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
} else {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
