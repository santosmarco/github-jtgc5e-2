"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  FileHeart,
  FileUp,
  Plus,
  Sparkles,
  StickyNote,
  Paperclip,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "~/components/ui/context-menu";
import { useProfile } from "~/hooks/use-profile";
import { useSessionNotes, type FileUpload } from "~/hooks/use-session-notes";
import { cn } from "~/lib/utils";
import PostItNote, { type NoteColor, NOTE_COLORS } from "./post-it-note";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

interface PostItContainerProps {
  sessionId: string;
  className?: string;
}

export default function PostItContainer({
  sessionId,
  className,
}: PostItContainerProps) {
  const { postItNotes, addPostItNote, updatePostItNote, deletePostItNote } =
    useSessionNotes(sessionId);

  const { profile } = useProfile();

  const [selectedColor, setSelectedColor] = useState<NoteColor>("yellow");
  const [highestZIndex, setHighestZIndex] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddNote = () => {
    const newZIndex = highestZIndex + 1;
    setHighestZIndex(newZIndex);

    addPostItNote({
      content: "",
      position: clickPosition,
      color: selectedColor,
      zIndex: newZIndex,
      minimized: false,
    });
  };

  // Handle file selection through input
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;

    await handleFileUpload(file, clickPosition);

    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file upload
  const handleFileUpload = async (
    file: File,
    position: { x: number; y: number },
  ) => {
    try {
      setIsUploading(true);

      const newZIndex = highestZIndex + 1;
      setHighestZIndex(newZIndex);

      // Convert file to base64
      const base64Data = await fileToBase64(file);

      // Create file upload object
      const fileUpload: FileUpload = {
        name: file.name,
        type: file.type,
        base64Data,
      };

      // Create note with file attachment
      const fileNote = {
        content: `File: ${file.name}`,
        position,
        color: selectedColor,
        zIndex: newZIndex,
        minimized: false,
        file: fileUpload,
      };

      await addPostItNote(fileNote);
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Expose file input to context menu
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleContextMenuTrigger = (e: React.MouseEvent) => {
    const containerBounds = containerRef.current?.getBoundingClientRect();
    if (!containerBounds) return;

    // Get container padding from computed style
    let paddingLeft = 6;
    let paddingTop = 6;

    if (containerRef.current) {
      const computedStyle = window.getComputedStyle(containerRef.current);
      paddingLeft = Number.parseInt(computedStyle.paddingLeft) || 6;
      paddingTop = Number.parseInt(computedStyle.paddingTop) || 6;
    }

    // Calculate position within the container, accounting for padding
    // and ensuring we're using the same coordinate system as the motion values
    const x = e.clientX - containerBounds.left - paddingLeft;
    const y = e.clientY - containerBounds.top - paddingTop;

    setClickPosition({ x, y });
  };

  const bringToFront = (id: string) => {
    const newZIndex = highestZIndex + 1;
    setHighestZIndex(newZIndex);
    updatePostItNote(id, { zIndex: newZIndex });
    setActiveNoteId(id);
  };

  const handleNoteInteraction = (id: string) => {
    setActiveNoteId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const containerBounds = containerRef.current?.getBoundingClientRect();
    if (!containerBounds) return;

    // Get container padding from computed style
    let paddingLeft = 6;
    let paddingTop = 6;

    if (containerRef.current) {
      const computedStyle = window.getComputedStyle(containerRef.current);
      paddingLeft = Number.parseInt(computedStyle.paddingLeft) || 6;
      paddingTop = Number.parseInt(computedStyle.paddingTop) || 6;
    }

    // Calculate position within the container, accounting for padding
    // and ensuring we're using the same coordinate system as the motion values
    const x = e.clientX - containerBounds.left - paddingLeft;
    const y = e.clientY - containerBounds.top - paddingTop;

    // Process files one by one with a small delay between them
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      const position = {
        x: x + i * 20,
        y: y + i * 20,
      };

      // Wait for each file to upload before moving to the next
      await handleFileUpload(file, position);

      // Small delay between uploads
      if (i < files.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const emptyStateIconVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
    hover: {
      scale: 1.05,
      rotate: [0, -5, 5, -5, 0],
      transition: {
        duration: 0.5,
        ease: "easeInOut",
      },
    },
  };

  const emptyStateTextVariants = {
    initial: { opacity: 0, y: 10 },
    animate: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.2 + custom * 0.1,
        duration: 0.4,
      },
    }),
  };

  const dropOverlayVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />

      <ContextMenu>
        <ContextMenuTrigger asChild onContextMenu={handleContextMenuTrigger}>
          <motion.div
            ref={containerRef}
            className={cn(
              "relative mx-4 my-4 flex h-full w-[calc(100%-2rem)] items-center justify-center overflow-hidden rounded-md border border-dashed border-muted-foreground/20 bg-gradient-to-br from-background/80 to-muted/20 p-6 backdrop-blur-sm transition-all duration-300",
              isDragging &&
                "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10",
              className,
            )}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            tabIndex={-1}
            style={{
              position: "relative",
              minHeight: "300px",
            }}
          >
            {/* Title positioned at top left */}
            <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5">
              <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                Notes & Discussion
              </h4>
              <div className="flex items-center gap-1.5">
                {postItNotes.length > 0 && (
                  <div className="flex items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0 text-xs font-normal text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-400">
                    <StickyNote className="mr-1 h-3 w-3" />
                    {postItNotes.length}
                  </div>
                )}
              </div>
            </div>

            {/* Upload button in top right corner */}
            <div className="absolute right-4 top-4 z-10">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 rounded-full"
                      onClick={triggerFileUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Paperclip className="h-3.5 w-3.5 animate-pulse" />
                      ) : (
                        <FileUp className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Upload file</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {postItNotes.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center">
                <motion.div
                  variants={emptyStateIconVariants}
                  initial="initial"
                  animate="animate"
                  whileHover="hover"
                  className="mb-2 rounded-full bg-muted/30 p-4 backdrop-blur-sm"
                >
                  <Sparkles className="h-12 w-12 text-primary/70" />
                </motion.div>

                <motion.p
                  variants={emptyStateTextVariants}
                  initial="initial"
                  animate="animate"
                  custom={0}
                  className="mb-2 text-center text-lg font-medium leading-tight text-foreground"
                >
                  Capture your coaching insights
                </motion.p>

                <motion.p
                  variants={emptyStateTextVariants}
                  initial="initial"
                  animate="animate"
                  custom={1}
                  className="text-xs leading-tight text-muted-foreground"
                >
                  Right-click anywhere to add a note
                </motion.p>

                <motion.p
                  variants={emptyStateTextVariants}
                  initial="initial"
                  animate="animate"
                  custom={2}
                  className="-mt-0.5 text-xs leading-tight text-muted-foreground"
                >
                  or drag and drop files here
                </motion.p>
              </div>
            )}

            <AnimatePresence>
              {postItNotes.map((note) => (
                <PostItNote
                  key={note.id}
                  {...note}
                  onUpdate={(id, updates) => {
                    updatePostItNote(id, updates);
                    handleNoteInteraction(id);
                  }}
                  onDelete={deletePostItNote}
                  isCurrentUser={note.author.id === profile?.id}
                  containerRef={containerRef}
                  bringToFront={bringToFront}
                  isNewNote={note.id.startsWith("temp-")}
                />
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {isDragging && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm"
                  variants={dropOverlayVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <motion.div
                    className="rounded-xl bg-card p-8 shadow-2xl"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                        transition: {
                          repeat: Number.POSITIVE_INFINITY,
                          duration: 1.5,
                          ease: "easeInOut",
                        },
                      }}
                    >
                      <FileUp className="mx-auto mb-3 h-12 w-12 text-primary" />
                    </motion.div>
                    <p className="mb-2 text-center text-lg font-medium leading-tight text-foreground">
                      Drop files to create notes
                    </p>
                    <p className="text-center text-xs leading-tight text-muted-foreground">
                      Release to add them to your board
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-64">
          <div className="mb-2 px-2 py-1.5">
            <h4 className="text-sm font-medium">Add Note</h4>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.keys(NOTE_COLORS).map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "h-6 w-6 rounded-full border transition-all hover:scale-110",
                    NOTE_COLORS[color as NoteColor].bg,
                    NOTE_COLORS[color as NoteColor].border,
                    selectedColor === color
                      ? "ring-2 ring-primary ring-offset-2"
                      : "",
                  )}
                  onClick={() => setSelectedColor(color as NoteColor)}
                  aria-label={`Select ${color} color`}
                />
              ))}
            </div>
          </div>
          <ContextMenuItem
            className="flex w-full items-center"
            onSelect={handleAddNote}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Add Note Here</span>
          </ContextMenuItem>
          <ContextMenuItem
            className="flex w-full items-center"
            onSelect={triggerFileUpload}
          >
            <Paperclip className="mr-2 h-4 w-4" />
            <span>Upload File Here</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}
