import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createClient } from "~/lib/supabase/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const sessionAnnotationsRouter = createTRPCRouter({
  getSourceDetails: publicProcedure
    .input(
      z.object({
        sourceId: z.string(),
        sourceType: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const { sourceId, sourceType } = input;
      const supabase = await createClient();

      switch (sourceType) {
        case "moment": {
          const { data, error } = await supabase
            .from("moments")
            .select("*")
            .eq("id", sourceId)
            .single();

          if (error) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Moment not found",
            });
          }

          return {
            type: "moment" as const,
            data: {
              id: data.id,
              title: data.title,
              summary: data.summary,
              startTimestamp: data.segment_start_timestamp,
              endTimestamp: data.segment_end_timestamp,
              activity: data.activity,
              activityType: data.activity_type,
              score: data.final_score,
            },
          };
        }

        case "entity": {
          const { data, error } = await supabase
            .from("meeting_entities_v2")
            .select("*")
            .eq("id", sourceId)
            .single();

          if (error) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Entity not found",
            });
          }

          return {
            type: "entity" as const,
            data: {
              id: data.id,
              name: data.name,
              type: data.type,
              description: data.description,
            },
          };
        }

        case "relationship": {
          const { data, error } = await supabase
            .from("meeting_entity_relationships_v2")
            .select("*")
            .eq("id", sourceId)
            .single();

          if (error) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Relationship not found",
            });
          }

          return {
            type: "relationship" as const,
            data: {
              id: data.id,
              subjectEntityName: data.subject_entity_name,
              objectEntityName: data.object_entity_name,
              relationshipType: data.relationship_type,
            },
          };
        }

        case "entity_observation": {
          const { data, error } = await supabase
            .from("meeting_entity_observations_v2")
            .select("*, entity:meeting_entities_v2(*)")
            .eq("id", sourceId)
            .single();

          if (error) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Entity observation not found",
            });
          }

          return {
            type: "entity_observation" as const,
            data: {
              id: data.id,
              observation: data.observation,
              entity: {
                id: data.entity.id,
                name: data.entity.name,
                type: data.entity.type,
              },
            },
          };
        }

        case "relationship_observation": {
          const { data, error } = await supabase
            .from("meeting_entity_relationship_observations_v2")
            .select("*, relationship:meeting_entity_relationships_v2(*)")
            .eq("id", sourceId)
            .single();

          if (error) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Relationship observation not found",
            });
          }

          return {
            type: "relationship_observation" as const,
            data: {
              id: data.id,
              observation: data.observation,
              relationship: {
                id: data.relationship.id,
                subjectEntityName: data.relationship.subject_entity_name,
                objectEntityName: data.relationship.object_entity_name,
                relationshipType: data.relationship.relationship_type,
              },
            },
          };
        }

        case "topic_observation": {
          const { data, error } = await supabase
            .from("meeting_observations_v2")
            .select("*, topic:meeting_topics_v2(*)")
            .eq("id", sourceId)
            .single();

          if (error) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Topic observation not found",
            });
          }

          return {
            type: "topic_observation" as const,
            data: {
              id: data.id,
              observation: data.observation,
              topic: {
                id: data.topic.id,
                title: data.topic.title,
                summary: data.topic.summary,
              },
            },
          };
        }

        case "topic": {
          const { data, error } = await supabase
            .from("meeting_topics_v2")
            .select("*")
            .eq("id", sourceId)
            .single();

          if (error) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Topic not found",
            });
          }

          return {
            type: "topic" as const,
            data: {
              id: data.id,
              title: data.title,
              summary: data.summary,
            },
          };
        }

        case "action_item": {
          const { data, error } = await supabase
            .from("meeting_action_items")
            .select("*, assignees:meeting_action_item_assignees(*)")
            .eq("id", sourceId)
            .single();

          if (error) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Action item not found",
            });
          }

          return {
            type: "action_item" as const,
            data: {
              id: data.id,
              text: data.text,
              dueDate: data.due_date,
              isCompleted: Boolean(data.completed_at),
              assignees: data.assignees.map(
                (assignee: { assignee_id: string }) => ({
                  id: assignee.assignee_id,
                  assigneeId: assignee.assignee_id,
                }),
              ),
            },
          };
        }

        case "topic_discussed": {
          const { data, error } = await supabase
            .from("meeting_topics")
            .select("*")
            .eq("id", sourceId)
            .single();

          if (error) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Topic discussed not found",
            });
          }

          return {
            type: "topic_discussed" as const,
            data: {
              id: data.id,
              title: data.title,
              summary: data.summary,
            },
          };
        }

        case "meeting": {
          const { data, error } = await supabase
            .from("meetings")
            .select("*")
            .eq("video_api_id", sourceId)
            .single();

          if (error) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Meeting not found",
            });
          }

          return {
            type: "meeting" as const,
            data: {
              id: data.video_api_id,
              name: data.name,
              summary: data.summary,
              date: data.date,
            },
          };
        }

        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Unsupported source type: ${sourceType}`,
          });
      }
    }),
});
