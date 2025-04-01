import { describe, expect, test } from "vitest";
import { type RecallTranscript, Vtt, VttCue, VttWord } from "./vtt.service";

describe("VTT Parsing", () => {
  describe("Basic Functionality", () => {
    test("should parse a basic WebVTT file with multiple cues", () => {
      const vttContent = `WEBVTT
X-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:900000

1
00:00:01.524 --> 00:00:02.518
<v Kimberly Shenk> or you're on your way to Ulta.

2
00:00:06.909 --> 00:00:07.814
<v Natasha Damner> Who are you meeting with?`;

      const vtt = new Vtt(vttContent);

      expect(vtt.cues.length).toBe(2);

      // Check first cue
      const firstCue = vtt.cues[0];
      expect(firstCue).toBeDefined();
      if (firstCue) {
        expect(firstCue.index).toBe(1);
        expect(firstCue.startTimestamp).toBe("00:00:01.524");
        expect(firstCue.endTimestamp).toBe("00:00:02.518");
        expect(firstCue.speaker).toBe("Kimberly Shenk");
        expect(firstCue.text).toBe("or you're on your way to Ulta.");
      }

      // Check second cue
      const secondCue = vtt.cues[1];
      expect(secondCue).toBeDefined();
      if (secondCue) {
        expect(secondCue.index).toBe(2);
        expect(secondCue.startTimestamp).toBe("00:00:06.909");
        expect(secondCue.endTimestamp).toBe("00:00:07.814");
        expect(secondCue.speaker).toBe("Natasha Damner");
        expect(secondCue.text).toBe("Who are you meeting with?");
      }
    });

    test("should correctly calculate timestamp values in milliseconds", () => {
      const vttContent = `WEBVTT

1
00:01:30.500 --> 00:02:00.750
<v Speaker> Test content`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(1);

      const cue = vtt.cues[0];
      expect(cue).toBeDefined();
      if (cue) {
        expect(cue.startInMilliseconds).toBe(90500); // 1*60*1000 + 30*1000 + 500
        expect(cue.endInMilliseconds).toBe(120750); // 2*60*1000 + 0*1000 + 750
        expect(cue.durationInMilliseconds).toBe(30250); // 120750 - 90500
      }
    });
  });

  describe("Header Handling", () => {
    test("should parse VTT with only required WEBVTT header", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker> Text`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(1);
    });

    test("should parse VTT with extensive header metadata", () => {
      const vttContent = `WEBVTT - This is a WebVTT file
Kind: captions
Language: en-US
Style:
::cue {
  background-image: linear-gradient(to bottom, yellow, blue);
  color: white;
}
NOTE This is a comment and should be ignored

1
00:00:01.000 --> 00:00:02.000 
<v Speaker> Text with metadata header`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(1);

      const cue = vtt.cues[0];
      expect(cue).toBeDefined();
      if (cue) {
        expect(cue.text).toBe("Text with metadata header");
      }
    });

    test("should handle VTT with no blank line after header", () => {
      // This is technically malformed but we should be robust
      const vttContent = `WEBVTT
1
00:00:01.000 --> 00:00:02.000
<v Speaker> Text`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    test("should return empty array for empty VTT file", () => {
      const vtt = new Vtt("");
      expect(vtt.cues).toEqual([]);
    });

    test("should return empty array for VTT with only header", () => {
      const vtt = new Vtt("WEBVTT");
      expect(vtt.cues).toEqual([]);
    });

    test("should handle timestamps with hours correctly", () => {
      const vttContent = `WEBVTT

1
01:30:45.500 --> 02:15:30.750
<v Speaker> Text with hours`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(1);

      const cue = vtt.cues[0];
      expect(cue).toBeDefined();
      if (cue) {
        expect(cue.startInMilliseconds).toBe(5445500); // 1*3600000 + 30*60000 + 45*1000 + 500
        expect(cue.endInMilliseconds).toBe(8130750); // 2*3600000 + 15*60000 + 30*1000 + 750
      }
    });

    test("should handle milliseconds with different precision", () => {
      const vttContent = `WEBVTT

1
00:00:01.5 --> 00:00:02.75
<v Speaker> Single digit millisecond

2
00:00:03.50 --> 00:00:04.99
<v Speaker> Double digit millisecond

3
00:00:05.999 --> 00:00:06.000
<v Speaker> Triple digit millisecond`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(3);

      if (vtt.cues[0]) {
        expect(vtt.cues[0].startInMilliseconds).toBe(1500); // Adjusted from .5 to 500ms
        expect(vtt.cues[0].endInMilliseconds).toBe(2750); // Adjusted from .75 to 750ms
      }

      if (vtt.cues[1]) {
        expect(vtt.cues[1].startInMilliseconds).toBe(3500); // Adjusted from .50 to 500ms
        expect(vtt.cues[1].endInMilliseconds).toBe(4990); // Adjusted from .99 to 990ms
      }
    });
  });

  describe("Malformed Input Handling", () => {
    test("should skip cues with invalid index", () => {
      const vttContent = `WEBVTT

not_a_number
00:00:01.000 --> 00:00:02.000
<v Speaker> Invalid index

2
00:00:03.000 --> 00:00:04.000
<v Speaker> Valid cue`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(1);
      if (vtt.cues[0]) {
        expect(vtt.cues[0].index).toBe(2);
      }
    });

    test("should skip cues with invalid timestamp format", () => {
      const vttContent = `WEBVTT

1
invalid_timestamp --> 00:00:02.000
<v Speaker> Invalid start timestamp

2
00:00:03.000 --> invalid_timestamp
<v Speaker> Invalid end timestamp

3
00:00:05.000 --> 00:00:06.000
<v Speaker> Valid cue`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(1);
      if (vtt.cues[0]) {
        expect(vtt.cues[0].index).toBe(3);
      }
    });

    test("should skip cues with missing speaker information", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:02.000
Text without speaker tag

2
00:00:03.000 --> 00:00:04.000
<v> Missing speaker name

3
00:00:05.000 --> 00:00:06.000
<v Speaker> Valid cue`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(1);
      if (vtt.cues[0]) {
        expect(vtt.cues[0].index).toBe(3);
      }
    });

    test("should skip cues with insufficient data", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:02.000

2

3
00:00:05.000 --> 00:00:06.000
<v Speaker> Valid cue`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(1);
      if (vtt.cues[0]) {
        expect(vtt.cues[0].index).toBe(3);
      }
    });
  });

  describe("Non-sequential and Overlapping Cues", () => {
    test("should handle non-sequential cue indices", () => {
      const vttContent = `WEBVTT

5
00:00:01.000 --> 00:00:02.000
<v Speaker> First cue with index 5

2
00:00:03.000 --> 00:00:04.000
<v Speaker> Second cue with index 2

10
00:00:05.000 --> 00:00:06.000
<v Speaker> Third cue with index 10`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(3);

      const indices = vtt.cues.map((cue) => cue.index);
      expect(indices).toEqual([5, 2, 10]);
    });

    test("should handle overlapping timestamps", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:05.000
<v Speaker1> First cue that overlaps

2
00:00:03.000 --> 00:00:07.000
<v Speaker2> Second cue that overlaps with first

3
00:00:06.000 --> 00:00:08.000
<v Speaker3> Third cue that overlaps with second`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(3);

      // Verify overlaps
      if (vtt.cues[0] && vtt.cues[1]) {
        expect(vtt.cues[0].endInMilliseconds).toBeGreaterThan(
          vtt.cues[1].startInMilliseconds,
        );
      }

      if (vtt.cues[1] && vtt.cues[2]) {
        expect(vtt.cues[1].endInMilliseconds).toBeGreaterThan(
          vtt.cues[2].startInMilliseconds,
        );
      }
    });

    test("should handle completely nested cues (one cue entirely within another)", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:10.000
<v Speaker1> Outer cue that contains another cue

2
00:00:03.000 --> 00:00:07.000
<v Speaker2> Inner cue completely within outer cue`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(2);

      if (vtt.cues[0] && vtt.cues[1]) {
        // Outer cue starts before inner cue
        expect(vtt.cues[0].startInMilliseconds).toBeLessThan(
          vtt.cues[1].startInMilliseconds,
        );

        // Outer cue ends after inner cue
        expect(vtt.cues[0].endInMilliseconds).toBeGreaterThan(
          vtt.cues[1].endInMilliseconds,
        );

        // Verify complete nesting
        expect(vtt.cues[1].startInMilliseconds).toBeGreaterThan(
          vtt.cues[0].startInMilliseconds,
        );
        expect(vtt.cues[1].endInMilliseconds).toBeLessThan(
          vtt.cues[0].endInMilliseconds,
        );
      }
    });

    test("should handle complex overlap patterns with multiple speakers", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:06.000
<v Speaker1> First speaker starts talking

2
00:00:03.000 --> 00:00:08.000
<v Speaker2> Second speaker interrupts

3
00:00:04.000 --> 00:00:05.000
<v Speaker3> Third speaker briefly interjects

4
00:00:07.000 --> 00:00:10.000
<v Speaker1> First speaker continues`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(4);

      // Time ranges where different numbers of speakers are active
      const timestamps = [
        { time: 2000, activeSpeakers: 1 }, // Only Speaker1
        { time: 3500, activeSpeakers: 2 }, // Speaker1 and Speaker2
        { time: 4500, activeSpeakers: 3 }, // All three speakers
        { time: 5500, activeSpeakers: 2 }, // Speaker1 and Speaker2
        { time: 7500, activeSpeakers: 2 }, // Speaker2 and Speaker1 (second time)
        { time: 9000, activeSpeakers: 1 }, // Only Speaker1 (second time)
      ];

      for (const { time, activeSpeakers } of timestamps) {
        const active = vtt.cues.filter(
          (cue) =>
            time >= cue.startInMilliseconds && time <= cue.endInMilliseconds,
        );
        expect(active.length).toBe(activeSpeakers);
      }
    });

    test("should maintain chronological order in parsed cues regardless of index numbers", () => {
      const vttContent = `WEBVTT

100
00:00:05.000 --> 00:00:07.000
<v Speaker> This appears third chronologically

50
00:00:01.000 --> 00:00:03.000
<v Speaker> This appears first chronologically 

75
00:00:03.500 --> 00:00:04.500
<v Speaker> This appears second chronologically`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(3);

      // Verify cues are in the same order as in the file
      // (VTT parser preserves input order, not chronological order)
      expect(vtt.cues[0]?.index).toBe(100);
      expect(vtt.cues[1]?.index).toBe(50);
      expect(vtt.cues[2]?.index).toBe(75);

      // We could implement a sort method for applications that need chronological order
      const sortedByStart = [...vtt.cues].sort(
        (a, b) => a.startInMilliseconds - b.startInMilliseconds,
      );
      expect(sortedByStart[0]?.index).toBe(50);
      expect(sortedByStart[1]?.index).toBe(75);
      expect(sortedByStart[2]?.index).toBe(100);
    });
  });

  describe("Special Text Content", () => {
    test("should handle special characters in speaker names and text", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v John O'Neill> Text with apostrophe's and "quotes"

2
00:00:03.000 --> 00:00:04.000
<v María-José> Text with non-English characters: üñîçødé`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(2);

      if (vtt.cues[0]) {
        expect(vtt.cues[0].speaker).toBe("John O'Neill");
        expect(vtt.cues[0].text).toBe('Text with apostrophe\'s and "quotes"');
      }

      if (vtt.cues[1]) {
        expect(vtt.cues[1].speaker).toBe("María-José");
        expect(vtt.cues[1].text).toBe(
          "Text with non-English characters: üñîçødé",
        );
      }
    });
  });

  // Add new test suite for VttCue methods
  describe("VttCue Methods", () => {
    test("should return next and previous cues", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First cue

2
00:00:03.000 --> 00:00:04.000
<v Speaker2> Second cue

3
00:00:05.000 --> 00:00:06.000
<v Speaker3> Third cue`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(3);

      // Test next() method
      const firstCue = vtt.cues[0];
      const secondCue = vtt.cues[1];
      const thirdCue = vtt.cues[2];

      expect(firstCue).toBeDefined();
      expect(secondCue).toBeDefined();
      expect(thirdCue).toBeDefined();

      if (firstCue && secondCue && thirdCue) {
        // next() should return the next cue
        expect(firstCue.next()?.index).toBe(secondCue.index);
        expect(secondCue.next()?.index).toBe(thirdCue.index);

        // The last cue should have no next cue
        expect(thirdCue.next()).toBeUndefined();

        // previous() should return the previous cue
        expect(secondCue.previous()?.index).toBe(firstCue.index);
        expect(thirdCue.previous()?.index).toBe(secondCue.index);

        // The first cue should have no previous cue
        expect(firstCue.previous()).toBeUndefined();
      }
    });

    test("should handle non-sequential indices with next and previous methods", () => {
      const vttContent = `WEBVTT

100
00:00:01.000 --> 00:00:02.000
<v Speaker1> First cue with index 100

200
00:00:03.000 --> 00:00:04.000
<v Speaker2> Second cue with index 200

50
00:00:05.000 --> 00:00:06.000
<v Speaker3> Third cue with index 50`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(3);

      // Get cues by position
      const firstCue = vtt.cues[0];
      const secondCue = vtt.cues[1];
      const thirdCue = vtt.cues[2];

      expect(firstCue).toBeDefined();
      expect(secondCue).toBeDefined();
      expect(thirdCue).toBeDefined();

      if (firstCue && secondCue && thirdCue) {
        // Verify indices
        expect(firstCue.index).toBe(100);
        expect(secondCue.index).toBe(200);
        expect(thirdCue.index).toBe(50);

        // next() should work based on position in array, not index value
        expect(firstCue.next()?.index).toBe(200);
        expect(secondCue.next()?.index).toBe(50);

        // previous() should work based on position in array, not index value
        expect(secondCue.previous()?.index).toBe(100);
        expect(thirdCue.previous()?.index).toBe(200);
      }
    });

    test("should handle isolated cues with no parent Vtt", () => {
      // Create an isolated cue not associated with a Vtt instance
      const isolatedCue = new VttCue({
        index: 1,
        startTimestamp: "00:00:01.000",
        endTimestamp: "00:00:02.000",
        speaker: "Isolated Speaker",
        words: [
          new VttWord({
            content: "This",
            startTimestamp: "00:00:01.000",
            endTimestamp: "00:00:01.200",
            index: 1,
          }),
          new VttWord({
            content: "cue",
            startTimestamp: "00:00:01.200",
            endTimestamp: "00:00:01.400",
            index: 2,
          }),
          new VttWord({
            content: "is",
            startTimestamp: "00:00:01.400",
            endTimestamp: "00:00:01.500",
            index: 3,
          }),
          new VttWord({
            content: "not",
            startTimestamp: "00:00:01.500",
            endTimestamp: "00:00:01.600",
            index: 4,
          }),
          new VttWord({
            content: "part",
            startTimestamp: "00:00:01.600",
            endTimestamp: "00:00:01.700",
            index: 5,
          }),
          new VttWord({
            content: "of",
            startTimestamp: "00:00:01.700",
            endTimestamp: "00:00:01.800",
            index: 6,
          }),
          new VttWord({
            content: "a",
            startTimestamp: "00:00:01.800",
            endTimestamp: "00:00:01.850",
            index: 7,
          }),
          new VttWord({
            content: "VTT",
            startTimestamp: "00:00:01.850",
            endTimestamp: "00:00:01.950",
            index: 8,
          }),
          new VttWord({
            content: "file",
            startTimestamp: "00:00:01.950",
            endTimestamp: "00:00:02.000",
            index: 9,
          }),
        ],
      });

      // Both next and previous should return undefined
      expect(isolatedCue.next()).toBeUndefined();
      expect(isolatedCue.previous()).toBeUndefined();
    });
  });

  // Add new test suite for Vtt slice method
  describe("Vtt Slice Method", () => {
    test("should slice VTT file by time range", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First cue (1-2s)

2
00:00:03.000 --> 00:00:04.000
<v Speaker2> Second cue (3-4s)

3
00:00:05.000 --> 00:00:06.000
<v Speaker3> Third cue (5-6s)

4
00:00:07.000 --> 00:00:08.000
<v Speaker4> Fourth cue (7-8s)`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(4);

      // Slice to get cues between 2.5 and 6.5 seconds
      // This should include cues 2 and 3
      const sliced = vtt.slice(2500, 6500);
      expect(sliced.cues.length).toBe(2);
      expect(sliced.cues[0]?.index).toBe(2);
      expect(sliced.cues[1]?.index).toBe(3);
    });

    test("should return empty array when slice range doesn't match any cues", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First cue

2
00:00:05.000 --> 00:00:06.000
<v Speaker2> Second cue`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(2);

      // Slice to get cues between 2.5 and 4.5 seconds
      // This shouldn't match any cues
      const sliced = vtt.slice(2500, 4500);
      expect(sliced.cues.length).toBe(0);
    });

    test("should include cues exactly at the boundaries", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:03.000
<v Speaker1> First cue (1-3s)

2
00:00:03.000 --> 00:00:05.000
<v Speaker2> Second cue (3-5s)

3
00:00:05.000 --> 00:00:07.000
<v Speaker3> Third cue (5-7s)`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(3);

      // Slice to get cues between 3s and 5s exactly
      // This should include all cues that overlap with the range
      const sliced = vtt.slice(3000, 5000);
      expect(sliced.cues.length).toBe(3);

      // Verify the indices of the included cues
      const indices = sliced.cues.map((cue) => cue.index);
      expect(indices).toContain(1); // First cue ends at 3s, included because it overlaps with the start
      expect(indices).toContain(2); // Second cue exactly matches the boundaries
      expect(indices).toContain(3); // Third cue starts at 5s, included because it overlaps with the end
    });

    test("should handle overlapping cues in slice results", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
<v Speaker1> First cue (1-4s)

2
00:00:02.000 --> 00:00:05.000
<v Speaker2> Second cue (2-5s)

3
00:00:03.000 --> 00:00:06.000
<v Speaker3> Third cue (3-6s)`;

      const vtt = new Vtt(vttContent);
      expect(vtt.cues.length).toBe(3);

      // Slice to get cues between 2.5 and 4.5 seconds
      // This should include all three cues since they all overlap with the time range
      const sliced = vtt.slice(2500, 4500);
      expect(sliced.cues.length).toBe(3);
    });
  });

  // Add new test suite for getActiveCues method
  describe("Vtt getActiveCues Method", () => {
    test("should find all cues active at a specific timestamp", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
<v Speaker1> First cue (1-4s)

2
00:00:02.000 --> 00:00:05.000
<v Speaker2> Second cue (2-5s)

3
00:00:03.000 --> 00:00:06.000
<v Speaker3> Third cue (3-6s)

4
00:00:07.000 --> 00:00:09.000
<v Speaker4> Fourth cue (7-9s)`;

      const vtt = new Vtt(vttContent);

      // Test different timestamps and validate the active cues

      // At 0.5s - no cues active
      const activeCuesAt0_5 = vtt.getActiveCues(500);
      expect(activeCuesAt0_5.length).toBe(0);

      // At 1.5s - only first cue active
      const activeCuesAt1_5 = vtt.getActiveCues(1500);
      expect(activeCuesAt1_5.length).toBe(1);
      expect(activeCuesAt1_5[0]?.index).toBe(1);

      // At 2.5s - two cues active
      const activeCuesAt2_5 = vtt.getActiveCues(2500);
      expect(activeCuesAt2_5.length).toBe(2);
      expect(activeCuesAt2_5.map((cue) => cue.index)).toContain(1);
      expect(activeCuesAt2_5.map((cue) => cue.index)).toContain(2);

      // At 3.5s - all three first cues active
      const activeCuesAt3_5 = vtt.getActiveCues(3500);
      expect(activeCuesAt3_5.length).toBe(3);
      expect(activeCuesAt3_5.map((cue) => cue.index)).toContain(1);
      expect(activeCuesAt3_5.map((cue) => cue.index)).toContain(2);
      expect(activeCuesAt3_5.map((cue) => cue.index)).toContain(3);

      // At 4.5s - only second and third cues active
      const activeCuesAt4_5 = vtt.getActiveCues(4500);
      expect(activeCuesAt4_5.length).toBe(2);
      expect(activeCuesAt4_5.map((cue) => cue.index)).toContain(2);
      expect(activeCuesAt4_5.map((cue) => cue.index)).toContain(3);

      // At 6.5s - no cues active (gap between cue 3 and 4)
      const activeCuesAt6_5 = vtt.getActiveCues(6500);
      expect(activeCuesAt6_5.length).toBe(0);

      // At 8s - only fourth cue active
      const activeCuesAt8 = vtt.getActiveCues(8000);
      expect(activeCuesAt8.length).toBe(1);
      expect(activeCuesAt8[0]?.index).toBe(4);

      // At 10s - no cues active (after all cues)
      const activeCuesAt10 = vtt.getActiveCues(10000);
      expect(activeCuesAt10.length).toBe(0);
    });

    test("should handle cues with exactly matching boundaries", () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:03.000
<v Speaker1> First cue

2
00:00:03.000 --> 00:00:05.000
<v Speaker2> Second cue

3
00:00:05.000 --> 00:00:07.000
<v Speaker3> Third cue`;

      const vtt = new Vtt(vttContent);

      // At exactly 3s - both first and second cues should be active (inclusive boundaries)
      const activeCuesAt3 = vtt.getActiveCues(3000);
      expect(activeCuesAt3.length).toBe(2);
      expect(activeCuesAt3.map((cue) => cue.index)).toContain(1);
      expect(activeCuesAt3.map((cue) => cue.index)).toContain(2);

      // At exactly 5s - both second and third cues should be active
      const activeCuesAt5 = vtt.getActiveCues(5000);
      expect(activeCuesAt5.length).toBe(2);
      expect(activeCuesAt5.map((cue) => cue.index)).toContain(2);
      expect(activeCuesAt5.map((cue) => cue.index)).toContain(3);
    });

    test("should handle empty VTT file", () => {
      const vtt = new Vtt("");
      const activeCues = vtt.getActiveCues(1000);
      expect(activeCues.length).toBe(0);
    });
  });

  describe("VttCue toString Method", () => {
    test("should convert cue to WebVTT string format", () => {
      const cue = new VttCue({
        index: 1,
        startTimestamp: "00:00:01.000",
        endTimestamp: "00:00:02.000",
        speaker: "Speaker",
        words: [
          new VttWord({
            content: "Test",
            startTimestamp: "00:00:01.000",
            endTimestamp: "00:00:01.500",
            index: 1,
          }),
          new VttWord({
            content: "text",
            startTimestamp: "00:00:01.500",
            endTimestamp: "00:00:02.000",
            index: 2,
          }),
        ],
      });

      const expected =
        "1\n00:00:01.000 --> 00:00:02.000\n<v Speaker> Test text\n";
      expect(cue.toString()).toBe(expected);
    });

    test("should handle special characters in speaker and text", () => {
      const cue = new VttCue({
        index: 2,
        startTimestamp: "00:00:03.000",
        endTimestamp: "00:00:04.000",
        speaker: "John O'Connor",
        words: [
          new VttWord({
            content: "Text",
            startTimestamp: "00:00:03.000",
            endTimestamp: "00:00:03.500",
            index: 1,
          }),
          new VttWord({
            content: "with",
            startTimestamp: "00:00:03.500",
            endTimestamp: "00:00:04.000",
            index: 2,
          }),
          new VttWord({
            content: '"quotes"',
            startTimestamp: "00:00:04.000",
            endTimestamp: "00:00:04.500",
            index: 3,
          }),
          new VttWord({
            content: "and",
            startTimestamp: "00:00:04.500",
            endTimestamp: "00:00:05.000",
            index: 4,
          }),
          new VttWord({
            content: "special",
            startTimestamp: "00:00:05.000",
            endTimestamp: "00:00:05.500",
            index: 5,
          }),
          new VttWord({
            content: "chars:",
            startTimestamp: "00:00:05.500",
            endTimestamp: "00:00:06.000",
            index: 6,
          }),
          new VttWord({
            content: "™",
            startTimestamp: "00:00:06.000",
            endTimestamp: "00:00:06.500",
            index: 7,
          }),
          new VttWord({
            content: "®",
            startTimestamp: "00:00:06.500",
            endTimestamp: "00:00:07.000",
            index: 8,
          }),
          new VttWord({
            content: "©",
            startTimestamp: "00:00:07.000",
            endTimestamp: "00:00:07.500",
            index: 9,
          }),
        ],
      });

      const expected =
        '2\n00:00:03.000 --> 00:00:04.000\n<v John O\'Connor> Text with "quotes" and special chars: ™ ® ©\n';
      expect(cue.toString()).toBe(expected);
    });
  });

  describe("Vtt merge Method", () => {
    test("should merge two Vtt instances", () => {
      const vtt1 = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First cue`);

      const vtt2 = new Vtt(`WEBVTT

2
00:00:03.000 --> 00:00:04.000
<v Speaker2> Second cue`);

      const merged = vtt1.merge(vtt2);

      expect(merged.cues.length).toBe(2);
      expect(merged.cues[0]?.index).toBe(1);
      expect(merged.cues[1]?.index).toBe(2);
    });

    test("should merge and sort by timestamp", () => {
      const vtt1 = new Vtt(`WEBVTT

2
00:00:03.000 --> 00:00:04.000
<v Speaker2> Later cue`);

      const vtt2 = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> Earlier cue`);

      const merged = vtt1.merge(vtt2);

      expect(merged.cues.length).toBe(2);
      // Should be sorted by start time
      expect(merged.cues[0]?.index).toBe(1);
      expect(merged.cues[1]?.index).toBe(2);
    });

    test("should handle merging with empty Vtt", () => {
      const vtt1 = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> Only cue`);

      const vtt2 = new Vtt("");

      const merged1 = vtt1.merge(vtt2);
      expect(merged1.cues.length).toBe(1);

      const merged2 = vtt2.merge(vtt1);
      expect(merged2.cues.length).toBe(1);
    });

    test("should handle merging with overlapping timestamps", () => {
      const vtt1 = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:03.000
<v Speaker1> First cue`);

      const vtt2 = new Vtt(`WEBVTT

2
00:00:02.000 --> 00:00:04.000
<v Speaker2> Overlapping cue`);

      const merged = vtt1.merge(vtt2);

      expect(merged.cues.length).toBe(2);
      expect(merged.cues[0]?.index).toBe(1);
      expect(merged.cues[1]?.index).toBe(2);
    });
  });

  describe("Vtt split Method", () => {
    test("should split VTT into chunks of specified duration", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:03.000
<v Speaker1> First cue

2
00:00:04.000 --> 00:00:06.000
<v Speaker2> Second cue

3
00:00:07.000 --> 00:00:09.000
<v Speaker3> Third cue`);

      // Split into 3-second chunks
      const chunks = vtt.split(3000);

      // Should create 3 chunks: 1-4s, 4-7s, 7-10s
      expect(chunks.length).toBe(3);

      // First chunk should contain first cue
      expect(chunks[0]?.cues.length).toBe(1);
      expect(chunks[0]?.cues[0]?.index).toBe(1);

      // Second chunk should contain second cue
      expect(chunks[1]?.cues.length).toBe(1);
      expect(chunks[1]?.cues[0]?.index).toBe(2);

      // Third chunk should contain third cue
      expect(chunks[2]?.cues.length).toBe(1);
      expect(chunks[2]?.cues[0]?.index).toBe(3);
    });

    test("should handle when chunk boundaries don't align with cues", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:05.000
<v Speaker1> Long cue spanning multiple chunks

2
00:00:06.000 --> 00:00:08.000
<v Speaker2> Second cue`);

      // Split into 2-second chunks
      const chunks = vtt.split(2000);

      // Should create 4 chunks: 1-3s, 3-5s, 5-7s, 7-9s
      expect(chunks.length).toBe(4);

      // First chunk contains first cue (1-3s)
      expect(chunks[0]?.cues.length).toBe(1);
      expect(chunks[0]?.cues[0]?.index).toBe(1);

      // Second chunk also contains first cue (3-5s)
      expect(chunks[1]?.cues.length).toBe(1);
      expect(chunks[1]?.cues[0]?.index).toBe(1);

      // Third chunk contains second cue (5-7s)
      expect(chunks[2]?.cues.length).toBe(1);
      expect(chunks[2]?.cues[0]?.index).toBe(2);

      // Fourth chunk contains second cue (7-9s)
      expect(chunks[3]?.cues.length).toBe(1);
      expect(chunks[3]?.cues[0]?.index).toBe(2);
    });

    test("should handle empty Vtt", () => {
      const vtt = new Vtt("");
      const chunks = vtt.split(1000);

      expect(chunks).toEqual([]);
    });
  });

  describe("Vtt findCueByTime Method", () => {
    test("should find closest cue to timestamp", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First cue

2
00:00:05.000 --> 00:00:06.000
<v Speaker2> Second cue

3
00:00:10.000 --> 00:00:11.000
<v Speaker3> Third cue`);

      // Timestamp exactly at start of cue
      expect(vtt.findCueByTime(1000)?.index).toBe(1);

      // Timestamp closer to first cue
      expect(vtt.findCueByTime(3000)?.index).toBe(1);

      // Timestamp closer to second cue
      expect(vtt.findCueByTime(4000)?.index).toBe(2);

      // Timestamp exactly at start of second cue
      expect(vtt.findCueByTime(5000)?.index).toBe(2);

      // Timestamp between second and third cue, but closer to third
      expect(vtt.findCueByTime(8000)?.index).toBe(3);
    });

    test("should handle timestamp before first cue", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:05.000 --> 00:00:06.000
<v Speaker> First cue`);

      // Timestamp before first cue should return first cue
      expect(vtt.findCueByTime(1000)?.index).toBe(1);
    });

    test("should handle timestamp after last cue", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker> Only cue`);

      // Timestamp after last cue should return last cue
      expect(vtt.findCueByTime(10000)?.index).toBe(1);
    });

    test("should handle empty Vtt", () => {
      const vtt = new Vtt("");
      expect(vtt.findCueByTime(1000)).toBeUndefined();
    });
  });

  describe("Vtt adjustTimestamps Method", () => {
    test("should adjust timestamps by positive offset", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker> Test cue`);

      // Add 1 second (1000ms) to all timestamps
      const adjusted = vtt.adjustTimestamps(1000);

      expect(adjusted.cues.length).toBe(1);

      const adjustedCue = adjusted.cues[0];
      expect(adjustedCue).toBeDefined();

      if (adjustedCue) {
        expect(adjustedCue.startTimestamp).toBe("00:00:02.000");
        expect(adjustedCue.endTimestamp).toBe("00:00:03.000");
        expect(adjustedCue.startInMilliseconds).toBe(2000);
        expect(adjustedCue.endInMilliseconds).toBe(3000);
      }
    });

    test("should adjust timestamps by negative offset", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:05.000 --> 00:00:06.000
<v Speaker> Test cue`);

      // Subtract 1 second (1000ms) from all timestamps
      const adjusted = vtt.adjustTimestamps(-1000);

      expect(adjusted.cues.length).toBe(1);

      const adjustedCue = adjusted.cues[0];
      expect(adjustedCue).toBeDefined();

      if (adjustedCue) {
        expect(adjustedCue.startTimestamp).toBe("00:00:04.000");
        expect(adjustedCue.endTimestamp).toBe("00:00:05.000");
        expect(adjustedCue.startInMilliseconds).toBe(4000);
        expect(adjustedCue.endInMilliseconds).toBe(5000);
      }
    });

    test("should handle empty Vtt", () => {
      const vtt = new Vtt("");
      const adjusted = vtt.adjustTimestamps(1000);

      expect(adjusted.cues).toEqual([]);
    });

    test("should handle timestamp crossing hour boundary", () => {
      const vtt = new Vtt(`WEBVTT

1
00:59:50.000 --> 01:00:10.000
<v Speaker> Cross-hour cue`);

      // Add 20 seconds (20000ms)
      const adjusted = vtt.adjustTimestamps(20000);

      const adjustedCue = adjusted.cues[0];
      expect(adjustedCue).toBeDefined();

      if (adjustedCue) {
        expect(adjustedCue.startTimestamp).toBe("01:00:10.000");
        expect(adjustedCue.endTimestamp).toBe("01:00:30.000");
      }
    });
  });

  describe("Vtt removeSpeaker Method", () => {
    test("should remove all cues from specified speaker", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First speaker

2
00:00:03.000 --> 00:00:04.000
<v Speaker2> Second speaker

3
00:00:05.000 --> 00:00:06.000
<v Speaker1> First speaker again`);

      // Remove all cues from Speaker1
      const filtered = vtt.removeSpeaker("Speaker1");

      expect(filtered.cues.length).toBe(1);
      expect(filtered.cues[0]?.index).toBe(2);
      expect(filtered.cues[0]?.speaker).toBe("Speaker2");
    });

    test("should handle non-existent speaker", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> Only cue`);

      // Try to remove cues from a speaker that doesn't exist
      const filtered = vtt.removeSpeaker("NonExistentSpeaker");

      // Should return same number of cues
      expect(filtered.cues.length).toBe(1);
      expect(filtered.cues[0]?.index).toBe(1);
    });

    test("should handle empty Vtt", () => {
      const vtt = new Vtt("");
      const filtered = vtt.removeSpeaker("Speaker");

      expect(filtered.cues).toEqual([]);
    });

    test("should remove all cues when all are from same speaker", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First cue

2
00:00:03.000 --> 00:00:04.000
<v Speaker1> Second cue`);

      // Remove all cues from Speaker1 (all cues)
      const filtered = vtt.removeSpeaker("Speaker1");

      expect(filtered.cues.length).toBe(0);
    });
  });

  describe("Vtt toString Method", () => {
    test("should convert Vtt to WebVTT string format", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First cue

2
00:00:03.000 --> 00:00:04.000
<v Speaker2> Second cue`);

      const vttString = vtt.toString();

      // Should have WebVTT header
      expect(vttString.startsWith("WEBVTT")).toBe(true);

      // Should include both cues
      expect(vttString.includes("1")).toBe(true);
      expect(vttString.includes("00:00:01.000 --> 00:00:02.000")).toBe(true);
      expect(vttString.includes("<v Speaker1> First cue")).toBe(true);

      expect(vttString.includes("2")).toBe(true);
      expect(vttString.includes("00:00:03.000 --> 00:00:04.000")).toBe(true);
      expect(vttString.includes("<v Speaker2> Second cue")).toBe(true);
    });

    test("should format empty Vtt correctly", () => {
      const vtt = new Vtt("");
      const vttString = vtt.toString();

      // Should just have the header and an empty line
      expect(vttString).toBe("WEBVTT\n");
    });

    test("should handle special characters", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v John's O'Neill> Text with "quotes" & symbols`);

      const vttString = vtt.toString();

      expect(
        vttString.includes("<v John's O'Neill> Text with \"quotes\" & symbols"),
      ).toBe(true);
    });

    test("should recreate original VTT format", () => {
      // Create a VTT, convert to string, then parse again
      const original = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker> Test cue`);

      const vttString = original.toString();
      const reparsed = new Vtt(vttString);

      expect(reparsed.cues.length).toBe(1);
      expect(reparsed.cues[0]?.index).toBe(1);
      expect(reparsed.cues[0]?.startTimestamp).toBe("00:00:01.000");
      expect(reparsed.cues[0]?.endTimestamp).toBe("00:00:02.000");
      expect(reparsed.cues[0]?.speaker).toBe("Speaker");
      expect(reparsed.cues[0]?.text).toBe("Test cue");
    });
  });

  describe("Vtt cleanVtt Method", () => {
    test("should clean and normalize VTT content", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v  Speaker1  > Text with extra spaces  

2
00:00:01.000 --> 00:00:02.000
<v  Speaker1  > Text with extra spaces  

3
00:00:02.000 --> 00:00:03.000
<v Speaker2> Valid cue

4
00:00:03.000 --> 00:00:04.000
<v Speaker3>    

5
00:00:04.000 --> 00:00:05.000
<v   > Text without speaker`);

      const cleaned = vtt.clean();

      // Should have removed empty and invalid cues, duplicates, and reindexed
      expect(cleaned.cues.length).toBe(2);

      // Check first cue
      const firstCue = cleaned.cues[0];
      expect(firstCue).toBeDefined();
      if (firstCue) {
        expect(firstCue.index).toBe(1);
        expect(firstCue.speaker).toBe("Speaker1");
        expect(firstCue.text).toBe("Text with extra spaces");
      }

      // Check second cue
      const secondCue = cleaned.cues[1];
      expect(secondCue).toBeDefined();
      if (secondCue) {
        expect(secondCue.index).toBe(2);
        expect(secondCue.speaker).toBe("Speaker2");
        expect(secondCue.text).toBe("Valid cue");
      }
    });

    test("should sort cues chronologically", () => {
      const vtt = new Vtt(`WEBVTT

3
00:00:05.000 --> 00:00:06.000
<v Speaker3> Last chronologically

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First chronologically

2
00:00:03.000 --> 00:00:04.000
<v Speaker2> Second chronologically`);

      const cleaned = vtt.clean();

      expect(cleaned.cues.length).toBe(3);
      expect(cleaned.cues[0]?.speaker).toBe("Speaker1");
      expect(cleaned.cues[1]?.speaker).toBe("Speaker2");
      expect(cleaned.cues[2]?.speaker).toBe("Speaker3");
    });

    test("should handle empty VTT", () => {
      const vtt = new Vtt("");
      const cleaned = vtt.clean();
      expect(cleaned.cues.length).toBe(0);
    });

    test("should handle VTT with only invalid cues", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v   >   

2
00:00:03.000 --> 00:00:04.000
<v Speaker2>    `);

      const cleaned = vtt.clean();
      expect(cleaned.cues.length).toBe(0);
    });

    test("should join sequential cues from the same speaker", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First part

2
00:00:02.100 --> 00:00:03.000
<v Speaker1> Second part`);

      const cleaned = vtt.clean();

      // Should have combined the cues
      expect(cleaned.cues.length).toBe(1);

      // Check the combined cue
      const combinedCue = cleaned.cues[0];
      expect(combinedCue).toBeDefined();
      if (combinedCue) {
        expect(combinedCue.startTimestamp).toBe("00:00:01.000");
        expect(combinedCue.endTimestamp).toBe("00:00:03.000");
        expect(combinedCue.text).toBe("First part Second part");
        expect(combinedCue.speaker).toBe("Speaker1");
      }
    });

    test("should not join cues from different speakers even if sequential", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First speaker

2
00:00:02.100 --> 00:00:03.000
<v Speaker2> Second speaker`);

      const cleaned = vtt.clean();

      // Should not have combined cues from different speakers
      expect(cleaned.cues.length).toBe(2);
      expect(cleaned.cues[0]?.speaker).toBe("Speaker1");
      expect(cleaned.cues[1]?.speaker).toBe("Speaker2");
    });

    test("should not join non-sequential cues from the same speaker", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First part

2
00:00:04.000 --> 00:00:05.000
<v Speaker1> Second part with gap`);

      const cleaned = vtt.clean(500); // 500ms max gap

      // Should not have combined cues with a large gap
      expect(cleaned.cues.length).toBe(2);
    });

    test("should join multiple sequential cues from the same speaker", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First part

2
00:00:02.100 --> 00:00:03.000
<v Speaker1> Second part

3
00:00:03.100 --> 00:00:04.000
<v Speaker1> Third part`);

      const cleaned = vtt.clean();

      // Should have combined all three cues
      expect(cleaned.cues.length).toBe(1);

      // Check the combined cue
      const combinedCue = cleaned.cues[0];
      expect(combinedCue).toBeDefined();
      if (combinedCue) {
        expect(combinedCue.startTimestamp).toBe("00:00:01.000");
        expect(combinedCue.endTimestamp).toBe("00:00:04.000");
        expect(combinedCue.text).toBe("First part Second part Third part");
        expect(combinedCue.speaker).toBe("Speaker1");
      }
    });

    test("should handle mixed sequential and non-sequential cues", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First part

2
00:00:02.100 --> 00:00:03.000
<v Speaker1> Second part

3
00:00:05.000 --> 00:00:06.000
<v Speaker1> After gap

4
00:00:06.100 --> 00:00:07.000
<v Speaker1> Final part`);

      const cleaned = vtt.clean(500);

      // Should have combined into two groups
      expect(cleaned.cues.length).toBe(2);

      // First group
      const firstGroup = cleaned.cues[0];
      expect(firstGroup).toBeDefined();
      if (firstGroup) {
        expect(firstGroup.startTimestamp).toBe("00:00:01.000");
        expect(firstGroup.endTimestamp).toBe("00:00:03.000");
        expect(firstGroup.text).toBe("First part Second part");
      }

      // Second group
      const secondGroup = cleaned.cues[1];
      expect(secondGroup).toBeDefined();
      if (secondGroup) {
        expect(secondGroup.startTimestamp).toBe("00:00:05.000");
        expect(secondGroup.endTimestamp).toBe("00:00:07.000");
        expect(secondGroup.text).toBe("After gap Final part");
      }
    });

    test("should respect custom maxGapMs parameter", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker1> First part

2
00:00:03.500 --> 00:00:04.000
<v Speaker1> Second part with larger gap`);

      // With default 500ms gap - should NOT join
      const cleanedDefault = vtt.clean(500);
      expect(cleanedDefault.cues.length).toBe(2);

      // With 2000ms gap - should join
      const cleanedLargerGap = vtt.clean(2000);
      expect(cleanedLargerGap.cues.length).toBe(1);
      expect(cleanedLargerGap.cues[0]?.text).toBe(
        "First part Second part with larger gap",
      );
    });
  });

  describe("Vtt getCueByPosition Method", () => {
    test("should get cue at specific position in sorted array", () => {
      const vtt = new Vtt(`WEBVTT

100
00:00:05.000 --> 00:00:06.000
<v Speaker3> Third chronologically

50
00:00:01.000 --> 00:00:02.000
<v Speaker1> First chronologically

75
00:00:03.000 --> 00:00:04.000
<v Speaker2> Second chronologically`);

      // When sorted by startInMilliseconds
      const firstChronologically = vtt.getCueByPosition(0);
      const secondChronologically = vtt.getCueByPosition(1);
      const thirdChronologically = vtt.getCueByPosition(2);

      expect(firstChronologically?.index).toBe(50); // First by start time
      expect(secondChronologically?.index).toBe(75); // Second by start time
      expect(thirdChronologically?.index).toBe(100); // Third by start time
    });

    test("should sort by specified property", () => {
      const vtt = new Vtt(`WEBVTT

100
00:00:03.000 --> 00:00:07.000
<v Speaker3> Latest ending

50
00:00:01.000 --> 00:00:04.000
<v Speaker1> Middle ending

75
00:00:02.000 --> 00:00:03.000
<v Speaker2> Earliest ending`);

      // Sort by endInMilliseconds
      const earliestEnding = vtt.getCueByPosition(0, "endInMilliseconds");
      const middleEnding = vtt.getCueByPosition(1, "endInMilliseconds");
      const latestEnding = vtt.getCueByPosition(2, "endInMilliseconds");

      expect(earliestEnding?.index).toBe(75); // Earliest ending
      expect(middleEnding?.index).toBe(50); // Middle ending
      expect(latestEnding?.index).toBe(100); // Latest ending

      // Sort by index
      const lowestIndex = vtt.getCueByPosition(0, "index");
      const middleIndex = vtt.getCueByPosition(1, "index");
      const highestIndex = vtt.getCueByPosition(2, "index");

      expect(lowestIndex?.index).toBe(50); // Lowest index
      expect(middleIndex?.index).toBe(75); // Middle index
      expect(highestIndex?.index).toBe(100); // Highest index
    });

    test("should return undefined for invalid position", () => {
      const vtt = new Vtt(`WEBVTT

1
00:00:01.000 --> 00:00:02.000
<v Speaker> Only cue`);

      // Position out of range
      expect(vtt.getCueByPosition(-1)).toBeUndefined();
      expect(vtt.getCueByPosition(1)).toBeUndefined();
    });

    test("should handle empty Vtt", () => {
      const vtt = new Vtt("");
      expect(vtt.getCueByPosition(0)).toBeUndefined();
    });
  });

  describe("VttCue words getter", () => {
    test("should split text into words", () => {
      const cue = new VttCue({
        index: 1,
        startTimestamp: "00:00:01.000",
        endTimestamp: "00:00:02.000",
        speaker: "Speaker",
        words: [
          new VttWord({
            content: "Hello",
            startTimestamp: "00:00:01.000",
            endTimestamp: "00:00:01.200",
            index: 1,
          }),
          new VttWord({
            content: "world,",
            startTimestamp: "00:00:01.200",
            endTimestamp: "00:00:01.400",
            index: 2,
          }),
          new VttWord({
            content: "this",
            startTimestamp: "00:00:01.400",
            endTimestamp: "00:00:01.600",
            index: 3,
          }),
          new VttWord({
            content: "is",
            startTimestamp: "00:00:01.600",
            endTimestamp: "00:00:01.700",
            index: 4,
          }),
          new VttWord({
            content: "a",
            startTimestamp: "00:00:01.700",
            endTimestamp: "00:00:01.800",
            index: 5,
          }),
          new VttWord({
            content: "test!",
            startTimestamp: "00:00:01.800",
            endTimestamp: "00:00:02.000",
            index: 6,
          }),
        ],
      });

      expect(cue.wordStrings).toEqual([
        "Hello",
        "world,",
        "this",
        "is",
        "a",
        "test!",
      ]);
    });

    test("should handle empty words array", () => {
      const cue = new VttCue({
        index: 1,
        startTimestamp: "00:00:01.000",
        endTimestamp: "00:00:02.000",
        speaker: "Speaker",
        words: [],
      });

      expect(cue.wordStrings).toEqual([]);
    });

    test("should handle multiple spaces and special characters", () => {
      const cue = new VttCue({
        index: 1,
        startTimestamp: "00:00:01.000",
        endTimestamp: "00:00:02.000",
        speaker: "Speaker",
        words: [
          new VttWord({
            content: "  Multiple  ",
            startTimestamp: "00:00:01.000",
            endTimestamp: "00:00:01.200",
            index: 1,
          }),
          new VttWord({
            content: " spaces  ",
            startTimestamp: "00:00:01.200",
            endTimestamp: "00:00:01.400",
            index: 2,
          }),
          new VttWord({
            content: " and...",
            startTimestamp: "00:00:01.400",
            endTimestamp: "00:00:01.600",
            index: 3,
          }),
          new VttWord({
            content: " special-characters!  ",
            startTimestamp: "00:00:01.600",
            endTimestamp: "00:00:01.800",
            index: 4,
          }),
        ],
      });

      expect(cue.wordStrings).toEqual([
        "Multiple",
        "spaces",
        "and...",
        "special-characters!",
      ]);
    });

    test("should handle text with numbers and symbols", () => {
      const cue = new VttCue({
        index: 1,
        startTimestamp: "00:00:01.000",
        endTimestamp: "00:00:02.000",
        speaker: "Speaker",
        words: [
          new VttWord({
            content: "Testing",
            startTimestamp: "00:00:01.000",
            endTimestamp: "00:00:01.200",
            index: 1,
          }),
          new VttWord({
            content: "123",
            startTimestamp: "00:00:01.200",
            endTimestamp: "00:00:01.400",
            index: 2,
          }),
          new VttWord({
            content: "with",
            startTimestamp: "00:00:01.400",
            endTimestamp: "00:00:01.600",
            index: 3,
          }),
          new VttWord({
            content: "$symbols%",
            startTimestamp: "00:00:01.600",
            endTimestamp: "00:00:01.800",
            index: 4,
          }),
          new VttWord({
            content: "and",
            startTimestamp: "00:00:01.800",
            endTimestamp: "00:00:01.900",
            index: 5,
          }),
          new VttWord({
            content: "(punctuation)",
            startTimestamp: "00:00:01.900",
            endTimestamp: "00:00:02.000",
            index: 6,
          }),
        ],
      });

      expect(cue.wordStrings).toEqual([
        "Testing",
        "123",
        "with",
        "$symbols%",
        "and",
        "(punctuation)",
      ]);
    });
  });

  describe("recallTranscriptToVtt Function", () => {
    test("should convert Recall transcript to VTT format", () => {
      const recallTranscript: RecallTranscript = [
        {
          words: [
            {
              text: "First segment",
              start_timestamp: 1,
              end_timestamp: 2,
            },
          ],
          speaker: "Speaker 1",
        },
        {
          words: [
            {
              text: "Second segment",
              start_timestamp: 3,
              end_timestamp: 4,
            },
          ],
          speaker: "Speaker 2",
        },
      ];

      const vtt = Vtt.fromRecallTranscript(recallTranscript);

      expect(vtt.cues.length).toBe(2);

      // Check first cue
      expect(vtt.cues[0]?.index).toBe(1);
      expect(vtt.cues[0]?.startTimestamp).toBe("00:00:01.000");
      expect(vtt.cues[0]?.endTimestamp).toBe("00:00:02.000");
      expect(vtt.cues[0]?.text).toBe("First segment");
      expect(vtt.cues[0]?.speaker).toBe("Speaker 1");

      // Check second cue
      expect(vtt.cues[1]?.index).toBe(2);
      expect(vtt.cues[1]?.startTimestamp).toBe("00:00:03.000");
      expect(vtt.cues[1]?.endTimestamp).toBe("00:00:04.000");
      expect(vtt.cues[1]?.text).toBe("Second segment");
      expect(vtt.cues[1]?.speaker).toBe("Speaker 2");
    });

    test("should handle empty transcript", () => {
      const vtt = Vtt.fromRecallTranscript([]);
      expect(vtt.cues.length).toBe(0);
      expect(vtt.toString()).toBe("WEBVTT\n");
    });

    test("should trim whitespace from text", () => {
      const recallTranscript: RecallTranscript = [
        {
          words: [
            {
              text: "  Text with spaces  ",
              start_timestamp: 1,
              end_timestamp: 2,
            },
          ],
          speaker: "Speaker 1",
        },
      ];

      const vtt = Vtt.fromRecallTranscript(recallTranscript);
      expect(vtt.cues[0]?.text).toBe("Text with spaces");
    });

    test("should handle transcript with long timestamps", () => {
      const recallTranscript: RecallTranscript = [
        {
          words: [
            {
              text: "Long duration",
              start_timestamp: 3600, // 1 hour
              end_timestamp: 7200, // 2 hours
            },
          ],
          speaker: "Speaker 1",
        },
      ];

      const vtt = Vtt.fromRecallTranscript(recallTranscript);
      expect(vtt.cues[0]?.startTimestamp).toBe("01:00:00.000");
      expect(vtt.cues[0]?.endTimestamp).toBe("02:00:00.000");
    });
  });
});
