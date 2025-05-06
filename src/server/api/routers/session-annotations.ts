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
        case "moment":
        case "moments": {
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

        case "entity":
        case "meeting_entities_v2": {
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

        case "relationship":
        case "meeting_entity_relationships_v2": {
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

        case "entity_observation":
        case "meeting_entity_observations_v2": {
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

        case "relationship_observation":
        case "meeting_entity_relationship_observations_v2": {
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

        case "topic_observation":
        case "meeting_observations_v2": {
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

        case "topic":
        case "meeting_topics_v2": {
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

        case "action_item":
        case "meeting_action_items": {
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

        case "topic_discussed":
        case "meeting_topics": {
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

        case "meeting":
        case "meetings": {
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

        case "entities": {
          const { data, error } = await supabase
            .from("entities")
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
              attributes: data.attributes,
            },
          };
        }

        case "meeting_topic_events_v2": {
          const { data, error } = await supabase
            .from("meeting_topic_events_v2")
            .select("*, topic:meeting_topics_v2(*)")
            .eq("id", sourceId)
            .single();

          if (error) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Topic event not found",
            });
          }

          return {
            type: "topic_event" as const,
            data: {
              id: data.id,
              event: data.event,
              timestamp: data.timestamp,
              topic: {
                id: data.topic.id,
                title: data.topic.title,
                summary: data.topic.summary,
              },
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

  // Get reactions for an annotation
  getReactions: publicProcedure
    .input(
      z.object({
        annotationId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("session_annotation_reactions")
        .select("*, user:profiles(*)")
        .eq("session_annotation_id", input.annotationId);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch annotation reactions",
        });
      }

      return data;
    }),

  // Add a reaction to an annotation
  addReaction: publicProcedure
    .input(
      z.object({
        annotationId: z.string(),
        type: z.enum(["thumbs_up", "thumbs_down"]),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      // First get the user ID
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to react to annotations",
        });
      }

      const userId = userData.user.id;

      // Check if the user already reacted to this annotation
      const { data: existingReaction } = await supabase
        .from("session_annotation_reactions")
        .select("*")
        .eq("session_annotation_id", input.annotationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingReaction) {
        // If clicking the same reaction type, remove it (toggle behavior)
        if (existingReaction.reaction_type === input.type) {
          const { error } = await supabase
            .from("session_annotation_reactions")
            .delete()
            .eq("id", existingReaction.id);

          if (error) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to remove reaction",
            });
          }

          return { success: true, id: existingReaction.id, toggled: true };
        }

        // Update the existing reaction if it's different
        const { error } = await supabase
          .from("session_annotation_reactions")
          .update({
            reaction_type: input.type,
            created_at: new Date().toISOString(),
          })
          .eq("id", existingReaction.id);

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update reaction",
          });
        }

        return { success: true, id: existingReaction.id, updated: true };
      }

      // Create a new reaction
      const { data, error } = await supabase
        .from("session_annotation_reactions")
        .insert({
          session_annotation_id: input.annotationId,
          user_id: userId,
          reaction_type: input.type,
        })
        .select("*")
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add reaction",
        });
      }

      return { success: true, id: data.id, created: true };
    }),

  // Get all reactions for multiple annotations
  getAllReactions: publicProcedure
    .input(
      z.object({
        annotationIds: z.array(z.string()),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      if (input.annotationIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("session_annotation_reactions")
        .select("*")
        .in("session_annotation_id", input.annotationIds);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch annotation reactions",
        });
      }

      return data;
    }),
});
