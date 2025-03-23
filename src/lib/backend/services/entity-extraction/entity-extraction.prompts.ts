import * as md from "ts-markdown";
import { dedent as s } from "ts-dedent";

import type { TopicSegment } from "~/lib/processing/topic-segmentation";
import type { Vtt } from "../vtt/vtt.service";

/**
 * Input variables for entity extraction prompt
 */
export type EntityExtractionPromptVariables = {
  currentTopic: TopicSegment;
  topicVtt: Vtt | string;
  previousTopic?: TopicSegment;
  nextTopic?: TopicSegment;
};

/**
 * Returns the system message for entity extraction
 */
export function getEntityExtractionSystemMessage() {
  return s`
    You are a specialized AI system that analyzes meeting segments to extract entities, identify relationships, and make observations for knowledge graph creation - delivering results in clean JSON format optimized for knowledge representation and insight discovery.
  `;
}

/**
 * Generates the prompt for entity extraction
 *
 * @param param0 Object containing topic information and VTT content
 */
export function getEntityExtractionPrompt({
  currentTopic,
  topicVtt,
  previousTopic,
  nextTopic,
}: EntityExtractionPromptVariables) {
  // Convert VTT object to string if needed
  const vttContent =
    typeof topicVtt === "string"
      ? topicVtt
      : topicVtt
          .clean()
          .cues.map((cue) => cue.line())
          .join("\n");

  return s`
    You are a specialized AI system designed to analyze meeting transcripts and extract valuable information for knowledge graph creation. Your task is to transform conversational data into structured knowledge that reveals organizational patterns, dependencies, and actionable intelligence.

    Here is the main meeting segment you need to analyze:
    <meeting_segment>
    ${formatTopicForLLM(currentTopic)}
    </meeting_segment>

    For additional context, here is the VTT content of the above meeting segment:
    <vtt_content>
    ${vttContent}
    </vtt_content>

    To ensure continuity, consider these adjacent segments:

    Previous segment:
    <previous_segment>
    ${previousTopic ? formatTopicForLLM(previousTopic) : "None"}
    </previous_segment>

    Next segment:
    <next_segment>
    ${nextTopic ? formatTopicForLLM(nextTopic) : "None"}
    </next_segment>

    Your analysis should follow these steps:

    1. Entity Identification: Extract all relevant entities from the meeting segment, including but not limited to:
      - People (team members, stakeholders, customers)
      - Projects (initiatives, campaigns, workstreams)
      - Artifacts (documents, lists, reports, presentations)
      - Systems (technologies, platforms, tools, software)
      - Processes (workflows, procedures, methodologies)
      - Metrics (KPIs, goals, targets, deadlines)
      - Organizations (companies, departments, teams)
      - Decisions (choices made, approvals, rejections)
      - Problems (issues, challenges, blockers)
      - Solutions (resolutions, workarounds, fixes)
      - ...

    2. Relationship Mapping: Identify all meaningful connections between entities, capturing:
      - Direction (clear source and target entities)
      - Nature (precise relationship type)
      - Strength (importance or criticality of the relationship)
      - Temporality (current, planned, or historical relationship)
      - Conditionality (any dependencies or contingencies)

    3. Insight Extraction: Derive high-value observations that reveal:
      - Dependencies (critical path relationships and bottlenecks)
      - Patterns (recurring themes, approaches, or challenges)
      - Priorities (explicit or implicit importance rankings)
      - Tensions (competing interests, resource conflicts, or trade-offs)
      - Gaps (missing information, unresolved questions, or needed follow-ups)
      - Next Steps (planned actions, assignments, or decisions)

    Before providing your final output, break down your thought process for each main step inside <knowledge_graph_analysis> tags in your thinking block:

    1. Entity Identification: List entities by type, numbering them (e.g., 1. People: a) John Doe, b) Jane Smith, 2. Projects: a) Website Redesign, b) Marketing Campaign, etc.)

    2. Relationship Mapping: Create a table with columns for entity1, entity2, and relationship (e.g., | Entity1 | Entity2 | Relationship |)

    3. Insight Extraction: List insights under categories (e.g., Dependencies: 1..., 2..., Patterns: 1..., 2..., etc.)

    This will ensure a thorough interpretation of the data. It's OK for this section to be quite long.

    Your final output should be in the following JSON structure:

    \`\`\`json
    {
      "entities": [
        {
          "name": "Entity Name",
          "type": "Person|Project|Artifact|System|Process|Metric|Organization|Decision|Problem|Solution|...",
          "description": "Comprehensive description with full context and significance",
          "observations": [
            "Specific insight about this entity's role/importance",
            "Another observation about status/impact"
          ]
        }
      ],
      "relationships": [
        {
          "entity1": "Source Entity Name",
          "entity2": "Target Entity Name",
          "relationship": "Precise relationship descriptor",
          "observations": [
            "Insight about this relationship's significance",
            "Observation about dependencies/implications"
          ]
        }
      ],
      "observations": [
        "Strategic insight revealing organizational patterns or priorities",
        "Critical dependency or bottleneck identification",
        "Key decision context or rationale",
        "Important timeline or deadline implication",
        "Resource allocation or ownership clarification"
      ]
    }
    \`\`\`

    Ensure your analysis meets these quality standards:
    1. Precision: Extract only entities with clear evidence in the transcript
    2. Comprehensiveness: Capture all significant entities and relationships
    3. Context-awareness: Incorporate relevant background from adjacent segments
    4. Insight-driven: Prioritize observations with strategic or operational value
    5. Disambiguation: Clearly distinguish between similar entities
    6. Consistency: Maintain uniform naming and typing conventions
    7. Completeness: Ensure all entity references resolve to defined entities

    Your analysis should demonstrate expert-level understanding of organizational dynamics, project management, and business operations. Produce output that would satisfy the most demanding knowledge management professional.

    Your final output should consist only of the JSON structure and should not duplicate or rehash any of the work you did in the thinking block.
  `;
}

function formatTopicForLLM(topic: TopicSegment) {
  return md.tsMarkdown([
    md.h1(topic.title),
    md.p(topic.detailed_summary),
    md.table({
      columns: ["Key", "Value"],
      rows: [
        { Key: "Start Segment ID", Value: topic.start_segment_id },
        { Key: "End Segment ID", Value: topic.end_segment_id },
      ],
    }),
    md.h2("Timeline"),
    md.ol(
      topic.timeline.map((event) => [
        md.bold(`[${event.timestamp}]`),
        md.text(event.event),
      ]),
    ),
  ]);
}
