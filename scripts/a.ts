import _ from "lodash";
import { createClient } from "~/lib/supabase/client";
import fs from "node:fs";
import path from "node:path";
import { apiVideo } from "~/server/api/services/api-video";
import webvtt from "@voctrolabs/node-webvtt";

const supabase = createClient();

interface MeetingData {
  meeting_id: string;
  duration_spoken: number;
  total_duration: number;
  percentage_spoken: number;
}

interface ProfileData {
  profile_id: string;
  nickname: string;
  duration_spoken: number;
  total_meeting_duration: number;
  percentage_spoken: number;
  meetings: MeetingData[];
}

// Helper function to format time for logging
export function formatTime(duration: number): string {
  const seconds = Math.floor(duration % 60);
  const minutes = Math.floor((duration / 60) % 60);
  const hours = Math.floor((duration / (60 * 60)) % 24);
  const milliseconds = Math.floor(((duration % 60) - seconds) * 1000);

  const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const secondsStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
  const millisecondsStr =
    milliseconds < 100
      ? milliseconds < 10
        ? `00${milliseconds}`
        : `0${milliseconds}`
      : `${milliseconds}`;

  return `${hoursStr}:${minutesStr}:${secondsStr}.${millisecondsStr}`;
}

// Helper function to extract speaker from cue text
export function getSpeaker(cueText: string): string | null {
  const speakerRegex = /<v\s+([^>]+)>/;
  const match = speakerRegex.exec(cueText);
  return match ? match[1] || null : null;
}

// Helper function to clean VTT text by removing zero-width characters
export function cleanVttText(vttText: string): string {
  return vttText.replace(/\u200B|\u200C|\u200D|\uFEFF/g, "");
}

// Helper function to validate and cap percentage values
export function normalizePercentage(percentage: number): number {
  if (percentage < 0) return 0;
  if (percentage > 100) return 100;
  return percentage;
}

const main = async () => {
  console.log("Starting data processing...");
  const { data: profiles } = await supabase.from("profiles").select("*");
  console.log(`Found ${profiles?.length ?? 0} profiles to process`);
  const results: ProfileData[] = [];

  for (const profile of profiles ?? []) {
    console.log(`Processing profile: ${profile.nickname ?? profile.id}`);
    const { data: meetings } = await supabase
      .from("meetings")
      .select("*")
      .eq("profile_id", profile.id);

    console.log(
      `Found ${meetings?.length ?? 0} meetings for profile ${profile.nickname ?? profile.id}`,
    );

    let totalDurationSpoken = 0;
    let totalMeetingDuration = 0;
    const meetingsData: MeetingData[] = [];

    for (const meeting of meetings ?? []) {
      try {
        console.log(
          `Processing meeting with video ID: ${meeting.video_api_id}`,
        );
        const vtt = meeting.clean_vtt_file ?? "";
        console.log(`Processing VTT content of length ${vtt.length}`);
        let durationSpokenInMeeting = 0;

        // Calculate total meeting duration
        let meetingDuration = meeting.duration_in_seconds ?? 0;
        console.log(
          `Initial meeting duration from database: ${meetingDuration} seconds`,
        );

        if (meetingDuration === 0) {
          console.log(
            `Fetching duration from API.video for ${meeting.video_api_id}`,
          );
          try {
            const video = await apiVideo.videos
              .getStatus(meeting.video_api_id)
              .catch((err) => {
                console.error(`Error fetching video status: ${err.message}`);
                return null;
              });
            meetingDuration = video?.encoding?.metadata?.duration ?? 0;
            console.log(`Duration from API.video: ${meetingDuration} seconds`);
          } catch (err) {
            console.error(
              `Failed to get video status: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        if (meetingDuration === 0) {
          console.log(
            `Meeting ${meeting.video_api_id} has no duration, skipping`,
          );
          continue;
        }

        totalMeetingDuration += meetingDuration;

        // Use webvtt parser to properly handle the VTT content
        try {
          // Clean VTT content by removing zero-width characters
          const cleanedVtt = cleanVttText(vtt);

          // Ensure the VTT has proper headers
          const vttWithHeader = cleanedVtt.startsWith("WEBVTT")
            ? cleanedVtt
            : `WEBVTT\n\n${cleanedVtt}`;

          const parsedVtt = webvtt.parse(vttWithHeader);

          if (!parsedVtt || !parsedVtt.cues) {
            console.log("Failed to parse VTT or no cues found");
            continue;
          }

          console.log(
            `Successfully parsed VTT with ${parsedVtt.cues.length} cues`,
          );

          // Create a map to track overlapping segments
          const timeSegments: { start: number; end: number }[] = [];
          let speakingInstances = 0;

          for (const cue of parsedVtt.cues) {
            // Extract speaker name from cue text
            const speaker = getSpeaker(cue.text);

            if (speaker === profile.nickname) {
              speakingInstances++;

              // Validate segment duration
              if (cue.end <= cue.start) {
                console.log(
                  `Invalid segment duration: ${cue.start} to ${cue.end}`,
                );
                continue;
              }

              // Check for overlapping segments to avoid double counting
              let isOverlapping = false;
              for (const segment of timeSegments) {
                // Check if this segment overlaps with any existing segment
                if (
                  (cue.start >= segment.start && cue.start < segment.end) ||
                  (cue.end > segment.start && cue.end <= segment.end) ||
                  (cue.start <= segment.start && cue.end >= segment.end)
                ) {
                  // Handle overlap by merging segments
                  segment.start = Math.min(segment.start, cue.start);
                  segment.end = Math.max(segment.end, cue.end);
                  isOverlapping = true;
                  break;
                }
              }

              if (!isOverlapping) {
                timeSegments.push({ start: cue.start, end: cue.end });
              }

              console.log(
                `Speaking segment: ${formatTime(cue.start)} to ${formatTime(cue.end)} (${(cue.end - cue.start).toFixed(2)} seconds)`,
              );
            }
          }

          // Calculate total speaking time from non-overlapping segments
          for (const segment of timeSegments) {
            durationSpokenInMeeting += segment.end - segment.start;
          }

          console.log(
            `Found ${speakingInstances} speaking instances for ${profile.nickname}`,
          );
          console.log(
            `Total speaking time in meeting: ${durationSpokenInMeeting.toFixed(2)} seconds`,
          );

          // Ensure speaking time doesn't exceed meeting duration
          if (durationSpokenInMeeting > meetingDuration) {
            console.log(
              `Warning: Speaking time (${durationSpokenInMeeting.toFixed(2)}s) exceeds meeting duration (${meetingDuration}s). Capping at meeting duration.`,
            );
            durationSpokenInMeeting = meetingDuration;
          }

          totalDurationSpoken += durationSpokenInMeeting;

          // Calculate percentage spoken for this meeting
          const percentageSpokenInMeeting = normalizePercentage(
            (durationSpokenInMeeting / meetingDuration) * 100,
          );

          console.log(
            `Speaking percentage in meeting: ${percentageSpokenInMeeting.toFixed(2)}%`,
          );

          // Add meeting data
          meetingsData.push({
            meeting_id: meeting.video_api_id,
            duration_spoken: durationSpokenInMeeting,
            total_duration: meetingDuration,
            percentage_spoken: percentageSpokenInMeeting,
          });
        } catch (err) {
          console.error(
            `Error parsing VTT content: ${err instanceof Error ? err.message : String(err)}`,
          );
          console.log("Falling back to manual VTT parsing");

          // Fallback to manual parsing if webvtt parser fails
          const vttLines = vtt.split("\n");
          console.log(`VTT file has ${vttLines.length} lines`);

          const filteredVttLines = vttLines.filter(
            (line) =>
              line.match(
                /^[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})? --> [0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?$/,
              ) || line.match(/<v [^>]+>/),
          );

          // Track time segments to avoid overlaps
          const timeSegments: { start: number; end: number }[] = [];
          let speakingInstances = 0;

          for (const [i, line] of _.uniq(filteredVttLines).entries()) {
            if (
              line.includes(`<v ${profile.nickname}>`) ||
              line === `<v ${profile.nickname}>`
            ) {
              speakingInstances++;
              const timestampLine = filteredVttLines[i - 1];

              if (!timestampLine || !timestampLine.includes("-->")) {
                console.log(
                  `Missing or invalid timestamp for line ${i}: ${line}`,
                );
                continue;
              }

              const [start, end] = timestampLine
                .split("-->")
                .map((time) => time.trim());

              if (!start || !end) {
                console.log(
                  `Invalid timestamp format at line ${i}: ${timestampLine}`,
                );
                continue;
              }

              try {
                const [
                  hoursStart = "0",
                  minutesStart = "0",
                  secondsStart = "0",
                ] = start.split(":");
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
                  console.log(
                    `Invalid segment duration: ${startSeconds} to ${endSeconds}`,
                  );
                  continue;
                }

                // Check for overlapping segments
                let isOverlapping = false;
                for (const segment of timeSegments) {
                  if (
                    (startSeconds >= segment.start &&
                      startSeconds < segment.end) ||
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

                console.log(
                  `Speaking segment: ${start} to ${end} (${(endSeconds - startSeconds).toFixed(2)} seconds)`,
                );
              } catch (err) {
                console.error(
                  `Error parsing timestamp: ${err instanceof Error ? err.message : String(err)}`,
                );
              }
            }
          }

          // Calculate total speaking time from non-overlapping segments
          for (const segment of timeSegments) {
            durationSpokenInMeeting += segment.end - segment.start;
          }

          console.log(
            `Found ${speakingInstances} speaking instances for ${profile.nickname} (manual parsing)`,
          );
          console.log(
            `Total speaking time in meeting: ${durationSpokenInMeeting.toFixed(2)} seconds`,
          );

          // Ensure speaking time doesn't exceed meeting duration
          if (durationSpokenInMeeting > meetingDuration) {
            console.log(
              `Warning: Speaking time (${durationSpokenInMeeting.toFixed(2)}s) exceeds meeting duration (${meetingDuration}s). Capping at meeting duration.`,
            );
            durationSpokenInMeeting = meetingDuration;
          }

          totalDurationSpoken += durationSpokenInMeeting;

          // Calculate percentage spoken for this meeting
          const percentageSpokenInMeeting = normalizePercentage(
            (durationSpokenInMeeting / meetingDuration) * 100,
          );

          // Add meeting data
          meetingsData.push({
            meeting_id: meeting.video_api_id,
            duration_spoken: durationSpokenInMeeting,
            total_duration: meetingDuration,
            percentage_spoken: percentageSpokenInMeeting,
          });
        }
      } catch (error) {
        console.error(
          `Error processing meeting ${meeting.video_api_id}:`,
          error,
        );
        console.log(`Skipping meeting ${meeting.video_api_id} due to error`);

        // Still add the meeting with zero values to maintain data consistency
        meetingsData.push({
          meeting_id: meeting.video_api_id,
          duration_spoken: 0,
          total_duration: meeting.duration_in_seconds ?? 0,
          percentage_spoken: 0,
        });
      }
    }

    // Calculate percentage spoken across all meetings
    const percentageSpoken = normalizePercentage(
      totalMeetingDuration > 0
        ? (totalDurationSpoken / totalMeetingDuration) * 100
        : 0,
    );

    console.log(`Profile ${profile.nickname ?? profile.id} summary:`);
    console.log(
      `- Total speaking time: ${totalDurationSpoken.toFixed(2)} seconds`,
    );
    console.log(`- Total meeting duration: ${totalMeetingDuration} seconds`);
    console.log(
      `- Overall speaking percentage: ${percentageSpoken.toFixed(2)}%`,
    );

    // Add profile data to results
    results.push({
      profile_id: profile.id,
      nickname: profile.nickname ?? "",
      duration_spoken: totalDurationSpoken,
      total_meeting_duration: totalMeetingDuration,
      percentage_spoken: percentageSpoken,
      meetings: meetingsData,
    });

    // Save data as we go after each profile is processed
    const outputPath = path.join(process.cwd(), "profile_speaking_data.json");
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Saved intermediate results to ${outputPath}`);
  }

  console.log(
    `Data processing complete. Saved data for ${results.length} profiles`,
  );
};

main().catch((error) => {
  console.error("Error in main process:", error);
  process.exit(1);
});
