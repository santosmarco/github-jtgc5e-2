import type { CoreMessage } from "ai";

/**
 * Creates a system message with the provided content.
 * @param content The message content
 * @returns A properly typed system message object
 */
export function system(content: string) {
  return {
    role: "system",
    content,
  } as const satisfies CoreMessage;
}

/**
 * Creates a user message with the provided content.
 * @param content The message content
 * @returns A properly typed user message object
 */
export function user(content: string) {
  return {
    role: "user",
    content,
  } as const satisfies CoreMessage;
}

/**
 * Creates an assistant message with the provided content.
 * @param content The message content
 * @returns A properly typed assistant message object
 */
export function assistant(content: string) {
  return {
    role: "assistant",
    content,
  } as const satisfies CoreMessage;
}

/**
 * Cleans VTT content by normalizing whitespace in the text portions while
 * preserving structural elements like timestamps and speaker tags.
 * Also combines consecutive segments from the same speaker.
 *
 * @param vtt The raw VTT content string
 * @returns Cleaned VTT content with normalized whitespace and combined speaker segments
 */
export function cleanVtt(vtt: string): string {
  // Split the VTT into lines
  const lines = vtt.split("\n");

  // Extract header (everything before the first segment ID)
  const headerLines: string[] = [];
  let i = 0;
  while (
    i < lines.length &&
    lines[i] !== undefined &&
    !/^\d+$/.test((lines[i] ?? "").trim())
  ) {
    headerLines.push(lines[i] ?? "");
    i++;
  }

  // Parse segments
  type VttSegment = {
    id: number;
    startTime: string;
    endTime: string;
    speaker: string | null;
    text: string;
  };

  const segments: VttSegment[] = [];

  let currentId: number | null = null;
  let currentStartTime: string | null = null;
  let currentEndTime: string | null = null;
  let currentSpeaker: string | null = null;
  let currentText: string | null = null;

  while (i < lines.length) {
    const line = lines[i]?.trim() ?? "";

    // Segment ID
    if (/^\d+$/.test(line)) {
      // Save previous segment if exists
      if (currentId !== null && currentStartTime && currentEndTime) {
        segments.push({
          id: currentId,
          startTime: currentStartTime,
          endTime: currentEndTime,
          speaker: currentSpeaker,
          text: currentText || "",
        });
      }

      currentId = Number.parseInt(line, 10);
      currentStartTime = null;
      currentEndTime = null;
      currentSpeaker = null;
      currentText = null;
    }
    // Timestamp line
    else if (line.includes("-->")) {
      const parts = line.split("-->").map((t) => t.trim());
      currentStartTime = parts[0] ?? null;
      currentEndTime = parts[1] ?? null;
    }
    // Text content with speaker
    else if (line.startsWith("<v ")) {
      const speakerMatch = line.match(/^<v\s+([^>]+)>\s*(.*)/);
      if (speakerMatch) {
        const speaker = speakerMatch[1];
        const text = speakerMatch[2];
        if (speaker !== undefined && text !== undefined) {
          currentSpeaker = speaker;
          currentText = text.replace(/\s+/g, " ").trim();
        }
      }
    }
    // Text content without speaker
    else if (line !== "") {
      if (currentText) {
        currentText = `${currentText} ${line.replace(/\s+/g, " ").trim()}`;
      } else {
        currentText = line.replace(/\s+/g, " ").trim();
      }
    }

    i++;
  }

  // Add the last segment
  if (currentId !== null && currentStartTime && currentEndTime) {
    segments.push({
      id: currentId,
      startTime: currentStartTime,
      endTime: currentEndTime,
      speaker: currentSpeaker,
      text: currentText || "",
    });
  }

  // Combine consecutive segments from the same speaker
  const combinedSegments: VttSegment[] = [];
  let currentSegment = segments[0];

  for (let j = 1; j < segments.length; j++) {
    const nextSegment = segments[j];
    if (!nextSegment) continue;

    if (currentSegment && nextSegment.speaker === currentSegment.speaker) {
      // Combine with previous segment
      currentSegment.endTime = nextSegment.endTime;
      currentSegment.text = `${currentSegment.text} ${nextSegment.text}`;
    } else {
      // Add current segment to results and start a new one
      if (currentSegment) {
        combinedSegments.push(currentSegment);
      }
      currentSegment = nextSegment;
    }
  }

  // Add the last combined segment
  if (currentSegment) {
    combinedSegments.push(currentSegment);
  }

  // Build the cleaned VTT content
  const result: string[] = [...headerLines];
  if (result.length > 0 && result[result.length - 1] !== "") {
    result.push("");
  }

  combinedSegments.forEach((segment, index) => {
    result.push(String(index + 1));
    result.push(`${segment.startTime} --> ${segment.endTime}`);
    if (segment.speaker) {
      result.push(`<v ${segment.speaker}>${segment.text}`);
    } else {
      result.push(segment.text);
    }
    result.push("");
  });

  return result.join("\n");
}

/**
 * Extracts VTT segments between specified start and end segment IDs.
 *
 * @param vtt The VTT content string
 * @param startSegmentId The starting segment ID to extract from
 * @param endSegmentId The ending segment ID to extract to
 * @returns A string containing only the VTT segments within the specified range
 */
export function extractVttSegments(
  vtt: string,
  startSegmentId: number,
  endSegmentId: number,
): string {
  // Split the VTT into lines
  const lines = vtt.split("\n");
  const extractedLines: string[] = [];

  let currentSegmentId: number | null = null;
  let includeSegment = false;

  for (const line of lines) {
    // Check if line is a segment ID (just a number)
    const [, segmentIdMatch] = line.trim().match(/^(\d+)$/) ?? [];

    if (segmentIdMatch) {
      currentSegmentId = Number.parseInt(segmentIdMatch, 10);
      includeSegment =
        currentSegmentId >= startSegmentId && currentSegmentId <= endSegmentId;

      if (includeSegment) {
        extractedLines.push(line);
      }
      continue;
    }

    // Include the line if we're in a segment we want to keep
    if (includeSegment) {
      extractedLines.push(line);
    }
  }

  return extractedLines.join("\n");
}

/**
 * Gets the start and end timestamps for VTT segments.
 *
 * @param vtt The VTT content string
 * @param startSegmentId The segment ID to find the start timestamp for
 * @param endSegmentId Optional segment ID to find the end timestamp for. If not provided, uses startSegmentId for both.
 * @returns An object containing start and end timestamps, or null if not found
 */
export function getVttSegmentTimestamps(
  vtt: string,
  startSegmentId: number,
  endSegmentId?: number,
): { start: string; end: string } | null {
  // Use regex to find the start segment ID followed by timestamps
  const startPattern = new RegExp(
    `^${startSegmentId}\\s*\\n(\\d{2}:\\d{2}:\\d{2}\\.\\d{3})\\s+-->\\s+(\\d{2}:\\d{2}:\\d{2}\\.\\d{3})`,
    "m",
  );

  const startMatch = vtt.match(startPattern);

  if (!startMatch?.[1]) {
    return null;
  }

  // If no end segment ID is provided, use the same segment for both start and end
  if (endSegmentId === undefined || endSegmentId === startSegmentId) {
    if (startMatch?.[2]) {
      return {
        start: startMatch[1],
        end: startMatch[2],
      };
    }
    return null;
  }

  // If different end segment ID is provided, find its end timestamp
  const endPattern = new RegExp(
    `^${endSegmentId}\\s*\\n(\\d{2}:\\d{2}:\\d{2}\\.\\d{3})\\s+-->\\s+(\\d{2}:\\d{2}:\\d{2}\\.\\d{3})`,
    "m",
  );

  const endMatch = vtt.match(endPattern);

  if (startMatch?.[1] && endMatch?.[2]) {
    return {
      start: startMatch[1],
      end: endMatch[2],
    };
  }

  return null;
}

/**
 * Converts a VTT timestamp (HH:MM:SS.mmm) to seconds
 *
 * @param timestamp The VTT timestamp in format HH:MM:SS.mmm
 * @returns The timestamp converted to seconds as a number, or null if invalid format
 */
export function vttTimestampToSeconds(timestamp: string): number | null {
  // Match the timestamp format HH:MM:SS.mmm
  const match = timestamp.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/);

  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1] ?? "0", 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const seconds = Number.parseInt(match[3] ?? "0", 10);
  const milliseconds = Number.parseInt(match[4] ?? "0", 10);

  // Convert to seconds
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}
