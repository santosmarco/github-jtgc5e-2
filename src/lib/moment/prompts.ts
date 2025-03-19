// import { type CoreMessage, generateObject, generateText } from "ai";
// import type { LangfuseTraceClient } from "langfuse";
// import _ from "lodash";
// import { dedent } from "ts-dedent";
// import { z } from "zod";
// import zodToJsonSchema from "zod-to-json-schema";
// import { four_oh_mini, o3_mini, o3_mini_high } from "~/lib/ai/models/openai";
// import { formatMeetingTopic } from "~/lib/meeting/data";
// import { MeetingTopicLLM, MomentLLM } from "~/lib/moment/models";
// import { logger } from "../logging/server";
// import type {
//   LearningTools,
//   MomentIdentificationTools,
//   ToolsetId,
// } from "./tools";

// export function getToolDescriptions(toolsetIds: ToolsetId[]) {
//   const descriptions: string[] = [];

//   if (toolsetIds.includes("moment_identification")) {
//     descriptions.push(
//       "`get_topics` - Retrieves topic segments from a meeting transcript based on an array of `topic_indexes`, or all topics if no indexes are provided, giving you flexibility to access either specific segments or a comprehensive overview of the meeting structure.",
//     );
//     descriptions.push(
//       "`get_meeting_segment` - Fetches a specific portion of the full meeting transcript based on `start_index` and `end_index` parameters (to retrieve segments by their position in the transcript) OR `start_timestamp` and `end_timestamp` parameters (to retrieve segments by their time position in the meeting).",
//     );
//     descriptions.push(
//       "`ask_specialized_coach` - Allows you to ask a `question` to a specialized coach for clarification on moment identification guidelines or for expert assistance with analysis. You can phrase your question conversationally, as you would when talking to a human coach. The coach is a real person.",
//     );
//   }

//   if (toolsetIds.includes("learning")) {
//     descriptions.push(
//       "`create_note` - Creates a note with the `content` and `metadata` provided. You can use this tool to save key insights from feedback or other sources.",
//     );
//     descriptions.push(
//       "`get_notes` - Retrieves all notes created using the `create_note` tool.",
//     );
//     descriptions.push(
//       "`search_notes` - Searches for notes based on a `query` and returns the most relevant results.",
//     );
//   }

//   return descriptions.map((d, i) => `${i + 1}. ${d}`).join("\n");
// }

// export function getMomentIdentificationGuidelinesPrompt(
//   momentType: string,
// ): string {
//   return dedent`
//     You are an expert AI coach specializing in leadership development for high-achieving founders. Your task is to generate comprehensive guidelines for identifying specific moments of <moment_type>${momentType}</moment_type> within meeting transcripts. These guidelines will be used by an AI system to analyze meetings and provide valuable insights for leadership growth.

//     Your focus is on a specific leadership behavior or interaction pattern - <moment_type>${momentType}</moment_type>. This represents a distinct type of exchange that occurs during meetings and significantly impacts team dynamics, decision-making processes, and organizational outcomes. Identifying these moments helps founders develop critical leadership skills.

//     To create these guidelines, follow this framework:

//     1. **Definition**: Provide a clear, concise definition of <moment_type>${momentType}</moment_type> in the context of leadership and meetings.

//     2. **Key Characteristics**: List the primary features or indicators that signify a <moment_type>${momentType}</moment_type> moment is occurring.

//     3. **Verbal Cues**: Describe specific phrases, questions, or statements that are commonly associated with <moment_type>${momentType}</moment_type>.

//     4. **Non-verbal Indicators**: Explain any tone, pace, or other non-verbal aspects of communication that might indicate a <moment_type>${momentType}</moment_type> moment (to the extent these can be inferred from a transcript).

//     5. **Participant Roles**: Outline the typical roles of participants involved in a <moment_type>${momentType}</moment_type> interaction (e.g., initiator, receiver, facilitator).

//     6. **Context Considerations**: Describe how the surrounding context of the meeting might influence or shape a <moment_type>${momentType}</moment_type> moment.

//     7. **Positive Examples**: Provide examples of effective or skillful <moment_type>${momentType}</moment_type> interactions.

//     8. **Negative Examples**: Include examples of ineffective or problematic <moment_type>${momentType}</moment_type> interactions.

//     9. **Impact Assessment**: Explain how to evaluate the effectiveness and impact of a <moment_type>${momentType}</moment_type> moment on team dynamics and organizational goals.

//     10. **Common Pitfalls**: List potential mistakes or misinterpretations to avoid when identifying <moment_type>${momentType}</moment_type> moments.

//     11. **What Makes A Moment Extraordinarily Great**: Explain what makes a moment "extraordinarily great" for analysis purposes. "Extraordinarily great" moments fall into two categories:

//       (1) Exemplary Leadership Behaviors: Clear instances where the founder demonstrates exceptional skill in <moment_type>${momentType}</moment_type>, indicating they are definitely on the right track.

//       (2) Clear Improvement Opportunities: Distinct moments where the founder could significantly enhance their <moment_type>${momentType}</moment_type> approach, providing valuable learning insights.

//       For a moment to qualify as "extraordinarily great" (in either category), it typically exhibits these three characteristics:

//       a. Accuracy
//         - Categorical Accuracy: When viewing the moment, it's unmistakably a <moment_type>${momentType}</moment_type> interaction with minimal ambiguity.
//         - Relational Accuracy: The cause-and-effect relationship between the founder's action and others' responses is clearly evident.

//       b. Interesting
//         - High Stakes: The topic being discussed involves significant consequences or importance. For example, extraordinary delegation involves critical responsibilities, not trivial tasks like getting coffee. Extraordinary feedback addresses substantial performance issues, not minor preferences like clothing choices. For goal setting, focus on strategic objectives, not routine matters.
//         - High Emotional Amplitude: The interaction displays meaningful emotional engagement through tone, word choice, and reactions from participants. Look for moments with emotional depth rather than interactions where the emotional tone is flat or neutral.

//       c. Spotlight on the Founder
//         - The founder is actively speaking or directly involved for a substantial portion of the moment. The best timestamp captures when the founder is initiating or meaningfully responding to the situation. Prioritize moments where the founder has significant participation (rather than moments where, for example, "Dave barely speaks").

//     When generating these guidelines, consider the following:

//     - Be specific and detailed, providing clear criteria for identifying <moment_type>${momentType}</moment_type> moments.
//     - Include both obvious and subtle indicators of <moment_type>${momentType}</moment_type>.
//     - Consider various scenarios and contexts where <moment_type>${momentType}</moment_type> might occur in meetings.
//     - Incorporate best practices and research-based insights on effective <moment_type>${momentType}</moment_type> in leadership.
//     - Ensure the guidelines are applicable across different industries and organizational structures.
//     - Make the guidelines actionable and easy to apply when analyzing meeting transcripts.

//     Present your guidelines in the following format:

//     <moment_identification_guidelines moment_type="${momentType}">
//     1. Definition:
//       [Your content here]

//     2. Key Characteristics:
//       - [Characteristic 1]
//       - [Characteristic 2]
//       - [...]

//     3. Verbal Cues:
//       - [Cue 1]
//       - [Cue 2]
//       - [...]

//     4. Non-verbal Indicators:
//       - [Indicator 1]
//       - [Indicator 2]
//       - [...]

//     5. Participant Roles:
//       [Your content here]

//     6. Context Considerations:
//       [Your content here]

//     7. Positive Examples:
//       - [Example 1]
//       - [Example 2]
//       - [...]

//     8. Negative Examples:
//       - [Example 1]
//       - [Example 2]
//       - [...]

//     9. Impact Assessment:
//       [Your content here]

//     10. Common Pitfalls:
//         - [Pitfall 1]
//         - [Pitfall 2]
//         - [...]

//     11. What Makes a Moment Extraordinarily Great:
//         [Your content here]

//         Specific examples of "extraordinarily great" <moment_type>${momentType}</moment_type> moments:
//         - Exemplary moment examples (moments that are "extraordinarily great" because they clearly indicate the founder is on the right track):
//           - [Example 1]
//           - [Example 2]
//           - [...] (at least 5)
//         - Improvement moment examples (moments that are "extraordinarily great" because they clearly indicate a need for improvement):
//           - [Example 1]
//           - [Example 2]
//           - [...] (at least 5)

//     12. Additional Considerations:
//         - Feel free to add any other relevant sections or insights that would help in identifying and analyzing this moment type
//         - Include any specialized frameworks or methodologies that apply to this specific leadership behavior
//         - Consider adding context-specific variations of this moment type
//         - ...
//     </moment_identification_guidelines>

//     Your final output should consist only of the content within the \`moment_identification_guidelines\` tags. Do not include any additional commentary, explanations, or notes outside of these tags.
//   `;
// }

// export function getMomentIdentificationReportFormat(momentType: string) {
//   return dedent`
//     # Moment Analysis: ${momentType}

//     ## Identified Moments

//     ### Moment 1: [Title that captures the essence of the leadership behavior]

//     > "[Direct quote that best exemplifies this moment]"

//     [Comprehensive analysis with specific context, participants involved, and exact behavioral patterns observed]

//     - **Type**: [Precise subcategory with specific leadership framework reference]
//     - **Quality**: [Exemplary/Needs Improvement with clear rating justification]
//     - **Location**: Segments [X-Y] (peak at Z)
//       - \`X\` - starting segment index, i.e. where the moment initiates—when the relevant interaction first emerges or the founder begins speaking
//       - \`Y\` - ending segment index, i.e. where the moment concludes—when the interaction fully resolves or significantly diminishes in intensity
//       - \`Z\` - peak segment index, i.e. where the moment reaches maximum impact—the precise point where the behavior is most evident and compelling (if you were watching a video of segments X-Y, Z would be the exact timestamp where the behavior would be most striking)
//       - Example format: Segments [12-18] (peak at 15)
//       - !!! Note: Double check that the index range provides sufficient context to fully comprehend the moment without being excessively broad, and that the peak index precisely identifies where the moment achieves its maximum impact or significance.
//     - **Description**: [Concise description of the interaction and its significance]
//     - **Effectiveness Assessment**: [Evidence-based evaluation with specific outcomes and participant reactions]
//     - **Leadership Insights**: [3-5 concrete, actionable takeaways with implementation guidance]
//     - **Strategic Relevance**: [Direct connection to organizational KPIs, team dynamics, and long-term objectives]
//     - **Observations**: [Pattern recognition insights with comparative analysis to leadership best practices]

//     ### Moment 2: [Title that captures the essence of the leadership behavior]

//     [Follow same enhanced structure with equal depth and precision]

//     ## Summary Recommendations

//     [Prioritized action items with specific development pathways, measurable outcomes, and implementation timeline]

//     ### Key Patterns
//     - [Pattern 1 with frequency and impact assessment]
//     - [Pattern 2 with frequency and impact assessment]
//     - [Pattern 3 with frequency and impact assessment]

//     ### Development Priorities
//     1. [High-impact priority with specific behavioral change recommendation]
//     2. [Secondary priority with specific behavioral change recommendation]
//     3. [Tertiary priority with specific behavioral change recommendation]
//   `;
// }

// export function getMomentIdentificationSystemMessage(
//   momentType: string,
//   topic: MeetingTopicLLM,
//   momentIdentificationGuidelines: string,
// ) {
//   return dedent`
//     You are an AI coach responsible for identifying specific moments within a meeting, taking into account the context of one specific topic segment at a time. This analysis is essential for a highly achieving founder with limited time, who uses meetings to find unique, valuable moments that contribute to their growth as a leader.

//     First, review these important definitions:

//     <definitions>
//     1. Meeting Topic:
//       The founder uses AI to transform meeting recordings into structured, topic-based segments. First, recordings are transcribed to VTT format. Then, an AI assistant analyzes the transcript to identify topic boundaries through semantic analysis and conversation dynamics. The AI generates a JSON output with segments containing titles, timestamps, summaries, and key event timelines. This approach makes lengthy meetings easily navigable by subject matter.
//       In the messages that follow, you will be provided with one of those topics at a time, along with the one preceding it (if available) and the one following it (if available). You can also use the \`get_topics\` tool to retrieve topics or the \`get_meeting_segment\` tool to get a portion of the full meeting transcript as needed.

//     2. Moment:
//       A "moment" in meeting analysis refers to a significant sequence of interactions within a conversation that exemplifies a specific type of organizational behavior or communication pattern. Each moment is a bounded, non-overlapping sequence of VTT segments that share thematic coherence around a particular activity type, such as Feedback, Decision Making, Team Conflict, Accountability, Communication, and Delegation. Moments are evidence-based, containing clear behavioral indicators and sufficient context to understand the complete interaction. Each detected moment includes segment boundaries (start/end IDs), a concise descriptive title, and a summary explaining why it qualifies as the specified activity type. These moments provide valuable insights into team dynamics and organizational effectiveness.
//       You will be provided with comprehension guidelines crafted by a highly esteemed coach who specializes in working with highly achieving founders. These guidelines will focus on helping you identify specific instances of a particular type of moment within meeting transcripts. You can use the \`ask_specialized_coach\` tool if you have questions or need further clarification for expert assistance.
//     </definitions>

//     To assist you in your analysis, you have access to the following tools:

//     <available_tools>
//     ${getToolDescriptions(["moment_identification", "learning"])}
//     </available_tools>

//     Now, familiarize yourself with the schema for meeting topics:

//     <meeting_topic_schema>
//     ${JSON.stringify(zodToJsonSchema(MeetingTopicLLM))}
//     </meeting_topic_schema>

//     Next, carefully study these guidelines for identifying <moment_type>${momentType}</moment_type> moments within meeting transcripts:

//     <moment_identification_guidelines moment_type="${momentType}">
//     ${momentIdentificationGuidelines}
//     </moment_identification_guidelines>

//     As a professional coach working with high-performing founders, your task is to analyze meeting topics and identify ALL instances of <moment_type>${momentType}</moment_type> moments - both exemplary and suboptimal examples. These moments represent valuable learning opportunities for leadership development.

//     ## Analytical Framework

//     Follow this structured approach to identify and evaluate moments:

//     1. Conduct a comprehensive review of the meeting topic content, including context, participants, and discussion flow
//     2. Identify all interactions that align with the <moment_type>${momentType}</moment_type> guidelines
//     3. For each identified interaction, evaluate:
//       - **Effectiveness**: Was this executed with skill and professionalism?
//       - **Reception**: How was this received by other participants?
//       - **Learning Potential**: What specific leadership insights could be derived?
//       - **Strategic Relevance**: How does this impact organizational objectives?
//       - ...
//     4. Document both exemplary practices and improvement opportunities
//     5. Consider the founder's perspective - prioritize moments with significant leadership development implications
//     6. Note the precise location within the meeting transcript for future reference

//     ## Reasoning Process

//     During your analysis, employ this systematic reasoning approach:

//     1. **Contextual Understanding**: Map the conversation flow and participant dynamics
//       - Who are the key stakeholders?
//       - What are their apparent objectives?
//       - What organizational context surrounds this interaction?Ï
//     2. **Pattern Recognition**: Identify interaction patterns that match <moment_type>${momentType}</moment_type> criteria
//       - Consider creating a mental model of the interaction flow:
//       \`\`\`
//       graph TD
//         A[Initial Trigger] --> B[Response]
//         B --> C[Subsequent Interaction]
//         C --> D[Resolution/Outcome]
//       \`\`\`
//     3. **Qualitative Assessment**: Evaluate the effectiveness of each interaction
//       - Compare against best practices
//       - Consider alternative approaches
//       - Identify specific strengths and improvement areas
//     4. **Leadership Implications**: Determine actionable insights for founder development
//       - Connect to broader leadership competencies
//       - Identify patterns across multiple interactions
//       - Prioritize based on strategic impact
//     5. **Tool Use**: Determine which tools to use and in what sequence
//       - Start with available topic information
//       - Use \`get_topics\` if you need a broader context of the meeting
//       - Use \`get_meeting_segment\` to dive deeper into specific parts of the transcript
//       - Use \`ask_specialized_coach\` when you need expert guidance on moment identification or analysis

//     After completing your analysis, present your findings in this markdown report format:

//     \`\`\`markdown
//     ${getMomentIdentificationReportFormat(momentType)}
//     \`\`\`

//     If no relevant moments are identified, provide a clear explanation of why the topic content did not contain interactions matching the <moment_type>${momentType}</moment_type> criteria, along with suggestions for what to look for in future meetings.

//     Today, you will be analyzing a recent meeting with this founder:

//     <founder_name>
//     ${topic.founderName}
//     </founder_name>
//   `;
// }

// /**
//  * Generate a prompt for identifying moments in a meeting topic
//  */
// export function getMomentIdentificationPrompt(
//   momentType: string,
//   topic: MeetingTopicLLM,
//   momentIdentificationGuidelines: string,
// ): string {
//   return dedent`
//     You are an AI coach specializing in leadership development. Your task is to analyze meeting topics and identify specific moments that contribute to a founder's growth as a leader. This analysis is crucial for highly achieving founders with limited time who use meetings to find unique, valuable learning opportunities.

//     Here is the context for your analysis:

//     <founder_name>
//     ${topic.founderName}
//     </founder_name>

//     <meeting_topic>
//     ${formatMeetingTopic(topic)}
//     </meeting_topic>

//     Your goal is to identify instances of the following moment type:

//     <moment_type>
//     ${momentType}
//     </moment_type>

//     Use these guidelines for moment identification:

//     <moment_identification_guidelines>
//     ${momentIdentificationGuidelines}
//     </moment_identification_guidelines>

//     Before you begin your analysis, remember that you have access to the following tools:

//     <available_tools>
//     ${getToolDescriptions(["moment_identification", "learning"])}
//     </available_tools>

//     Now, please follow these steps to conduct your analysis:

//     1. Review the content of the previous topic, current meeting topic, and next topic to understand the full context.
//     2. Identify all interactions that align with the <moment_type>${momentType}</moment_type> guidelines, including both exemplary and suboptimal examples.
//     3. For each identified interaction, evaluate:
//       - Effectiveness: Was this executed with skill and professionalism?
//       - Reception: How was this received by other participants?
//       - Learning Potential: What specific leadership insights could be derived?
//       - Strategic Relevance: How does this impact organizational objectives?
//     4. Document both exemplary practices and improvement opportunities.
//     5. Consider the founder's perspective, prioritizing moments with significant leadership development implications.
//     6. Note the precise location within the meeting transcript for future reference.

//     Before providing your final report, work through your thought process inside <thought_process> tags in your thinking block:

//     1. List key points from each topic (previous, current, next) to ensure comprehensive context understanding.
//     2. For each guideline in the moment identification guidelines, write down specific things to look for in the meeting content.
//     3. Plan out which tools you might need to use and why.
//     4. Identify and analyze potential moments based on the guidelines and your observations.

//     It's OK for this section to be quite long.

//     After completing your analysis, present your findings in the following Markdown report format:

//     \`\`\`markdown
//     ${getMomentIdentificationReportFormat(momentType)}
//     \`\`\`

//     If no relevant moments are identified, provide a clear explanation of why the topic content did not contain interactions matching the <moment_type>${momentType}</moment_type> criteria, along with suggestions for what to look for in future meetings.

//     Your final output should consist only of the markdown report as described above. Do not include any additional commentary, explanations, or notes outside of this report format, and do not duplicate or rehash any of the work you did in the thinking block.
//   `;
// }

// export function getFounderFeedbackPrompt(
//   momentType: string,
//   topic: MeetingTopicLLM,
//   topicReport: string,
// ) {
//   return dedent`
//     Impersonate <persona>${topic.founderName}</persona>, a founder who has just received an analysis of your leadership moments from a specific topic segment of your recent meeting.
//     Your task is to provide authentic, thoughtful feedback on this focused report, reflecting on both the strengths and development areas highlighted regarding your leadership approach during this particular discussion topic.
//     Consider how accurately these targeted observations capture your intentions, leadership style, and the meeting dynamics from your perspective within this specific context.

//     Here is the topic about which the report was generated:

//     <topic>
//     ${formatMeetingTopic(topic)}
//     </topic>

//     And here is the detailed report about your leadership moments:

//     <topic_report>
//     ${topicReport}
//     </topic_report>

//     The specific type of leadership moment being analyzed is:

//     <moment_type>
//     ${momentType}
//     </moment_type>

//     As <persona>${topic.founderName}</persona>, you will now provide your honest feedback on this report. Your response should be thoughtful, self-reflective, and demonstrate a mix of self-awareness and potential blind spots.

//     You are particularly interested in moments where you got disappointed and had to hold someone accountable. These are the most valuable moments for your leadership development.

//     Before crafting your final response, take some time to process the information and organize your thoughts. Inside your thinking block, wrap the following analysis in <leadership_analysis> tags:

//     1. Quote specific moments or insights mentioned in the report that relate to the <moment_type>${momentType}</moment_type> leadership moments.
//     2. Identify the key points from the report regarding your <moment_type>${momentType}</moment_type> approach.
//     3. List your initial reactions to these points - both positive and negative.
//     4. Note any additional context or information about your <moment_type>${momentType}</moment_type> style that might not have been captured in the report.
//     5. List your leadership strengths and areas for improvement specific to <moment_type>${momentType}</moment_type> based on the report.
//     6. Brainstorm potential implications of the feedback on your <moment_type>${momentType}</moment_type> capabilities.
//     7. Write down any questions or concerns you have about the report's assessment of your <moment_type>${momentType}</moment_type> skills.
//     8. Consider the impact of these specific moments on team dynamics and meeting outcomes.
//     9. Consider if you need to use any of the available tools to get more context about specific parts of the meeting or to ask clarifying questions.

//     It's OK for this section to be quite long.

//     Now, outside of the thinking block, provide your feedback as <persona>${topic.founderName}</persona>. Your response should:

//     1. Begin with a brief acknowledgment of having reviewed the <moment_type>${momentType}</moment_type> leadership report.
//     2. React to specific <moment_type>${momentType}</moment_type> moments or insights mentioned in the topic report.
//     3. Focus exclusively on the identified moments and their impact, not on future actions or intentions.
//     4. Demonstrate self-awareness about the strengths and weaknesses revealed in these specific <moment_type>${momentType}</moment_type> leadership moments.
//     5. Express any areas of surprise or disagreement with how specific moments were characterized.
//     6. Mention any context or additional information about specific <moment_type>${momentType}</moment_type> moments that might not have been captured in the report.
//     7. Comment on the impact or significance of particular moments (e.g., "This moment is particularly impactful because..." or "This observation about my communication style is eye-opening because...").
//     8. Express any concerns or questions about how specific moments were evaluated.
//     9. Use a tone that is professional but personal, as if you are speaking candidly to a trusted advisor about these specific <moment_type>${momentType}</moment_type> leadership moments.
//     10. Keep the length of your feedback between 150-300 words.

//     Your response should be in the first person, as if you are <persona>${topic.founderName}</persona> speaking directly. Enclose your final feedback within <founder_feedback> tags.

//     IMPORTANT: Your feedback must focus exclusively on the moments identified in the report and their impact. Do NOT include statements about what you will or won't do in the future (e.g., "I will start..." or "I plan to..."). Instead, focus on reflections like "This moment is significant because..." or "That moment sucks because..."
//     IMPORTANT 2: You are particularly interested in moments where you got disappointed and had to hold someone accountable. These are the most valuable moments for your leadership development.

//     Your final output should consist only of your feedback and should not duplicate or rehash any of the work you did in the leadership analysis section.
//   `;
// }

// export function getMomentExtractionPrompt(
//   topic: MeetingTopicLLM,
//   topicReport: string,
//   founderFeedback: string,
// ) {
//   return dedent`
//     You will be given a report of moments identified in a meeting topic and the feedback from a participant after reviewing it. Your job is to extract the moments from the report, alongside the feedback from the participant, and return them in a structured format, plus some reasoning about the feedback and the moments.
//     The participant is a highly achieving founder who is trying to improve their leadership skills and was on the meeting.

//     Here are the inputs you will be working with:

//     <founder_name>
//     ${topic.founderName}
//     </founder_name>

//     <topic_report>
//     ${topicReport}
//     </topic_report>

//     <founder_feedback>
//     ${founderFeedback}
//     </founder_feedback>

//     <moment_schema>
//     ${JSON.stringify(zodToJsonSchema(MomentLLM))}
//     </moment_schema>

//     Follow these steps to complete the task:

//     1. Carefully read through the entire topic report and founder's feedback.

//     2. Identify distinct leadership moments from the report. These can be actions, decisions, or behaviors demonstrated by the founder that reflect their leadership style.

//     3. For each identified moment:
//       a. Determine the appropriate category (e.g., communication, decision-making, etc.)
//       b. Extract the relevant quote from the report
//       c. Provide a brief description of the moment
//       d. Assess the impact (positive or negative) of this moment on the team or meeting
//       e. Offer a specific suggestion for improvement or reinforcement
//       f. If applicable, incorporate any relevant feedback from the founder about this moment

//     4. Prioritize moments that the founder specifically mentioned or showed concern about in their feedback.

//     5. For each moment, provide a score based on the following criteria:
//       - Effectiveness of the leadership action
//       - Alignment with best leadership practices
//       - Impact on team dynamics and meeting productivity
//       - Founder's own assessment (if available in the feedback)

//       Before assigning a score, provide a brief justification for your evaluation.

//     6. Ensure that each extracted moment adheres completely to the provided schema structure.

//     7. Maintain the original context and meaning of each moment when describing it.

//     Format your output as a JSON array of \`moment\` objects, with each object following the structure defined in the moment schema. Ensure that all required fields are filled for each moment.

//     Your final output should consist only of the JSON array of extracted leadership moments, formatted according to the provided schema. Do not include any additional commentary or explanation outside of this structure.
//   `;
// }

// /**
//  * Generate moment identification guidelines for a specific moment type
//  */
// export async function generateMomentIdentificationGuidelines(
//   momentType: string,
//   trace?: LangfuseTraceClient,
// ): Promise<string> {
//   const prompt = getMomentIdentificationGuidelinesPrompt(momentType);

//   const { text } = await generateText({
//     model: o3_mini_high,
//     prompt,
//     experimental_continueSteps: true,
//     experimental_telemetry: {
//       isEnabled: true,
//       functionId: "generateMomentIdentificationGuidelines",
//       metadata: trace && {
//         langfuseTraceId: trace.id,
//         langfuseUpdateParent: false,
//       },
//     },
//   });

//   const regex = new RegExp(
//     `<moment_identification_guidelines moment_type="${momentType}">(.*?)</moment_identification_guidelines>`,
//     "s",
//   );
//   const match = text.match(regex);

//   return match?.[1]?.trim() || text.trim();
// }

// export async function generateMomentIdentificationReport(
//   momentType: string,
//   conversationHistory: CoreMessage[],
//   topic: MeetingTopicLLM,
//   momentIdentificationGuidelines: string,
//   tools: MomentIdentificationTools & LearningTools,
//   trace?: LangfuseTraceClient,
// ): Promise<string> {
//   const prompt = getMomentIdentificationPrompt(
//     momentType,
//     topic,
//     momentIdentificationGuidelines,
//   );

//   conversationHistory.push({
//     role: "user",
//     content: prompt,
//   });

//   const { text, response: reportResponse } = await generateText({
//     model: o3_mini_high,
//     messages: conversationHistory,
//     tools,
//     experimental_activeTools: [
//       "get_topics",
//       "get_meeting_segment",
//       "ask_specialized_coach",
//       "create_note",
//       "get_notes",
//       "search_notes",
//     ] satisfies (keyof (MomentIdentificationTools & LearningTools))[],
//     maxSteps: 10,
//     experimental_continueSteps: true,
//     experimental_telemetry: {
//       isEnabled: true,
//       functionId: "stepMomentIdentification",
//       metadata: trace && {
//         langfuseTraceId: trace.id,
//         langfuseUpdateParent: false,
//       },
//     },
//   });

//   const regex = /\`\`\`(?:markdown|md)?([\s\S]*?)\`\`\`/;
//   const match = text.match(regex);

//   const report = match?.[1]?.trim() || text.trim();

//   conversationHistory.push(...reportResponse.messages);

//   return report;
// }

// export async function evaluateDidIdentifyMoments(
//   topicReport: string,
//   trace?: LangfuseTraceClient,
// ) {
//   const { object } = await generateObject({
//     model: four_oh_mini,
//     prompt: dedent`
//       You are an expert analyst reviewing meeting reports. Examine the following report and determine if it identifies any specific moments or insights.

//       <topic_report>
//       ${topicReport}
//       </topic_report>

//       Answer only one question: Does this report identify any specific moments from the meeting?

//       {
//         didIdentifyMoments: boolean, // true if any concrete moments were identified, false if none
//         reason: string, // brief explanation with evidence supporting your determination
//       }
//     `,
//     schema: z.object({
//       didIdentifyMoments: z.boolean(),
//       reason: z.string(),
//     }),
//     experimental_telemetry: {
//       isEnabled: true,
//       functionId: "evaluateDidIdentifyMoments",
//       metadata: trace && {
//         langfuseTraceId: trace.id,
//         langfuseUpdateParent: false,
//       },
//     },
//   });

//   return object.didIdentifyMoments;
// }

// export async function generateFounderFeedback(
//   momentType: string,
//   conversationHistory: CoreMessage[],
//   topic: MeetingTopicLLM,
//   topicReport: string,
//   tools: MomentIdentificationTools & LearningTools,
//   trace?: LangfuseTraceClient,
// ): Promise<string> {
//   const prompt = getFounderFeedbackPrompt(momentType, topic, topicReport);

//   const didIdentifyMoments = await evaluateDidIdentifyMoments(
//     topicReport,
//     trace,
//   );

//   if (!didIdentifyMoments) {
//     return "No moments identified in the report.";
//   }

//   const { text: feedback } = await generateText({
//     model: o3_mini_high,
//     prompt,
//     experimental_continueSteps: true,
//     experimental_telemetry: {
//       isEnabled: true,
//       functionId: "generateFounderFeedback",
//       metadata: trace && {
//         langfuseTraceId: trace.id,
//         langfuseUpdateParent: false,
//       },
//     },
//   });

//   conversationHistory.push({
//     role: "user",
//     content: dedent`
//       === FOUNDER FEEDBACK ===

//       Founder Name: ${topic.founderName}

//       ---

//       I've carefully reviewed the moments you've just identified and have the following insights to share:

//       """
//       ${feedback}
//       """

//       This feedback is designed to help you recognize patterns about how I evaluate <moment_type>${momentType}</moment_type> moments. Take a moment to reflect on these observations and consider how they might apply to future interactions.

//       You MUST use the \`create_note\` tool now to save key insights about what I like or dislike from this report. Create at least 3 separate notes with metadata that indicates whether each point is something I appreciate or want to improve.

//       For each note:
//       - Identify specific <moment_type>${momentType}</moment_type> behaviors I responded positively or negatively to
//       - Include metadata with \`"sentiment": "positive"\` or \`"sentiment": "negative"\`
//       - Add \`"momentType": "${momentType}"\` to the metadata
//     `,
//   });

//   const { response: confirmationResponse } = await generateText({
//     model: o3_mini_high,
//     messages: conversationHistory,
//     tools,
//     experimental_activeTools: [
//       "create_note",
//       "get_notes",
//       "search_notes",
//     ] satisfies (keyof LearningTools)[],
//     toolChoice: "required",
//     maxSteps: 10,
//     experimental_continueSteps: true,
//     experimental_telemetry: {
//       isEnabled: true,
//       functionId: "confirmFounderFeedback",
//       metadata: trace && {
//         langfuseTraceId: trace.id,
//         langfuseUpdateParent: false,
//       },
//     },
//   });

//   conversationHistory.push(...confirmationResponse.messages);

//   return feedback;
// }

// export async function extractMomentsFromReport(
//   topic: MeetingTopicLLM,
//   topicReport: string,
//   founderFeedback: string,
//   trace?: LangfuseTraceClient,
// ): Promise<MomentLLM[]> {
//   const prompt = getMomentExtractionPrompt(topic, topicReport, founderFeedback);

//   const { object: moments } = await generateObject({
//     model: o3_mini,
//     output: "array",
//     prompt,
//     schema: MomentLLM,
//     experimental_telemetry: {
//       isEnabled: true,
//       functionId: "extractMomentsFromReport",
//       metadata: trace && {
//         langfuseTraceId: trace.id,
//         langfuseUpdateParent: false,
//       },
//     },
//   });

//   return _.orderBy(moments, [(m) => m.score], ["desc"]);
// }

// export async function stepMomentIdentification(
//   momentType: string,
//   conversationHistory: CoreMessage[],
//   topic: MeetingTopicLLM,
//   tools: MomentIdentificationTools & LearningTools,
//   trace: LangfuseTraceClient,
// ) {
//   const logPrefix = `[${momentType}] [${topic.title}]`;

//   logger.info(`🔎 ${logPrefix} Starting moment identification process`, {
//     momentType,
//     topicTitle: topic.title,
//     traceId: trace.id,
//   });

//   let momentIdentificationGuidelines: string;

//   const system = conversationHistory[0];

//   if (!system) {
//     momentIdentificationGuidelines =
//       await generateMomentIdentificationGuidelines(momentType, trace);

//     conversationHistory.push({
//       role: "system",
//       content: getMomentIdentificationSystemMessage(
//         momentType,
//         topic,
//         momentIdentificationGuidelines,
//       ),
//     });

//     logger.info(`📝 ${logPrefix} Generated moment identification guidelines`, {
//       momentIdentificationGuidelines,
//       conversationHistory,
//       traceId: trace.id,
//     });
//   } else if (system.role !== "system") {
//     throw new Error("First message must be a system message");
//   } else {
//     momentIdentificationGuidelines =
//       system.content
//         .match(
//           /<moment_identification_guidelines[^>]*>(.*?)<\/moment_identification_guidelines>/,
//         )?.[1]
//         ?.trim() || "";
//   }

//   const report = await generateMomentIdentificationReport(
//     momentType,
//     conversationHistory,
//     topic,
//     momentIdentificationGuidelines,
//     tools,
//     trace,
//   );

//   logger.info(`📊 ${logPrefix} Generated moment identification report`, {
//     report,
//     conversationHistory,
//     traceId: trace.id,
//   });

//   const founderFeedback = await generateFounderFeedback(
//     momentType,
//     conversationHistory,
//     topic,
//     report,
//     tools,
//     trace,
//   );

//   logger.info(`💬 ${logPrefix} Generated founder feedback`, {
//     founderFeedback,
//     conversationHistory,
//     trace,
//   });

//   const moments =
//     founderFeedback === "No moments identified in the report."
//       ? []
//       : await extractMomentsFromReport(topic, report, founderFeedback, trace);

//   logger.info(`✨ ${logPrefix} Extracted moments from report`, {
//     moments,
//     conversationHistory,
//     trace,
//   });

//   return {
//     moments,
//     momentIdentificationGuidelines,
//     report,
//     founderFeedback,
//     trace,
//   };
// }

// const prompt22 = getMomentIdentificationGuidelinesPrompt("Decision Making");

// console.log(prompt22);

// <leadership_behavior_analysis>
// 1. Summarize the exemplary <moment_type>Feedback</moment_type> behavior in one sentence.
// Exemplary feedback behavior involves a leader skillfully delivering constructive, specific, and actionable information that balances appreciation with opportunity for growth in a psychologically safe environment, ultimately leading to improved performance and professional development.

// 2. Define the exemplary <moment_type>Feedback</moment_type> behavior in the context of leadership.
// In leadership contexts, exemplary feedback behavior refers to the exceptional ability of leaders to provide information to team members about their performance, behaviors, or outputs in a way that is timely, specific, balanced, respectful, and actionable. It involves not just sharing observations but doing so in a manner that motivates improvement, builds confidence, preserves dignity, and fosters trust. Exemplary feedback demonstrates the leader's commitment to others' growth and development while maintaining high standards for performance and accountability.

// 3. List key features and characteristics of this exemplary behavior.
// - Specificity: Focuses on particular behaviors, achievements, or areas for improvement rather than generalities
// - Balance: Incorporates both strengths/achievements and areas for development
// - Actionability: Provides clear, concrete suggestions for improvement or maintenance of positive behaviors
// - Timeliness: Delivered at appropriate moments when feedback can be most impactful
// - Psychological safety: Creates an environment where feedback is perceived as helpful rather than threatening
// - Growth-oriented: Emphasizes development and improvement rather than judgment
// - Two-way dialogue: Encourages recipient input and perspective rather than one-sided delivery
// - Evidence-based: References specific examples and observable behaviors
// - Future-focused: Oriented toward future improvement rather than dwelling on past mistakes
// - Empathetic delivery: Demonstrates understanding of the recipient's perspective and challenges
// - Appropriate privacy: Consideration of whether feedback should be delivered privately or publicly
// - Context-sensitive: Adapted to the individual's personality, experience level, and situation
// - Non-judgmental: Focuses on behaviors rather than character or personality
// - Clarity: Communicates in straightforward language that avoids ambiguity
// - Ownership: Acknowledges the leader's perspective rather than presenting subjective assessment as objective fact

// 4. Provide at least three examples of how this exemplary behavior might manifest in meetings.

// Example 1: Performance Review Discussion
// "Sarah, I'd like to discuss your presentation from yesterday's client meeting. You did an exceptional job explaining our technical solution in terms the client could easily understand—I noticed how you used analogies that resonated with their industry. That skill really helps us build credibility. One area I think could strengthen your impact even further would be to prepare more concise responses to objections. For instance, when they asked about implementation timeline, the answer was comprehensive but took about five minutes. Maybe we could work together on creating some frameworks for more concise responses that still address their concerns fully. What do you think about that observation, and how do you see it?"

// Example 2: Project Checkpoint Meeting
// "Team, I want to acknowledge the incredible work you've done reaching our milestone two weeks ahead of schedule. Particularly impressive was how marketing and product development collaborated on the feature prioritization—that cross-functional communication is exactly what we need more of. As we move into the next phase, I've noticed our documentation process isn't keeping pace with our development. I'd like us to discuss how we might improve this without slowing momentum. Carlos, given your expertise in this area, what approaches have you seen work well in previous projects that we might adapt here?"

// Example 3: One-on-one Leadership Coaching
// "Alex, I've been observing your leadership of the customer service team over the past month, and I'm really impressed with how you've improved team morale through your daily check-ins and recognition practices. The employee satisfaction scores reflect this positive change. I also think there's an opportunity for you to further develop your strategic thinking. In our planning meetings, I notice you excel at addressing immediate issues but sometimes miss chances to connect those to our longer-term objectives. Would you be interested in working together to develop this skill? Perhaps we could start by having you join some of the executive planning sessions as an observer, and then discuss what you observe about how we connect tactical and strategic thinking."

// 5. Consider potential challenges in identifying this exemplary behavior.
// - Distinguishing between genuine feedback and criticism disguised as feedback
// - Identifying feedback that appears positive but lacks specificity or actionability
// - Recognizing cultural differences in how feedback is delivered and received
// - Assessing the appropriateness of feedback without full context of the relationship
// - Evaluating the balance between positive and developmental feedback
// - Determining whether feedback is actually having the intended impact on the recipient
// - Identifying subtle forms of feedback that may not use explicit feedback language
// - Distinguishing exemplary feedback from merely adequate feedback
// - Evaluating the authenticity of the feedback versus performative leadership behavior
// - Assessing whether the feedback is appropriately challenging for the recipient's development level
// - Identifying feedback that may seem harsh but is appropriate for high-performing teams with established trust
// - Determining whether feedback privacy considerations were appropriate
// - Recognizing when silence or deferral of feedback might actually be the exemplary choice
// - Identifying feedback that appropriately balances individual and team considerations
// - Assessing whether feedback is aligned with organizational values and objectives

// 6. Analyze how this exemplary behavior relates to effective leadership.
// Exemplary feedback behavior is central to effective leadership for several reasons:

// First, it directly enables performance improvement and skill development. Leaders who excel at providing feedback help team members understand both their strengths and development areas, accelerating growth and improving outcomes.

// Second, it builds trust and psychological safety. When feedback is delivered skillfully, it demonstrates the leader's commitment to the recipient's success and fosters an environment where honest communication is valued.

// Third, it models organizational values and expectations. Leaders who provide exemplary feedback demonstrate and reinforce standards of performance, behavior, and communication throughout the organization.

// Fourth, it enables alignment. Clear feedback helps team members understand how their work connects to broader objectives and how they can adjust their efforts to better support organizational goals.

// Fifth, it supports talent development and succession planning. Through ongoing, high-quality feedback, leaders cultivate the next generation of organizational leadership and ensure continuity.

// Sixth, it promotes accountability without blame. Exemplary feedback creates a culture where taking responsibility for outcomes is normalized without creating fear or defensiveness.

// Seventh, it demonstrates emotional intelligence. The ability to deliver constructive feedback effectively requires self-awareness, self-regulation, empathy, and social skill—all components of emotional intelligence that distinguish great leaders.

// In essence, exemplary feedback behavior is both a leadership tool and a leadership indicator. It enables leaders to improve team performance while simultaneously demonstrating their own leadership capacity.

// 7. Explore how this exemplary behavior might differ across organizational levels (e.g., C-suite vs. middle management).

// C-Suite Level:
// - More strategic focus in feedback, connecting individual performance to organizational outcomes
// - Higher emphasis on long-term vision and market positioning in feedback content
// - Greater focus on leadership development aspects rather than technical skills
// - More attention to executive presence, stakeholder management, and board communication
// - Often more direct and candid, with less "sandwiching" of negative feedback between positive points
// - May include more peer-based feedback (board to CEO, C-suite colleagues to each other)
// - Feedback often integrates business metrics and shareholder/stakeholder perspectives
// - May address more complex ethical dilemmas and gray-area decision making
// - Often delivered with greater privacy and confidentiality
// - May be more focused on helping the receiver navigate political landscapes

// Middle Management Level:
// - More balanced between strategic and operational considerations
// - Greater emphasis on team dynamics and cross-functional collaboration
// - More focus on developing management skills and capabilities
// - Often addresses both technical expertise and people leadership abilities
// - May be more structured and aligned with formal performance management systems
// - Frequently includes translating senior leadership expectations to frontline implementation
// - More likely to address specific behavioral examples observed in day-to-day operations
// - Often includes coaching on managing upward and laterally
// - May include more regular, informal feedback touchpoints
// - Typically involves navigating the challenge of being both a feedback receiver and provider

// Frontline Management Level:
// - More operationally focused, emphasizing execution and immediate results
// - Higher emphasis on technical skills and specific task performance
// - More attention to customer/client-facing behaviors and outcomes
// - Often more frequent and immediate, closer to the actual performance
// - May be more directive and specific about expected changes
// - More likely to include team member development and coaching elements
// - Often addresses compliance with organizational procedures and protocols
// - May focus more on consistency and reliability of performance
// - Often includes more concrete examples and immediate applications
// - May involve more public recognition for positive performance

// 8. Provide examples of how this exemplary behavior might manifest differently across various industries.

// Technology Industry:
// "I've reviewed the code you submitted for the authentication feature. Your implementation of the security protocols exceeded our standards—particularly impressive was how you anticipated and handled potential edge cases in user authentication flows. That kind of forward thinking keeps our products secure. One area to consider is documentation. While your code is clean, adding more comprehensive comments would help the maintenance team and new developers understand your design decisions more quickly. I've highlighted some specific sections in the pull request where this would be most valuable. How do you feel about updating those before we merge?"

// Healthcare Industry:
// "Dr. Chen, I observed your interaction with the patient in Room 304 this morning. Your clinical assessment was thorough, and I particularly noticed how you explained the treatment options in terms the patient could understand, checking for comprehension at key points. That patient-centered approach aligns perfectly with our care philosophy. One suggestion: when interruptions occurred from staff, you might consider briefly acknowledging the patient before addressing the interruption. This maintains the patient's sense of being your priority even when you need to shift attention momentarily. Is that something you've considered in your practice?"

// Financial Services:
// "Morgan, your investment analysis for the Johnson portfolio demonstrated exceptional attention to risk factors—particularly how you identified the correlation between their existing holdings and the proposed new investments. That level of diligence is exactly what maintains client trust. As you continue developing as an advisor, I'd encourage you to also strengthen how you communicate these complex insights to clients. For instance, the risk assessment was technically perfect but might be difficult for non-financial clients to fully grasp. Would you be interested in working with our communications team to develop some visualization tools that could help translate these important insights for clients?"

// Manufacturing:
// "Rajiv, the production line modifications you implemented have increased efficiency by 12% while reducing material waste by 8% compared to last quarter. Your approach of consulting with floor operators before finalizing the changes clearly contributed to this success—they've reported higher satisfaction with the new process. Looking ahead, I think there's an opportunity to apply a similar approach to the quality control checkpoint. Currently, we're seeing occasional bottlenecks there that offset some of your efficiency gains. How would you feel about leading a similar collaborative improvement process for that station over the next month?"

// Retail:
// "Alicia, I observed your customer interactions during the holiday rush yesterday. Even under pressure, you maintained a warm, helpful approach with each customer—I particularly noticed how you remembered returning customers' names and preferences. That personal touch is what differentiates our boutique experience. One thing that could enhance your already strong service: when customers are browsing without asking for help, your approaches sometimes came too quickly. Consider giving them about 30 seconds more browsing time before offering assistance. This respects their space while still ensuring they know you're available. Does that observation resonate with your experience on the floor?"

// 9. Compare and contrast this exemplary behavior with similar leadership behaviors.

// Comparison with Coaching:
// Similarities:
// - Both focus on development and improvement
// - Both involve observation and assessment of performance
// - Both aim to enhance skills and capabilities
// - Both require strong communication skills and empathy

// Differences:
// - Feedback is often more specific to a particular performance or behavior, while coaching takes a broader, longer-term developmental approach
// - Feedback typically involves more direct guidance, while coaching may use more questioning to guide self-discovery
// - Feedback often addresses immediate performance needs, while coaching may focus on longer-term career or leadership development
// - Feedback is generally more evaluative, while coaching is more developmental in nature

// Comparison with Performance Evaluation:
// Similarities:
// - Both involve assessment of performance against expectations
// - Both can address strengths and development areas
// - Both can influence career progression and development

// Differences:
// - Exemplary feedback is ongoing and timely, while formal evaluations typically occur at scheduled intervals
// - Feedback is often more conversational and dialogue-based, while evaluations may follow more structured formats
// - Feedback emphasizes future improvement, while evaluations often focus more on documenting past performance
// - Exemplary feedback often occurs within the context of a specific task or project, while evaluations typically take a comprehensive view of performance over time

// Comparison with Mentoring:
// Similarities:
// - Both aim to develop the recipient's capabilities
// - Both draw on the provider's experience and knowledge
// - Both can build strong professional relationships

// Differences:
// - Feedback typically focuses on specific performance or behaviors, while mentoring addresses broader professional and sometimes personal development
// - Feedback often comes from a direct supervisor, while mentoring may come from someone outside the reporting relationship
// - Feedback addresses current performance, while mentoring often focuses on longer-term career development and navigation
// - Exemplary feedback tends to be more structured and specific, while mentoring may be more fluid and wide-ranging in topics covered

// Comparison with Recognition:
// Similarities:
// - Both can acknowledge positive performance
// - Both can motivate and encourage continued good performance
// - Both demonstrate that performance is being observed and valued

// Differences:
// - Exemplary feedback includes both strengths and development areas, while recognition focuses primarily on achievements and strengths
// - Feedback is typically more private and detailed, while recognition is often more public and general
// - Feedback aims to improve future performance, while recognition primarily rewards past performance
// - Feedback involves more dialogue and recipient input, while recognition is more unidirectional

// 10. Consider how this exemplary behavior might evolve in future workplace scenarios.

// Data-Enhanced Feedback:
// As analytics become more sophisticated, exemplary feedback may increasingly incorporate objective performance data. Leaders will need to skillfully blend quantitative metrics with qualitative observations, helping team members understand both what the data shows and how their specific behaviors influence those outcomes.

// Remote/Hybrid Workplace Adaptations:
// With more distributed teams, exemplary feedback will need to account for limited visibility into daily work processes. Leaders may develop more structured feedback touchpoints, use technology to observe work products rather than processes, and become more skilled at detecting nuance in virtual communications.

// Cross-Cultural Globalization:
// As teams become more globally distributed, exemplary feedback will need to accommodate different cultural norms around directness, face-saving, individualism vs. collectivism, and power distance. Leaders will need greater cultural intelligence to deliver feedback that is received as intended across diverse cultural contexts.

// Continuous Feedback Systems:
// The trend toward real-time feedback may accelerate, with exemplary feedback becoming more incremental and embedded in daily work rather than delivered in distinct sessions. Leaders will need to balance immediate micro-feedback with more comprehensive development conversations.

// AI-Assisted Feedback:
// AI tools may assist leaders by flagging potential feedback opportunities, suggesting language or approaches based on known preferences of the recipient, or even providing feedback directly for routine matters. Exemplary leaders will leverage these tools while maintaining the human judgment and empathy that technology cannot replace.

// Peer-Based Feedback Networks:
// Organizational structures may continue to flatten, with increased emphasis on peer feedback systems. Exemplary leadership will include creating environments where high-quality horizontal feedback flourishes, requiring leaders to model, teach, and facilitate effective feedback processes rather than being the sole source of performance information.

// Feedback for Creativity and Innovation:
// As automation handles more routine tasks, human work will increasingly focus on creative and innovative contributions. Exemplary feedback will need to address these less-defined aspects of performance, requiring leaders to develop frameworks for discussing and developing creative capabilities.

// Wellbeing-Integrated Feedback:
// With increasing recognition of mental health and wellbeing in workplace performance, exemplary feedback may more explicitly consider the recipient's current state and capacity. Leaders may integrate discussions of sustainable performance and resilience into feedback conversations.

// Purpose-Aligned Feedback:
// As younger generations seek greater meaning in work, exemplary feedback may increasingly connect individual performance to organizational purpose and societal impact. Leaders will need to articulate how specific behaviors and outcomes contribute to meaningful goals beyond financial performance.

// Skills-Based Feedback for the Future of Work:
// With rapid changes in required skills, exemplary feedback may focus more on adaptability, learning capacity, and skill acquisition rather than current performance alone. Leaders will need to help team members prepare for future roles that may not yet exist.

// 11. Identify criteria for what makes an instance of this behavior truly exemplary or extraordinary.

// Comprehensive Impact:
// Truly exemplary feedback produces multiple positive outcomes simultaneously—improving performance, strengthening relationships, enhancing engagement, building capability, and aligning with organizational values. The impact extends beyond the immediate performance issue to benefit the individual, team, and organization more broadly.

// Perfect Calibration:
// Exemplary feedback is precisely calibrated to the recipient's needs, capabilities, and circumstances. It pushes them enough to stimulate growth without overwhelming them, acknowledges achievements without creating complacency, and challenges without demoralizing. This perfect calibration requires exceptional emotional intelligence and recipient awareness.

// Transformative Effect:
// Rather than producing incremental improvement, exemplary feedback sometimes creates breakthrough moments that fundamentally shift the recipient's perspective, approach, or capability. These pivotal conversations become reference points that influence development long after the initial discussion.

// Mutual Growth:
// The most extraordinary feedback instances often involve growth for both parties. The leader not only develops the recipient but gains new insights, perspectives, or approaches through the dialogue, demonstrating humility and continued learning even from a position of authority.

// Autonomy Enhancing:
// Exemplary feedback strengthens the recipient's ability to self-assess and self-correct rather than creating dependence on external feedback. It builds the recipient's internal guidance system and confidence in their own judgment about their performance.

// Contextual Mastery:
// Truly exemplary feedback demonstrates mastery of the environment, timing, approach, and content simultaneously. The leader skillfully creates or seizes the perfect moment, chooses the ideal setting, adopts the most effective approach, and delivers precisely the right content for maximum positive impact.

// Balanced Courage and Compassion:
// Extraordinary feedback perfectly balances honest, direct communication about difficult issues with genuine care and empathy for the recipient. It demonstrates the leader's courage to address challenging topics and compassion in how those topics are addressed.

// Cultural Catalysis:
// Sometimes exemplary feedback transcends the individual interaction to influence the broader organizational culture. These instances model and normalize healthy feedback practices that others begin to emulate, creating ripple effects throughout the organization.

// Recipient Endorsement:
// Perhaps the ultimate marker of exemplary feedback is when recipients themselves identify it as transformative. When recipients voluntarily cite specific feedback conversations as pivotal to their development, even years later, this indicates truly extraordinary feedback impact.

// Adaptive Expertise:
// Exemplary feedback demonstrates the leader's ability to adapt their approach based on subtle cues during the conversation. They can pivot their method in real-time based on the recipient's reactions, ensuring the feedback achieves its intended purpose despite any initial barriers or resistance.

// 12. List potential indicators that distinguish exemplary instances from average ones.

// Recipient Engagement Level:
// - Average: Recipient listens passively, offers minimal response
// - Exemplary: Recipient actively engages, asks clarifying questions, offers reflections, and contributes to solution development

// Specificity and Precision:
// - Average: General observations with vague improvement suggestions
// - Exemplary: Pinpoint accuracy in identifying specific behaviors with equally specific and actionable improvement strategies

// Evidence Integration:
// - Average: Relies primarily on subjective impressions or secondhand information
// - Exemplary: Seamlessly integrates multiple sources of evidence, including concrete examples, data points, and patterns over time

// Forward Movement:
// - Average: Conversation ends with acknowledgment but no clear path forward
// - Exemplary: Concludes with shared understanding, clear next steps, and recipient ownership of development actions

// Emotional Intelligence:
// - Average: Delivers content correctly but with limited attunement to recipient's emotional state
// - Exemplary: Demonstrates exceptional awareness of and responsiveness to recipient's emotional reactions throughout

// Trust Building:
// - Average: Maintains existing trust level in the relationship
// - Exemplary: Visibly strengthens the relationship and increases trust through the interaction

// Insight Generation:
// - Average: Confirms what the recipient already knew or suspected
// - Exemplary: Creates genuine "aha moments" where the recipient gains new insights about their performance or capabilities

// Holistic Integration:
// - Average: Addresses the specific performance issue in isolation
// - Exemplary: Connects the specific feedback to broader development themes, career aspirations, and organizational context

// Bidirectional Learning:
// - Average: One-way delivery of insights from leader to recipient
// - Exemplary: Mutual learning where the leader also gains new perspectives or insights from the exchange

// Motivational Impact:
// - Average: Recipient accepts feedback without notable change in energy or commitment
// - Exemplary: Recipient demonstrates increased motivation, enthusiasm, and commitment following the conversation

// Timing Precision:
// - Average: Delivered at a convenient or scheduled time
// - Exemplary: Delivered at the optimal moment for learning and receptivity, often requiring the leader to recognize and create this moment

// Balanced Autonomy:
// - Average: Leader maintains control of the feedback conversation
// - Exemplary: Leader skillfully balances guidance with space for recipient self-discovery and ownership

// Cultural Sensitivity:
// - Average: Delivers feedback according to standard organizational practices
// - Exemplary: Thoughtfully adapts approach based on recipient's cultural background and preferences while maintaining effectiveness

// Sustainable Change:
// - Average: Produces temporary behavior adjustment that may revert over time
// - Exemplary: Catalyzes lasting behavior change or capability development that persists without continued intervention

// Cascading Impact:
// - Average: Benefits limited to the specific recipient and situation
// - Exemplary: Creates positive ripple effects that influence team dynamics, peer relationships, or organizational practices

// 13. Provide examples of both exemplary and non-exemplary instances of this behavior, emphasizing the differences.

// Exemplary Instance 1:
// Leader: "James, I wanted to discuss your leadership of the Williams project. First, I've observed how you've built strong relationships across departments—particularly how you navigated the conflict between marketing and product development last week. Your approach of facilitating a solutions-focused conversation rather than assigning blame kept the project moving forward while strengthening cross-team trust. That's exactly the kind of leadership we need.

// I've also noticed an opportunity regarding team communication. Several team members have mentioned feeling uncertain about priorities when requirements change. For instance, when the client requested the additional analytics feature last month, there was confusion about how that affected the existing timeline. I'm wondering if we could discuss some approaches for maintaining clarity during requirement changes that might help the team stay aligned? What's your perspective on this feedback?"

// [This example is exemplary because it provides specific, observable behaviors, balances positive observation with development opportunity, invites dialogue rather than simply delivering a message, connects to broader leadership impact, and focuses on future improvement rather than dwelling on past issues.]

// Non-exemplary Instance 1:
// Leader: "James, I need to talk to you about some issues with the Williams project. The team seems confused about priorities, and there have been some communication problems. You need to be clearer with them about what needs to be done, especially when things change. Do better at keeping everyone on the same page, okay?"

// [This example lacks specificity, focuses only on the problem without acknowledging strengths, provides no actionable guidance for improvement, frames the issue as a character deficit ("you need to be better"), and doesn't invite dialogue or the recipient's perspective.]

// Exemplary Instance 2:
// Leader: "Elena, I'd like to share some observations about your presentation to the executive team yesterday. Your preparation was evident in how comprehensively you addressed potential questions—the section addressing ROI projections was particularly effective as it preemptively answered what would have been their first question. The executives commented afterward on how thoroughly you'd considered the financial implications.

// I also noticed an opportunity regarding the technical explanation portion. Some of the executives looked confused during the explanation of the implementation process, and CFO Roberts specifically asked me afterward for clarification. In my experience with this group, they typically need higher-level explanations with business impact clearly highlighted. Would it be helpful if we discussed some approaches for adapting technical content for this specific audience? I've had to learn this skill myself over the years and have some frameworks that might be useful."

// [This example is exemplary because it references specific observed behaviors rather than generalizations, balances positive feedback with development areas, offers concrete support for improvement, normalizes the development need by sharing the leader's own experience, and positions the feedback as help rather than criticism.]

// Non-exemplary Instance 2:
// Leader: "Elena, good job on the presentation yesterday. The executives were impressed with your work. One thing though—you got too technical in some parts and lost people. Remember that executives don't need all those details. Just focus on the business impact next time."

// [This example provides vague praise without specifics, doesn't fully explain the development area or provide guidance on how to improve, uses directive language ("Just focus on") rather than collaborative problem-solving, and doesn't invite the recipient's perspective or questions.]

// Exemplary Instance 3:
// Leader: "Michael, I've been reflecting on your contributions in leadership team meetings over the past month, and I'd like to share some observations. I've noticed that when discussions become tense, particularly around resource allocation decisions, you consistently bring the conversation back to our strategic priorities. In Monday's meeting, for example, when the discussion about the marketing budget was becoming positional, your question about how each option supported our market expansion goal refocused us productively. That strategic lens is tremendously valuable to our decision quality.

// I also see an opportunity for you to build on this strength. While you're effective at raising these strategic questions, I sometimes observe you stepping back from advocating for your own department's needs, even when they align with those strategic goals. For instance, in the technology investment discussion, you raised excellent points about strategic alignment but didn't connect them to your team's specific resource requests. I value your collaborative nature, AND I want to ensure your team's legitimate needs are fully considered. How do you see this balance between being a team player and an advocate for your area?"

// [This example is exemplary because it focuses on a pattern of behavior rather than a single incident, connects specific behaviors to broader impact, identifies a development area that builds on an existing strength rather than simply addressing a weakness, balances organizational and individual concerns, and opens a thoughtful dialogue about an important leadership tension.]

// Non-exemplary Instance 3:
// Leader: "Michael, you're not speaking up enough in leadership meetings. Your team is counting on you to fight for their resources, but you're being too passive. I need you to be more assertive when we're making budget decisions. The other directors are all advocating strongly for their teams, and you need to do the same."

// [This example frames the feedback as a character criticism ("you're being too passive"), provides no specific examples, fails to acknowledge any positive aspects of the current approach, prescribes a specific solution rather than exploring options, and doesn't invite dialogue or the recipient's perspective.]

// 14. List out key words and phrases associated with this exemplary leadership behavior.

// Key words:
// - Specific
// - Actionable
// - Balanced
// - Timely
// - Constructive
// - Developmental
// - Dialogue
// - Growth-oriented
// - Evidence-based
// - Forward-looking
// - Empathetic
// - Observation
// - Assessment
// - Improvement
// - Performance
// - Behavior
// - Impact
// - Capability
// - Strength
// - Development area
// - Opportunity
// - Success
// - Challenge
// - Perspective
// - Reflection
// - Recognition
// - Coaching
// - Progress
// - Learning
// - Adjustment

// Key phrases:
// - "I've observed that..."
// - "A specific example is..."
// - "The impact of this was..."
// - "What I appreciated was..."
// - "An opportunity I see is..."
// - "Have you considered..."
// - "What are your thoughts about..."
// - "How might you approach..."
// - "Building on your strength in..."
// - "I noticed the effect this had on..."
// - "What would make this even more effective..."
// - "I'm curious about your perspective on..."
// - "This aligns with our goal of..."
// - "Let's discuss approaches for..."
// - "How can I support you in..."
// - "What would success look like to you..."
// - "Let me check my understanding..."
// - "The pattern I'm noticing is..."
// - "Compared to our expectations..."
// - "I'd like to acknowledge how you..."
// - "Let's explore options for addressing..."
// - "What resources might help you..."
// - "I've seen your growth in..."
// - "This matters because..."
// - "The next level of development might be..."

// 15. Consider how this exemplary behavior might be misinterpreted or confused with other behaviors.

// Confusion with Praise/Recognition:
// Exemplary feedback includes both strengths and development areas, while pure praise or recognition focuses solely on positive aspects. When feedback includes only positive observations, it may be mistaken for simple recognition rather than developmental feedback that helps the recipient grow.

// Confusion with Criticism:
// Even constructive feedback that is well-balanced can sometimes be perceived as criticism, especially if the recipient has past negative experiences with feedback or if organizational culture has established feedback as primarily corrective. Recipients may focus disproportionately on development areas even when the feedback is well-balanced.

// Confusion with Performance Evaluation:
// Informal, ongoing feedback may be confused with formal performance evaluation, causing recipients to react defensively or focus on justification rather than growth. This is especially likely if feedback sessions are infrequent or only occur near formal review periods.

// Confusion with Directional Instruction:
// Feedback that includes specific suggestions may be interpreted as directive instruction rather than input for consideration. This can undermine the developmental intent and reduce recipient ownership of solutions.

// Confusion with Mentoring:
// When feedback incorporates broader career guidance or wisdom-sharing, it may blur with mentoring relationships. While this overlap can be positive, it may create confusion about the primary purpose of the interaction.

// Confusion with Coaching:
// Feedback that uses questioning approaches to stimulate self-discovery may be confused with coaching. While coaching elements can enhance feedback effectiveness, pure coaching typically avoids the evaluative component that is inherent in feedback.

// Confusion with Casual Conversation:
// Skillfully delivered feedback that maintains a conversational tone may not be recognized as formal feedback, potentially diluting its perceived importance or the recipient's attention to development opportunities.

// Confusion with Problem-Solving:
// Feedback discussions that move quickly to solution exploration may be interpreted as problem-solving sessions rather than feedback. This can bypass important reflection on the performance or behavior being discussed.

// Confusion with Conflict Resolution:
// Feedback addressing interpersonal effectiveness or team dynamics may be mistaken for conflict resolution, particularly if it involves how the recipient interacts with others who are experiencing concerns.

// Confusion with Status Updates:
// Feedback embedded within project discussions or status updates may not be recognized as feedback, particularly if the leader transitions between operational and developmental topics without clear signaling.

// Confusion with Venting or Complaining:
// Poorly delivered feedback that focuses disproportionately on problems without offering constructive guidance may be perceived as venting or complaining rather than developmental input.

// Confusion with Micromanagement:
// Detailed feedback about specific approaches may be interpreted as micromanagement rather than development, particularly if it prescribes methods rather than focusing on outcomes and learning.

// 16. Brainstorm potential metrics for measuring the effectiveness of this exemplary behavior.

// Recipient-Reported Metrics:
// - Self-reported understanding of feedback content (clarity score)
// - Perceived usefulness of feedback (utility rating)
// - Likelihood to recommend leader as a source of feedback to others (NPS-style metric)
// - Emotional response to feedback (psychological safety measure)
// - Confidence in ability to implement changes discussed
// - Perceived fairness and accuracy of the feedback
// - Clarity of next steps following feedback conversation
// - Motivation level following feedback conversation
// - Satisfaction with balance between positive recognition and development areas

// Behavioral Change Metrics:
// - Observable changes in behavior following feedback
// - Speed of implementation of agreed-upon changes
// - Sustainability of behavior changes over time
// - Consistency of improved performance across situations
// - Decreased need for feedback on the same topic over time
// - Application of feedback to novel situations beyond the specific discussed
// - Recipient's increased capability to self-assess in the area addressed
// - Frequency of recipient proactively seeking additional feedback

// Relationship Impact Metrics:
// - Trust level between leader and recipient before and after feedback
// - Frequency of voluntary interaction following feedback
// - Recipient's willingness to bring problems or mistakes to the leader
// - Leader-recipient communication effectiveness
// - Reduced defensiveness in subsequent feedback conversations
// - Increased openness and vulnerability in professional discussions
// - Recipient's willingness to provide upward feedback to the leader

// Organizational Impact Metrics:
// - Team psychological safety measures
// - Feedback frequency and quality across the team
// - Performance improvements in areas addressed by feedback
// - Innovation or problem-solving effectiveness following feedback
// - Team member development velocity
// - Reduced turnover or increased engagement
// - Improved collaboration or conflict resolution following feedback
// - Customer/client satisfaction in areas influenced by the feedback
// - Productivity or quality metrics in areas addressed

// Feedback Process Metrics:
// - Time between observed behavior and delivery of feedback
// - Ratio of positive observations to development areas
// - Specificity level of examples provided
// - Actionability rating of development suggestions
// - Duration and balance of leader vs. recipient talk time
// - Frequency of feedback conversations
// - Diversity of feedback topics addressed
// - Alignment of feedback with organizational priorities and values
// - Integration of multiple data sources in feedback content
// </leadership_behavior_analysis>

// Now, I'll create comprehensive guidelines for identifying exemplary Feedback moments in meeting transcripts:

// <moment_identification_guidelines moment_type="Feedback">
// 1. Definition:
// Exemplary feedback in leadership contexts refers to the exceptional ability of a leader to provide information about performance, behaviors, or outputs in a way that is timely, specific, balanced, respectful, and actionable. This exceptional feedback simultaneously affirms strengths, identifies growth opportunities, maintains psychological safety, invites dialogue, and catalyzes improved performance—all while demonstrating the leader's commitment to others' development and organizational excellence.

// 2. Key Characteristics:
// - Specificity: References particular behaviors, achievements, or areas for improvement with precise examples
// - Balance: Skillfully integrates recognition of strengths with identification of growth opportunities
// - Actionability: Provides clear, concrete, and implementable suggestions for improvement
// - Dialogic approach: Engages the recipient as an active participant rather than a passive receiver
// - Psychological safety: Creates an environment where feedback is perceived as helpful rather than threatening

// 3. Verbal Cues:
// - "I've observed that..." (introducing specific behavioral observations)
// - "The impact of this approach was..." (connecting behaviors to outcomes)
// - "What I appreciate about your approach is..." (highlighting specific strengths)
// - "One opportunity I see is..." (introducing development areas constructively)
// - "I'm curious about your perspective on..." (inviting dialogue and recipient input)

// 4. Non-verbal Indicators:
// - Balanced pacing: Allowing appropriate time for both delivery and recipient response
// - Thoughtful pauses: Giving space for reflection rather than rushing through feedback
// - Conversational tone: Using dialogue-oriented language rather than declarative statements
// - Personalized framing: Adapting language and examples to the recipient's specific situation
// - Inquiry orientation: Using question patterns that invite reflection rather than defensiveness

// 5. Participant Roles:
// Exemplary feedback interactions typically involve:

// Initiator (Leader): The person providing the feedback, demonstrating exceptional skill in delivery, observation, and guidance.

// Receiver: The person receiving the feedback, who in exemplary interactions is actively engaged in processing, responding to, and building upon the feedback.

// Facilitator (sometimes present): In team settings, a third party may help structure the feedback exchange, ensuring psychological safety and productive dialogue.

// Witnesses (in public feedback): In group settings, team members who observe the feedback exchange and may be influenced by the modeling of effective feedback practices.

// 6. Context Considerations:
// The context surrounding exemplary feedback significantly shapes its form and impact:

// Privacy appropriateness: Exemplary leaders demonstrate judgment about whether feedback should be delivered privately (for developmental areas or sensitive topics) or publicly (for recognition or team learning opportunities).

// Timing sensitivity: Exceptional feedback is delivered at optimal moments—soon enough after observations to be relevant but with appropriate consideration for readiness and receptivity.

// Relationship history: Exemplary feedback builds upon established trust and mutual understanding, with leaders adapting their approach based on the relationship foundation.

// Organizational culture: Feedback excellence is demonstrated through alignment with positive cultural norms while avoiding counterproductive practices that may be normalized in the organization.

// Performance stage: Exemplary feedback considers where the recipient is in their development journey, with approaches tailored to novice versus advanced performers.

// 7. Exemplary Moments:
// Exemplary feedback moments demonstrate a masterful integration of content, delivery, and recipient engagement that creates extraordinary developmental impact. These interactions show the leader operating at an exceptional level of skill in service of both individual growth and organizational excellence.

// - Positive Examples:
//   - A leader provides feedback that perfectly balances recognition with challenge by first acknowledging specific strengths ("Your financial analysis was exceptionally thorough, particularly how you incorporated market volatility factors") before introducing a growth area with equal specificity ("An opportunity to make this even stronger would be connecting these financial projections more explicitly to our strategic priorities, especially our expansion goals"). The leader then engages the recipient in collaborative problem-solving rather than prescribing solutions: "What approaches might help make those connections more visible in future analyses?"

//   - During a project review, a leader demonstrates exceptional skill in real-time adjustment by noticing subtle signs of recipient defensiveness and immediately pivoting their approach: "I notice I might not be explaining my observation clearly. Let me try a different angle and see if this resonates better with your experience." This demonstrates extraordinary emotional intelligence and commitment to the recipient's growth rather than the leader's own need to deliver a message.

//   - A leader provides feedback that transcends the specific situation to foster broader capability development: "The way you handled the client's objections shows real skill in listening for underlying concerns. That same approach of looking beneath the surface could be powerful in our internal team discussions, particularly when we're experiencing conflicts about resource allocation. How might you apply that strength in our upcoming budget planning meeting?"

//   - After a team member's presentation, a leader delivers public recognition that is specific, meaningful, and educational for the entire team: "Sarah, I want to highlight how effectively you translated complex technical information into business impact terms. The way you connected each technical feature to a specific customer pain point made the value proposition crystal clear. This approach helps everyone see not just what we're building but why it matters." This exemplary public feedback reinforces important organizational values while providing specific behavioral guidance.

//   - A leader demonstrates exceptional developmental focus by framing feedback around growth trajectory rather than fixed assessment: "Looking at how you've facilitated the last three client workshops, I can see your significant growth in managing the different personality types. You've moved from primarily engaging the dominant voices to skillfully drawing out quieter participants. The next developmental edge I see is balancing the need for comprehensive input with time management pressures. What strategies have you been considering for that balance?"

// - Negative Examples:
//   - A leader provides feedback that appears balanced but lacks specificity: "Great job on the project, though there are some areas for improvement." Without specific examples of what was done well and what could be improved, this vague feedback fails to provide actionable guidance despite seeming balanced, making it non-exemplary.

//   - A manager delivers feedback that focuses exclusively on problems without acknowledging strengths or providing constructive guidance: "Your presentation didn't meet our standards. The slides were cluttered and you went over time. You need to do better next time." This approach may be mistaken for feedback but lacks the balance, psychological safety, and developmental focus that characterizes exemplary feedback.

//   - In what appears to be a feedback discussion, a leader actually engages in one-way communication without inviting the recipient's perspective: "Let me give you some feedback on your performance this quarter. Here are the three things you did well and the four things you need to improve. Any questions?" While structured and including both positive and negative observations, this approach lacks the dialogic quality essential to exemplary feedback.

// 8. Impact Assessment:
// The effectiveness of exemplary feedback can be evaluated through multiple dimensions:

// Immediate response: Exemplary feedback typically generates engagement rather than defensiveness, visible through the recipient's active participation, thoughtful responses, and willingness to explore development areas without becoming withdrawn or combative.

// Behavioral change: The true impact of exemplary feedback becomes evident in subsequent observable changes in the recipient's approaches, decisions, or actions that align with the developmental areas discussed.

// Relationship effect: Exceptional feedback strengthens rather than diminishes the leader-recipient relationship, evident in increased trust, more open communication, and greater willingness to engage in future developmental conversations.

// Ripple impact: Truly exemplary feedback influences not just the direct recipient but often creates positive effects throughout the team, as others observe and learn from both the content and process of the feedback exchange.

// Self-sufficiency development: The ultimate measure of exemplary feedback is the recipient's increased capacity for self-assessment and self-correction, reducing dependence on external feedback over time while maintaining high performance standards.

// 9. Common Pitfalls:
// - Mistaking balanced feedback for exemplary feedback when it lacks the specificity and actionability that makes feedback truly exceptional
// - Focusing on identifying only critical feedback moments, overlooking that exemplary feedback includes skillful positive feedback
// - Confusing elaborate praise with exemplary positive feedback, missing that exceptional recognition is specific, meaningful, and connected to important values or outcomes
// - Overvaluing expertise content while undervaluing delivery method and recipient engagement in determining whether feedback is exemplary
// - Failing to distinguish between feedback that maintains performance and truly exemplary feedback that catalyzes breakthrough development or transformative change

// 10. Criteria for Extraordinarily Great Moments:
// Truly extraordinary feedback moments represent the highest expression of leadership skill in developing others. These moments stand out for their transformative impact, perfect calibration to recipient needs, and ability to create significant forward movement.

// a) Exemplary Leadership Behaviors:
// Extraordinarily great feedback moments show leaders demonstrating exceptional skill through:
// - Perfect calibration of content and approach to the specific recipient's needs, style, and development stage
// - Masterful integration of affirming strengths while stretching toward new capability levels
// - Creating psychological safety even when addressing challenging performance issues
// - Skillful real-time adaptation based on subtle recipient responses
// - Connecting specific feedback to broader development themes and organizational priorities
// - Demonstrating deep commitment to the recipient's growth while maintaining high standards

// b) Key Characteristics of Extraordinarily Great Moments:
// i. Accuracy:
// - Categorical Accuracy: Extraordinary feedback moments precisely identify the most significant aspect of performance that will create leverage for development, rather than focusing on minor issues or symptoms. The leader demonstrates exceptional discernment in targeting feedback that will create the greatest positive impact.
// - Relational Accuracy: Extraordinarily great feedback moments show perfect attunement to the relationship context, with the leader expertly calibrating their approach based on trust level, recipient's self-awareness, and past interactions, resulting in maximum receptivity and impact.

// ii. Interesting:
// - High Stakes: Extraordinary feedback moments often address pivotal aspects of performance that have significant consequences for the recipient's success, team outcomes, or organizational results, elevating their importance beyond routine feedback.
// - High Emotional Amplitude: The most powerful feedback moments engage emotions productively—creating appropriate tension that motivates change while maintaining sufficient psychological safety to enable learning rather than triggering fight-or-flight responses.

// iii. Spotlight on the Leader:
// Extraordinarily great feedback moments highlight the leader's exceptional skill in:
// - Balancing conviction with humility—confidently offering valuable perspective while acknowledging the limits of their perception
// - Demonstrating genuine care for the recipient's development alongside commitment to performance excellence
// - Modeling the vulnerability and growth mindset they seek to instill in others
// - Creating transformative learning through their unique combination of observation, insight, and developmental approach

// c) Specific examples of "extraordinarily great" Feedback moments:
// - A CEO provides career-defining feedback to a senior leader by identifying a specific blind spot that has limited their effectiveness: "I've noticed a pattern in executive meetings where you excel at articulating your perspective but rarely build upon others' ideas. Yesterday's strategy discussion was a prime example—you presented your market analysis brilliantly, but when others suggested modifications, your body language and responses indicated dismissal rather than consideration. This pattern is limiting your influence and our collective decision quality. The exceptional analytical thinking you bring is too valuable to be diminished by this interaction pattern. I'd like us to explore what might be driving this tendency and how you might experiment with a more integrative approach. What's your reaction to this observation?" This represents extraordinarily great feedback because it identifies a pattern with significant career implications, balances appreciation for strengths with clear development needs, demonstrates careful observation, and invites genuine dialogue about a challenging topic.

// - During a product review, a leader delivers extraordinarily impactful feedback by connecting specific behaviors to both team dynamics and business outcomes: "The way you incorporated user research data into the feature prioritization process has fundamentally elevated our decision quality. Before you introduced this approach, we were making assumptions about user needs rather than testing them. Yesterday's meeting was a perfect example—when marketing and engineering disagreed about the dashboard design, you didn't advocate for either position but instead referred everyone back to the user testing data, which resolved the conflict and led to a better solution. This evidence-based approach has not only improved our product decisions but has also reduced cross-functional tensions. I'd love to see you document this methodology so we can scale this approach across other product teams. Would you be open to leading a session on this at our next leadership offsite?" This feedback is extraordinarily great because it precisely identifies a high-impact behavior, connects it to multiple valuable outcomes, and extends the impact beyond the individual to organizational learning.

// - A manager provides transformative feedback during a critical project phase: "I want to acknowledge something I observed in yesterday's crisis meeting. When the system failure was reported and the team started pointing fingers, you did something remarkable. Instead of joining the blame discussion, you reframed the conversation around what we could learn and how to prevent future failures. What made this particularly powerful was that your team was not responsible for the failure, so you had nothing to defend, yet you still chose the learning approach over the opportunity to look good by comparison. That moment shifted the entire dynamic from defensiveness to collaboration. This is precisely the culture-shaping leadership we need at this level. I'm curious—was this a conscious choice in the moment, or is this an approach you've developed over time?" This feedback is extraordinarily great because it identifies a leadership behavior with cultural impact, provides specific evidence of its effectiveness, connects it to organizational values, and explores the thinking behind the behavior to deepen learning.

// - After observing a difficult client interaction, a leader provides exceptionally nuanced feedback: "The way you handled the client's frustration about the implementation delays demonstrated remarkable emotional intelligence. I particularly noticed three things: first, how you acknowledged their concerns without becoming defensive; second, how you maintained appropriate boundaries when they attempted to pull you into criticizing other departments; and third, how you transitioned from the problem to solution options without dismissing their experience. The client left feeling heard while we maintained our collaborative relationship with the implementation team. This level of stakeholder management is exactly what we need in our client-facing leaders. As you continue developing this strength, one nuance to consider is the pacing of these conversations. I noticed you moved to solutions perhaps two minutes before the client had fully expressed their concerns. In your experience, how do you gauge the right moment for that transition?" This feedback is extraordinarily great because it dissects a complex interpersonal skill into specific components, acknowledges sophisticated handling of a difficult situation, and offers a refined development area that builds on existing strength.

// - A leader provides extraordinary developmental feedback by connecting immediate performance to leadership identity: "In this morning's team meeting, you demonstrated a leadership quality that I believe could become a defining strength for you. When Raj and Elena disagreed about the research methodology, you didn't simply find a compromise—you helped them identify the underlying goals they shared before exploring how each approach might serve those goals. This moved them from positional debate to collaborative problem-solving. What's particularly notable is that you didn't assert your authority to break the tie; instead, you facilitated their own discovery of a better solution. This reflects a leadership model based on developing team capability rather than showcasing personal expertise. As you consider your evolution as a leader, this capacity to develop collaborative problem-solving rather than dependency on your decisions could become a cornerstone of your leadership approach. How aligned is this with how you aspire to lead?" This feedback is extraordinarily great because it connects specific behaviors to leadership identity development, identifies an authentic strength with long-term significance, and invites reflection on leadership philosophy rather than just immediate performance.

// 11. Additional Considerations:
// - Cultural Adaptation: Exemplary feedback may take different forms across cultural contexts. In high-power distance cultures, more directive feedback may be expected, while in low-power distance cultures, more collaborative approaches may be more effective. Truly exceptional leaders adapt their feedback approach to bridge cultural expectations while maintaining effectiveness.

// - Developmental Trajectory: The identification of exemplary feedback should consider the recipient's developmental stage. Feedback that helps a novice establish foundational skills differs from feedback that helps an expert refine advanced capabilities, though both can be exemplary within their context.

// - Feedback Networks: Sometimes the most exemplary leadership behavior involves creating systems and norms for multi-directional feedback rather than just delivering feedback personally. Leaders who create robust feedback ecosystems demonstrate an exceptional commitment to organizational learning.

// - Meta-Feedback: Extraordinarily skilled leaders sometimes provide "feedback about feedback"—helping recipients understand how to receive, process, and implement feedback more effectively, thereby multiplying the impact of all future feedback they receive.

// - Crisis-Context Adaptation: During high-pressure situations, exemplary feedback may become more direct and concise while maintaining its developmental intent. Identifying this contextual adaptation requires considering the situational demands rather than applying standard criteria rigidly.

// - Remote/Virtual Considerations: In digital communication environments, exemplary feedback may require additional explicit framing, check-ins for understanding, and attention to limited non-verbal cues to achieve the same effectiveness as in-person feedback.
// </moment_identification_guidelines>
