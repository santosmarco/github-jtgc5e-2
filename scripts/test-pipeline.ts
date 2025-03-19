// import fs from "node:fs/promises";
// import path from "node:path";
// import { createClient } from "~/lib/supabase/client";
// import type { TablesInsert } from "~/lib/supabase/database.types";
// import { processTranscript } from "~/lib/vtt/pipeline";

// interface TestResult {
//   meetingId: string;
//   profileId: string;
//   processingResult: {
//     events: TablesInsert<"entity_events">[];
//     entities: TablesInsert<"entities">[];
//     relations: TablesInsert<"entity_relationships">[];
//   };
//   error?: string;
// }

// async function main() {
//   // Configuration
//   const PROFILE_ID = process.env.TEST_PROFILE_ID;
//   if (!PROFILE_ID) {
//     throw new Error("TEST_PROFILE_ID environment variable is required");
//   }

//   console.log(`Starting pipeline test for profile ${PROFILE_ID}`);

//   // Initialize Supabase client
//   const supabase = createClient();

//   try {
//     // Fetch the first two meetings for the profile
//     const { data: meetings, error } = await supabase
//       .from("meetings")
//       .select("*")
//       .eq("profile_id", PROFILE_ID)
//       .order("created_at", { ascending: false })
//       .limit(2);

//     if (error) throw error;
//     if (!meetings || meetings.length === 0) {
//       throw new Error("No meetings found for the specified profile");
//     }

//     console.log(`Found ${meetings.length} meetings to process`);

//     // Process each meeting
//     const results: TestResult[] = [];
//     for (const meeting of meetings) {
//       console.log(`Processing meeting ${meeting.video_api_id}`);

//       try {
//         // Ensure we have VTT content
//         if (!meeting.clean_vtt_file) {
//           throw new Error("Meeting has no clean VTT file");
//         }

//         // Process the transcript
//         const processingResult = await processTranscript(
//           meeting.clean_vtt_file,
//           meeting.video_api_id,
//           PROFILE_ID,
//         );

//         results.push({
//           meetingId: meeting.video_api_id,
//           profileId: PROFILE_ID,
//           processingResult,
//         });

//         console.log(`Successfully processed meeting ${meeting.video_api_id}`);
//       } catch (err) {
//         console.error(`Error processing meeting ${meeting.video_api_id}:`, err);
//         results.push({
//           meetingId: meeting.video_api_id,
//           profileId: PROFILE_ID,
//           processingResult: {
//             events: [],
//             entities: [],
//             relations: [],
//           },
//           error: err instanceof Error ? err.message : "Unknown error occurred",
//         });
//       }
//     }

//     // Save results to file
//     const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
//     const outputDir = path.join(process.cwd(), "test-results");
//     const outputFile = path.join(outputDir, `pipeline-test-${timestamp}.json`);

//     // Ensure output directory exists
//     await fs.mkdir(outputDir, { recursive: true });

//     // Write results to file
//     await fs.writeFile(outputFile, JSON.stringify(results, null, 2), "utf-8");

//     console.log(`Test results saved to ${outputFile}`);
//   } catch (err) {
//     console.error("Error running pipeline test:", err);
//     process.exit(1);
//   }
// }

// // Run the script
// main().catch((err) => {
//   console.error("Fatal error:", err);
//   process.exit(1);
// });
