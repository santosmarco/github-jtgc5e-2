import type { SetOptional } from "type-fest";
import type { VideoMoment, VideoMoments } from "~/lib/schemas/video-moment";
import type { Tables } from "~/lib/supabase/database.types";
import { createClient } from "~/lib/supabase/server";

export function transformMoment(
  moment: SetOptional<
    Pick<
      Tables<"moments"> & {
        subtags?: Tables<"moment_subtags">[];
      },
      | "activity"
      | "activity_reasoning"
      | "activity_type"
      | "id"
      | "relevant"
      | "segment_end_timestamp"
      | "segment_end_timestamp_in_seconds"
      | "segment_id_sequence_end"
      | "segment_id_sequence_start"
      | "segment_start_timestamp"
      | "segment_start_timestamp_in_seconds"
      | "segment_start_timestamp_in_seconds_ideal"
      | "subtags"
      | "summary"
      | "target_person_type"
      | "title"
      | "video_api_id"
    >,
    | "activity_reasoning"
    | "activity_type"
    | "segment_end_timestamp"
    | "segment_id_sequence_end"
    | "segment_id_sequence_start"
    | "segment_start_timestamp"
    | "target_person_type"
  >,
  idx: number,
): VideoMoment {
  return {
    id: moment.id ?? `${moment.video_api_id}_${moment.activity}_${idx}`,
    index: `${moment.video_api_id}_${moment.activity}_${idx}`,
    sequence_id: idx ?? "",
    segment_id_sequence_start: moment.segment_id_sequence_start ?? 0,
    segment_id_sequence_end: moment.segment_id_sequence_end ?? 0,
    title: (moment.title ?? "").replace(/^"|"$/g, ""),
    summary: (moment.summary ?? "").replace(/^"|"$/g, ""),
    segment_start_timestamp: moment.segment_start_timestamp ?? "",
    segment_end_timestamp: moment.segment_end_timestamp ?? "",
    segment_start_timestamp_in_seconds:
      moment.segment_start_timestamp_in_seconds ?? 0,
    segment_end_timestamp_in_seconds:
      moment.segment_end_timestamp_in_seconds ?? 0,
    segment_ideal_timestamp_in_seconds:
      moment.segment_start_timestamp_in_seconds_ideal,
    video_id: moment.video_api_id ?? "",
    activity_type: moment.activity_type ?? "",
    activity_reasoning: (moment.activity_reasoning ?? "").replace(/^"|"$/g, ""),
    target_person_type: moment.target_person_type ?? "",
    target_person_reasoning: null,
    activity: moment.activity ?? "",
    relevant: moment.relevant,
    reactions: [],
    subtags: moment.subtags ?? [],
  };
}

export async function fetchVideoMoments(
  videoId: string,
): Promise<VideoMoments> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("moments")
    .select("*, subtags:moment_subtags(*)")
    .eq("video_api_id", videoId)
    .eq("latest", true);

  if (error) throw error;

  return data.map(transformMoment);
}

export async function fetchMomentByActivity(
  videoId: string,
  activity: string,
  sequenceId: number,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("moments")
    .select("*, subtags:moment_subtags(*)")
    .eq("video_api_id", videoId)
    .eq("activity", activity)
    .eq("latest", true)
    .single();

  if (error) throw error;
  if (!data) return null;

  return transformMoment(data, sequenceId);
}

export type PaginatedMomentsOptions = {
  cursor?: number;
  limit?: number;
};

export async function fetchPaginatedMoments(options: PaginatedMomentsOptions) {
  const supabase = await createClient();

  let query = supabase
    .from("moments")
    .select("*, subtags:moment_subtags(*)")
    .eq("latest", true)
    .order("created_at", { ascending: false });

  const { cursor, limit } = options;

  if (cursor) {
    query = query.lt("created_at", new Date(cursor).toISOString());
  }
  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  return {
    moments: data.map(transformMoment),
    nextCursor:
      data.length === limit
        ? Date.parse(data[data.length - 1]?.created_at ?? "")
        : undefined,
  };
}
