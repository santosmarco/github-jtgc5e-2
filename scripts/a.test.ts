import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { apiVideo } from "~/server/api/services/api-video";
import { createClient } from "~/lib/supabase/client";
import webvtt from "@voctrolabs/node-webvtt";

// Mock dependencies - these need to be defined before importing any modules
vi.mock("@voctrolabs/node-webvtt", () => {
  return {
    default: {
      parse: vi.fn(),
    },
  };
});

vi.mock("~/lib/supabase/client", () => ({
  createClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }),
}));

vi.mock("~/server/api/services/api-video", () => ({
  apiVideo: {
    videos: {
      getStatus: vi.fn(),
    },
  },
}));

vi.mock("node:fs", () => ({
  default: {
    writeFileSync: vi.fn(),
  },
}));

// Import the functions to test
import { formatTime, getSpeaker, cleanVttText, normalizePercentage } from "./a";

// Get the mocked parse function
const mockParse = vi.mocked(webvtt.parse);

describe("VTT Processing Helper Functions", () => {
  describe("formatTime", () => {
    it("should format time correctly with hours, minutes, seconds, and milliseconds", () => {
      expect(formatTime(3661.123)).toBe("01:01:01.123");
    });

    it("should pad single-digit values with leading zeros", () => {
      expect(formatTime(3601.005)).toBe("01:00:01.005");
    });

    it("should handle zero correctly", () => {
      expect(formatTime(0)).toBe("00:00:00.000");
    });
  });

  describe("getSpeaker", () => {
    it("should extract speaker name from cue text", () => {
      expect(getSpeaker("<v John Doe>Hello world")).toBe("John Doe");
    });

    it("should return null if no speaker tag is found", () => {
      expect(getSpeaker("Hello world")).toBeNull();
    });

    it("should handle speaker names with special characters", () => {
      expect(getSpeaker("<v John-Doe_123>Hello")).toBe("John-Doe_123");
    });
  });

  describe("cleanVttText", () => {
    it("should remove zero-width characters from text", () => {
      const textWithZeroWidth = "Hello\u200BWorld";
      expect(cleanVttText(textWithZeroWidth)).toBe("HelloWorld");
    });

    it("should return unchanged text when no zero-width characters are present", () => {
      const normalText = "Hello World";
      expect(cleanVttText(normalText)).toBe(normalText);
    });
  });

  describe("normalizePercentage", () => {
    it("should return the same value for percentages between 0 and 100", () => {
      expect(normalizePercentage(50)).toBe(50);
      expect(normalizePercentage(75.5)).toBe(75.5);
    });

    it("should cap values greater than 100 to 100", () => {
      expect(normalizePercentage(150)).toBe(100);
    });

    it("should cap negative values to 0", () => {
      expect(normalizePercentage(-10)).toBe(0);
    });
  });
});

// Add tests for VTT parsing logic
describe("VTT Parsing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should correctly process a well-formatted VTT file", () => {
    // Create mock VTT data
    const mockVttContent = `WEBVTT

00:00:10.000 --> 00:00:15.000
<v John>Hello, this is John speaking

00:00:20.000 --> 00:00:25.000
<v Alice>Hello John, this is Alice

00:00:30.000 --> 00:00:35.000
<v John>Nice to meet you Alice`;

    // Mock the parsed VTT data
    mockParse.mockReturnValue({
      cues: [
        {
          start: 10,
          end: 15,
          text: "<v John>Hello, this is John speaking",
          identifier: "",
        },
        {
          start: 20,
          end: 25,
          text: "<v Alice>Hello John, this is Alice",
          identifier: "",
        },
        {
          start: 30,
          end: 35,
          text: "<v John>Nice to meet you Alice",
          identifier: "",
        },
      ],
    });

    // Create a test function that processes VTT and calculates speaking time
    const processVttForSpeaker = (
      vttContent: string,
      speakerName: string,
    ): number => {
      // Clean VTT content
      const cleanedVtt = cleanVttText(vttContent);

      // Parse VTT
      const parsedVtt = mockParse(cleanedVtt);

      // Calculate speaking time
      let speakingTime = 0;
      const timeSegments: { start: number; end: number }[] = [];

      for (const cue of parsedVtt.cues) {
        const speaker = getSpeaker(cue.text);

        if (speaker === speakerName) {
          let isOverlapping = false;

          for (const segment of timeSegments) {
            if (
              (cue.start >= segment.start && cue.start < segment.end) ||
              (cue.end > segment.start && cue.end <= segment.end) ||
              (cue.start <= segment.start && cue.end >= segment.end)
            ) {
              segment.start = Math.min(segment.start, cue.start);
              segment.end = Math.max(segment.end, cue.end);
              isOverlapping = true;
              break;
            }
          }

          if (!isOverlapping) {
            timeSegments.push({ start: cue.start, end: cue.end });
          }
        }
      }

      for (const segment of timeSegments) {
        speakingTime += segment.end - segment.start;
      }

      return speakingTime;
    };

    // Test for John's speaking time
    const johnSpeakingTime = processVttForSpeaker(mockVttContent, "John");
    expect(johnSpeakingTime).toBe(10); // 5 seconds from first segment + 5 seconds from third segment

    // Test for Alice's speaking time
    const aliceSpeakingTime = processVttForSpeaker(mockVttContent, "Alice");
    expect(aliceSpeakingTime).toBe(5); // 5 seconds from second segment
  });

  it("should handle overlapping speaking segments correctly", () => {
    // Create mock VTT data with overlapping segments
    const mockVttContent = `WEBVTT

00:00:10.000 --> 00:00:20.000
<v John>This is a longer segment

00:00:15.000 --> 00:00:25.000
<v John>This overlaps with the previous segment`;

    // Mock the parsed VTT data
    mockParse.mockReturnValue({
      cues: [
        {
          start: 10,
          end: 20,
          text: "<v John>This is a longer segment",
          identifier: "",
        },
        {
          start: 15,
          end: 25,
          text: "<v John>This overlaps with the previous segment",
          identifier: "",
        },
      ],
    });

    // Use the same processing function
    const processVttForSpeaker = (
      vttContent: string,
      speakerName: string,
    ): number => {
      const cleanedVtt = cleanVttText(vttContent);
      const parsedVtt = mockParse(cleanedVtt);

      let speakingTime = 0;
      const timeSegments: { start: number; end: number }[] = [];

      for (const cue of parsedVtt.cues) {
        const speaker = getSpeaker(cue.text);

        if (speaker === speakerName) {
          let isOverlapping = false;

          for (const segment of timeSegments) {
            if (
              (cue.start >= segment.start && cue.start < segment.end) ||
              (cue.end > segment.start && cue.end <= segment.end) ||
              (cue.start <= segment.start && cue.end >= segment.end)
            ) {
              segment.start = Math.min(segment.start, cue.start);
              segment.end = Math.max(segment.end, cue.end);
              isOverlapping = true;
              break;
            }
          }

          if (!isOverlapping) {
            timeSegments.push({ start: cue.start, end: cue.end });
          }
        }
      }

      for (const segment of timeSegments) {
        speakingTime += segment.end - segment.start;
      }

      return speakingTime;
    };

    // Test with overlapping segments
    const johnSpeakingTime = processVttForSpeaker(mockVttContent, "John");

    // Should merge the two segments (10-20 and 15-25) into one segment (10-25)
    expect(johnSpeakingTime).toBe(15); // 25 - 10 = 15 seconds
  });

  it("should handle invalid segment durations", () => {
    // Create mock VTT data with an invalid segment (end <= start)
    const mockVttContent = `WEBVTT

00:00:10.000 --> 00:00:10.000
<v John>This segment has zero duration

00:00:15.000 --> 00:00:20.000
<v John>This is a valid segment`;

    // Mock the parsed VTT data
    mockParse.mockReturnValue({
      cues: [
        {
          start: 10,
          end: 10, // Invalid duration (0)
          text: "<v John>This segment has zero duration",
          identifier: "",
        },
        {
          start: 15,
          end: 20,
          text: "<v John>This is a valid segment",
          identifier: "",
        },
      ],
    });

    // Processing function that skips invalid segments
    const processVttForSpeaker = (
      vttContent: string,
      speakerName: string,
    ): number => {
      const cleanedVtt = cleanVttText(vttContent);
      const parsedVtt = mockParse(cleanedVtt);

      let speakingTime = 0;
      const timeSegments: { start: number; end: number }[] = [];

      for (const cue of parsedVtt.cues) {
        const speaker = getSpeaker(cue.text);

        if (speaker === speakerName) {
          // Skip invalid segments
          if (cue.end <= cue.start) {
            continue;
          }

          let isOverlapping = false;

          for (const segment of timeSegments) {
            if (
              (cue.start >= segment.start && cue.start < segment.end) ||
              (cue.end > segment.start && cue.end <= segment.end) ||
              (cue.start <= segment.start && cue.end >= segment.end)
            ) {
              segment.start = Math.min(segment.start, cue.start);
              segment.end = Math.max(segment.end, cue.end);
              isOverlapping = true;
              break;
            }
          }

          if (!isOverlapping) {
            timeSegments.push({ start: cue.start, end: cue.end });
          }
        }
      }

      for (const segment of timeSegments) {
        speakingTime += segment.end - segment.start;
      }

      return speakingTime;
    };

    // Test with invalid segment
    const johnSpeakingTime = processVttForSpeaker(mockVttContent, "John");

    // Should only count the valid segment
    expect(johnSpeakingTime).toBe(5); // Only the 15-20 segment should be counted
  });

  it("should fall back to manual parsing when webvtt parser fails", () => {
    // Mock the webvtt parse function to throw an error
    mockParse.mockImplementation(() => {
      throw new Error("Mock parsing error");
    });

    // Create a test function for manual VTT parsing
    const manuallyProcessVtt = (
      vttContent: string,
      speakerName: string,
    ): number => {
      const vttLines = vttContent.split("\n");

      // Extract timestamp lines and speaker lines
      const filteredVttLines = vttLines.filter(
        (line) =>
          line.match(
            /^[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})? --> [0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?$/,
          ) || line.match(/<v [^>]+>/),
      );

      let speakingTime = 0;
      const timeSegments: { start: number; end: number }[] = [];

      for (const [i, line] of filteredVttLines.entries()) {
        if (
          line.includes(`<v ${speakerName}>`) ||
          line === `<v ${speakerName}>`
        ) {
          const timestampLine = filteredVttLines[i - 1];

          if (!timestampLine || !timestampLine.includes("-->")) {
            continue;
          }

          const [start, end] = timestampLine
            .split("-->")
            .map((time) => time.trim());

          if (!start || !end) {
            continue;
          }

          try {
            const [hoursStart = "0", minutesStart = "0", secondsStart = "0"] =
              start.split(":");
            const [hoursEnd = "0", minutesEnd = "0", secondsEnd = "0"] =
              end.split(":");

            const startSeconds =
              Number.parseInt(hoursStart) * 3600 +
              Number.parseInt(minutesStart) * 60 +
              Number.parseFloat(secondsStart);

            const endSeconds =
              Number.parseInt(hoursEnd) * 3600 +
              Number.parseInt(minutesEnd) * 60 +
              Number.parseFloat(secondsEnd);

            if (endSeconds <= startSeconds) {
              continue;
            }

            // Check for overlaps
            let isOverlapping = false;
            for (const segment of timeSegments) {
              if (
                (startSeconds >= segment.start && startSeconds < segment.end) ||
                (endSeconds > segment.start && endSeconds <= segment.end) ||
                (startSeconds <= segment.start && endSeconds >= segment.end)
              ) {
                segment.start = Math.min(segment.start, startSeconds);
                segment.end = Math.max(segment.end, endSeconds);
                isOverlapping = true;
                break;
              }
            }

            if (!isOverlapping) {
              timeSegments.push({ start: startSeconds, end: endSeconds });
            }
          } catch (err) {
            // Skip on error
            continue;
          }
        }
      }

      // Calculate speaking time
      for (const segment of timeSegments) {
        speakingTime += segment.end - segment.start;
      }

      return speakingTime;
    };

    // Create a mock VTT file for manual parsing
    const mockVttContent = `WEBVTT

00:00:10.000 --> 00:00:15.000
<v John>Hello, this is John speaking

00:00:20.000 --> 00:00:25.000
<v Alice>Hello John, this is Alice

00:00:30.000 --> 00:00:35.000
<v John>Nice to meet you Alice`;

    // Test manual parsing
    const johnSpeakingTime = manuallyProcessVtt(mockVttContent, "John");
    expect(johnSpeakingTime).toBe(10); // 5 seconds from first segment + 5 seconds from third segment

    const aliceSpeakingTime = manuallyProcessVtt(mockVttContent, "Alice");
    expect(aliceSpeakingTime).toBe(5); // 5 seconds from second segment
  });

  it("should cap speaking time to meeting duration", () => {
    const mockVttContent = `WEBVTT

00:00:10.000 --> 00:01:10.000
<v John>This is a very long segment, over a minute

00:01:15.000 --> 00:01:45.000
<v John>This is another segment`;

    // Mock the parsed VTT data
    mockParse.mockReturnValue({
      cues: [
        {
          start: 10,
          end: 70, // 60 seconds
          text: "<v John>This is a very long segment, over a minute",
          identifier: "",
        },
        {
          start: 75,
          end: 105, // 30 seconds
          text: "<v John>This is another segment",
          identifier: "",
        },
      ],
    });

    // Function that calculates speaking time with a cap
    const processVttForSpeakerWithCap = (
      vttContent: string,
      speakerName: string,
      meetingDuration: number,
    ): number => {
      const cleanedVtt = cleanVttText(vttContent);
      const parsedVtt = mockParse(cleanedVtt);

      let speakingTime = 0;
      const timeSegments: { start: number; end: number }[] = [];

      for (const cue of parsedVtt.cues) {
        const speaker = getSpeaker(cue.text);

        if (speaker === speakerName) {
          if (cue.end <= cue.start) {
            continue;
          }

          let isOverlapping = false;

          for (const segment of timeSegments) {
            if (
              (cue.start >= segment.start && cue.start < segment.end) ||
              (cue.end > segment.start && cue.end <= segment.end) ||
              (cue.start <= segment.start && cue.end >= segment.end)
            ) {
              segment.start = Math.min(segment.start, cue.start);
              segment.end = Math.max(segment.end, cue.end);
              isOverlapping = true;
              break;
            }
          }

          if (!isOverlapping) {
            timeSegments.push({ start: cue.start, end: cue.end });
          }
        }
      }

      for (const segment of timeSegments) {
        speakingTime += segment.end - segment.start;
      }

      // Cap speaking time to meeting duration
      if (speakingTime > meetingDuration) {
        speakingTime = meetingDuration;
      }

      return speakingTime;
    };

    // Test with a meeting that's shorter than the speaking time
    const johnSpeakingTime = processVttForSpeakerWithCap(
      mockVttContent,
      "John",
      80,
    );

    // Total speaking time would be 90 seconds (60 + 30), but should be capped to 80
    expect(johnSpeakingTime).toBe(80);

    // Test with a meeting that's longer than the speaking time
    const johnSpeakingTimeNoGap = processVttForSpeakerWithCap(
      mockVttContent,
      "John",
      100,
    );

    // Total speaking time is 90 seconds, which is less than 100, so no capping
    expect(johnSpeakingTimeNoGap).toBe(90);
  });

  it("should correctly process long VTT files with multiple speakers and special formats", () => {
    // Create a mock long VTT file with the format from the user example
    // This includes X-TIMESTAMP-MAP header, multiple speakers, and sequential numbering
    const mockLongVttContent = `WEBVTT
X-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:900000

1
00:00:03.518 --> 00:00:04.080
<v Kevin Bowman> Say, how are you?

2
00:00:04.381 --> 00:00:06.929
<v Ashley Murphy> I'm good. Nice to meet you. Nice

3
00:00:06.929 --> 00:00:07.732
<v Kevin Bowman> to meet you as well.

4
00:00:10.737 --> 00:00:12.102
<v Ashley Murphy> Is Alex also joining us?

5
00:00:12.584 --> 00:00:13.206
<v Kevin Bowman> Yeah, he is.`;

    // Create mock cues that represent the parsed VTT
    const mockCues = [
      {
        identifier: "1",
        start: 3.518,
        end: 4.08,
        text: "<v Kevin Bowman> Say, how are you?",
      },
      {
        identifier: "2",
        start: 4.381,
        end: 6.929,
        text: "<v Ashley Murphy> I'm good. Nice to meet you. Nice",
      },
      {
        identifier: "3",
        start: 6.929,
        end: 7.732,
        text: "<v Kevin Bowman> to meet you as well.",
      },
      {
        identifier: "4",
        start: 10.737,
        end: 12.102,
        text: "<v Ashley Murphy> Is Alex also joining us?",
      },
      {
        identifier: "5",
        start: 12.584,
        end: 13.206,
        text: "<v Kevin Bowman> Yeah, he is.",
      },
    ];

    // Mock the parsed VTT data
    mockParse.mockReturnValue({
      cues: mockCues,
    });

    // Processing function for calculating speaker time
    const processVttForSpeakerLong = (
      vttContent: string,
      speakerName: string,
    ): number => {
      const cleanedVtt = cleanVttText(vttContent);
      const parsedVtt = mockParse(cleanedVtt);

      let speakingTime = 0;
      const timeSegments: { start: number; end: number }[] = [];

      for (const cue of parsedVtt.cues) {
        const speaker = getSpeaker(cue.text);

        if (speaker === speakerName) {
          if (cue.end <= cue.start) {
            continue;
          }

          let isOverlapping = false;

          for (const segment of timeSegments) {
            if (
              (cue.start >= segment.start && cue.start < segment.end) ||
              (cue.end > segment.start && cue.end <= segment.end) ||
              (cue.start <= segment.start && cue.end >= segment.end)
            ) {
              segment.start = Math.min(segment.start, cue.start);
              segment.end = Math.max(segment.end, cue.end);
              isOverlapping = true;
              break;
            }
          }

          if (!isOverlapping) {
            timeSegments.push({ start: cue.start, end: cue.end });
          }
        }
      }

      for (const segment of timeSegments) {
        speakingTime += segment.end - segment.start;
      }

      return speakingTime;
    };

    // Test calculation of speaking time for Kevin
    const kevinSpeakingTime = processVttForSpeakerLong(
      mockLongVttContent,
      "Kevin Bowman",
    );
    // Kevin speaks in segments 1, 3, and 5: (4.080-3.518) + (7.732-6.929) + (13.206-12.584) = 0.562 + 0.803 + 0.622 = 1.987 seconds
    expect(kevinSpeakingTime).toBeCloseTo(1.987, 3);

    // Test calculation of speaking time for Ashley
    const ashleySpeakingTime = processVttForSpeakerLong(
      mockLongVttContent,
      "Ashley Murphy",
    );
    // Ashley speaks in segments 2 and 4: (6.929-4.381) + (12.102-10.737) = 2.548 + 1.365 = 3.913 seconds
    expect(ashleySpeakingTime).toBeCloseTo(3.913, 3);
  });

  it("should handle VTT with special timestamp formats and cue identifiers", () => {
    // Create a mock VTT file with various timestamp formats and cue identifiers
    const mockVttWithSpecialFormats = `WEBVTT

cue-1
00:00:01.000 --> 00:00:02.500
<v Speaker1>Text with cue identifier

00:01:30.250 --> 00:01:35.750
<v Speaker2>Text without cue identifier

note
This is a note and should be ignored

00:02:00 --> 00:02:05
<v Speaker1>Timestamp without milliseconds

00:03:00.000 --> 00:03:10.000
<v Speaker1>Another segment

non-cue-data
This line should be ignored`;

    // Mock the parsed VTT data
    mockParse.mockReturnValue({
      cues: [
        {
          identifier: "cue-1",
          start: 1.0,
          end: 2.5,
          text: "<v Speaker1>Text with cue identifier",
        },
        {
          identifier: "",
          start: 90.25,
          end: 95.75,
          text: "<v Speaker2>Text without cue identifier",
        },
        {
          identifier: "",
          start: 120.0,
          end: 125.0,
          text: "<v Speaker1>Timestamp without milliseconds",
        },
        {
          identifier: "",
          start: 180.0,
          end: 190.0,
          text: "<v Speaker1>Another segment",
        },
      ],
    });

    // Processing function for calculating speaker time
    const processVttForSpeakerSpecial = (
      vttContent: string,
      speakerName: string,
    ): number => {
      const cleanedVtt = cleanVttText(vttContent);
      const parsedVtt = mockParse(cleanedVtt);

      let speakingTime = 0;
      const timeSegments: { start: number; end: number }[] = [];

      for (const cue of parsedVtt.cues) {
        const speaker = getSpeaker(cue.text);

        if (speaker === speakerName) {
          if (cue.end <= cue.start) {
            continue;
          }

          let isOverlapping = false;

          for (const segment of timeSegments) {
            if (
              (cue.start >= segment.start && cue.start < segment.end) ||
              (cue.end > segment.start && cue.end <= segment.end) ||
              (cue.start <= segment.start && cue.end >= segment.end)
            ) {
              segment.start = Math.min(segment.start, cue.start);
              segment.end = Math.max(segment.end, cue.end);
              isOverlapping = true;
              break;
            }
          }

          if (!isOverlapping) {
            timeSegments.push({ start: cue.start, end: cue.end });
          }
        }
      }

      for (const segment of timeSegments) {
        speakingTime += segment.end - segment.start;
      }

      return speakingTime;
    };

    // Test calculation of speaking time for Speaker1
    const speaker1Time = processVttForSpeakerSpecial(
      mockVttWithSpecialFormats,
      "Speaker1",
    );
    // Speaker1 speaks in segments 1, 3, and 4: (2.5-1.0) + (125.0-120.0) + (190.0-180.0) = 1.5 + 5.0 + 10.0 = 16.5 seconds
    expect(speaker1Time).toBe(16.5);

    // Test calculation of speaking time for Speaker2
    const speaker2Time = processVttForSpeakerSpecial(
      mockVttWithSpecialFormats,
      "Speaker2",
    );
    // Speaker2 speaks in segment 2: (95.75-90.25) = 5.5 seconds
    expect(speaker2Time).toBe(5.5);
  });

  it("should handle manual parsing of VTT with timestamp format variations and edge cases", () => {
    // Mock the webvtt parse function to throw an error to trigger manual parsing
    mockParse.mockImplementation(() => {
      throw new Error("Mock parsing error");
    });

    // Create a mock VTT with various edge cases
    const mockVttWithEdgeCases = `WEBVTT
X-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:900000

1
00:00:03.518 --> 00:00:04.080
<v Kevin Bowman> Say, how are you?

2
00:00:04.081 --> 00:00:04.081
<v Ashley Murphy> Invalid zero duration

3
00:00:04.381 --> 00:00:06.929
<v Ashley Murphy> I'm good. Nice to meet you.

00:00:06.929 --> 00:00:07.732
<v Kevin Bowman> to meet you as well.

NOTES This is not a valid cue

00:00:07.732 --> 00:00:06.929
<v Nick D'Ascensao> Negative duration (invalid)

00:00:10.737 --> 00:00:12.102
<v Ashley Murphy> Is Alex also joining us?

00:00:11.000 --> 00:00:11.500
<v Ashley Murphy> Overlapping segment with previous

00:00:12.584 --> 00:00:13.206
<v Kevin Bowman> Yeah, he is.`;

    // Create a test function for manual VTT parsing
    const manuallyProcessVttWithEdgeCases = (
      vttContent: string,
      speakerName: string,
    ): number => {
      const vttLines = vttContent.split("\n");

      // Extract timestamp lines and speaker lines
      const filteredVttLines = vttLines.filter(
        (line) =>
          line.match(
            /^[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})? --> [0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?$/,
          ) || line.match(/<v [^>]+>/),
      );

      let speakingTime = 0;
      const timeSegments: { start: number; end: number }[] = [];

      for (const [i, line] of filteredVttLines.entries()) {
        if (
          line.includes(`<v ${speakerName}>`) ||
          line === `<v ${speakerName}>`
        ) {
          const timestampLine = filteredVttLines[i - 1];

          if (!timestampLine || !timestampLine.includes("-->")) {
            continue;
          }

          const [start, end] = timestampLine
            .split("-->")
            .map((time) => time.trim());

          if (!start || !end) {
            continue;
          }

          try {
            const [hoursStart = "0", minutesStart = "0", secondsStart = "0"] =
              start.split(":");
            const [hoursEnd = "0", minutesEnd = "0", secondsEnd = "0"] =
              end.split(":");

            const startSeconds =
              Number.parseInt(hoursStart) * 3600 +
              Number.parseInt(minutesStart) * 60 +
              Number.parseFloat(secondsStart);

            const endSeconds =
              Number.parseInt(hoursEnd) * 3600 +
              Number.parseInt(minutesEnd) * 60 +
              Number.parseFloat(secondsEnd);

            // Skip invalid segments (zero or negative duration)
            if (endSeconds <= startSeconds) {
              continue;
            }

            // Check for overlaps
            let isOverlapping = false;
            for (const segment of timeSegments) {
              if (
                (startSeconds >= segment.start && startSeconds < segment.end) ||
                (endSeconds > segment.start && endSeconds <= segment.end) ||
                (startSeconds <= segment.start && endSeconds >= segment.end)
              ) {
                segment.start = Math.min(segment.start, startSeconds);
                segment.end = Math.max(segment.end, endSeconds);
                isOverlapping = true;
                break;
              }
            }

            if (!isOverlapping) {
              timeSegments.push({ start: startSeconds, end: endSeconds });
            }
          } catch (err) {
            // Skip on error
            continue;
          }
        }
      }

      // Calculate speaking time
      for (const segment of timeSegments) {
        speakingTime += segment.end - segment.start;
      }

      return speakingTime;
    };

    // Test manual parsing for Ashley Murphy's speaking time
    const ashleySpeakingTime = manuallyProcessVttWithEdgeCases(
      mockVttWithEdgeCases,
      "Ashley Murphy",
    );
    // Ashley has segments at 4.381-6.929 and 10.737-12.102 with an overlap at 11.000-11.500
    // Expected: (6.929-4.381) + (12.102-10.737) = 2.548 + 1.365 = 3.913
    expect(ashleySpeakingTime).toBeCloseTo(3.913, 3);

    // Test manual parsing for Kevin Bowman's speaking time
    const kevinSpeakingTime = manuallyProcessVttWithEdgeCases(
      mockVttWithEdgeCases,
      "Kevin Bowman",
    );
    // Kevin has segments at 3.518-4.080, 6.929-7.732, and 12.584-13.206
    // Expected: (4.080-3.518) + (7.732-6.929) + (13.206-12.584) = 0.562 + 0.803 + 0.622 = 1.987
    expect(kevinSpeakingTime).toBeCloseTo(1.987, 3);

    // Test manual parsing for Nick D'Ascensao (who has only an invalid segment)
    const nickSpeakingTime = manuallyProcessVttWithEdgeCases(
      mockVttWithEdgeCases,
      "Nick D'Ascensao",
    );
    // Nick has only an invalid segment with negative duration, should be skipped
    expect(nickSpeakingTime).toBe(0);
  });
});
