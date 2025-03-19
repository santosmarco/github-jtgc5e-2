import dotenv from "dotenv";

dotenv.config({
  path: "../.env.local",
});

import { env } from "~/env";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { dedent } from "ts-dedent";
import { z } from "zod";
import { createClient } from "~/lib/supabase/client";

const RICHARD_HENDRICKS_PROFILE_ID = "952d3c5e-93da-49b0-a139-4da6216fb027";

const Entity = z.object({
  name: z.string().describe("Exact name/identifier of the entity"),
  type: z.string().describe("Category/type of the entity"),
  observations: z.array(
    z.object({
      text: z.string().describe("Detailed observation about the entity"),
      source: z
        .string()
        .describe("Specific part of transcript where this was found"),
    }),
  ),
});
type Entity = z.infer<typeof Entity>;

const Relationship = z.object({
  subject: z.string().describe("Entity that is the subject"),
  predicate: z.string().describe("Nature of the relationship"),
  object: z.string().describe("Entity that is the object"),
  observations: z.array(
    z.object({
      text: z.string().describe("Evidence of relationship"),
      source: z
        .string()
        .describe("Specific part of transcript where this was found"),
    }),
  ),
});
type Relationship = z.infer<typeof Relationship>;

const supabase = createClient();

async function generateTranscriptEntitiesAndRelationships(vtt: string) {
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      prompt: dedent`
        You are an expert system specialized in analyzing meeting transcripts and extracting structured knowledge. Your task is to identify entities and their relationships from the given transcript with high precision.

        Transcript to analyze:
        <transcript>
        ${vtt}
        </transcript>

        Follow these steps precisely:

        1. INITIAL SCAN
        - Read through the entire transcript
        - Identify speakers and their roles
        - Note key topics and themes
        - Mark timestamps of important discussions

        2. ENTITY EXTRACTION
        For each significant mention of:
        - People and their roles
        - Organizations and groups
        - Projects, products, or initiatives
        - Technologies or tools
        - Problems or challenges
        - Goals or objectives
        - Any other relevant entities

        For each entity found:
        {
          name: "exact name as mentioned",
          type: "descriptive category",
          observations: [
            {
              text: "specific observation about the entity",
              source: "exact quote or timestamp from transcript"
            }
          ]
        }

        3. RELATIONSHIP MAPPING
        For each entity, identify meaningful connections to other entities:
        {
          subject: "entity name",
          predicate: "clear description of relationship",
          object: "entity name",
          observations: [
            {
              text: "specific evidence of relationship",
              source: "exact quote or timestamp from transcript"
            }
          ]
        }

        4. VALIDATION RULES
        - Every entity must have at least one relationship
        - All relationships must reference existing entities
        - Use exact names consistently throughout
        - Provide specific source evidence for all observations
        - Capture meaningful relationships that are clearly evidenced
        - Use clear, descriptive types and predicates

        Required Output Format:
        {
          "entities": [
            // Array of entities with their observations
          ],
          "relationships": [
            // Array of relationships with their observations
          ]
        }

        IMPORTANT:
        - Only include entities and relationships with clear evidence in the transcript
        - Use consistent naming throughout
        - Always provide source evidence (quotes or timestamps)
        - Be specific and descriptive in types and relationships
        - Focus on extracting meaningful, well-supported information
      `,
      schema: z.object({
        entities: z.array(Entity),
        relationships: z.array(Relationship),
      }),
      schemaName: "TranscriptEntitiesAndRelationships",
      schemaDescription:
        "A JSON object containing entities and relationships from a meeting transcript",
      temperature: 0,
    });

    return result.object;
  } catch (error) {
    console.error("Error generating transcript entities:", error);
    return null;
  }
}

async function checkEntityTypesCompatibility(type1: string, type2: string) {
  try {
    console.log("Checking entity types compatibility...");

    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      prompt: dedent`
        Given two entity types from a knowledge graph, determine if they are semantically compatible or represent the same concept.
        
        Type 1: ${type1}
        Type 2: ${type2}
        
        Return true if the types are compatible/same, false if they are different concepts.
        
        Consider things like:
        - Synonyms or alternative names for the same concept
        - Hierarchical relationships (e.g. "Company" and "Organization")
        - Common variations in naming
      `,
      schema: z.object({
        compatible: z.boolean(),
        reason: z.string(),
      }),
    });

    return result.object.compatible;
  } catch (error) {
    console.error("Error checking entity types compatibility:", error);
    return false;
  }
}

async function getOrCreateEntityForMasterProfileId(
  masterProfileId: string,
  entityName: string,
  entityType: string,
) {
  try {
    const { data: exactMatch, error: exactMatchError } = await supabase
      .from("entities")
      .select(
        "*, observations:entity_observations(*), relationships_as_subject:entity_relationships!subject_id(*), relationships_as_object:entity_relationships!object_id(*)",
      )
      .eq("master_profile_id", masterProfileId)
      .eq("name", entityName)
      .eq("type", entityType)
      .maybeSingle();

    if (exactMatchError) {
      throw exactMatchError;
    }

    if (exactMatch) {
      return exactMatch;
    }

    const { data: nameMatch, error: nameMatchError } = await supabase
      .from("entities")
      .select(
        "*, observations:entity_observations(*), relationships_as_subject:entity_relationships!subject_id(*), relationships_as_object:entity_relationships!object_id(*)",
      )
      .eq("master_profile_id", masterProfileId)
      .eq("name", entityName)
      .maybeSingle();

    if (nameMatchError) {
      throw nameMatchError;
    }

    if (nameMatch) {
      const typesAreCompatible = await checkEntityTypesCompatibility(
        nameMatch.type || "",
        entityType,
      );

      if (typesAreCompatible) {
        return nameMatch;
      }
    }

    const { data: newEntity, error: newEntityError } = await supabase
      .from("entities")
      .insert({
        type: entityType,
        name: entityName,
        master_profile_id: masterProfileId,
        is_test: true,
      })
      .select(
        "*, observations:entity_observations(*), relationships_as_subject:entity_relationships!subject_id(*), relationships_as_object:entity_relationships!object_id(*)",
      )
      .single();

    if (newEntityError) {
      throw newEntityError;
    }

    return newEntity;
  } catch (error) {
    console.error("Error getting or creating entity:", error);
    return null;
  }
}

async function getOrCreateEntityRelationship(
  subjectId: string,
  objectId: string,
  predicate: string,
) {
  try {
    const { data: existingRelationship, error: existingRelationshipError } =
      await supabase
        .from("entity_relationships")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("object_id", objectId)
        .eq("predicate", predicate)
        .maybeSingle();

    if (existingRelationshipError) {
      throw existingRelationshipError;
    }

    if (existingRelationship) {
      return existingRelationship;
    }

    const { data: newRelationship, error: newRelationshipError } =
      await supabase
        .from("entity_relationships")
        .insert({
          subject_id: subjectId,
          object_id: objectId,
          predicate: predicate,
          is_test: true,
        })
        .select("*")
        .single();

    if (newRelationshipError) {
      throw newRelationshipError;
    }

    return newRelationship;
  } catch (error) {
    console.error("Error getting or creating relationship:", error);
    return null;
  }
}

async function processTranscriptEntities(vtt: string, masterProfileId: string) {
  try {
    console.log("🔄 Analyzing transcript with AI...");

    const entitiesAndRelationships =
      await generateTranscriptEntitiesAndRelationships(vtt);
    if (!entitiesAndRelationships) return;

    const { entities, relationships } = entitiesAndRelationships;

    console.log(`📊 Processing ${entities.length} entity types...`);
    for (const entity of entities) {
      console.log(`⏳ Processing ${entity.name}...`);

      const dbEntity = await getOrCreateEntityForMasterProfileId(
        masterProfileId,
        entity.name,
        entity.type,
      );
      if (!dbEntity) {
        console.error("Error getting or creating entity:", entity.name);
        continue;
      }

      for (const observation of entity.observations) {
        const { error: observationError } = await supabase
          .from("entity_observations")
          .insert({
            entity_id: dbEntity.id,
            text: observation.text,
            is_test: true,
          });
        if (observationError) {
          console.error("Error creating observation:", observationError);
        }
      }
    }

    console.log(`⏳ Processing ${relationships.length} relationships...`);
    for (const relationship of relationships) {
      const { data: subjectEntity } = await supabase
        .from("entities")
        .select("id")
        .eq("name", relationship.subject)
        .eq("master_profile_id", masterProfileId)
        .limit(1);
      const { data: objectEntity } = await supabase
        .from("entities")
        .select("id")
        .eq("name", relationship.object)
        .eq("master_profile_id", masterProfileId)
        .limit(1);

      if (!subjectEntity?.[0] || !objectEntity?.[0]) {
        console.error(
          "Error getting or creating entity:",
          relationship.subject,
          relationship.object,
        );
        continue;
      }

      await getOrCreateEntityRelationship(
        subjectEntity?.[0]?.id,
        objectEntity?.[0]?.id,
        relationship.predicate,
      );
    }
  } catch (error) {
    console.error("Error processing transcript entities:", error);
  }
}

async function main() {
  try {
    console.log("🚀 Starting transcript processing...");

    const { data: meetings, error: meetingsError } = await supabase
      .from("meetings")
      .select("*")
      .eq("profile_id", RICHARD_HENDRICKS_PROFILE_ID);

    if (meetingsError) {
      console.error("Error fetching meetings:", meetingsError);
      return;
    }

    const meetingsToProcess = meetings.filter(
      (
        m,
      ): m is typeof m & {
        clean_vtt_file: NonNullable<typeof m.clean_vtt_file>;
      } => !!m.clean_vtt_file,
    );

    console.log(`📊 Found ${meetingsToProcess.length} meetings to process`);
    for (const [index, meeting] of meetingsToProcess.entries()) {
      console.log(
        `\n⏳ Processing meeting ${index + 1}/${meetingsToProcess.length}...`,
      );
      await processTranscriptEntities(
        meeting.clean_vtt_file,
        RICHARD_HENDRICKS_PROFILE_ID,
      );
      console.log(
        `✅ Completed meeting ${index + 1}/${meetingsToProcess.length}`,
      );
    }

    console.log("🎉 All meetings processed successfully!");
  } catch (error) {
    console.error("Error in main process:", error);
  }
}

void main();
