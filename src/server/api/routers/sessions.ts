import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { logger } from "~/lib/logging/server";
import type { TablesInsert, TablesUpdate } from "~/lib/supabase/database.types";
import { createClient } from "~/lib/supabase/server";
import { isTruthy } from "~/lib/utils";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

// Define common types
const NoteColorEnum = z.enum(["yellow", "blue", "green", "pink", "purple"]);
type NoteColor = z.infer<typeof NoteColorEnum>;

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const sessionsRouter = createTRPCRouter({
  getAllSessionsForUser: publicProcedure
    .input(
      z.object({
        profileId: z.string(),
        eventType: z.enum(["coaching_session", "meeting"]).optional(),
      }),
    )
    .query(async ({ input }) => {
      const { profileId } = input;
      const supabase = await createClient();

      // Fetch user profile with coach relationship
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (profileError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch profile",
          cause: profileError,
        });
      }

      const coachId = profile.coach_id;

      // Early return if no coach assigned to profile
      if (!coachId) {
        logger.info("No coach assigned to profile", { profileId: profile.id });
        return [];
      }

      // Fetch coach profile
      const { data: coach, error: coachError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", coachId)
        .single();

      if (coachError) {
        logger.warn("Failed to fetch coach profile", {
          profileId: profile.id,
          coachId,
          error: coachError,
        });
        return [];
      }

      // Fetch calendar events for the user
      const { data: events, error: eventsError } = await supabase
        .from("calendar_event_details_v2")
        .select("*")
        .eq("profile_id", profileId);

      if (eventsError) {
        logger.error("Failed to fetch calendar events", {
          profileId,
          error: eventsError,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch calendar events",
          cause: eventsError,
        });
      }

      // Filter events where coach is an attendee
      const coachEmail = coach.email;
      const eventsWithCoachAsAttendee = events.filter(
        (event) =>
          Array.isArray(event.attendees) &&
          event.attendees.some(
            (attendee) =>
              typeof attendee === "string" && attendee === coachEmail,
          ),
      );

      // Fetch existing sessions for the user with related entities
      const { data: existingSessions, error: sessionsError } = await supabase
        .from("sessions")
        .select(
          "*, user:profiles!user_id(*), coach:profiles!coach_id(*), event:calendar_events_v2!event_id(*, meeting_bots:meeting_bots_v2(*)), meeting:meetings!api_video_id(*, action_items:meeting_action_items(*), insights:meeting_topics(*)), annotations:session_annotations(*, sources:session_annotation_sources(*))",
        )
        .eq("user_id", profileId);

      if (sessionsError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch existing sessions",
          cause: sessionsError,
        });
      }

      // Identify events without associated sessions
      const existingEventIds = new Set(
        existingSessions.map((session) => session.event_id),
      );

      const eventsWithoutSessions = eventsWithCoachAsAttendee.filter(
        (event) => !existingEventIds.has(event.id),
      );

      // If no new sessions need to be created, return existing sessions
      if (eventsWithoutSessions.length === 0) {
        return existingSessions.map((session) => ({
          ...session,
          meeting: session.meeting
            ? {
                ...session.meeting,
                insights: session.meeting.insights.filter(
                  (insight) => !insight.server_deleted_at,
                ),
                action_items: session.meeting.action_items.filter(
                  (actionItem) => !actionItem.server_deleted_at,
                ),
              }
            : null,
        }));
      }

      // Prepare new session records
      const newSessions = eventsWithoutSessions.map(
        (event) =>
          ({
            user_id: profileId,
            coach_id: coachId,
            event_id: event.id,
            title: event.summary || "Coaching Session",
            date: event.start_date_time,
          }) satisfies TablesInsert<"sessions">,
      );

      // Create the sessions
      const { data: createdSessions, error: insertError } = await supabase
        .from("sessions")
        .insert(newSessions)
        .select(
          "*, user:profiles!user_id(*), coach:profiles!coach_id(*), event:calendar_events_v2!event_id(*, meeting_bots:meeting_bots_v2(*)), meeting:meetings!api_video_id(*, action_items:meeting_action_items(*), insights:meeting_topics(*)), annotations:session_annotations(*)",
        );

      if (insertError) {
        logger.error("Failed to create sessions", {
          profileId,
          error: insertError,
        });
        // Return existing sessions if we failed to create new ones
        return existingSessions.map((session) => ({
          ...session,
          meeting: session.meeting
            ? {
                ...session.meeting,
                insights: session.meeting.insights.filter(
                  (insight) => !insight.server_deleted_at,
                ),
                action_items: session.meeting.action_items.filter(
                  (actionItem) => !actionItem.server_deleted_at,
                ),
              }
            : null,
        }));
      }

      // Update the events with type coaching_session
      const eventIds = eventsWithoutSessions
        .map((event) => event.id)
        .filter(isTruthy);

      if (eventIds.length === 0) {
        // Combine existing and created sessions if we have any
        return [...existingSessions, ...(createdSessions || [])].map(
          (session) => ({
            ...session,
            meeting: session.meeting
              ? {
                  ...session.meeting,
                  insights: session.meeting.insights.filter(
                    (insight) => !insight.server_deleted_at,
                  ),
                  action_items: session.meeting.action_items.filter(
                    (actionItem) => !actionItem.server_deleted_at,
                  ),
                }
              : null,
          }),
        );
      }

      // Update events to coaching_session type
      const { data: updatedEvents, error: updateError } = await supabase
        .from("calendar_events_v2")
        .update({ event_type: "coaching_session" })
        .in("id", eventIds)
        .select("*, meeting_bots:meeting_bots_v2(*)");

      if (updateError) {
        logger.error("Failed to update event types", {
          profileId,
          error: updateError,
        });
      }

      // Process updated sessions with video IDs
      const sessionsWithUpdatedVideoIds = !updatedEvents?.length
        ? existingSessions
        : await Promise.all(
            existingSessions.map(async (session) => {
              const matchingEvent = updatedEvents.find(
                (event) => event.id === session.event_id,
              );

              if (!matchingEvent) return session;

              const apiVideoId = matchingEvent.meeting_bots.find(
                (meetingBot) => meetingBot.api_video_id,
              )?.api_video_id;

              if (!apiVideoId) return session;

              const { data: updatedSession } = await supabase
                .from("sessions")
                .update({ api_video_id: apiVideoId })
                .eq("event_id", matchingEvent.id)
                .select(
                  "*, user:profiles!user_id(*), coach:profiles!coach_id(*), event:calendar_events_v2!event_id(*, meeting_bots:meeting_bots_v2(*)), meeting:meetings!api_video_id(*, action_items:meeting_action_items(*), insights:meeting_topics(*)), annotations:session_annotations(*)",
                )
                .maybeSingle();

              return updatedSession || session;
            }),
          );

      // Merge all sessions with updated event data
      const finalSessions = [
        ...sessionsWithUpdatedVideoIds,
        ...(createdSessions || []),
      ].map((session) => {
        const updatedEvent = updatedEvents?.find(
          (event) => event.id === session.event_id,
        );

        if (!updatedEvent)
          return {
            ...session,
            meeting: session.meeting
              ? {
                  ...session.meeting,
                  insights: session.meeting.insights.filter(
                    (insight) => !insight.server_deleted_at,
                  ),
                  action_items: session.meeting.action_items.filter(
                    (actionItem) => !actionItem.server_deleted_at,
                  ),
                }
              : null,
          };

        // Create a new session object with updated event data
        return {
          ...session,
          event: { ...session.event, ...updatedEvent },
          meeting: session.meeting
            ? {
                ...session.meeting,
                insights: session.meeting.insights.filter(
                  (insight) => !insight.server_deleted_at,
                ),
                action_items: session.meeting.action_items.filter(
                  (actionItem) => !actionItem.server_deleted_at,
                ),
              }
            : null,
        };
      });

      return finalSessions;
    }),

  getSessionById: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("sessions")
        .select(
          "*, user:profiles!user_id(*), coach:profiles!coach_id(*), event:calendar_events_v2!event_id(*)",
        )
        .eq("id", input.sessionId)
        .single();

      if (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
          cause: error,
        });
      }

      return data;
    }),

  getSessionNotes: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("session_notes")
        .select("*, author:profiles!author_id(*)")
        .eq("session_id", input.sessionId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch session notes",
          cause: error,
        });
      }

      return data || [];
    }),

  addSessionNote: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        authorId: z.string(),
        content: z.string(),
        // Optional post-it note fields
        color: NoteColorEnum.optional(),
        position: PositionSchema.optional(),
        zIndex: z.number().optional(),
        minimized: z.boolean().optional(),
        // File upload fields
        file: z
          .object({
            name: z.string(),
            type: z.string(),
            base64Data: z.string(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      let fileUrl = null;

      // Handle file upload if provided
      if (input.file) {
        const { name, type, base64Data } = input.file;

        // Remove the data URL prefix to get just the base64 content
        const base64FileData = base64Data.split(",")[1] || base64Data;

        // Convert base64 to binary data
        const fileData = Buffer.from(base64FileData, "base64");

        // Generate a unique file path
        const filePath = `session-notes/${input.sessionId}/${Date.now()}-${name}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("session-note-attachments")
          .upload(filePath, fileData, {
            contentType: type,
            upsert: false,
          });

        if (uploadError) {
          logger.error("Failed to upload file attachment", {
            sessionId: input.sessionId,
            fileName: name,
            error: uploadError,
          });

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to upload file attachment",
            cause: uploadError,
          });
        }

        // Get the public URL for the uploaded file
        const { data: publicUrlData } = supabase.storage
          .from("session-note-attachments")
          .getPublicUrl(filePath);

        fileUrl = publicUrlData.publicUrl;
      }

      // Create note data with file URL if available
      const noteData = {
        session_id: input.sessionId,
        author_id: input.authorId,
        content: input.content,
        // Add file URL if uploaded
        ...(fileUrl && { attachment_url: fileUrl }),
        // Add post-it specific fields if provided
        ...(input.color && { color: input.color }),
        ...(input.position && {
          position_x: input.position.x,
          position_y: input.position.y,
        }),
        ...(input.zIndex !== undefined && { z_index: input.zIndex }),
        ...(input.minimized !== undefined && { minimized: input.minimized }),
      } satisfies TablesInsert<"session_notes">;

      const { data, error } = await supabase
        .from("session_notes")
        .insert(noteData)
        .select("*, author:profiles!author_id(*)")
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add session note",
          cause: error,
        });
      }

      return data;
    }),

  updateSessionNote: protectedProcedure
    .input(
      z.object({
        noteId: z.string(),
        updates: z.object({
          content: z.string().optional(),
          color: NoteColorEnum.optional(),
          position: PositionSchema.optional(),
          zIndex: z.number().optional(),
          minimized: z.boolean().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      // Transform the updates to match database schema
      const updateData = {
        ...(input.updates.content !== undefined && {
          content: input.updates.content,
        }),
        ...(input.updates.color !== undefined && {
          color: input.updates.color,
        }),
        ...(input.updates.position !== undefined && {
          position_x: input.updates.position.x,
          position_y: input.updates.position.y,
        }),
        ...(input.updates.zIndex !== undefined && {
          z_index: input.updates.zIndex,
        }),
        ...(input.updates.minimized !== undefined && {
          minimized: input.updates.minimized,
        }),
      } satisfies TablesUpdate<"session_notes">;

      const { data, error } = await supabase
        .from("session_notes")
        .update(updateData)
        .eq("id", input.noteId)
        .select("*, author:profiles!author_id(*)")
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update session note",
          cause: error,
        });
      }

      return data;
    }),

  deleteSessionNote: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      // First, check if the note has an attachment to delete
      const { data: note, error: fetchError } = await supabase
        .from("session_notes")
        .select("attachment_url")
        .eq("id", input.noteId)
        .single();

      if (fetchError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch session note",
          cause: fetchError,
        });
      }

      // If there's an attachment, delete it from storage
      if (note?.attachment_url) {
        // Extract the file path from the URL
        const storageUrl = supabase.storage
          .from("session-note-attachments")
          .getPublicUrl("").data.publicUrl;
        const filePath = note.attachment_url.replace(storageUrl, "");

        if (filePath) {
          const { error: deleteFileError } = await supabase.storage
            .from("session-note-attachments")
            .remove([filePath]);

          if (deleteFileError) {
            logger.warn("Failed to delete file attachment", {
              noteId: input.noteId,
              filePath,
              error: deleteFileError,
            });
            // Continue with note deletion even if file deletion fails
          }
        }
      }

      // Delete the note
      const { error } = await supabase
        .from("session_notes")
        .delete()
        .eq("id", input.noteId);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete session note",
          cause: error,
        });
      }

      return { success: true };
    }),

  updateSessionSummary: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        summary: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { error } = await supabase
        .from("sessions")
        .update({ summary: input.summary })
        .eq("id", input.sessionId);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update session summary",
          cause: error,
        });
      }

      return { success: true };
    }),

  updateSessionTitle: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        title: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();

      const { error } = await supabase
        .from("sessions")
        .update({ title: input.title })
        .eq("id", input.sessionId);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update session title",
          cause: error,
        });
      }

      return { success: true };
    }),
});
