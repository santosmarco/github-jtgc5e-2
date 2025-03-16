import type {
  Entity,
  EntityRelation,
  EntityExtractionOutput,
} from "./entity-extraction";
import {
  generateEntityAnalysis,
  analyzeEntityRelationships,
  discoverKeyInsights,
} from "./entity-extraction-ai";
import { entitySemanticSearchTool } from "./ai-search-tools";
import {
  searchEntities,
  formatEntitySearchResults,
} from "../graph/entity-search";

/**
 * This file provides examples of how to use the AI search tools with entity extraction data.
 *
 * These examples demonstrate common patterns for:
 * 1. Getting insights about specific entities
 * 2. Analyzing relationships between entities
 * 3. Discovering key entities across meetings
 * 4. Using the AI tools for custom analysis
 */

/**
 * Example 1: Analyze a specific entity and its relationships
 */
export async function analyzeSpecificEntity(
  entityName: string,
  meetingIds: string[],
): Promise<string> {
  console.log(`Analyzing entity: ${entityName}...`);

  // First search for the entity by name
  const searchResults = await searchEntities("", {
    entityNames: [entityName],
    meetingIds,
    topK: 1,
  });

  // If no entity found, return an error message
  if (searchResults.entities.length === 0) {
    return `Entity '${entityName}' not found in the specified meetings.`;
  }

  // Get the entity metadata
  const entityMetadata = searchResults.entities[0].metadata;

  // Create a mock entity for analysis (in practice, you would get this from your database)
  const entity: Entity = {
    name: entityMetadata.entity_name || entityName,
    type: entityMetadata.entity_type || "Unknown",
    description: entityMetadata.content || "No description available",
    observations: [],
  };

  // Search for observations about this entity
  const observationsSearch = await searchEntities(
    `observations about ${entityName}`,
    {
      entityNames: [entityName],
      meetingIds,
      topK: 10,
    },
  );

  // Add observations to the entity
  entity.observations = observationsSearch.observations.map(
    (o) => o.metadata.content || "",
  );

  // Search for relationships involving this entity
  const relationshipsSearch = await searchEntities("", {
    filter: {
      $or: [
        { subject_entity: { $eq: entityName } },
        { object_entity: { $eq: entityName } },
      ],
    },
    meetingIds,
    topK: 10,
    namespace: "relationships",
  });

  // Convert relationships to the expected format
  const relatedEntities = relationshipsSearch.relationships.map((rel) => {
    // Determine if this entity is the subject or object
    const isSubject = rel.metadata.subject_entity === entityName;
    const otherEntityName = isSubject
      ? rel.metadata.object_entity
      : rel.metadata.subject_entity;

    // Create a mock related entity
    const relatedEntity: Entity = {
      name: otherEntityName || "Unknown",
      type: "Unknown",
      description: "",
      observations: [],
    };

    // Create a mock relationship
    const relationship: EntityRelation = {
      entity1: isSubject ? entityName : otherEntityName || "",
      entity2: isSubject ? otherEntityName || "" : entityName,
      relationship: rel.metadata.relationship_type || "related to",
      observations: [rel.metadata.content || ""],
    };

    return { entity: relatedEntity, relationship };
  });

  // Use the AI to generate an analysis
  const analysis = await generateEntityAnalysis(entity, relatedEntities, {
    meetingIds,
    model: "gpt-4",
  });

  return analysis;
}

/**
 * Example 2: Analyze relationships between multiple entities
 */
export async function analyzeEntityNetwork(
  entityNames: string[],
  meetingIds: string[],
): Promise<string> {
  console.log(`Analyzing relationships between: ${entityNames.join(", ")}...`);

  const question = `What is the relationship between ${entityNames.join(", ")}? 
    How do they interact and influence each other? 
    What is their significance in the context of these meetings?`;

  const analysis = await analyzeEntityRelationships(question, entityNames, {
    meetingIds,
    model: "gpt-4",
  });

  return analysis;
}

/**
 * Example 3: Discover key entities across meetings
 */
export async function findKeyEntities(
  meetingIds: string[],
  entityTypes?: string[],
): Promise<string> {
  console.log("Discovering key entities across meetings...");

  const prompt =
    "What are the most important entities across these meetings? " +
    "Identify key people, projects, decisions, problems, and solutions that appear frequently " +
    "or have significant impact.";

  const insights = await discoverKeyInsights(prompt, {
    meetingIds,
    model: "gpt-4",
  });

  return insights;
}

/**
 * Example 4: Directly use the semantic search tool
 */
export async function semanticSearch(
  query: string,
  meetingIds: string[],
): Promise<{
  success: boolean;
  query: string;
  totalResults?: {
    entities: number;
    relationships: number;
    observations: number;
  };
  results?: {
    entities: Array<{
      name: string;
      type: string;
      description: string;
      observations: string[];
      topicTitle: string;
      confidence: number;
    }>;
    relationships: Array<{
      subject: string;
      relationship: string;
      object: string;
      observations: string[];
      topicTitle: string;
      confidence: number;
    }>;
    observations: Array<{
      observation: string;
      topicTitle: string;
      confidence: number;
    }>;
  };
  error?: string;
  suggestion?: string;
}> {
  console.log(`Performing semantic search: "${query}"...`);

  // Directly use the search entities function since tools might have different interfaces
  const searchResults = await searchEntities(query, {
    meetingIds,
    minScore: 0.6,
    topK: 5,
  });

  // Format the results
  const formattedResults = formatEntitySearchResults(searchResults);

  return {
    success: true,
    query,
    totalResults: {
      entities: searchResults.entities.length,
      relationships: searchResults.relationships.length,
      observations: searchResults.observations.length,
    },
    results: formattedResults,
  };
}

/**
 * Example 5: Find which topics discuss a particular subject
 */
export async function findTopicsAbout(
  subject: string,
  meetingIds: string[],
): Promise<{ topicId: string; title: string; score: number }[]> {
  console.log(`Finding topics about: "${subject}"...`);

  // Perform a search for the subject
  const results = await searchEntities(subject, {
    meetingIds,
    topK: 20,
  });

  // Extract unique topics
  const topicMap = new Map<
    string,
    { topicId: string; title: string; score: number }
  >();

  // Process all results to find unique topics
  const allResults = [
    ...results.entities,
    ...results.relationships,
    ...results.observations,
  ];

  for (const item of allResults) {
    const topicId = item.metadata.topic_id;
    const topicTitle = item.metadata.topic_title;

    if (!topicId) continue; // Skip if no topic ID

    if (!topicMap.has(topicId)) {
      topicMap.set(topicId, {
        topicId,
        title: topicTitle,
        score: item.score,
      });
    } else {
      // If we already have this topic, update the score if this one is higher
      const existing = topicMap.get(topicId);
      if (existing && item.score > existing.score) {
        existing.score = item.score;
      }
    }
  }

  // Convert to array and sort by score
  return Array.from(topicMap.values()).sort((a, b) => b.score - a.score);
}

/**
 * Example 6: Use entity extraction results directly
 */
export async function analyzeExtractionResults(
  extractionResults: EntityExtractionOutput,
  topic: { id: string; title: string },
): Promise<string> {
  console.log(`Analyzing extraction results for topic: "${topic.title}"...`);

  // Format entities and relationships for the AI
  const entity = extractionResults.entities[0] || {
    name: "No entities found",
    type: "Unknown",
    description: "No entities were extracted from this topic.",
    observations: [],
  };

  // Create related entities array
  const relatedEntities = extractionResults.relationships.map((rel) => {
    // Find the related entity
    const relatedEntity = extractionResults.entities.find(
      (e) => e.name === rel.entity1 || e.name === rel.entity2,
    );

    // Use the found entity or create a placeholder
    const entityToUse = relatedEntity || {
      name: rel.entity1 === entity.name ? rel.entity2 : rel.entity1,
      type: "Unknown",
      description: "",
      observations: [],
    };

    return {
      entity: entityToUse,
      relationship: rel,
    };
  });

  // Generate the analysis
  return await generateEntityAnalysis(entity, relatedEntities, {
    topicIds: [topic.id],
  });
}

analyzeEntityNetwork(
  ["Kimberly Shenk", "Natasha Damner"],
  ["vi4zeYgSAD04ayNfWcwlVgxt"],
).then(console.log);
