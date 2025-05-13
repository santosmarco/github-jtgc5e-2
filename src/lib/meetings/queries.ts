import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "~/lib/supabase/database.types";

export function getAllRelevantMeetingDataQuery(
  apiVideoId: string,
  supabaseClient: SupabaseClient<Database>,
) {
  return supabaseClient
    .from("meetings")
    .select(
      `
        video_api_id,
        name,
        summary,
        clean_vtt_file,
        date,
        type,
        duration_in_seconds,
        profile_id,
        topics_discussed:meeting_topics(
          id,
          title,
          summary,
          vtt_start_segment_id,
          vtt_end_segment_id,
          server_deleted_at,
          created_at
        ),
        action_items:meeting_action_items(
          id,
          text,
          vtt_start_segment_id,
          vtt_end_segment_id,
          due_date,
          completed_at,
          deleted_at,
          server_deleted_at,
          created_at,
          assignees:meeting_action_item_assignees(
            assignee:entities(
              id,
              name,
              type,
              attributes,
              is_test
            )
          )
        ),
        topics:meeting_topics_v2(
          id,
          index,
          title,
          summary,
          start_segment_id,
          end_segment_id,
          created_at,
          latest,
          events:meeting_topic_events_v2(
            id,
            event,
            timestamp,
            latest
          ),
          entities:meeting_entities_v2(
            id,
            name,
            type,
            description,
            latest,
            observations:meeting_entity_observations_v2(
              id,
              observation,
              latest
            )
          ),
          relationships:meeting_entity_relationships_v2(
            id,
            subject_entity_name,
            object_entity_name,
            relationship_type,
            latest,
            observations:meeting_entity_relationship_observations_v2(
              id,
              observation,
              latest
            )
          ),
          observations:meeting_observations_v2(
            id,
            observation,
            latest
          )
        ),
        moments(
          id,
          title,
          summary,
          vtt,
          activity,
          activity_type,
          interestingness_score,
          interestingness_reasoning_not_lower,
          interestingness_reasoning_not_higher,
          altitude_score,
          altitude_score_reasoning_not_lower,
          altitude_score_reasoning_not_higher,
          qa_score,
          qa_reasoning_not_lower,
          qa_reasoning_not_higher,
          final_score,
          segment_start_timestamp,
          segment_end_timestamp,
          segment_id_sequence_start,
          segment_id_sequence_end,
          created_at,
          latest,
          relevant
        ),
        profile:profiles(
          id,
          nickname
        )
      `,
    )
    .eq("video_api_id", apiVideoId)
    .is("topics_discussed.server_deleted_at", null)
    .is("action_items.server_deleted_at", null)
    .eq("action_items.assignees.assignee.is_test", false)
    .eq("topics.latest", true)
    .eq("topics.events.latest", true)
    .eq("topics.entities.latest", true)
    .eq("topics.entities.observations.latest", true)
    .eq("topics.relationships.latest", true)
    .eq("topics.relationships.observations.latest", true)
    .eq("topics.observations.latest", true)
    .eq("moments.latest", true)
    .eq("moments.relevant", true);
}
