import _ from "lodash";
import { z } from "zod";

import { createClient } from "~/lib/supabase/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const entitiesRouter = createTRPCRouter({
  getKnowledgeGraph: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      // Fetch entities from meeting_entities_v2
      const { data: entities, error: entitiesError } = await supabase
        .from("meeting_entities_v2")
        .select(
          "id, name, type, description, api_video_id, meeting:meetings(video_api_id, name), observations:meeting_entity_observations_v2(id, observation)",
        )
        .eq("profile_id", input.profileId)
        .eq("latest", true);

      if (entitiesError) {
        throw new Error(`Failed to fetch entities: ${entitiesError.message}`);
      }

      // Fetch relationships from meeting_entity_relationships_v2
      const { data: relationships, error: relationshipsError } = await supabase
        .from("meeting_entity_relationships_v2")
        .select(
          "id, subject_entity_name, object_entity_name, relationship_type, api_video_id, meeting:meetings(video_api_id, name), observations:meeting_entity_relationship_observations_v2(id, observation)",
        )
        .eq("profile_id", input.profileId)
        .eq("latest", true);

      if (relationshipsError) {
        throw new Error(
          `Failed to fetch relationships: ${relationshipsError.message}`,
        );
      }

      const entitiesMap = new Map<
        [name: string, type: string],
        {
          name: string;
          type: string;
          ids: string[];
          descriptions: string[];
          observations: string[];
          meetingIds: string[];
        }
      >();

      for (const entity of entities) {
        const existingEntity = entitiesMap.get([
          _.snakeCase(entity.name),
          _.snakeCase(entity.type),
        ]);

        if (existingEntity) {
          existingEntity.ids.push(entity.id);
          if (entity.description) {
            existingEntity.descriptions.push(entity.description);
          }
          existingEntity.observations.push(
            ...entity.observations.map((obs) => obs.observation),
          );
          existingEntity.meetingIds.push(entity.api_video_id);
        } else {
          entitiesMap.set(
            [_.snakeCase(entity.name), _.snakeCase(entity.type)],
            {
              name: entity.name,
              type: entity.type,
              ids: [entity.id],
              descriptions: entity.description ? [entity.description] : [],
              observations: entity.observations.map((obs) => obs.observation),
              meetingIds: [entity.api_video_id],
            },
          );
        }
      }

      // Format data for the knowledge graph
      const nodes = Array.from(entitiesMap.values()).map((entity) => {
        return {
          id: entity.ids.join(","),
          name: entity.name,
          type: _.upperFirst(entity.type),
          descriptions: entity.descriptions,
          observations: entity.observations,
          meetingIds: entity.meetingIds,
        };
      });

      // Format relationships as links
      const links = relationships
        .filter(
          (rel) =>
            nodes.some(
              (node) =>
                _.snakeCase(node.name) === _.snakeCase(rel.subject_entity_name),
            ) &&
            nodes.some(
              (node) =>
                _.snakeCase(node.name) === _.snakeCase(rel.object_entity_name),
            ),
        )
        .map((rel) => ({
          id: rel.id,
          source: nodes.find(
            (node) =>
              _.snakeCase(node.name) === _.snakeCase(rel.subject_entity_name),
          ),
          target: nodes.find(
            (node) =>
              _.snakeCase(node.name) === _.snakeCase(rel.object_entity_name),
          ),
          type: rel.relationship_type.toLowerCase(),
          meetingId: rel.api_video_id,
        }));

      return {
        nodes,
        links,
      };
    }),
});
