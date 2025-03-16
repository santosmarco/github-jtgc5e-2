// import dedent from "ts-dedent";
// import { createClient } from "~/lib/supabase/client";
// import { formatTime, webvtt } from "../../vtt-utils-v2";

// const SYSTEM_MESSAGE =
//   "You are an AI coach responsible for identifying specific moments within a meeting, taking into account the context of one specific topic segment at a time. This analysis is essential for a highly achieving founder with limited time, who uses meetings to find unique, valuable moments that contribute to their growth as a leader.";

// const DEFINITIONS = [
//   {
//     name: "Topic",
//     definition:
//       "The founder uses AI to transform meeting recordings into structured, topic-based segments. First, recordings are transcribed to VTT format. Then, an AI assistant analyzes the transcript to identify topic boundaries through semantic analysis and conversation dynamics. The AI generates a JSON output with segments containing titles, timestamps, summaries, and key event timelines. This approach makes lengthy meetings easily navigable by subject matter.",
//   },
//   {
//     name: "Moment",
//     definition: `A "moment" in meeting analysis refers to a significant sequence of interactions within a conversation that exemplifies a specific type of organizational behavior or communication pattern. Each moment is a bounded, non-overlapping sequence of VTT segments that share thematic coherence around a particular activity type, such as Feedback, Decision Making, Team Conflict, Accountability, Communication, and Delegation. Moments are evidence-based, containing clear behavioral indicators and sufficient context to understand the complete interaction. Each detected moment includes segment boundaries (start/end IDs), a concise descriptive title, and a summary explaining why it qualifies as the specified activity type. These moments provide valuable insights into team dynamics and organizational effectiveness.`,
//   },
// ];

// export async function getTopicForLLM(topicId: string) {
//   const supabase = createClient();

//   const { data: topic, error: topicError } = await supabase
//     .from("meeting_topics_v2")
//     .select(
//       "*, timeline:meeting_topic_events_v2(*), entities:meeting_entities_v2(*, observations:meeting_entity_observations_v2(*)), relationships:meeting_entity_relationships_v2(*, observations:meeting_entity_relationship_observations_v2(*)), observations:meeting_observations_v2(*)",
//     )
//     .eq("id", topicId)
//     .single();

//   if (topicError) {
//     throw topicError;
//   }

//   return topic;
// }

// export function formatTopicForLLM(
//   topic: Awaited<ReturnType<typeof getTopicForLLM>>,
//   meetingVtt: string,
// ) {
//   const { cues = [] } = webvtt.parse(meetingVtt);

//   const topicCues = cues.slice(
//     topic.start_segment_id - 1,
//     topic.end_segment_id,
//   );

//   const startSegmentTimestampInSeconds = topicCues[0]?.start ?? 0;
//   const endSegmentTimestampInSeconds =
//     topicCues[topicCues.length - 1]?.end ?? 0;

//   const startSegmentTimestamp = formatTime(startSegmentTimestampInSeconds);
//   const endSegmentTimestamp = formatTime(endSegmentTimestampInSeconds);

//   const timelineFormatted = topic.timeline
//     .map((event) => [`- ${event.timestamp}: ${event.event}`].join("\n"))
//     .join("\n");

//   const transcriptFormatted = topicCues
//     .map((cue) =>
//       [`- [${cue.identifier}] ${cue.}: ${cue.text}`].join("\n"),
//     )
//     .join("\n");

//   return dedent`
//     # Topic: ${topic.title} (${startSegmentTimestamp} - ${endSegmentTimestamp})

//     ${topic.summary}

//     ## Timeline

//     ${timelineFormatted}

//     ## Transcript

//   `;
// }

// export function makeMomentIdentificationPromptFactories({
//   identificationGuidelines,
// }: {
//   identificationGuidelines: string;
//   doingWellGuidelines: string;
//   growthAreasGuidelines: string;
// }) {
//   const definitionsFormatted = DEFINITIONS.map((d, i) =>
//     [
//       `<definition_${i + 1}>`,
//       `<name>${d.name}</name>`,
//       `<definition>${d.definition}</definition>`,
//       `</definition_${i + 1}>`,
//     ].join("\n"),
//   ).join("\n");

//   async function momentIdentification(topicId: string) {
//     const supabase = createClient();

//     const { data: topic, error: topicError } = await supabase
//       .from("meeting_topics_v2")
//       .select(
//         "*, timeline:meeting_topic_events_v2(*), entities:meeting_entities_v2(*, observations:meeting_entity_observations_v2(*)), relationships:meeting_entity_relationships_v2(*, observations:meeting_entity_relationship_observations_v2(*)), observations:meeting_observations_v2(*)",
//       )
//       .eq("id", topicId)
//       .single();

//     if (topicError) {
//       throw topicError;
//     }

//     return dedent`
//       ${SYSTEM_MESSAGE}

//       First, review these important definitions:

//       <definitions>
//       ${definitionsFormatted}
//       </definitions>

//       Next, let's review the context for your analysis:

//       <meeting_topic>
//       {{MEETING_TOPIC}}
//       </meeting_topic>

//       <founder_name>
//       {{FOUNDER_NAME}}
//       </founder_name>

//       <entities>
//       {{ENTITIES}}
//       </entities>

//       <previous_meeting_topic>
//       {{PREVIOUS_MEETING_TOPIC}}
//       </previous_meeting_topic>

//       <next_meeting_topic>
//       {{NEXT_MEETING_TOPIC}}
//       </next_meeting_topic>

//       <moment_type>
//       {{MOMENT_TYPE}}
//       </moment_type>

//       <moment_identification_guidelines>
//       {{MOMENT_IDENTIFICATION_GUIDELINES}}
//       </moment_identification_guidelines>

//       Your primary goal is to identify as many instances of <moment_type> moments as possible within the meeting transcript. These moments occur when leaders engage in specific behaviors or interactions related to the <moment_type> aspect of leadership.

//       When identifying <moment_type> moments, consider the following characteristics:

//       1. Intentionality: The leader consciously engages in the behavior with a specific purpose or goal in mind.
//       2. Relevance: The interaction directly relates to the <moment_type> aspect of leadership.
//       3. Impact: The moment has the potential to influence team members, align efforts, or address organizational needs.
//       4. Context-awareness: The behavior is appropriate and tailored to the specific situation and audience.
//       5. Outcome-orientation: The interaction aims to produce specific responses, actions, understanding, or alignment.

//       Look for verbal and non-verbal cues that indicate a <moment_type> moment is occurring. Pay attention to changes in tone, pace, language complexity, and explicit topic transitions.

//       Consider the various roles participants may take in these moments:
//       - Initiator
//       - Recipient
//       - Facilitator
//       - Contributor
//       - Challenger
//       - Supporter

//       Remember to account for contextual factors such as meeting purpose, team composition, organizational phase, recent events, prior interactions, power dynamics, cultural factors, and time constraints.

//       Analysis Process:
//       1. Review the meeting topic content, including context, participants, and discussion flow.
//       2. Identify all interactions that align with the <moment_type> moment guidelines.
//       3. Document the precise location within the meeting transcript for each identified moment.
//       4. Provide a brief description of each <moment_type> moment.

//       Before providing your final output, conduct your analysis inside <leadership_moment_analysis> tags within your thinking block. Follow this process:

//       1. Context Summary: Briefly summarize the meeting topic and relevant context.
//       2. Key Participants: Extract and list the key participants from the meeting topic.
//       3. Key Phrases Identification: List and number key phrases or interactions from the transcript that might be relevant to <moment_type> moments.
//       4. Potential Moments Identification: For each key phrase or interaction, consider whether it might qualify as a <moment_type> moment. Number each potential moment as you list it.
//       5. Moment Evaluation: For each potential moment:
//         a. Explicitly evaluate how it matches each of the 5 characteristics provided.
//         b. Consider which roles participants are taking in each moment.
//         c. Explicitly consider how the moment relates to each key participant.
//       6. Continuity Analysis: Cross-reference identified moments with the previous and next meeting topics for continuity.
//       7. Detailed Documentation: For each confirmed <moment_type> moment, provide its location in the transcript and a brief description.

//       It's OK for this section to be quite long, as thorough analysis is crucial for accurate moment identification.

//       If no relevant moments are identified, provide a clear explanation of why the topic content did not contain interactions matching the <moment_type> moment criteria, along with suggestions for what to look for in future meetings.

//       Your final output should be in JSON format, structured as follows:

//       \`\`\`json
//       {
//         "meeting_topic": "string",
//         "moment_count": number,
//         "moments": [
//           {
//             "location": "string",
//             "description": "string"
//           }
//         ],
//         "analysis": "string"
//       }
//       \`\`\`

//       If no moments are identified, the "moments" array should be empty, the "moment_count" should be 0, and the "analysis" field should contain the explanation.

//       Remember, your primary goal is to identify as many potential <moment_type> moments as possible without judging their quality or effectiveness. Focus on comprehensive identification rather than evaluation.

//       Your final output should consist only of the JSON object and should not duplicate or rehash any of the work you did in the thinking block.
//   `;
//   }

//   return {
//     momentIdentification,
//   };
// }
