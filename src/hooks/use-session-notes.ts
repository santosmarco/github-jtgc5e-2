"use client";

import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import type { PostItNoteData } from "~/components/sessions/post-it-note";
import type { Tables } from "~/lib/supabase/database.types";
import { api } from "~/trpc/react";
import { useProfile } from "./use-profile";

// Define file upload data structure
export interface FileUpload {
  name: string;
  type: string;
  base64Data: string;
}

export function useSessionNotes(sessionId: string) {
  const { profile } = useProfile();
  const utils = api.useUtils();

  // Query session notes
  const { data: serverNotes = [], isLoading } =
    api.sessions.getSessionNotes.useQuery({ sessionId });

  // Mutations
  const addNoteMutation = api.sessions.addSessionNote.useMutation();
  const updateNoteMutation = api.sessions.updateSessionNote.useMutation();
  const deleteNoteMutation = api.sessions.deleteSessionNote.useMutation();

  // Transform server data to PostItNoteData
  const transformServerNote = (
    note: Tables<"session_notes"> & {
      author: Tables<"profiles">;
    },
  ): PostItNoteData => ({
    id: note.id,
    content: note.content,
    author: {
      id: note.author.id,
      nickname: note.author.nickname || "User",
      avatar_url: note.author.image_url,
    },
    createdAt: note.created_at,
    position: {
      x: note.position_x || 0,
      y: note.position_y || 0,
    },
    color: note.color || "yellow",
    zIndex: note.z_index || 100,
    minimized: note.minimized || false,
    attachmentUrl: note.attachment_url || null,
  });

  // Filter for post-it notes (those with position data)
  const postItNotes = serverNotes
    .map(transformServerNote)
    .filter(
      (note) =>
        note.position?.x !== undefined && note.position?.y !== undefined,
    );

  // Regular notes (those without position data)
  const regularNotes = serverNotes
    .map(transformServerNote)
    .filter(
      (note) =>
        note.position?.x === undefined || note.position?.y === undefined,
    );

  // Add a new post-it note with optimistic update
  const addPostItNote = async (
    noteData: Omit<
      PostItNoteData,
      "id" | "author" | "createdAt" | "attachmentUrl"
    > & {
      file?: FileUpload;
    },
  ) => {
    if (!profile) return;

    // Create temporary ID
    const tempId = `temp-${uuidv4()}`;
    const now = new Date().toISOString();

    const optimisticNote = {
      id: tempId,
      author_id: profile.id,
      session_id: sessionId,
      content: noteData.content,
      color: noteData.color,
      position_x: noteData.position?.x,
      position_y: noteData.position?.y,
      z_index: noteData.zIndex,
      minimized: !!noteData.minimized,
      created_at: now,
      author: {
        id: profile.id,
        nickname: profile.nickname || "User",
        image_url: profile.image_url,
      } as Tables<"profiles">,
      // For file uploads, we can't know the URL until after server processing
      attachment_url: noteData.file ? "pending" : null,
      updated_at: now,
    };

    // Optimistically update the UI
    utils.sessions.getSessionNotes.setData({ sessionId }, (old = []) => {
      return [...old, optimisticNote];
    });

    try {
      await addNoteMutation.mutateAsync({
        sessionId,
        authorId: profile.id,
        content: noteData.content,
        color: noteData.color,
        position: noteData.position,
        zIndex: noteData.zIndex,
        minimized: noteData.minimized,
        file: noteData.file,
      });

      // Invalidate to get fresh data
      await utils.sessions.getSessionNotes.invalidate({ sessionId });
    } catch (error) {
      // Revert optimistic update on error
      utils.sessions.getSessionNotes.setData({ sessionId }, (old = []) => {
        return old.filter((note) => note.id !== tempId);
      });
      console.error("Failed to add note:", error);
    }

    return tempId;
  };

  // Update a post-it note with optimistic update
  const updatePostItNote = async (
    id: string,
    updates: Partial<PostItNoteData>,
  ) => {
    // Optimistically update the UI
    utils.sessions.getSessionNotes.setData({ sessionId }, (old = []) => {
      return old.map((note) => {
        if (note.id !== id) return note;
        return {
          ...note,
          content: updates.content ?? note.content,
          color: updates.color ?? note.color,
          position_x: updates.position?.x ?? note.position_x,
          position_y: updates.position?.y ?? note.position_y,
          z_index: updates.zIndex ?? note.z_index,
          minimized: updates.minimized ?? note.minimized,
        };
      });
    });

    try {
      await updateNoteMutation.mutateAsync({
        noteId: id,
        updates: {
          content: updates.content,
          color: updates.color,
          position: updates.position,
          zIndex: updates.zIndex,
          minimized: updates.minimized,
        },
      });

      // Invalidate to get fresh data
      await utils.sessions.getSessionNotes.invalidate({ sessionId });
    } catch (error) {
      // Revert optimistic update on error
      await utils.sessions.getSessionNotes.invalidate({ sessionId });
      console.error("Failed to update note:", error);
    }
  };

  // Delete a post-it note with optimistic update
  const deletePostItNote = async (id: string) => {
    // Skip server delete for temp notes that haven't been saved
    const isTemp = id.startsWith("temp-");
    if (isTemp) {
      utils.sessions.getSessionNotes.setData({ sessionId }, (old = []) => {
        return old.filter((note) => note.id !== id);
      });
      return;
    }

    // Optimistically update the UI
    utils.sessions.getSessionNotes.setData({ sessionId }, (old = []) => {
      return old.filter((note) => note.id !== id);
    });

    try {
      await deleteNoteMutation.mutateAsync({
        noteId: id,
      });

      // Invalidate to get fresh data
      await utils.sessions.getSessionNotes.invalidate({ sessionId });
    } catch (error) {
      // Revert optimistic update on error
      await utils.sessions.getSessionNotes.invalidate({ sessionId });
      console.error("Failed to delete note:", error);
    }
  };

  // Clear any stale temp notes on mount
  useEffect(() => {
    if (!isLoading && serverNotes.length > 0) {
      utils.sessions.getSessionNotes.setData({ sessionId }, (old = []) => {
        return old.filter((note) => !note.id.startsWith("temp-"));
      });
    }
  }, [
    isLoading,
    serverNotes.length,
    sessionId,
    utils.sessions.getSessionNotes,
  ]);

  return {
    postItNotes,
    regularNotes,
    isLoading,
    addPostItNote,
    updatePostItNote,
    deletePostItNote,
  };
}
