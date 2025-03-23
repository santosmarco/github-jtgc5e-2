import { z } from "zod";

/**
 * Schema for an entity extracted from meeting content
 */
export const Entity = z.object({
  name: z.string().describe("Name of the entity."),
  type: z.string().describe("Type of the entity."),
  description: z
    .string()
    .describe("Brief description or context of the entity."),
  observations: z
    .array(z.string())
    .describe("Specific observations about this entity."),
});
export type Entity = z.infer<typeof Entity>;

/**
 * Schema for a relationship between two entities
 */
export const EntityRelation = z.object({
  entity1: z.string().describe("First entity in the relationship."),
  entity2: z.string().describe("Second entity in the relationship."),
  relationship: z.string().describe("Nature of the relationship"),
  observations: z
    .array(z.string())
    .describe("Specific observations about this relationship."),
});
export type EntityRelation = z.infer<typeof EntityRelation>;

/**
 * Schema for the complete output of entity extraction
 */
export const EntityExtractionOutput = z.object({
  entities: z
    .array(Entity)
    .describe("List of identified entities from the meeting segment."),
  relationships: z
    .array(EntityRelation)
    .describe(
      "List of relationships identified between the extracted entities.",
    ),
  observations: z
    .array(z.string())
    .describe("List of general observations regarding the overall context."),
});
export type EntityExtractionOutput = z.infer<typeof EntityExtractionOutput>;
