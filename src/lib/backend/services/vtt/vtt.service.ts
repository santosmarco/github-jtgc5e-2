import _ from "lodash";
import type { Tagged } from "type-fest";

export type VttWordInput = {
  content: string;
  startTimestamp: string;
  endTimestamp: string;
  index: number;
};

export type VttCueInput = {
  index: number;
  startTimestamp: string;
  endTimestamp: string;
  words?: VttWord[];
  speaker: string;
};

export type RecallTranscriptWord = {
  text: string;
  start_timestamp: number;
  end_timestamp: number;
};

export type RecallTranscriptSlice = {
  words: RecallTranscriptWord[];
  speaker: string;
};

export type RecallTranscript = RecallTranscriptSlice[];

// Regex for matching a cue index (single number)
const VTT_INDEX_RX = /^(\d+)$/;

// Regex for matching a timestamp line (start --> end)
// This regex now handles milliseconds with different precision (1, 2, or 3 digits)
const VTT_TIMESTAMP_RX =
  /^(\d{2}:\d{2}:\d{2}\.\d{1,3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{1,3})$/;

// Regex for matching speaker and text line (<v Speaker>Text)
const VTT_CONTENT_RX = /^<v\s+(.*?)>\s*(.*)$/;

// Regex for splitting VTT file into cue blocks
const VTT_BLOCK_SPLIT_RX = /\n\n+/;

// Regex for removing WebVTT header
const VTT_HEADER_RX = /^WEBVTT[\s\S]*?\n\n/m;

/**
 * Represents a single word in a WebVTT cue.
 * Each word contains content, timestamps, and an index.
 */
export class VttWord {
  public content: string;
  public startTimestamp: string;
  public endTimestamp: string;
  public index: number;

  public startInMilliseconds: number;
  public endInMilliseconds: number;
  public durationInMilliseconds: number;

  constructor(input: VttWordInput) {
    this.content = input.content;
    this.startTimestamp = input.startTimestamp;
    this.endTimestamp = input.endTimestamp;
    this.index = input.index;

    this.startInMilliseconds = timestampToMilliseconds(input.startTimestamp);
    this.endInMilliseconds = timestampToMilliseconds(input.endTimestamp);
    this.durationInMilliseconds =
      this.endInMilliseconds - this.startInMilliseconds;
  }

  /**
   * Returns a string representation of the word
   * @returns The word content as a string
   */
  public toString(): string {
    return this.content;
  }
}

/**
 * Represents a single cue in a WebVTT file.
 * Each cue contains an index, timestamps, speaker, and text.
 */
export class VttCue {
  public index: number;
  public startTimestamp: string;
  public endTimestamp: string;
  public words: VttWord[];
  public speaker: string;

  public startInMilliseconds: number;
  public endInMilliseconds: number;
  public durationInMilliseconds: number;

  private _vtt?: Vtt;

  constructor(input: VttCueInput, vtt?: Vtt) {
    this.index = input.index;
    this.startTimestamp = input.startTimestamp;
    this.speaker = input.speaker;

    // Calculate millisecond values
    this.startInMilliseconds = timestampToMilliseconds(input.startTimestamp);

    // Validate and potentially correct end timestamp
    this.endInMilliseconds = timestampToMilliseconds(input.endTimestamp);

    // Ensure end timestamp is after start timestamp with a minimum duration
    const MIN_DURATION_MS = 100; // Minimum 100ms duration
    if (this.endInMilliseconds <= this.startInMilliseconds) {
      this.endInMilliseconds = this.startInMilliseconds + MIN_DURATION_MS;
      // Update the string representation to match
      this.endTimestamp = millisecondsToTimestamp(this.endInMilliseconds);
    } else {
      this.endTimestamp = input.endTimestamp;
    }

    this.durationInMilliseconds =
      this.endInMilliseconds - this.startInMilliseconds;

    // Handle the 'words' property
    if (input.words) {
      this.words = input.words;
    } else {
      // Default to empty array
      this.words = [];
    }

    this._vtt = vtt;
  }

  /**
   * Gets the text of the cue as a single string.
   * Joins the words with spaces and removes any empty strings.
   * @returns The text of the cue as a single string
   */
  public get text(): string {
    return this.words
      .map((word) => word.content)
      .filter((word) => word.length > 0)
      .join(" ");
  }

  /**
   * Gets an array of word strings from the cue's text.
   * This is for backward compatibility with tests.
   * @returns Array of word strings from the text
   */
  public get wordStrings(): string[] {
    return this.words.map((word) => word.content);
  }

  /**
   * Returns the previous cue in the VTT file
   * @returns The previous VttCue or undefined if this is the first cue
   */
  public previous(): VttCue | undefined {
    if (!this._vtt) return undefined;
    const currentIndex = this._vtt.cues.findIndex(
      (cue) => cue.index === this.index,
    );
    if (currentIndex <= 0) return undefined;
    return this._vtt.cues[currentIndex - 1];
  }

  /**
   * Returns the next cue in the VTT file
   * @returns The next VttCue or undefined if this is the last cue
   */
  public next(): VttCue | undefined {
    if (!this._vtt) return undefined;
    const currentIndex = this._vtt.cues.findIndex(
      (cue) => cue.index === this.index,
    );
    if (currentIndex === -1 || currentIndex === this._vtt.cues.length - 1)
      return undefined;
    return this._vtt.cues[currentIndex + 1];
  }

  /**
   * Converts the cue to its WebVTT string representation
   * @returns The WebVTT formatted string for this cue
   */
  public toString(): string {
    return [
      this.index.toString(),
      `${this.startTimestamp} --> ${this.endTimestamp}`,
      `<v ${this.speaker}> ${this.text}`,
      "", // Empty line after cue
    ].join("\n");
  }

  /**
   * Returns a string representation of the cue in the format:
   * `[index] (startTimestamp --> endTimestamp) speaker: text`
   * @returns The formatted string
   */
  public line(): string {
    return `[${this.index}] (${this.startTimestamp} --> ${this.endTimestamp}) ${this.speaker}: ${this.text}`;
  }
}

/**
 * Represents a parsed WebVTT file containing multiple cues.
 */
export class Vtt {
  public cues: VttCue[];

  constructor(input: string | VttCue[]) {
    this.cues = Array.isArray(input)
      ? input.map((cue) => new VttCue(cue, this))
      : parseVtt(input, this);
  }

  /**
   * Returns a new Vtt instance containing only the cues within the specified time range
   * @param startMs Start time in milliseconds
   * @param endMs End time in milliseconds
   * @returns A new Vtt instance with filtered cues
   */
  public slice(startMs: number, endMs: number): Vtt {
    const filteredCues = this.cues.filter(
      (cue) =>
        // Include cues that overlap with the time range
        // A cue overlaps if it starts before the end of the range AND ends after the start of the range
        cue.startInMilliseconds <= endMs && cue.endInMilliseconds >= startMs,
    );

    const vtt = new Vtt("");
    vtt.cues = filteredCues;
    return vtt;
  }

  /**
   * Returns all cues that are active at the specified timestamp
   * @param timestampMs Timestamp in milliseconds
   * @returns Array of VttCue objects that are active at the given timestamp
   */
  public getActiveCues(timestampMs: number): VttCue[] {
    return this.cues.filter(
      (cue) =>
        cue.startInMilliseconds <= timestampMs &&
        cue.endInMilliseconds >= timestampMs,
    );
  }

  /**
   * Merges another VTT file into this one, sorting all cues by timestamp
   * @param otherVtt The VTT file to merge with this one
   * @returns A new Vtt instance with merged and sorted cues
   */
  public merge(otherVtt: Vtt): Vtt {
    const mergedCues = [...this.cues, ...otherVtt.cues].sort(
      (a, b) => a.startInMilliseconds - b.startInMilliseconds,
    );
    return new Vtt(mergedCues);
  }

  /**
   * Returns a cue at a specific position in a chronologically sorted list of cues
   * @param position The position in the sorted list (0-based index)
   * @param sortBy The property to sort by, defaults to 'startInMilliseconds'
   * @returns The VttCue at the specified position or undefined if not found
   */
  public getCueByPosition(
    position: number,
    sortBy:
      | "startInMilliseconds"
      | "endInMilliseconds"
      | "index" = "startInMilliseconds",
  ): VttCue | undefined {
    if (
      this.cues.length === 0 ||
      position < 0 ||
      position >= this.cues.length
    ) {
      return undefined;
    }

    // Sort cues by the specified property
    const sortedCues = [...this.cues].sort((a, b) => a[sortBy] - b[sortBy]);

    // Return the cue at the requested position
    return sortedCues[position];
  }

  /**
   * Splits the VTT file into chunks of specified duration
   * @param durationMs Duration of each chunk in milliseconds
   * @returns Array of Vtt instances, each containing cues within the duration window
   */
  public split(durationMs: number): Vtt[] {
    if (this.cues.length === 0) return [];

    const firstCue = this.cues[0];
    const lastCue = this.cues[this.cues.length - 1];

    if (!firstCue || !lastCue) return [];

    const chunks: Vtt[] = [];
    for (
      let startTime = firstCue.startInMilliseconds;
      startTime < lastCue.endInMilliseconds;
      startTime += durationMs
    ) {
      const endTime = startTime + durationMs;

      // For the test to pass, we need to include cues that overlap with the chunk time range
      // This behavior matches the slice method but focused on specific chunk ranges
      const chunkCues = this.cues.filter(
        (cue) =>
          // A cue is in the chunk if:
          // 1. It starts before the end of the chunk AND
          // 2. It ends after the start of the chunk
          cue.startInMilliseconds < endTime &&
          cue.endInMilliseconds > startTime,
      );

      const chunkVtt = new Vtt("");
      chunkVtt.cues = chunkCues;
      chunks.push(chunkVtt);
    }

    return chunks;
  }

  /**
   * Finds the closest cue to a given timestamp
   * @param timestampMs Timestamp in milliseconds
   * @returns The closest VttCue or undefined if no cues exist
   */
  public findCueByTime(timestampMs: number): VttCue | undefined {
    if (this.cues.length === 0) return undefined;

    return this.cues.reduce((closest, current) => {
      const currentDistance = Math.abs(
        current.startInMilliseconds - timestampMs,
      );
      const closestDistance = Math.abs(
        closest.startInMilliseconds - timestampMs,
      );
      return currentDistance < closestDistance ? current : closest;
    });
  }

  /**
   * Adjusts all timestamps by a specified offset
   * @param offsetMs Offset in milliseconds (positive or negative)
   * @returns A new Vtt instance with adjusted timestamps
   */
  public adjustTimestamps(offsetMs: number): Vtt {
    if (this.cues.length === 0) return new Vtt("");

    const adjustedCues: VttCue[] = [];

    for (const cue of this.cues) {
      const newStartMs = cue.startInMilliseconds + offsetMs;
      const newEndMs = cue.endInMilliseconds + offsetMs;

      const newCue = new VttCue({
        index: cue.index,
        startTimestamp: millisecondsToTimestamp(newStartMs),
        endTimestamp: millisecondsToTimestamp(newEndMs),
        words: cue.words,
        speaker: cue.speaker,
      });

      adjustedCues.push(newCue);
    }

    const newVtt = new Vtt("");
    newVtt.cues = adjustedCues;
    return newVtt;
  }

  /**
   * Removes all cues from a specific speaker
   * @param name Speaker name to remove
   * @returns A new Vtt instance without the specified speaker's cues
   */
  public removeSpeaker(name: string): Vtt {
    const filteredCues = this.cues.filter((cue) => cue.speaker !== name);
    return new Vtt(filteredCues);
  }

  /**
   * Cleans and normalizes the VTT content by:
   * - Removing empty or invalid cues
   * - Reindexing cues sequentially
   * - Sorting cues chronologically
   * - Removing duplicate cues
   * - Trimming whitespace in text and speaker names
   * - Joining sequential cues from the same speaker
   * @param maxGapMs Maximum gap in milliseconds between cues to be considered sequential (default: 500ms)
   * @returns A new Vtt instance with cleaned content
   */
  public clean(maxGapMs = Number.POSITIVE_INFINITY): CleanedVtt {
    if (this.cues.length === 0) return new Vtt("") as CleanedVtt;

    // Remove invalid cues and clean existing ones
    const cleanedCues = this.cues
      .filter((cue) => {
        // Remove cues with empty text or speaker
        return cue.text?.trim() !== "" && cue.speaker?.trim() !== "";
      })
      .map((cue) => {
        cue.speaker = cue.speaker?.trim() ?? "";
        cue.words = cue.words.map((word) => {
          word.content = word.content?.trim() ?? "";
          return word;
        });
        return cue;
      });

    // Sort cues chronologically
    const sortedCues = [...cleanedCues].sort(
      (a, b) => a.startInMilliseconds - b.startInMilliseconds,
    );

    // Remove duplicates (same start time, end time, speaker, and text)
    const uniqueCues = sortedCues.filter((cue, index, array) => {
      if (index === 0) return true;
      const prevCue = array[index - 1];
      // Since we're filtering from index 1 onwards, prevCue will always exist
      return !(
        prevCue &&
        cue.startInMilliseconds === prevCue.startInMilliseconds &&
        cue.endInMilliseconds === prevCue.endInMilliseconds &&
        cue.speaker === prevCue.speaker &&
        cue.text === prevCue.text
      );
    });

    // Join sequential cues from the same speaker
    const joinedCues: typeof uniqueCues = [];

    for (const cue of uniqueCues) {
      // If this is the first cue, add it directly
      if (joinedCues.length === 0) {
        joinedCues.push(cue);
        continue;
      }

      // Get the last cue in our result array
      const lastCue = joinedCues[joinedCues.length - 1];

      // Check if this cue should be joined with the previous one:
      // 1. Same speaker
      // 2. Within maxGapMs of the previous cue's end time
      if (
        lastCue &&
        cue.speaker === lastCue.speaker &&
        cue.startInMilliseconds - lastCue.endInMilliseconds <= maxGapMs
      ) {
        // Join this cue with the previous one by creating a proper VttCue instance
        joinedCues[joinedCues.length - 1] = new VttCue(
          {
            index: lastCue.index,
            startTimestamp: lastCue.startTimestamp,
            endTimestamp: cue.endTimestamp,
            // Combine the words arrays, preserving order
            words: [...lastCue.words, ...cue.words],
            speaker: lastCue.speaker,
          },
          this,
        );
      } else {
        // Not sequential or different speaker, add as a separate cue
        joinedCues.push(cue);
      }
    }

    // Reindex cues sequentially
    const reindexedCues: VttCue[] = joinedCues.map(
      (cue, index) =>
        new VttCue(
          {
            index: index + 1,
            startTimestamp: cue.startTimestamp,
            endTimestamp: cue.endTimestamp,
            words: cue.words,
            speaker: cue.speaker,
          },
          this,
        ),
    );

    return new Vtt(reindexedCues) as CleanedVtt;
  }

  /**
   * Converts the VTT file to its string representation
   * @returns The complete WebVTT formatted string
   */
  public toString(): string {
    return [
      "WEBVTT",
      "", // Empty line after header
      ...this.cues.map((cue) => cue.toString()),
    ].join("\n");
  }

  /**
   * Converts the VTT file to a Recall transcript array
   * @returns Array of Recall transcript segments
   */
  public toRecallTranscript(): RecallTranscript {
    return this.cues.map((cue) => ({
      words: cue.words.map((word) => ({
        text: word.content,
        start_timestamp: word.startInMilliseconds / 1000,
        end_timestamp: word.endInMilliseconds / 1000,
      })),
      speaker: cue.speaker,
    }));
  }

  /**
   * Converts a Recall transcript array to a VTT instance
   * @param transcript Array of transcript segments from Recall
   * @returns A new Vtt instance containing the converted transcript
   */
  public static fromRecallTranscript(transcript: RecallTranscript): Vtt {
    if (!transcript || transcript.length === 0) {
      return new Vtt("");
    }

    const cues: VttCue[] = transcript.map((segment, index) => {
      const wordsSorted = _.sortBy(segment.words, (w) => w.start_timestamp);

      if (wordsSorted.length === 0) {
        // Handle empty segment with defaults
        return new VttCue({
          index: index + 1,
          startTimestamp: "00:00:00.000",
          endTimestamp: "00:00:00.100", // Minimum duration
          words: [],
          speaker: segment.speaker ?? "",
        });
      }

      const startTimestamp = (wordsSorted[0]?.start_timestamp ?? 0) * 1000;
      let endTimestamp =
        (wordsSorted[wordsSorted.length - 1]?.end_timestamp ?? 0) * 1000;

      // Ensure end timestamp is after start timestamp
      if (endTimestamp <= startTimestamp) {
        endTimestamp = startTimestamp + 100; // Minimum 100ms duration
      }

      return new VttCue({
        index: index + 1,
        startTimestamp: millisecondsToTimestamp(startTimestamp),
        endTimestamp: millisecondsToTimestamp(endTimestamp),
        words: wordsSorted.map(
          (w, index) =>
            new VttWord({
              content: w.text?.trim() ?? "",
              startTimestamp: millisecondsToTimestamp(w.start_timestamp * 1000),
              endTimestamp: millisecondsToTimestamp(w.end_timestamp * 1000),
              index,
            }),
        ),
        speaker: segment.speaker ?? "",
      });
    });

    return new Vtt(cues);
  }
}

/**
 * Converts a timestamp string (HH:MM:SS.MMM) to milliseconds.
 */
function timestampToMilliseconds(timestamp: string): number {
  if (!timestamp) return 0;

  const parts = timestamp.split(":");
  const hours = parts[0] ? Number.parseInt(parts[0], 10) : 0;
  const minutes = parts[1] ? Number.parseInt(parts[1], 10) : 0;

  // Handle seconds and milliseconds separately
  if (!parts[2]) return hours * 3_600_000 + minutes * 60_000;

  const secondsParts = parts[2].split(".");
  const seconds = secondsParts[0] ? Number.parseInt(secondsParts[0], 10) : 0;

  // Properly handle milliseconds based on the number of digits
  let milliseconds = 0;
  if (secondsParts[1]) {
    milliseconds = Number.parseInt(secondsParts[1], 10);
    // Adjust based on number of digits (e.g., '5' -> 500, '50' -> 500, '500' -> 500)
    if (secondsParts[1].length === 1) {
      milliseconds *= 100;
    } else if (secondsParts[1].length === 2) {
      milliseconds *= 10;
    }
  }

  return hours * 3_600_000 + minutes * 60_000 + seconds * 1_000 + milliseconds;
}

/**
 * Converts milliseconds to a timestamp string in format HH:MM:SS.mmm
 * @param milliseconds Number of milliseconds
 * @returns Formatted timestamp string
 */
export function millisecondsToTimestamp(milliseconds: number): string {
  // Ensure we have a valid number and truncate to an integer to avoid floating point issues
  const ms = Math.max(0, Math.floor(milliseconds));

  const hours = Math.floor(ms / 3_600_000);
  const remainingAfterHours = ms % 3_600_000;

  const minutes = Math.floor(remainingAfterHours / 60_000);
  const remainingAfterMinutes = remainingAfterHours % 60_000;

  const seconds = Math.floor(remainingAfterMinutes / 1_000);
  const remainingMilliseconds = remainingAfterMinutes % 1_000;

  // Pad with leading zeros
  const hoursStr = hours.toString().padStart(2, "0");
  const minutesStr = minutes.toString().padStart(2, "0");
  const secondsStr = seconds.toString().padStart(2, "0");
  const msStr = remainingMilliseconds.toString().padStart(3, "0");

  return `${hoursStr}:${minutesStr}:${secondsStr}.${msStr}`;
}

/**
 * Parses WebVTT content into an array of VttCue objects.
 *
 * @param {string} text - The WebVTT content to parse
 * @param {Vtt} vtt - The parent Vtt instance
 * @returns {VttCue[]} Array of parsed VttCue objects
 */
function parseVtt(text: string, vtt: Vtt): VttCue[] {
  if (!text) return [];

  // Handle VTT without a blank line after the header
  // Replace WEBVTT line with WEBVTT\n\n to ensure proper parsing
  let content = text;
  if (text.startsWith("WEBVTT") && !text.startsWith("WEBVTT\n\n")) {
    content = content.replace(/^(WEBVTT[^\n]*\n)(?!\n)/, "$1\n");
  }

  // Remove the header (everything before the first cue number)
  content = content.replace(VTT_HEADER_RX, "");

  // Split content into cue blocks (separated by blank lines)
  const cueBlocks = content.split(VTT_BLOCK_SPLIT_RX).filter(Boolean);
  const cues: VttCue[] = [];

  for (const block of cueBlocks) {
    try {
      const lines = block
        .split("\n")
        .map((line) => line?.trim() ?? "")
        .filter(Boolean);

      // Need at least 3 lines for a valid cue
      if (lines.length < 3) continue;

      // First line is the cue index
      const indexLine = lines[0];
      if (!indexLine) continue;
      const indexMatch = indexLine.match(VTT_INDEX_RX);
      if (!indexMatch || !indexMatch[1]) continue;
      const index = Number(indexMatch[1]);

      // Second line contains timestamps
      const timestampLine = lines[1];
      if (!timestampLine) continue;
      const timestampMatch = timestampLine.match(VTT_TIMESTAMP_RX);
      if (!timestampMatch || !timestampMatch[1] || !timestampMatch[2]) continue;
      const startTimestamp = timestampMatch[1];
      const endTimestamp = timestampMatch[2];

      // Validate timestamp order
      const startMs = timestampToMilliseconds(startTimestamp);
      const endMs = timestampToMilliseconds(endTimestamp);
      if (endMs <= startMs) continue; // Skip invalid cues with end time before or equal to start time

      // Third line contains speaker and text
      const contentLine = lines[2];
      if (!contentLine) continue;
      const speakerTextMatch = contentLine.match(VTT_CONTENT_RX);
      if (!speakerTextMatch || !speakerTextMatch[1] || !speakerTextMatch[2])
        continue;
      const speaker = speakerTextMatch[1];
      const textContent = speakerTextMatch[2];

      // Create VttWord objects from the text
      const wordStrings = textContent
        .split(/\s+/)
        .filter((word) => word.length > 0);
      const cueStartMs = timestampToMilliseconds(startTimestamp);
      const cueEndMs = timestampToMilliseconds(endTimestamp);
      const timePerWord =
        wordStrings.length > 0
          ? (cueEndMs - cueStartMs) / wordStrings.length
          : 0;

      const words = wordStrings.map((content, wordIndex) => {
        const wordStartMs = cueStartMs + timePerWord * wordIndex;
        const wordEndMs = wordStartMs + timePerWord;

        return new VttWord({
          content,
          startTimestamp: millisecondsToTimestamp(wordStartMs),
          endTimestamp: millisecondsToTimestamp(wordEndMs),
          index: wordIndex + 1, // 1-based indexing
        });
      });

      cues.push(
        new VttCue(
          {
            index,
            startTimestamp,
            endTimestamp,
            words,
            speaker,
          },
          vtt,
        ),
      );
    } catch (error) {
      console.error("Error parsing cue block:", block, error);
      // Continue to next block if there's an error
    }
  }

  return cues;
}

export type CleanedVtt = Tagged<Vtt, "$cleaned">;
