import type { ParsedVTT } from "~/lib/schemas/parsed-vtt";

import type { getVideo } from "./api-video/videos";
import { EmotionAnalysis, type EmotionSequence } from "./schemas/emotion";
import type { Video } from "./schemas/video";
import type { VideoMoment } from "./schemas/video-moment";
import type { Tables } from "./supabase/database.types";

export function getVideoEmotions(video: Video) {
  const { emotion_sequences: emotionSequences = [] } =
    EmotionAnalysis.partial().parse(
      JSON.parse(
        video.metadata.find((m) => m.key === "emotions")?.value ?? "{}",
      ),
    );

  return emotionSequences;
}

export function emotionToMoment(
  emotion: EmotionSequence,
  video: Video,
  vtt: string,
): VideoMoment {
  const parsedVTT = parseVTT(vtt, video.videoId);
  const start = parsedVTT.find(
    (v) => v.index === emotion.segment_id_sequence_start,
  );
  const end = parsedVTT.find(
    (v) => v.index === emotion.segment_id_sequence_end,
  );

  return {
    id: `${video.videoId}_Emotion_${emotion.sequence_id}`,
    index: `${video.videoId}_Emotion_${emotion.sequence_id}`,
    sequence_id: emotion.sequence_id,
    segment_id_sequence_start: emotion.segment_id_sequence_start,
    segment_id_sequence_end: emotion.segment_id_sequence_end,
    title: emotion.emotion,
    summary: `${emotion.context}\n\n${emotion.reasoning}`,
    segment_start_timestamp: start?.start ?? "",
    segment_end_timestamp: end?.end ?? "",
    segment_start_timestamp_in_seconds: start?.startInSeconds ?? 0,
    segment_end_timestamp_in_seconds: end?.endInSeconds ?? 0,
    video_id: video.videoId,
    activity_type: `${emotion.emotion_intensity}/10`,
    activity_reasoning: emotion.reasoning,
    target_person_type: emotion.speaker_name,
    target_person_reasoning: null,
    activity: "Emotion",
    relevant: true,
    reactions: [],
    subtags: [],
  };
}

export function getVideoMomentById(
  video: VideoOutput,
  momentId: string,
  vtt: string,
) {
  const emotions = getVideoEmotions(video) ?? [];
  const emotionMoments = emotions.map((emotion) =>
    emotionToMoment(emotion, video, vtt),
  );
  const moments = video.moments;
  return moments.concat(emotionMoments).find((m) => m.index === momentId);
}

export function parseVTT(content: string, videoId: string): ParsedVTT[] {
  const blocks = content.split(/\n\s*\n/).slice(1); // Skip the WEBVTT and X-TIMESTAMP-MAP headers
  const data: ParsedVTT[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length >= 3) {
      try {
        const [index = "", timing = "", ...textLines] = lines;
        let text = textLines.join(" ");
        let speaker: string | undefined;

        const speakerMatch = /<v ([^>]+)>(.*)/.exec(text);
        if (speakerMatch) {
          [, speaker, text = ""] = speakerMatch;
        }

        const [start = "", end = ""] = timing.split(" --> ");

        const startInSeconds = parseTimestamp(start);
        const endInSeconds = parseTimestamp(end);

        data.push({
          videoId,
          index: +index,
          start,
          end,
          startInSeconds,
          endInSeconds,
          speaker,
          text,
        });
      } catch {
        // Do nothing
      }
    }
  }

  return data;
}

export function parseTimestamp(timestamp: string): number {
  const parts = timestamp
    .split(":")
    .map((part) =>
      part.includes(".") ? Number.parseFloat(part) : Number.parseInt(part),
    );

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts[0] !== undefined && parts[1] !== undefined) {
    [minutes, seconds] = parts;
  } else if (
    parts[0] !== undefined &&
    parts[1] !== undefined &&
    parts[2] !== undefined
  ) {
    [hours, minutes, seconds] = parts;
  } else {
    throw new Error(
      "Invalid timestamp format. Use 'mm:ss.xxx' or 'hh:mm:ss.xxx'",
    );
  }

  try {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds;
  } catch {
    throw new Error("Invalid numerical values in timestamp.");
  }
}

export function handleMomentCategorySort(categoryA: string, categoryB: string) {
  if (categoryA === "Emotion") return 1;
  return categoryA.localeCompare(categoryB);
}

// ---

export function toVideoOutput<T extends Awaited<ReturnType<typeof getVideo>>>(
  video: T,
  additionalData: {
    videoSrc: string;
    meeting?: Tables<"meetings">;
    moments?: VideoMoment[];
    summary?: string;
  },
) {
  const videoSrc = additionalData.videoSrc;
  const meeting = additionalData.meeting;
  const moments = additionalData.moments ?? [];
  const summary = additionalData.summary ?? "";
  const vtt = meeting?.original_vtt_file;
  const metadata = [
    ...video.metadata.filter(
      (m) => m.key !== "summary" && m.key !== "activities",
    ),
    { key: "summary", value: summary },
    { key: "activities", value: JSON.stringify(moments) },
  ];

  return { ...video, videoSrc, meeting, moments, summary, vtt, metadata };
}

export type VideoOutput = Awaited<ReturnType<typeof toVideoOutput>>;

export function getMomentText(
  moment: {
    segment_id_sequence_start: number;
    segment_id_sequence_end: number;
  },
  parsedVTT: ParsedVTT[],
): string {
  const relevantSegments = parsedVTT.filter(
    (segment) =>
      segment.index >= moment.segment_id_sequence_start &&
      segment.index <= moment.segment_id_sequence_end,
  );

  return relevantSegments
    .map((segment) => {
      if (segment.speaker) return `${segment.speaker}: ${segment.text}`;
      return segment.text;
    })
    .join("\n");
}
