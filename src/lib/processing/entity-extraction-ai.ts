import { openai } from "@ai-sdk/openai";
import { type CoreMessage, generateText } from "ai";
import { aiSearchTools } from "./ai-search-tools";
import type { Entity, EntityRelation } from "./entity-extraction";
import { system } from "./vtt-utils";
import { inspect } from "node:util";

/**
 * Configuration for entity analysis
 */
type EntityAnalysisConfig = {
  meetingIds?: string[];
  topicIds?: string[];
  profileIds?: string[];
  model?: string;
  temperature?: number;
  stream?: boolean;
};

/**
 * Helper method to prepare the system message for entity analysis
 */
function getEntityAnalysisSystemMessage(): string {
  return `You are an AI assistant that helps analyze entity data extracted from meeting transcripts.
You can perform semantic searches over entities, relationships, and observations to find relevant information.
You have access to tools that can help you search for entities, look up specific entities, find related topics,
discover relationships, and identify key entities across meetings.

When answering questions about meetings, try to leverage the vector search tools to find the most relevant information.
For example:
- If asked about a specific entity, use entityLookup to get detailed information
- If asked about relationships, use findEntityRelationships
- If asked about important entities, use discoverKeyEntities
- For general queries, use entitySemanticSearch or findRelatedTopics

Always explain your thought process before searching, then present the results in a clear, structured format.`;
}

/**
 * Generate an analysis of an entity and its relationships
 *
 * @param entity The entity to analyze
 * @param relatedEntities Related entities with their relationships
 * @param config Configuration options
 * @returns An analysis of the entity and its significance
 */
export async function generateEntityAnalysis(
  entity: Entity,
  relatedEntities: { entity: Entity; relationship: EntityRelation }[],
  config: EntityAnalysisConfig = {},
): Promise<string> {
  // Build a structured prompt for the entity analysis
  const entityDescription = `
Entity Name: ${entity.name}
Entity Type: ${entity.type}
Description: ${entity.description}
Observations:
${entity.observations.map((obs) => `- ${obs}`).join("\n")}

Related Entities:
${relatedEntities
  .map(
    (re) =>
      `- ${re.entity.name} (${re.entity.type}): ${re.relationship.relationship}
    * ${re.relationship.observations.map((obs) => obs).join("\n    * ")}
`,
  )
  .join("\n")}
`;

  const analysisPrompt = `Please analyze this entity and its relationships in depth:

${entityDescription}

Provide an analysis that covers:
1. The significance of this entity based on its type and descriptions
2. Key insights from the observations about this entity
3. Important relationships and their implications
4. Potential areas where this entity might be critical or influential
5. Any recommendations or action items related to this entity

You can use your vector search tools to find additional information if needed.`;

  // Create request to OpenAI
  const completion = await generateText({
    model: openai("gpt-4"),
    temperature: config.temperature || 0.7,
    messages: [
      { role: "system", content: getEntityAnalysisSystemMessage() },
      { role: "user", content: analysisPrompt },
    ],
    tools: aiSearchTools,
    toolChoice: "auto",
  });

  return completion.response || "No analysis could be generated at this time.";
}

/**
 * Analyze relationships between entities
 *
 * @param question Question about the entities' relationships
 * @param entityNames Names of entities to analyze
 * @param config Configuration options
 * @returns Analysis of the relationships
 */
export async function analyzeEntityRelationships(
  question: string,
  entityNames: string[],
  config: EntityAnalysisConfig = {},
): Promise<string> {
  // Build a structured prompt for the relationship analysis
  const relationshipPrompt = `Please analyze the relationships between these entities: ${entityNames.join(", ")}

${question}

Use your vector search tools to find detailed information about each entity and their relationships.
Be thorough in your analysis and make sure to explore both direct and indirect relationships.`;

  // Create request to OpenAI
  const completion = await generateText({
    model: openai("gpt-4"),
    temperature: config.temperature || 0.7,
    messages: [
      { role: "system", content: getEntityAnalysisSystemMessage() },
      { role: "user", content: relationshipPrompt },
    ],
    tools: aiSearchTools,
    toolChoice: "auto",
  });

  console.log(inspect(completion, { depth: null }));

  return completion.text || "No analysis could be generated at this time.";
}

/**
 * Answer questions about meeting content using vector search
 *
 * @param question Question about meeting content
 * @param config Configuration options
 * @returns Answer to the question
 */
export async function answerMeetingQuestion(
  question: string,
  config: EntityAnalysisConfig = {},
): Promise<string> {
  // Create request to OpenAI
  const completion = await generateText({
    model: openai("gpt-4"),
    temperature: config.temperature || 0.7,
    messages: [
      { role: "system", content: getEntityAnalysisSystemMessage() },
      { role: "user", content: question },
    ],
    tools: aiSearchTools,
    toolChoice: "auto",
  });

  return completion.text || "No answer could be generated at this time.";
}

/**
 * Discover key entities and themes across meetings
 *
 * @param prompt Prompt for discovering insights
 * @param config Configuration options
 * @returns Key insights discovered
 */
export async function discoverKeyInsights(
  prompt: string,
  config: EntityAnalysisConfig = {},
): Promise<string> {
  // Build a structured prompt for insight discovery
  const insightPrompt = `${prompt}

Please discover key entities, relationships, and themes across the meetings.
Focus on identifying:
1. The most important entities and their significance
2. Critical relationships between key entities
3. Recurring themes or patterns across meetings
4. Potential action items or recommendations based on the insights

Use your vector search tools to gather comprehensive information. Be thorough and insightful in your analysis.`;

  // Create request to OpenAI
  const completion = await generateText({
    model: openai("gpt-4o-mini"),
    // temperature: config.temperature || 0.7,
    messages: [
      { role: "system", content: getEntityAnalysisSystemMessage() },
      { role: "user", content: insightPrompt },
    ],
    tools: aiSearchTools,
    toolChoice: "auto",
  });

  return completion.response || "No insights could be generated at this time.";
}

discoverKeyInsights("Kimeberly extreme accountability").then((t) =>
  console.log(inspect(t, { depth: null })),
);

/**
 * Process a conversation with AI about entity data
 *
 * @param messages Previous conversation messages
 * @param config Configuration options
 * @returns The AI's response
 */
export async function processEntityConversation(
  messages: CoreMessage[],
  config: EntityAnalysisConfig = {},
): Promise<string> {
  // Make sure we have a system message, add one if not
  if (!messages.some((m) => m.role === "system")) {
    messages = [
      { role: "system", content: getEntityAnalysisSystemMessage() },
      ...messages,
    ];
  }

  // Create request to OpenAI
  const completion = await generateText({
    model: openai("gpt-4"),
    temperature: config.temperature || 0.7,
    messages: [
      ...(messages.some((m) => m.role === "system")
        ? []
        : [system(getEntityAnalysisSystemMessage())]),
      ...messages,
    ],
    tools: aiSearchTools,
    toolChoice: "auto",
  });

  return completion.text || "No response could be generated at this time.";
}
