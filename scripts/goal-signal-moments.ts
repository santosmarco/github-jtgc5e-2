import { parse } from "csv-parse/sync";
import fs from "node:fs";
import { inspect } from "node:util";
import dotenv from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

dotenv.config({
  path: "../.env.local",
});

import { env } from "~/env";
import { createClient } from "~/lib/supabase/client";
import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { dedent } from "ts-dedent";
import { z } from "zod";
import type { TablesInsert } from "~/lib/supabase/database.types";

const GOAL_ID_TO_COPY_INTO_PROFILE = "389517d0-ae63-4b94-b033-965888abbcca";
const PROFILE_ID_TO_COPY_INTO = "b34f732f-9fbe-4b1b-95d3-25a7488bb97b";

// (async () => {
//   const supabase = createClient();

//   for (const moment of MOMENTS_DATA) {
//     const result = await generateObject({
//       model: openai("o3-mini"),
//       prompt: dedent`
//         System: You are a professional meeting analyst specializing in objective language assessment. Your task is to evaluate meeting moment titles and ensure they maintain professional, neutral language.

//         Context: You will analyze a meeting moment's metadata to assess if its title needs rephrasing to be more objective and constructive.

//         Task: Evaluate the title for emotionally charged or potentially biased language that could be rephrased more neutrally.

//         Guidelines:
//         - Replace confrontational terms (e.g. "hostile", "aggressive") with objective descriptors
//         - Maintain the core meaning while using professional language
//         - Focus on describing the interaction pattern rather than emotional interpretation
//         - Use neutral business terminology

//         Examples:
//         ❌ "Hostile Product Criticism" → ✅ "Product Feedback Discussion"
//         ❌ "Aggressive Interruption" → ✅ "Communication Flow Break"

//         Output Schema:
//         {
//           "should_change_title": boolean, // true if title needs revision
//           "new_title": string | null      // revised neutral title or null if no change needed
//         }

//         Input Moment:
//         ${JSON.stringify(moment, null, 2)}

//         Analyze the title objectively and provide your assessment following the schema.
//       `,
//       schema: z.object({
//         should_change_title: z
//           .boolean()
//           .describe(
//             "Indicates if the current title contains language that should be revised for neutrality",
//           ),
//         new_title: z
//           .string()
//           .nullable()
//           .describe(
//             "A professionally rephrased title using neutral language, or null if current title is appropriate",
//           ),
//       }),
//     });

//     if (result.object.should_change_title) {
//       await supabase
//         .from("moments")
//         .update({
//           title: result.object.new_title,
//         })
//         .eq("id", moment.id);

//       console.log(
//         `Updated moment ${moment.id} from ${moment.title} to ${result.object.new_title}`,
//       );
//     }
//   }

//   /*
//   const { data: goal, error: goalError } = await supabase
//     .from("goals")
//     .select("*, signals:goal_signals(*)")
//     .eq("id", GOAL_ID_TO_COPY_INTO_PROFILE)
//     .single();

//   if (goalError) {
//     console.error("❌ Error fetching goal:", goalError);
//     return;
//   }

//   const { data: newGoal, error: newGoalError } = await supabase
//     .from("goals")
//     .insert({
//       is_current: true,
//       profile_id: PROFILE_ID_TO_COPY_INTO,
//       text: goal.text,
//       hidden_text: goal.hidden_text,
//       user_provided_context: goal.user_provided_context,
//       is_default: goal.is_default,
//     })
//     .select("id")
//     .single();

//   if (newGoalError) {
//     console.error("❌ Error inserting goal:", newGoalError);
//     return;
//   }

//   await supabase.from("goal_signals").upsert(
//     goal.signals
//       .filter((signal) => signal.is_current)
//       .map(
//         (signal) =>
//           ({
//             goal_id: newGoal.id,
//             direction: signal.direction,
//             text: signal.text,
//             hidden_text: signal.hidden_text,
//             activity_type: signal.activity_type,
//             is_current: true,
//             tag: signal.tag,
//             target_person_type: signal.target_person_type,
//             activity: signal.activity,
//           }) satisfies TablesInsert<"goal_signals">,
//       ),
//   );

//   console.log(newGoal.id);
//   */
// })();

// const DHRUV_PROFILE_ID = "1bd6ce35-80b0-4484-b4ba-0a7cd6009025";

// const supabase = createClient();

// // Types for our JSON storage
// type Timestamp = {
//   start: string; // HH:mm:ss.SSS format from VTT
//   end: string; // HH:mm:ss.SSS format from VTT
// };

// type Moment = {
//   start_segment_id: number;
//   end_segment_id: number;
//   reasoning: string;
//   score: number;
//   timestamp: Timestamp;
//   above_threshold: boolean;
// };

// type PatternAnalysis = {
//   key_indicators: string[];
//   context_requirements: string[];
//   anti_patterns: string[];
//   detection_strategy: string;
// };

// type SignalResult = {
//   signal_id: string;
//   signal_text: string;
//   pattern_analysis: PatternAnalysis;
//   moments: Moment[];
//   processing_time_ms: number;
// };

// type GoalResult = {
//   goal_id: string;
//   goal_text: string;
//   signals: SignalResult[];
// };

// type MeetingResult = {
//   meeting_id: string;
//   meeting_name: string;
//   meeting_date: string;
//   goals: GoalResult[];
//   has_moments: boolean;
// };

// type AnalysisResult = {
//   analysis_date: string;
//   total_runtime_ms: number;
//   stats: {
//     total_meetings: number;
//     processed_meetings: number;
//     meetings_with_moments: number;
//     total_signals: number;
//     total_moments: number;
//     average_moments_per_meeting: number;
//   };
//   meetings: MeetingResult[];
// };

// // VTT parsing types
// type VTTSegment = {
//   id: number;
//   start: string; // HH:mm:ss.SSS
//   end: string; // HH:mm:ss.SSS
//   text: string;
// };

// // Helper to format durations
// const formatDuration = (ms: number): string => {
//   if (ms < 1000) return `${ms}ms`;
//   const seconds = Math.floor(ms / 1000);
//   const minutes = Math.floor(seconds / 60);
//   if (minutes > 0) {
//     return `${minutes}m ${seconds % 60}s`;
//   }
//   return `${seconds}s`;
// };

// // Helper to parse VTT file and extract segments with timestamps
// const parseVTT = (vttContent: string): VTTSegment[] => {
//   const lines = vttContent.split("\n").filter(Boolean); // Remove empty lines
//   const segments: VTTSegment[] = [];
//   let currentSegment: Partial<VTTSegment> | null = null;

//   const isCompleteSegment = (
//     segment: Partial<VTTSegment> | null,
//   ): segment is VTTSegment => {
//     if (!segment) return false;
//     return (
//       typeof segment.id === "number" &&
//       typeof segment.start === "string" &&
//       typeof segment.end === "string" &&
//       typeof segment.text === "string"
//     );
//   };

//   for (const line of lines) {
//     const trimmedLine = line.trim();

//     // Skip WEBVTT header
//     if (
//       trimmedLine === "WEBVTT" ||
//       trimmedLine.startsWith("X-TIMESTAMP-MAP=")
//     ) {
//       continue;
//     }

//     // Check if line is a segment number
//     if (/^\d+$/.test(trimmedLine)) {
//       if (isCompleteSegment(currentSegment)) {
//         segments.push(currentSegment);
//       }
//       currentSegment = { id: Number.parseFloat(trimmedLine, 10) };
//       continue;
//     }

//     // Check if line is a timestamp
//     const timestampMatch = trimmedLine.match(
//       /(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/,
//     );
//     if (timestampMatch && currentSegment) {
//       const [_, start, end] = timestampMatch;
//       if (!start || !end) {
//         console.warn(`Invalid timestamp format in line: ${trimmedLine}`);
//         continue;
//       }
//       currentSegment.start = start;
//       currentSegment.end = end;
//       continue;
//     }

//     // If we have timestamps and this is a text line, add the text
//     if (currentSegment?.start && currentSegment?.end && trimmedLine) {
//       currentSegment.text = trimmedLine;
//     }
//   }

//   // Don't forget to add the last segment if it's complete
//   if (isCompleteSegment(currentSegment)) {
//     segments.push(currentSegment);
//   }

//   return segments;
// };

// // Helper to get timestamps for a moment
// const getMomentTimestamps = (
//   segments: VTTSegment[],
//   startSegmentId: number,
//   endSegmentId: number,
// ): Timestamp => {
//   const startSegment = segments.find((s) => s.id === startSegmentId);
//   const endSegment = segments.find((s) => s.id === endSegmentId);

//   if (!startSegment || !endSegment) {
//     throw new Error(
//       `Could not find segments for moment: ${startSegmentId}-${endSegmentId}`,
//     );
//   }

//   return {
//     start: startSegment.start,
//     end: endSegment.end,
//   };
// };

// const main = async () => {
//   console.log("\n🔍 Starting goal signal detection...");
//   const startTime = Date.now();

//   // Initialize our result structure
//   const result: AnalysisResult = {
//     analysis_date: new Date().toISOString(),
//     total_runtime_ms: 0,
//     stats: {
//       total_meetings: 0,
//       processed_meetings: 0,
//       meetings_with_moments: 0,
//       total_signals: 0,
//       total_moments: 0,
//       average_moments_per_meeting: 0,
//     },
//     meetings: [],
//   };

//   // Fetch goals
//   console.log("\n📊 Fetching goals and signals...");
//   const { data: goals, error: goalsError } = await supabase
//     .from("goals")
//     .select("*, signals:goal_signals(*)")
//     .eq(
//       "id",
//       // "8be974a7-a4d1-47f6-ba6f-f7926341238f" /* Communicate Clearly and Effectively */,
//       // "5788f2fc-7719-4330-b723-908ebf86870f" /* Give feedback effectively with more authority */,
//       "4017ba21-4742-4134-bfc7-af52f9bbef1c" /* Give direct feedback effectively without demotivating the team */,
//     );

//   if (goalsError) {
//     console.error("❌ Error fetching goals:", goalsError);
//     return;
//   }
//   console.log(
//     `✅ Found ${goals.length} goals with ${goals[0]?.signals.length ?? 0} signals`,
//   );

//   // Fetch meetings
//   console.log("\n🎥 Fetching meetings...");
//   const { data: meetings, error: meetingsError } = await supabase
//     .from("meetings")
//     .select("*, profile:profiles(*)")
//     .eq("profile_id", DHRUV_PROFILE_ID)
//     .limit(10);

//   if (meetingsError) {
//     console.error("❌ Error fetching meetings:", meetingsError);
//     return;
//   }
//   console.log(`✅ Found ${meetings.length} meetings to analyze`);

//   // Update initial stats
//   result.stats.total_meetings = meetings.length;
//   result.stats.total_signals = goals.reduce(
//     (acc, goal) => acc + goal.signals.length,
//     0,
//   );

//   // Process each meeting
//   for (const meeting of meetings) {
//     console.log(`\n📝 Processing meeting: ${meeting.video_api_id}`);
//     console.log(`   Name: ${meeting.name ?? "Untitled"}`);
//     console.log(
//       `   Date: ${new Date(meeting.created_at).toLocaleDateString()}`,
//     );

//     const meetingResult: MeetingResult = {
//       meeting_id: meeting.video_api_id,
//       meeting_name: meeting.name ?? "Untitled",
//       meeting_date: meeting.created_at,
//       goals: [],
//       has_moments: false,
//     };

//     for (const goal of goals) {
//       console.log(`\n🎯 Analyzing for goal: ${goal.text}`);

//       const goalResult: GoalResult = {
//         goal_id: goal.id,
//         goal_text: goal.text,
//         signals: [],
//       };

//       for (const signal of goal.signals) {
//         const signalStartTime = Date.now();
//         console.log(`\n🔍 Checking signal: ${signal.hidden_text}`);

//         const llmResult = await generateObject({
//           model: openai("gpt-4o"),
//           prompt: dedent`
//             You are a helpful assistant analyzing a meeting transcript to find specific behavioral patterns or signals.
//             You will be given:
//             1. A meeting transcript in VTT format
//             2. A signal pattern to look for (e.g. "Deliver feedback that is vague, unclear, or unactionable")

//             The VTT format explained:
//             - Each segment has a numeric ID (e.g. "1", "2", "3")
//             - Each segment has a timestamp range (e.g. "00:00:01.870 --> 00:00:03.490")
//             - Each segment shows who is speaking with their name in angle brackets (e.g. "<v Marco Santos>")
//             - After the speaker name is their spoken text

//             Example VTT segment:
//             """
//             1
//             00:00:01.870 --> 00:00:03.490
//             <v Marco Santos>the meeting started with introductions
//             """

//             <meeting_transcript>
//             ${meeting.clean_vtt_file}
//             </meeting_transcript>

//             <task>
//             First, analyze the signal pattern and break it down into key behavioral indicators that would help identify matching moments. Think step by step about:
//             1. What specific behaviors or language patterns indicate this signal?
//             2. What contextual clues would strengthen or weaken a match?
//             3. What potential false positives should be avoided?

//             Then, find moments in the transcript where DHRUV AGRAWAL exhibits the given signal pattern.
//             Only include moments where Dhruv is the one performing the behavior - ignore instances where others exhibit the pattern.
//             Be precise and only return moments that clearly match the pattern.
//             It's perfectly fine to return an empty array if no moments clearly match the pattern.
//             Do not try to force matches if you're unsure - accuracy is more important than finding matches.

//             For each moment, assign a relevance score from 1-10:
//             - 10: Perfect match with clear evidence
//             - 7-9: Strong match with good evidence
//             - 4-6: Moderate match with some evidence
//             - 1-3: Weak match with limited evidence
//             </task>

//             <output_format>
//             Return an object with:
//             1. A "pattern_analysis" object containing:
//                - key_indicators: Array of specific behaviors/patterns to look for
//                - context_requirements: What surrounding context strengthens a match
//                - anti_patterns: Behaviors that might seem like matches but should be excluded
//                - detection_strategy: How to systematically identify true matches

//             2. An array of "moments" where each moment has:
//                - start_segment_id: The numeric ID where this relevant moment begins
//                - end_segment_id: The numeric ID where this relevant moment ends
//                - reasoning: Explain why this segment matches the signal pattern
//                - score: A number from 1-10 indicating how well this moment matches the pattern

//             Example:
//             {
//               "pattern_analysis": {
//                 "key_indicators": ["Uses abstract terms without concrete examples", "Speaks in generalizations"],
//                 "context_requirements": ["Multiple sentences of vague language", "Lack of specific details"],
//                 "anti_patterns": ["Technical terms used appropriately", "Intentionally high-level overview"],
//                 "detection_strategy": "Look for segments where specific details are needed but missing"
//               },
//               "moments": [{
//                 "start_segment_id": 1,
//                 "end_segment_id": 3,
//                 "reasoning": "{detailed reasoning for why this moment matches the pattern}",
//                 "score": 8
//               }]
//             }
//             </output_format>

//             <signal_pattern>
//             ${signal.hidden_text}
//             </signal_pattern>

//             Remember:
//             - Only include moments where DHRUV exhibits the pattern
//             - Only include moments that clearly match the pattern
//             - It's better to return no moments than to include uncertain matches
//             - Each moment must have clear evidence from the transcript supporting the match
//             - Assign scores thoughtfully based on how well each moment matches the pattern
//           `,
//           schema: z.object({
//             pattern_analysis: z.object({
//               key_indicators: z.array(z.string()),
//               context_requirements: z.array(z.string()),
//               anti_patterns: z.array(z.string()),
//               detection_strategy: z.string(),
//             }),
//             moments: z
//               .array(
//                 z.object({
//                   start_segment_id: z.number(),
//                   end_segment_id: z.number(),
//                   reasoning: z.string(),
//                   score: z.number().min(1).max(10),
//                 }),
//               )
//               .default([]),
//           }),
//           temperature: 0.2,
//         });

//         const duration = Date.now() - signalStartTime;
//         const momentCount = llmResult.object.moments.length;

//         // Parse VTT file once for this signal
//         const vttSegments = parseVTT(meeting.clean_vtt_file ?? "");

//         // Calculate average score for this signal's moments
//         const averageScore =
//           llmResult.object.moments.length > 0
//             ? llmResult.object.moments.reduce((acc, m) => acc + m.score, 0) /
//               llmResult.object.moments.length
//             : 0;

//         // Add timestamps and above_threshold to moments, then sort by score
//         const momentsWithTimestamps = llmResult.object.moments
//           .map((moment) => ({
//             ...moment,
//             timestamp: getMomentTimestamps(
//               vttSegments,
//               moment.start_segment_id,
//               moment.end_segment_id,
//             ),
//             above_threshold: moment.score > averageScore,
//           }))
//           .sort((a, b) => b.score - a.score);

//         // Store signal results
//         const signalResult: SignalResult = {
//           signal_id: signal.id,
//           signal_text: signal.hidden_text ?? "",
//           pattern_analysis: llmResult.object.pattern_analysis,
//           moments: momentsWithTimestamps,
//           processing_time_ms: duration,
//         };
//         goalResult.signals.push(signalResult);

//         // Update stats
//         result.stats.total_moments += momentCount;
//         if (momentCount > 0) {
//           meetingResult.has_moments = true;
//         }

//         // Log results for this signal
//         console.log(
//           `   Found ${momentCount} moments (took ${formatDuration(duration)})`,
//         );

//         // Log pattern analysis
//         console.log("\n   Pattern Analysis:");
//         console.log(
//           "   Key Indicators:",
//           llmResult.object.pattern_analysis.key_indicators.join(", "),
//         );
//         console.log(
//           "   Context Requirements:",
//           llmResult.object.pattern_analysis.context_requirements.join(", "),
//         );
//         console.log(
//           "   Anti-patterns:",
//           llmResult.object.pattern_analysis.anti_patterns.join(", "),
//         );
//         console.log(
//           "   Detection Strategy:",
//           llmResult.object.pattern_analysis.detection_strategy,
//         );

//         if (momentCount > 0) {
//           console.log("\n   Moments found:");
//           momentsWithTimestamps.forEach((moment, idx) => {
//             console.log(
//               `   ${idx + 1}. Segments ${moment.start_segment_id}-${moment.end_segment_id} (Score: ${moment.score}/10, Above Threshold: ${moment.above_threshold})`,
//             );
//             console.log(
//               `      Time: ${moment.timestamp.start} - ${moment.timestamp.end}`,
//             );
//             console.log(`      Reason: ${moment.reasoning}`);
//           });
//         }
//       }

//       meetingResult.goals.push(goalResult);
//     }

//     result.meetings.push(meetingResult);
//     result.stats.processed_meetings++;
//     if (meetingResult.has_moments) {
//       result.stats.meetings_with_moments++;
//     }

//     // Progress update
//     const progress =
//       (result.stats.processed_meetings / result.stats.total_meetings) * 100;
//     console.log(
//       `\n📊 Progress: ${progress.toFixed(1)}% (${result.stats.processed_meetings}/${result.stats.total_meetings} meetings)`,
//     );

//     // Save intermediate results
//     const intermediateFilePath = join(
//       process.cwd(),
//       "goal_signal_analysis_in_progress.json",
//     );
//     writeFileSync(
//       intermediateFilePath,
//       JSON.stringify(result, null, 2),
//       "utf-8",
//     );
//   }

//   // Calculate final stats
//   result.total_runtime_ms = Date.now() - startTime;
//   result.stats.average_moments_per_meeting =
//     result.stats.total_moments / result.stats.processed_meetings;

//   // Save final results as JSON
//   const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
//   const jsonFilePath = join(
//     process.cwd(),
//     `goal_signal_analysis_${timestamp}.json`,
//   );
//   writeFileSync(jsonFilePath, JSON.stringify(result, null, 2), "utf-8");

//   // Generate CSV
//   console.log("\n📊 Generating CSV export...");

//   // Prepare CSV rows
//   const csvRows = [];

//   // CSV headers
//   const headers = [
//     "Meeting ID",
//     "Meeting Name",
//     "Meeting Date",
//     "Goal ID",
//     "Goal Text",
//     "Signal ID",
//     "Signal Text",
//     "Moment Start Segment",
//     "Moment End Segment",
//     "Moment Start Time",
//     "Moment End Time",
//     "Moment Score",
//     "Above Threshold",
//     "Reasoning",
//     "Key Indicators",
//     "Context Requirements",
//     "Anti Patterns",
//     "Detection Strategy",
//   ];
//   csvRows.push(headers);

//   // Flatten the data structure for CSV
//   for (const meeting of result.meetings) {
//     for (const goal of meeting.goals) {
//       for (const signal of goal.signals) {
//         for (const moment of signal.moments) {
//           csvRows.push([
//             meeting.meeting_id,
//             meeting.meeting_name,
//             meeting.meeting_date,
//             goal.goal_id,
//             goal.goal_text,
//             signal.signal_id,
//             signal.signal_text,
//             moment.start_segment_id,
//             moment.end_segment_id,
//             moment.timestamp.start,
//             moment.timestamp.end,
//             moment.score,
//             moment.above_threshold,
//             moment.reasoning,
//             signal.pattern_analysis.key_indicators.join("; "),
//             signal.pattern_analysis.context_requirements.join("; "),
//             signal.pattern_analysis.anti_patterns.join("; "),
//             signal.pattern_analysis.detection_strategy,
//           ]);
//         }
//       }
//     }
//   }

//   // Save CSV
//   const csvFilePath = join(
//     process.cwd(),
//     `goal_signal_analysis_${timestamp}.csv`,
//   );
//   writeFileSync(
//     csvFilePath,
//     stringify(csvRows, {
//       header: false,
//       quoted: true,
//       quoted_empty: true,
//     }),
//     "utf-8",
//   );

//   // Final statistics
//   console.log("\n📈 Final Statistics:");
//   console.log("--------------------");
//   console.log(`Total Runtime: ${formatDuration(result.total_runtime_ms)}`);
//   console.log(
//     `Meetings Processed: ${result.stats.processed_meetings}/${result.stats.total_meetings}`,
//   );
//   console.log(`Meetings with Moments: ${result.stats.meetings_with_moments}`);
//   console.log(`Total Signals Checked: ${result.stats.total_signals}`);
//   console.log(`Total Moments Found: ${result.stats.total_moments}`);
//   console.log(
//     `Average Moments per Meeting: ${result.stats.average_moments_per_meeting.toFixed(2)}`,
//   );
//   console.log("\n💾 Results saved to:");
//   console.log(`   JSON: ${jsonFilePath}`);
//   console.log(`   CSV: ${csvFilePath}`);
//   console.log("--------------------");
// };

// main().catch((error) => {
//   console.error("❌ Fatal error:", error);
//   process.exit(1);
// });

/*
agent_detection_prompt = dedent(f"""\
        You are an expert linguist tasked with analyzing a transcript to determine the role of a specific person in feedback exchanges.
        You will be provided with a transcript in VTT format and the name of the target person.

        The target person for this analysis is:
        <target_person>{target_person}</target_person>

        Your task is to determine whether {target_person} is:
        1. Actively giving feedback
        2. Actively receiving feedback 
        3. Not involved in any feedback exchanges

        Carefully analyze the transcript, paying close attention to {target_person}'s contributions and the context of their interactions. Look for instances where they are offering suggestions, affirmations, or advice (giving feedback), or where they are on the receiving end of such comments (receiving feedback).

        In your analysis, consider the following:
        - The content and tone of {target_person}'s statements
        - The responses of other participants to {target_person}
        - The overall context of the conversation

        Provide your analysis in the following JSON format:

        <output_format>
        {{
            "reasoning": "Detailed explanation of analysis with specific examples from transcript",
            "type": "One of: 'Giving Feedback' | 'Receiving Feedback' | 'Not Involved'"
        }}
        </output_format>

        The type must be exactly one of the following values:
        - "Giving Feedback": If {target_person} is primarily offering suggestions, affirmations, or advice
        - "Receiving Feedback": If {target_person} is mainly on the receiving end of feedback
        - "Not Involved": If {target_person} does not participate in any significant feedback exchange

        Base your type solely on evidence present in the transcript. Do not add extraneous information or make assumptions beyond what is explicitly stated.
        Output valid JSON only with no additional text or formatting.
    """).strip()

    sublabel_prompt = dedent(f"""\
        You are an expert linguist tasked with analyzing communication transcripts in a high-stakes diplomatic setting. Your goal is to categorize segments of a meeting transcript based on the type of feedback or communication occurring.

        You will be provided with the following information:
        
        <inputs_description>
        1. The transcript of that moment in VTT format.
        2. The target person involved.
        3. A summary of a specific moment in the meeting.
        4. The direction of feedback.
        </inputs_description>

        <target_person>
        {target_person}
        </target_person>

        Interpret the feedback direction as follows:
        - "Giving Feedback": {target_person} is giving someone else feedback.
        - "Receiving Feedback": {target_person} is receiving feedback from someone else.
        - Any other input: This is "Not Feedback".

        Analyze the transcript and categorize each segment based on the following categories:

        1. Positive Reinforcement: Affirming or encouraging another's actions, behaviors, or performance.
        2. Constructive Feedback: Offering specific, actionable suggestions for improvement.
        3. Critical Feedback: Pointing out negative or problematic behavior directly related to the addressed person.
        4. Guidance: Offering advice, support, or direction to help solve a problem, improve, or grow.
        5. Suggestion: Proposing a new or alternative way of doing something, without direct criticism.
        6. Request: Asking or instructing another to complete a task, provide information, or take action.
        7. Other Feedback: Communication that is considered feedback but doesn't fit the above categories.
        8. Not Detected: Communication that is not considered feedback (e.g., general conversation, unrelated comments).

        Instructions for analysis:
        1. Read the summary and transcript carefully.
        2. Consider the feedback direction and target person.
        3. Analyze each segment of the transcript and determine the best-fitting category.
        4. Provide your reasoning for the chosen category.
        5. Format your response in JSON as specified below.

        Before providing your final response, wrap your analysis inside <detailed_analysis> tags:

        <detailed_analysis>
        1. Summarize the key points from the transcript
        2. Consider how the feedback direction and target person influence your interpretation
        3. For each category:
        - List relevant quotes from the transcript that support this category
        - Evaluate how well the overall content fits this category
        4. Compare the top 2-3 most likely categories, noting pros and cons for each
        5. Make a final decision on the best-fitting category
        6. Formulate your reasoning, referencing specific details from the transcript
        </detailed_analysis>

        Provide your final response in the following JSON format:
        
        <output_format>
        {{
            "type": "One of: 'Positive Reinforcement' | 'Constructive Feedback' | 'Critical Feedback' | 'Guidance' | 'Suggestion' | 'Request' | 'Other Feedback' | 'Not Detected'",
            "reasoning": "Explanation of why this category was chosen based on the transcript content"
        }}
        </output_format>

        Remember to choose exactly one category that best fits the overall content of the transcript, and provide a clear explanation for your choice based on specific details from the transcript.
    """).strip()
*/

// (async () => {

// // Function to load and parse CSV data
// async function loadCsvToJson(filePath: string) {
//   try {
//     // Read the CSV file
//     const fileContent = fs.readFileSync(filePath, "utf8");

//     // Parse CSV to JSON
//     const records = parse(fileContent, {
//       columns: true,
//       skip_empty_lines: true,
//       trim: true,
//     });

//     console.log(`Successfully loaded ${records.length} records from CSV`);
//     console.log(records[0]);
//     return records;
//   } catch (error) {
//     console.error("Error loading or parsing CSV:", error);
//     throw error;
//   }
// }

// // Load Lucia's Moments data
// try {
//   const luciaMomentsPath =
//     "./Lucia's Moments Sheet v0 Interestingness Score.csv";
//   const luciaMomentsData = await loadCsvToJson(luciaMomentsPath);

//   console.log("First record sample:", luciaMomentsData[0]);

//   // Map CSV data to moments table schema
// const momentsData: TablesInsert<"moments">[] = luciaMomentsData.map(
//   (record) =>
//     ({
//       id: record.id,
//       segment_id_sequence_start: record.segment_id_sequence_start
//         ? Number.parseFloat(record.segment_id_sequence_start)
//         : null,
//       segment_id_sequence_end: record.segment_id_sequence_end
//         ? Number.parseFloat(record.segment_id_sequence_end)
//         : null,
//       summary: record.summary,
//       title: record.title,
//       segment_start_timestamp: record.segment_start_timestamp,
//       segment_end_timestamp: record.segment_end_timestamp,
//       segment_start_timestamp_in_seconds:
//         record.segment_start_timestamp_in_seconds
//           ? Number.parseFloat(record.segment_start_timestamp_in_seconds)
//           : null,
//       segment_end_timestamp_in_seconds:
//         record.segment_end_timestamp_in_seconds
//           ? Number.parseFloat(record.segment_end_timestamp_in_seconds)
//           : null,
//       video_api_id: record.video_api_id || null,
//       activity_type:
//         record.activity_type === "null" ? null : record.activity_type,
//       activity_reasoning:
//         record.activity_reasoning === "null"
//           ? null
//           : record.activity_reasoning,
//       target_person_type: record.target_person_role_type,
//       target_person_reasoning: record.target_person_role_reasoning,
//       activity: record.activity,
//       moment_url: record.moment_url,
//       latest: record.latest === "TRUE",
//       version: record.version ? Number.parseFloat(record.version) : 1,
//       relevant: false,
//       intensity: record.intensity
//         ? Number.parseFloat(record.intensity)
//         : null,
//       profile_id: record.profile_id || null,
//       topic_id: record.topic_id || null,
//       vtt: record.vtt,
//       qa_score: record.qa_score ? Number.parseFloat(record.qa_score) : null,
//       qa_reasoning: record.qa_reasoning,
//       qa_reasoning_not_higher: record.qa_reasoning_not_higher,
//       qa_reasoning_not_lower: record.qa_reasoning_not_lower,
//       target_person_score: record.target_person_role_score
//         ? Number.parseFloat(record.target_person_role_score)
//         : null,
//       altitude_score: record.altitude_score
//         ? Number.parseFloat(record.altitude_score)
//         : null,
//       altitude_reasoning: record.altitude_reasoning,
//       altitude_score_reasoning_not_higher:
//         record.altitude_score_reasoning_not_higher,
//       altitude_score_reasoning_not_lower:
//         record.altitude_score_reasoning_not_lower,
//       altitude_type: record.altitude_type,
//       altitude_score_reasoning: record.altitude_score_reasoning,
//       interestingness_score: record.interestingness_score
//         ? Number.parseFloat(record.interestingness_score)
//         : null,
//       interestingness_reasoning: record.interestingness_reasoning,
//       interestingness_reasoning_not_lower:
//         record.interestingness_reasoning_not_lower,
//       interestingness_reasoning_not_higher:
//         record.interestingness_reasoning_not_higher,
//       _internal_comment: null,
//       _internal_thumbs_up: 0,
//       _internal_thumbs_down: 0,
//       created_at: record.created_at
//         ? new Date(record.created_at)
//         : new Date(),
//       updated_at: record.updated_at
//         ? new Date(record.updated_at)
//         : new Date(),
//       segment_start_timestamp_in_seconds_ideal:
//         record.segment_perfect_timestamp_in_seconds
//           ? Number.parseFloat(record.segment_perfect_timestamp_in_seconds)
//           : null,
//       segment_id_sequence_start_ideal: null,
//       segment_id_sequence_start_ideal_algorithm: null,
//       segment_start_timestamp_in_seconds_ideal_algorithm:
//         record.segment_perfect_timestamp_in_seconds
//           ? Number.parseFloat(record.segment_perfect_timestamp_in_seconds)
//           : null,
//       target_person_confidence: record.target_person_role_score
//         ? Number.parseFloat(record.target_person_role_score)
//         : null,
//       activity_type_confidence: null,
//       final_score: Number.parseFloat(record.ranking_score),
//     }) satisfies Required<TablesInsert<"moments">>,
// );

//   // Insert data into moments table
//   // Use insert with onConflict to avoid the "cannot affect row a second time" error
//   // This happens when multiple rows in momentsData have the same ID
//   // Filter out duplicates and keep only the latest version of each moment
//   const uniqueMomentsData = [
//     ...new Map(momentsData.map((item) => [item.id, item])).values(),
//   ];

//   // Upsert data - this will insert new records and update existing ones
//   const { data, error } = await supabase
//     .from("moments")
//     .upsert(uniqueMomentsData, {
//       onConflict: "id",
//     });

//   if (error) {
//     console.error("Error inserting moments data:", error);
//   } else {
//     console.log(`Successfully inserted ${momentsData.length} moments`);
//   }
// } catch (error) {
//   console.error("Failed to process Lucia's moments data:", error);
// }
(async () => {
  const supabase = createClient();

  try {
    // Create a moment entry based on the data from file_context_0
    const momentData = {
      id: "349de9e7-fa64-4ec0-b43c-4da9b74cde77",
      profile_id: "2c0bed46-31ce-4168-a3a6-11f41c0819d7",
      title: "End-of-Day Deliverable Commitment",
      summary:
        'In this sequence, Matt provides a progress update by stating he "pinged them today," and Lucia follows up with a clear, time-bound commitment by saying she is happy to deliver by end of day. This exchange directly demonstrates personal accountability through explicit status reporting and deadline commitment.',
      activity: "Accountability_v4",
      video_api_id: "vi4PpMAWhPqUHnkn83qH23DF",
      topic_id: "b951aa12-9dd5-4b2a-b6bb-cf3a3c7a97bc",
      vtt: "98\n00:14:57.061 --> 00:14:59.182\nLucia Huang: I saw your follow ups. They're so annoying.\n\n99\n00:14:58.781 --> 00:15:00.881\nMatt Kannan: pinged them today because, yeah, if\n\n100\n00:15:00.606 --> 00:15:00.822\nLucia Huang: Yeah.\n\n101\n00:15:00.861 --> 00:15:25.361\nMatt Kannan: we want to move forward with, like, if this is going to be a constraint and just thinking about the timeline now, like, even if they both respond today, it's still going to take time to get the buy-in from Justin if we want to go with, like, the NSO with longer life or with the longer option life. or post-termination exercise period. Perhaps we just structure it as an RSA if you're comfortable with that.\n\n102\n00:15:26.223 --> 00:15:33.781\nLucia Huang: Okay. Okay. I'm happy to give it to end of day today. And then we can just move forward tomorrow if we don't get back. Yeah,",
      segment_id_sequence_start: 98,
      segment_id_sequence_end: 102,
      segment_start_timestamp: "00:14:57.061",
      segment_end_timestamp: "00:15:33.781",
      segment_start_timestamp_in_seconds: 897,
      segment_end_timestamp_in_seconds: 933,
      moment_url: "https://embed.api.video/vod/vi4PpMAWhPqUHnkn83qH23DF#;t=897",
      qa_score: 3,
      qa_reasoning:
        "The transcript segment displays a clear instance of accountability through Lucia's explicit commitment to deliver the required item by the end of the day. Her statement 'I'm happy to give it to end of day today. And then we can just move forward tomorrow if we don't get back.' indicates she is taking responsibility for ensuring that follow-up actions occur, which is a hallmark of accountability in professional environments.",
      qa_reasoning_not_higher:
        "While the accountability instance is clear, it is not exceptionally exemplary or multifaceted in terms of comprehensive accountability behaviors, which prevents it from scoring as the highest (4).",
      qa_reasoning_not_lower:
        "The clear and direct commitment by Lucia, which resolves potential delays, leaves little doubt about the demonstration of accountability, ensuring the score is not lower.",
      target_person_score: "3",
      altitude_score: "3",
      altitude_reasoning:
        "Lucia's contributions in this segment are focused on immediate task execution and day-to-day operations. While she expresses irritation at the follow-ups, her commitment to deliver by the end of the day indicates a clear sense of operational accountability. The exchange centers around setting short-term deadlines and handling immediate workflows, rather than addressing long-term strategic or visionary goals.",
      altitude_score_reasoning_not_higher:
        "A higher score (such as 4) was not chosen because the segment does not involve overarching strategic or visionary decision-making, but rather focuses on immediate, operational matters.",
      altitude_score_reasoning_not_lower:
        "A lower score was not chosen because there is clear commitment to and ownership of the immediate tasks, which surpasses mere individual minor accountability.",
      altitude_type: "2.0",
      altitude_score_reasoning:
        "A score of 3 has been assigned because there is strong evidence of accountability in terms of managing daily deliverables. Lucia clarifies her commitment to completing the task within the set timeframe, which is a hallmark of operational accountability.",
      interestingness_score: "4",
      interestingness_reasoning:
        "The interestingness of this moment lies in how it clearly demonstrates personal accountability and process commitment, which is valuable for leadership. However, the emotion of mild annoyance, while present, does not add a significant dramatic or uniquely transformative quality to the exchange. It remains a routine, operational feedback moment. This combination makes the moment moderately interesting as it highlights accountability but without any heightened emotional impact or leadership breakthrough.",
      interestingness_reasoning_not_lower:
        "It is not lower because the moment does offer clear deadline commitment and feedback clarity, which can be insightful for a leader in terms of ownership and process follow-up.",
      interestingness_reasoning_not_higher:
        "The score is not higher because the emotion involved is only mild annoyance, and the accountability shown is part of routine follow-up, lacking any exceptional or emotionally charged aspects.",
      activity_type: "Ownership Taking",
      activity_reasoning:
        "In the transcript, Lucia Huang clearly takes direct responsibility for her assigned task by stating, 'I'm happy to give it to end of day today. And then we can just move forward tomorrow if we don't get back.' This explicit commitment indicates that she is actively taking ownership of delivering her work. Although her earlier comment expressed frustration, the decisive statement about the timeline outweighs it, fitting best under 'Ownership Taking' where the focus is on demonstration of responsibility. Therefore, based on these details, 'Ownership Taking' is the most appropriate category.",
      target_person_type: "Personal Accountability",
      target_person_reasoning: `Lucia Huang's contribution in the transcript shows a clear instance of personal accountability. In segment 102 (00:15:26.223 --> 00:15:33.781), she explicitly states, 'I'm happy to give it to end of day today. And then we can just move forward tomorrow if we don't get back,' which demonstrates a commitment to complete her task within a defined time frame. Although her earlier comment in segment 98 ('I saw your follow ups. They're so annoying.') conveys annoyance, it does not detract from the fact that she takes responsibility by setting a clear timeline for her deliverable. The explicit timeline and acceptance of responsibility clearly align with the 'Personal Accountability' category. Given the clarity and direct nature of her commitment, the evidence supports a high score but with slight reservations due to the initial negative tone. Therefore, the analysis leads to a 'Personal Accountability' classification with a score of 3.`,
      created_at: new Date(),
      version: 1,
      updated_at: new Date(),
      relevant: true,
      intensity: null,
      latest: true,
      _internal_comment: null,
      _internal_thumbs_up: 0,
      _internal_thumbs_down: 0,
      final_score: Math.min(
        1,
        (() => {
          // Extract required values
          const targetPersonRoleType = "Personal Accountability"; // target_person_type
          const targetPersonRoleScore = 3; // target_person_score
          const qaScore = 3; // qa_score
          const altitudeType = 2; // altitude_type
          const altitudeScore = 3; // altitude_score
          const interestingnessScore = 4; // interestingness_score

          // Check conditions for zero score
          if (
            (targetPersonRoleType === "Not Involved" &&
              targetPersonRoleScore >= 3) ||
            qaScore <= 1
          ) {
            return 0;
          }

          // Calculate components
          const qualityComponent = 0.1 * (qaScore / 3);

          const altitudeComponent =
            0.4 *
            Math.pow(
              0.5 * (altitudeScore / 4) +
                0.5 * (Number.parseInt(altitudeType) / 5),
              2,
            );

          let interestingnessComponent;
          if (interestingnessScore <= 3) {
            interestingnessComponent =
              (interestingnessScore / 3) *
              0.1 *
              Math.pow(interestingnessScore / 3, 2);
          } else if (interestingnessScore <= 7) {
            interestingnessComponent =
              (interestingnessScore / 3) *
              (0.1 + 0.2 * Math.pow((interestingnessScore - 3) / 4, 2));
          } else {
            interestingnessComponent =
              (interestingnessScore / 3) *
              (0.3 + 0.2 * Math.pow((interestingnessScore - 7) / 3, 2));
          }

          return (
            qualityComponent + altitudeComponent + interestingnessComponent
          );
        })(),
      ),
    } satisfies Required<TablesInsert<"moments">>;

    // Insert the moment into the database
    const { data, error } = await supabase.from("moments").upsert(momentData, {
      onConflict: "id",
    });

    if (error) {
      console.error("Error inserting moment data:", error);
    } else {
      console.log(`Successfully inserted moment: ${momentData.title}`);
    }
  } catch (error) {
    console.error("Failed to process moment data:", error);
  }
})();
