import type { SupabaseClient } from "@supabase/supabase-js";
import _ from "lodash";
import type { MeetingTopicLLM } from "~/lib/moment/models";
import { parseTimestampToMs, segmentVtt } from "~/lib/moment/vtt-utils";
import type { Database } from "~/lib/supabase/database.types";

/**
 * Fetch meeting data from Supabase
 */
export async function getMeeting(
  supabase: SupabaseClient<Database>,
  apiVideoId: string,
) {
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select(
      "*, profile:profiles(*), topics:meeting_topics_v2(*, timeline:meeting_topic_events_v2(*), entities:meeting_entities_v2(*, observations:meeting_entity_observations_v2(*)), entity_relationships:meeting_entity_relationships_v2(*, observations:meeting_entity_relationship_observations_v2(*)), observations:meeting_observations_v2(*))",
    )
    .eq("video_api_id", apiVideoId)
    .single();

  if (meetingError) {
    throw new Error(meetingError.message);
  }

  return {
    ...meeting,
    topics: _.sortBy(
      meeting.topics.map((t) => ({
        ...t,
        timeline: _.sortBy(t.timeline, (ev) =>
          parseTimestampToMs(ev.timestamp),
        ),
      })),
      (t) => t.index,
    ),
  };
}

/**
 * Transform meeting topics into LLM-friendly format
 */
export function parseMeetingTopicsForLLM(
  meeting: Awaited<ReturnType<typeof getMeeting>>,
): MeetingTopicLLM[] {
  // Process the VTT content to get segments
  const allSegments = segmentVtt(meeting.clean_vtt_file);

  return meeting.topics.map((topic) => {
    // Find segments that belong to this topic based on segment IDs (1-based)
    const topicSegments = allSegments.filter(
      (segment) =>
        segment.index >= topic.start_segment_id &&
        segment.index <= topic.end_segment_id,
    );

    return {
      ...(meeting.profile?.nickname && {
        founderName: meeting.profile.nickname,
      }),
      index: topic.index,
      title: topic.title,
      summary: topic.summary,
      transcript: topicSegments,
      meeting: {
        title: meeting.name ?? "Untitled Meeting",
        summary: meeting.summary ?? "No summary available",
      },
      timeline: topic.timeline.map((t) => ({
        timestamp: t.timestamp,
        event: t.event,
      })),
      entities: topic.entities.map((e) => ({
        name: e.name,
        description: e.description,
        type: e.type,
        observations: e.observations.map((o) => o.observation),
      })),
      entity_relationships: topic.entity_relationships.map((r) => ({
        subject_entity_name: r.subject_entity_name,
        object_entity_name: r.object_entity_name,
        relationship_type: r.relationship_type,
        observations: r.observations.map((o) => o.observation),
      })),
      observations: topic.observations.map((o) => o.observation),
    } satisfies MeetingTopicLLM;
  });
}

export function formatVttSegment(
  segment: MeetingTopicLLM["transcript"][number],
): string {
  return `[${segment.index}] [${segment.start_timestamp} → ${segment.end_timestamp}] ${segment.speaker}: ${segment.text}`;
}

/**
 * Format a meeting topic into a human-readable string
 *
 * Creates a markdown-formatted representation of a meeting topic
 * including all its components: summary, timeline, transcript,
 * entities, relationships, and observations.
 */
export function formatMeetingTopic(topic: MeetingTopicLLM): string {
  // Initialize the result string
  let result = "";

  if (topic.founderName) {
    // Add founder name if available
    result += `# Founder Name: ${topic.founderName}\n\n`;
  }

  // Add topic title and index
  result += `# Topic ${topic.index}: ${topic.title}\n\n`;

  // Add topic summary section
  result += `## Summary\n${topic.summary}\n\n`;

  // Add meeting context information
  result += "## Meeting\n";
  result += `- Title: ${topic.meeting.title}\n`;
  result += `- Summary: ${topic.meeting.summary}\n\n`;

  // Add timeline events if available
  if (topic.timeline.length > 0) {
    result += "## Timeline\n";
    for (const event of topic.timeline) {
      result += `- ${event.timestamp}: ${event.event}\n`;
    }
    result += "\n";
  }

  // Add transcript segments if available
  if (topic.transcript.length > 0) {
    result += "## Transcript\n";
    for (const segment of topic.transcript) {
      result += `${formatVttSegment(segment)}\n`;
    }
    result += "\n";
  }

  // Add entities information if available
  if (topic.entities.length > 0) {
    result += "## Entities\n";

    for (const entity of topic.entities) {
      // Entity header with name and type
      result += `### ${entity.name} (${entity.type})\n`;
      if (entity.description) {
        result += `${entity.description}\n`;
      }

      // Entity observations if available
      if (entity.observations.length > 0) {
        result += "Observations:\n";
        for (const obs of entity.observations) {
          result += `- ${obs}\n`;
        }
      }
      result += "\n";
    }
  }

  // Add entity relationships if available
  if (topic.entity_relationships.length > 0) {
    result += "## Entity Relationships\n";

    for (const rel of topic.entity_relationships) {
      // Relationship description
      result += `- ${rel.subject_entity_name} ${rel.relationship_type} ${rel.object_entity_name}\n`;

      // Relationship observations if available
      if (rel.observations.length > 0) {
        result += "  Observations:\n";
        for (const obs of rel.observations) {
          result += `  - ${obs}\n`;
        }
      }
      result += "\n";
    }
  }

  // Add general topic observations if available
  if (topic.observations.length > 0) {
    result += "## Observations\n";
    for (const obs of topic.observations) {
      result += `- ${obs}\n`;
    }
  }

  return result;
}
