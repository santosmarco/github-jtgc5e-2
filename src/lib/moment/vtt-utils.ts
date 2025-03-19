import type { MeetingTopicLLM } from "~/lib/moment/models";

/**
 * Parse a timestamp string (HH:MM:SS.mmm) to milliseconds
 */
export function parseTimestampToMs(
  timestampStr: string | null | undefined,
): number {
  if (!timestampStr) return 0;

  const parts = timestampStr.split(":");
  if (parts.length < 2) return 0;

  // Safely parse timestamp parts
  const hours = Number.parseInt(parts[0] || "0", 10) || 0;
  const minutes = Number.parseInt(parts[1] || "0", 10) || 0;
  const seconds =
    parts.length > 2 ? Number.parseInt(parts[2] || "0", 10) || 0 : 0;
  const milliseconds =
    parts.length > 3 ? Number.parseInt(parts[3] || "0", 10) || 0 : 0;

  return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
}

/**
 * Parse VTT content into transcript segments
 */
export function segmentVtt(
  vttContent: string | null,
): MeetingTopicLLM["transcript"] {
  if (!vttContent) return [];

  const segments: MeetingTopicLLM["transcript"] = [];

  // Simple regex pattern to match VTT cue blocks
  const cuePattern =
    /(\d+)\s*\n(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\s*\n<v\s+([^>]+)>\s*(.*?)(?=\n\n|\n\d+\n|$)/gs;

  // Define match variable with proper type
  let match: RegExpExecArray | null;

  // Execute regex separately from the while condition
  match = cuePattern.exec(vttContent);
  while (match !== null) {
    // Type check each captured group
    // Note: VTT cue numbers are 1-based
    const [
      ,
      cueIndexStr = "",
      startTime = "",
      endTime = "",
      speaker = "",
      text = "",
    ] = match;
    // Use the original cue number (1-based) if available, otherwise use array position + 1
    const cueIndex = cueIndexStr
      ? Number.parseInt(cueIndexStr, 10)
      : segments.length + 1;

    // Extract just the speaker name, removing any HTML-like tags
    const speakerName = speaker
      ? speaker.replace(/<\/?[^>]+(>|$)/g, "").trim()
      : "Unknown";

    segments.push({
      index: cueIndex,
      start_timestamp: startTime,
      end_timestamp: endTime,
      speaker: speakerName,
      text: text.trim(),
    });

    // Get next match
    match = cuePattern.exec(vttContent);
  }

  // Combine consecutive segments from the same speaker
  const combinedSegments: MeetingTopicLLM["transcript"] = [];
  let currentSegment: MeetingTopicLLM["transcript"][number] | null = null;

  for (const segment of segments) {
    if (!currentSegment) {
      currentSegment = { ...segment };
    } else if (currentSegment.speaker === segment.speaker) {
      // Same speaker, combine the text and update end timestamp
      currentSegment.text = `${currentSegment.text} ${segment.text}`;
      currentSegment.end_timestamp = segment.end_timestamp;
    } else {
      // Different speaker, push the current segment and start a new one
      combinedSegments.push(currentSegment);
      currentSegment = { ...segment };
    }
  }

  // Don't forget to push the last segment
  if (currentSegment) {
    combinedSegments.push(currentSegment);
  }

  // Preserve the original combined segments with their 1-based indexes
  return combinedSegments;
}

/**
 * Get the timestamp of a specific VTT segment by index
 */
export function getVttSegmentTimestamp(
  segmentIndex: number,
  allSegments: MeetingTopicLLM["transcript"],
): string | null {
  const segment = allSegments.find((s) => s.index === segmentIndex);
  if (!segment) return null;

  return segment.start_timestamp;
}
