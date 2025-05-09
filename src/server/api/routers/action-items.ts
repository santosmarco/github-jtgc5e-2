import { TRPCError } from "@trpc/server";
import dayjs from "dayjs";
import _ from "lodash";
import { z } from "zod";

import type { Tables, TablesInsert } from "~/lib/supabase/database.types";
import { createClient } from "~/lib/supabase/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

type ActionItemWithAssignees = Tables<"meeting_action_items"> & {
  assignees: Array<{
    assignee: Tables<"entities">;
  }>;
};

export const actionItemsRouter = createTRPCRouter({
  getByProfileId: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { data: userMeetings, error: userMeetingsError } = await supabase
        .from("meetings")
        .select("video_api_id")
        .eq("profile_id", input.profileId);

      if (userMeetingsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch meetings: ${userMeetingsError.message}`,
          cause: userMeetingsError,
        });
      }

      const { data, error } = await supabase
        .from("meeting_action_items")
        .select(
          `
            *,
            assignees:meeting_action_item_assignees(
              assignee:entities(*)
            ),
            meeting:meetings(*)
          `,
        )
        .in(
          "api_video_id",
          userMeetings.map((meeting) => meeting.video_api_id),
        )
        .is("deleted_at", null)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("text", { ascending: true })
        .order("completed_at", { ascending: true, nullsFirst: true });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch action items: ${error.message}`,
          cause: error,
        });
      }

      const actionItems = data.map((item) => ({
        ...item,
        due_date: item.due_date
          ? dayjs(item.due_date).year() < 2025
            ? dayjs(item.due_date)
                .add(2025 - dayjs(item.due_date).year(), "year")
                .toISOString()
            : item.due_date
          : null,
      }));
      const meetings: Tables<"meetings">[] = [];
      const people: Tables<"entities">[] = [];

      for (const item of data) {
        const meeting = item.meeting;
        const assignees = item.assignees;

        if (meeting) {
          meetings.push(meeting);
        }

        for (const assignee of assignees) {
          people.push(assignee.assignee);
        }
      }

      return {
        actionItems,
        meetings: _.uniqBy(meetings, (x) => x.video_api_id),
        people: _.sortBy(
          _.uniqBy(people, (x) => x.id),
          (x) => x.name,
        ),
      };
    }),

  getByVideoId: protectedProcedure
    .input(
      z.object({
        videoId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { data: actionItems, error } = await supabase
        .from("meeting_action_items")
        .select(
          `
            *,
            assignees:meeting_action_item_assignees(
              assignee:entities(*)
            ),
            meeting:meetings(*)
          `,
        )
        .eq("api_video_id", input.videoId)
        .is("deleted_at", null)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("text", { ascending: true })
        .order("completed_at", { ascending: true, nullsFirst: true });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch action items: ${error.message}`,
          cause: error,
        });
      }

      if (actionItems.length <= 0) {
        return null;
      }

      return (actionItems satisfies ActionItemWithAssignees[]).map((item) => ({
        ...item,
        due_date: item.due_date
          ? dayjs(item.due_date).year() < 2025
            ? dayjs(item.due_date)
                .add(2025 - dayjs(item.due_date).year(), "year")
                .toISOString()
            : item.due_date
          : null,
      }));
    }),

  create: protectedProcedure
    .input(
      z.object({
        videoId: z.string(),
        text: z.string().trim(),
        dueDate: z.string().optional(),
        assigneeIds: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { data: actionItem, error } = await supabase
        .from("meeting_action_items")
        .insert({
          api_video_id: input.videoId,
          text: input.text,
          due_date: input.dueDate,
        })
        .select("*")
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create action item: ${error.message}`,
          cause: error,
        });
      }

      if (input.assigneeIds.length > 0) {
        const { data: assignees, error } = await supabase
          .from("meeting_action_item_assignees")
          .insert(
            input.assigneeIds.map(
              (assigneeId) =>
                ({
                  meeting_action_item_id: actionItem.id,
                  assignee_id: assigneeId,
                }) satisfies TablesInsert<"meeting_action_item_assignees">,
            ),
          )
          .select("*, assignee:entities(*)");

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create action item: ${error.message}`,
            cause: error,
          });
        }

        return { ...actionItem, assignees } satisfies ActionItemWithAssignees;
      }

      return { ...actionItem, assignees: [] } satisfies ActionItemWithAssignees;
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { error } = await supabase
        .from("meeting_action_items")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete action item: ${error.message}`,
          cause: error,
        });
      }

      return true;
    }),

  toggleComplete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        completed: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { error } = await supabase
        .from("meeting_action_items")
        .update({
          completed_at: input.completed ? new Date().toISOString() : null,
        })
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to toggle action item: ${error.message}`,
          cause: error,
        });
      }

      return true;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        text: z.string().trim().optional(),
        dueDate: z.string().optional(),
        assigneeIds: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { id, assigneeIds, ...rest } = input;

      if (Object.keys(rest).length > 0) {
        const { error } = await supabase
          .from("meeting_action_items")
          .update({
            ...(input.text && { text: input.text }),
            ...(input.dueDate && { due_date: input.dueDate }),
          })
          .eq("id", id);

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update action item: ${error.message}`,
            cause: error,
          });
        }
      }

      if (assigneeIds.length > 0) {
        const { error: assigneeDeleteError } = await supabase
          .from("meeting_action_item_assignees")
          .delete()
          .eq("meeting_action_item_id", id);

        if (assigneeDeleteError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update action item: ${assigneeDeleteError.message}`,
            cause: assigneeDeleteError,
          });
        }

        const { error: assigneeInsertError } = await supabase
          .from("meeting_action_item_assignees")
          .insert(
            input.assigneeIds.map(
              (assigneeId) =>
                ({
                  meeting_action_item_id: id,
                  assignee_id: assigneeId,
                }) satisfies TablesInsert<"meeting_action_item_assignees">,
            ),
          );

        if (assigneeInsertError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update action item: ${assigneeInsertError.message}`,
            cause: assigneeInsertError,
          });
        }
      }

      return true;
    }),
});
