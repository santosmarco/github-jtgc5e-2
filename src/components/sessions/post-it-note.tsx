"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  AnimatePresence,
  type PanInfo,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit2,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Paperclip,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { useResizeObserver } from "~/hooks/use-resize-observer";

// Initialize dayjs plugins
dayjs.extend(relativeTime);

// Enhanced note color options with refined visual properties
export const NOTE_COLORS = {
  yellow: {
    bg: "bg-gradient-to-br from-amber-50/90 to-amber-100/90 dark:from-amber-900/30 dark:to-amber-800/20",
    border: "border-amber-200/70 dark:border-amber-700/40",
    shadow: "shadow-amber-200/30 dark:shadow-amber-900/10",
    text: "text-amber-950 dark:text-amber-100",
    handle: "bg-amber-200/80 dark:bg-amber-800/60",
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-50/90 to-blue-100/90 dark:from-blue-900/30 dark:to-blue-800/20",
    border: "border-blue-200/70 dark:border-blue-700/40",
    shadow: "shadow-blue-200/30 dark:shadow-blue-900/10",
    text: "text-blue-950 dark:text-blue-100",
    handle: "bg-blue-200/80 dark:bg-blue-800/60",
  },
  green: {
    bg: "bg-gradient-to-br from-emerald-50/90 to-emerald-100/90 dark:from-emerald-900/30 dark:to-emerald-800/20",
    border: "border-emerald-200/70 dark:border-emerald-700/40",
    shadow: "shadow-emerald-200/30 dark:shadow-emerald-900/10",
    text: "text-emerald-950 dark:text-emerald-100",
    handle: "bg-emerald-200/80 dark:bg-emerald-800/60",
  },
  pink: {
    bg: "bg-gradient-to-br from-pink-50/90 to-pink-100/90 dark:from-pink-900/30 dark:to-pink-800/20",
    border: "border-pink-200/70 dark:border-pink-700/40",
    shadow: "shadow-pink-200/30 dark:shadow-pink-900/10",
    text: "text-pink-950 dark:text-pink-100",
    handle: "bg-pink-200/80 dark:bg-pink-800/60",
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-50/90 to-purple-100/90 dark:from-purple-900/30 dark:to-purple-800/20",
    border: "border-purple-200/70 dark:border-purple-700/40",
    shadow: "shadow-purple-200/30 dark:shadow-purple-900/10",
    text: "text-purple-950 dark:text-purple-100",
    handle: "bg-purple-200/80 dark:bg-purple-800/60",
  },
};

export type NoteColor = keyof typeof NOTE_COLORS;

export interface PostItNoteProps {
  id: string;
  content: string;
  author: {
    id: string;
    nickname?: string | null;
    avatar_url?: string | null;
  };
  createdAt: string;
  position: { x: number; y: number };
  color: NoteColor;
  zIndex: number;
  minimized?: boolean;
  attachmentUrl?: string | null;
  onUpdate: (id: string, updates: Partial<PostItNoteData>) => void;
  onDelete: (id: string) => void;
  isCurrentUser: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  bringToFront: (id: string) => void;
  isNewNote?: boolean;
}

export interface PostItNoteData {
  id: string;
  content: string;
  author: {
    id: string;
    nickname?: string | null;
    avatar_url?: string | null;
  };
  createdAt: string;
  position: { x: number; y: number };
  color: NoteColor;
  zIndex: number;
  minimized?: boolean;
  attachmentUrl?: string | null;
}

export default function PostItNote({
  id,
  content,
  author,
  createdAt,
  position,
  color,
  zIndex,
  minimized = false,
  attachmentUrl = null,
  onUpdate,
  onDelete,
  isCurrentUser,
  containerRef,
  bringToFront,
  isNewNote = false,
}: PostItNoteProps) {
  // State for editing mode and content
  const [isEditing, setIsEditing] = useState(isNewNote && isCurrentUser);
  const [editedContent, setEditedContent] = useState(content);
  const [isMinimized, setIsMinimized] = useState(minimized);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCoords, setDragStartCoords] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);

  // Refs for DOM elements and measurements
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const menuOpen = useRef<boolean>(false);
  const editorActionsRef = useRef<HTMLDivElement>(null);
  const doubleClickTimer = useRef<NodeJS.Timeout | null>(null);

  // Motion values for dragging
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);

  // Subtle rotation based on position for a natural feel
  const rotate = useTransform<number, number>(
    [x, y],
    ([latestX, latestY]) =>
      (((latestX ?? 0) * 0.005 + (latestY ?? 0) * 0.005) % 2) - 1,
  );

  // Track window resize and container changes
  const { width: containerWidth, height: containerHeight } =
    useResizeObserver(containerRef);

  // Update position when props change - improved sync with MotionValues
  useEffect(() => {
    // Only update motion values if they differ from current position
    // This prevents potential conflicts during drag operations
    if (position.x !== x.get() || position.y !== y.get()) {
      x.set(position.x);
      y.set(position.y);
    }
  }, [position.x, position.y, x, y]);

  // Sync content from props when not editing
  useEffect(() => {
    if (!isEditing) {
      setEditedContent(content);
    }
  }, [content, isEditing]);

  // Set focus on textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      // Small delay to ensure render is complete
      const focusTimer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            editedContent.length,
            editedContent.length,
          );
        }
      }, 50);

      return () => clearTimeout(focusTimer);
    }
  }, [isEditing, editedContent]);

  // Recalculate position constraints when container size changes
  useEffect(() => {
    if (containerWidth && containerHeight && noteRef.current) {
      ensureNoteWithinBounds();
    }
  }, [containerWidth, containerHeight]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (doubleClickTimer.current) {
        clearTimeout(doubleClickTimer.current);
      }
    };
  }, []);

  // Double click detection with proper cleanup
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isCurrentUser || isEditing || isDragging) return;

      e.stopPropagation();
      e.preventDefault();

      // If clicking on the header area, don't enter edit mode
      if (handleRef.current?.contains(e.target as Node)) return;

      setIsEditing(true);
    },
    [isCurrentUser, isEditing, isDragging],
  );

  // Format the time as relative (e.g., "5 minutes ago")
  const formattedTime = dayjs(createdAt).fromNow();

  // Ensure note stays within container bounds
  const ensureNoteWithinBounds = useCallback(() => {
    if (!containerRef.current) return;

    const containerBounds = containerRef.current.getBoundingClientRect();
    const noteBounds = noteRef.current?.getBoundingClientRect();

    if (!noteBounds) return;

    const padding = 10;
    const maxX = containerBounds.width - noteBounds.width - padding;
    const maxY =
      containerBounds.height - (isMinimized ? 40 : noteBounds.height) - padding;

    const newX = Math.max(padding, Math.min(position.x, maxX));
    const newY = Math.max(padding, Math.min(position.y, maxY));

    if (newX !== position.x || newY !== position.y) {
      x.set(newX);
      y.set(newY);
      onUpdate(id, { position: { x: newX, y: newY } });
    }
  }, [position.x, position.y, isMinimized, id, onUpdate, x, y, containerRef]);

  const handleDragStart = (event: MouseEvent | TouchEvent | PointerEvent) => {
    if (menuOpen.current) return;
    if (isEditing) return;

    setIsDragging(true);
    setHasMoved(false);
    bringToFront(id);

    // Record start coordinates for movement detection
    if ("clientX" in event) {
      setDragStartCoords({ x: event.clientX, y: event.clientY });
    }
  };

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    // Check if actual movement occurred (prevent accidental mini-drags)
    const movedSignificantly =
      Math.abs(info.offset.x) > 5 || Math.abs(info.offset.y) > 5;
    setHasMoved(movedSignificantly);
    setIsDragging(false);

    // Skip position updates for negligible movement
    if (!movedSignificantly) return;

    // Get container bounds
    const containerBounds = containerRef.current?.getBoundingClientRect();
    const noteBounds = noteRef.current?.getBoundingClientRect();

    if (containerBounds && noteBounds) {
      // Get container padding from computed style
      let paddingLeft = 0;
      let paddingTop = 0;

      if (containerRef.current) {
        const computedStyle = window.getComputedStyle(containerRef.current);
        paddingLeft = Number.parseInt(computedStyle.paddingLeft) || 0;
        paddingTop = Number.parseInt(computedStyle.paddingTop) || 0;
      }

      // Calculate new position, ensuring note stays within container bounds
      // Use the motion values current position as the source of truth
      let newX = x.get() + info.offset.x;
      let newY = y.get() + info.offset.y;

      console.log({ x, y, info });

      // Constrain to container bounds with some padding
      const safetyPadding = 10;
      const maxX =
        containerBounds.width - noteBounds.width - paddingLeft - safetyPadding;
      const maxY =
        containerBounds.height -
        (isMinimized ? 40 : noteBounds.height) -
        paddingTop -
        safetyPadding;

      console.log(newX, newY, maxX, maxY, containerBounds, noteBounds);

      newX = Math.max(safetyPadding, Math.min(newX, maxX));
      newY = Math.max(safetyPadding, Math.min(newY, maxY));

      // Update motion values immediately for responsive feel
      x.set(newX);
      y.set(newY);

      // Update position in parent component state
      if (newX !== position.x || newY !== position.y) {
        onUpdate(id, { position: { x: newX, y: newY } });
      }
    }
  };

  const handleSaveEdit = useCallback(() => {
    // Strip only trailing whitespace but preserve intentional line breaks
    const trimmedContent = editedContent.replace(/\s+$/, "");

    if (trimmedContent !== content) {
      onUpdate(id, { content: trimmedContent });
    }

    setIsEditing(false);
  }, [editedContent, content, id, onUpdate]);

  const handleCancelEdit = useCallback(() => {
    setEditedContent(content);
    setIsEditing(false);
  }, [content]);

  const handleToggleMinimize = useCallback(() => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    onUpdate(id, { minimized: newMinimized });
  }, [isMinimized, id, onUpdate]);

  const handleChangeColor = useCallback(
    (newColor: NoteColor) => {
      onUpdate(id, { color: newColor });
    },
    [id, onUpdate],
  );

  // Handle clicking on the note content with improved click detection
  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isCurrentUser || isEditing || isDragging || hasMoved) return;

      // If clicking on color buttons or time indicator, don't trigger edit
      if (
        e.target instanceof HTMLElement &&
        (e.target.closest("button") || e.target.closest(".time-indicator"))
      ) {
        return;
      }

      // Use a single click timer instead of tracking last click time
      if (doubleClickTimer.current) {
        clearTimeout(doubleClickTimer.current);
        doubleClickTimer.current = null;

        // This is a double click
        if (!handleRef.current?.contains(e.target as Node)) {
          e.stopPropagation();
          setIsEditing(true);
        }
      } else {
        // This might be a single click or the first click of a double click
        doubleClickTimer.current = setTimeout(() => {
          doubleClickTimer.current = null;
          // If this was just a single click, it expires here - no action
        }, 250); // 250ms is a standard double-click threshold
      }
    },
    [isCurrentUser, isEditing, isDragging, hasMoved],
  );

  // Handle keyboard navigation for content area
  const handleContentKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isCurrentUser || isEditing) return;

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsEditing(true);
      }
    },
    [isCurrentUser, isEditing],
  );

  // Handle textarea blur with improved safety
  const handleTextareaBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Don't process if relatedTarget is within the note (like clicking save/cancel buttons)
      if (noteRef.current?.contains(e.relatedTarget as Node)) {
        return;
      }

      // If clicking away while editing, save the content
      handleSaveEdit();
    },
    [handleSaveEdit],
  );

  // Handle keyboard events in textarea
  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Enter without shift should save and close
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit();
      }
      // Escape should cancel
      else if (e.key === "Escape") {
        e.preventDefault();
        handleCancelEdit();
      }
      // Tab navigation within the note
      else if (e.key === "Tab") {
        if (editorActionsRef.current) {
          const buttons = editorActionsRef.current.querySelectorAll("button");
          if (buttons.length > 0) {
            if (!e.shiftKey) {
              e.preventDefault();
              (buttons[0] as HTMLButtonElement).focus();
            }
          }
        }
      }
    },
    [handleSaveEdit, handleCancelEdit],
  );

  // Handle dropdown menu open/close
  const handleMenuOpenChange = useCallback((open: boolean) => {
    menuOpen.current = open;
  }, []);

  // Animation variants with refined transitions
  const noteVariants = {
    initial: {
      opacity: 0,
      scale: 0.8,
      rotate: -2,
    },
    animate: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 350,
        damping: 25,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      rotate: 2,
      transition: { duration: 0.15 },
    },
    hover: {
      boxShadow:
        "0 8px 20px -5px rgba(0, 0, 0, 0.1), 0 6px 8px -6px rgba(0, 0, 0, 0.1)",
      scale: 1.015,
      transition: { duration: 0.2 },
    },
    tap: {
      scale: 0.985,
      transition: { duration: 0.1 },
    },
  };

  const colorClasses = NOTE_COLORS[color];

  // Get file name from attachment URL
  const getFileName = useCallback(() => {
    if (!attachmentUrl) return null;

    try {
      // Extract the filename from the URL
      const url = new URL(attachmentUrl);
      const pathSegments = url.pathname.split("/");
      const fullFileName = pathSegments[pathSegments.length - 1] || "";

      // Extract just the original filename by removing the timestamp prefix if present
      const filenameMatch = fullFileName.match(/\d+-(.+)$/);
      return filenameMatch ? filenameMatch[1] : fullFileName;
    } catch (e) {
      return "Attachment";
    }
  }, [attachmentUrl]);

  const fileName = getFileName();

  return (
    <motion.div
      ref={noteRef}
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-md border shadow-md",
        colorClasses.bg,
        colorClasses.border,
        colorClasses.shadow,
        isDragging ? "shadow-lg" : "",
        isMinimized
          ? "h-8"
          : "max-h-[250px] min-h-[100px] w-[180px] sm:w-[220px]",
        isEditing ? "ring-2 ring-primary ring-opacity-70" : "",
      )}
      style={{
        x: x.get() - 300,
        y: y.get() - 100,
        rotate: isDragging ? 0 : rotate,
        zIndex,
      }}
      drag={!isEditing}
      dragMomentum={false}
      dragElastic={0.05}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => !isDragging && bringToFront(id)}
      onDoubleClick={handleDoubleClick}
      variants={noteVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={!isDragging && !isEditing ? "hover" : undefined}
      whileTap={!isEditing ? "tap" : undefined}
      transition={{ duration: 0.15 }}
      aria-label={`Note by ${author.nickname || "User"}`}
    >
      {/* Note Header */}
      <div
        ref={handleRef}
        className={cn(
          "flex items-center justify-between px-2 py-0.5",
          colorClasses.handle,
          !isEditing && "cursor-grab active:cursor-grabbing",
        )}
      >
        <div className="flex items-center gap-1">
          <Avatar className="h-5 w-5">
            {author.avatar_url ? (
              <AvatarImage
                src={author.avatar_url}
                alt={author.nickname || "User"}
              />
            ) : (
              <AvatarFallback className="text-[9px]">
                {author.nickname?.substring(0, 2) || "U"}
              </AvatarFallback>
            )}
          </Avatar>
          <span className="max-w-[100px] truncate text-xs font-medium">
            {author.nickname || "User"}
          </span>
        </div>

        <div className="flex items-center">
          {isCurrentUser && (
            <DropdownMenu onOpenChange={handleMenuOpenChange}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full p-0"
                  aria-label="Note options"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-3 w-3" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleToggleMinimize}>
                  {isMinimized ? (
                    <>
                      <ChevronDown className="mr-2 h-3 w-3" />
                      Expand
                    </>
                  ) : (
                    <>
                      <ChevronUp className="mr-2 h-3 w-3" />
                      Minimize
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400"
                  onClick={() => onDelete(id)}
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!isCurrentUser && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-full p-0"
              onClick={handleToggleMinimize}
              aria-label={isMinimized ? "Expand note" : "Minimize note"}
            >
              {isMinimized ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Note Content */}
      <AnimatePresence mode="wait">
        {!isMinimized && (
          <motion.div
            className="flex flex-1 flex-col p-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {isEditing ? (
              <div className="flex h-full flex-col gap-1.5">
                <Textarea
                  ref={textareaRef}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  onBlur={handleTextareaBlur}
                  onKeyDown={handleTextareaKeyDown}
                  className={cn(
                    "flex-1 resize-none border-none bg-transparent p-0 text-xs focus-visible:ring-0",
                    colorClasses.text,
                    "placeholder:text-foreground/50",
                  )}
                  style={{
                    color: "inherit",
                  }}
                  placeholder="Write your note..."
                  autoFocus
                  aria-label="Note content"
                />
                <div ref={editorActionsRef} className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 rounded-sm px-1.5 py-0 text-[10px]"
                    onClick={handleCancelEdit}
                    aria-label="Cancel editing"
                    type="button"
                  >
                    <X className="mr-1 h-2.5 w-2.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-5 rounded-sm bg-blue-600 px-1.5 py-0 text-[10px] hover:bg-blue-700"
                    onClick={handleSaveEdit}
                    aria-label="Save note"
                    type="button"
                  >
                    <Check className="mr-1 h-2.5 w-2.5" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <p
                  ref={contentRef}
                  className={cn(
                    "whitespace-pre-wrap text-xs font-medium",
                    colorClasses.text,
                    isCurrentUser && "cursor-text",
                    editedContent.trim() === "" && "italic opacity-70",
                  )}
                  style={{
                    color: "inherit",
                  }}
                  onClick={handleContentClick}
                  onKeyDown={isCurrentUser ? handleContentKeyDown : undefined}
                  tabIndex={isCurrentUser ? 0 : -1}
                  role={isCurrentUser ? "button" : undefined}
                  aria-label={
                    isCurrentUser ? "Double-click to edit note" : undefined
                  }
                >
                  {content.trim() === "" ? "Empty note" : content}
                </p>

                {/* File Attachment */}
                {attachmentUrl && attachmentUrl !== "pending" && (
                  <div className="mt-1 flex items-center rounded-md border border-muted/40 bg-muted/20 p-1.5 text-[10px] transition-colors hover:bg-muted/30">
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center gap-1.5 text-xs text-foreground/90 no-underline transition-colors hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileText className="h-3 w-3 flex-shrink-0" />
                      <span className="flex-1 truncate">
                        {fileName || "Attachment"}
                      </span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-60" />
                    </a>
                  </div>
                )}

                {attachmentUrl === "pending" && (
                  <div className="mt-1 flex items-center rounded-md border border-muted/40 bg-muted/20 p-1.5 text-[10px]">
                    <div className="flex w-full items-center gap-1.5 text-xs text-foreground/90">
                      <Paperclip className="h-3 w-3 flex-shrink-0 animate-pulse" />
                      <span className="flex-1 truncate italic">
                        Uploading attachment...
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between">
                  <span className="time-indicator text-[10px] opacity-70">
                    {formattedTime}
                  </span>

                  {isCurrentUser && (
                    <div className="flex gap-0.5">
                      {Object.keys(NOTE_COLORS).map((noteColor) => (
                        <button
                          key={noteColor}
                          type="button"
                          className={cn(
                            "z-10 h-2.5 w-2.5 rounded-full border",
                            NOTE_COLORS[noteColor as NoteColor].bg,
                            NOTE_COLORS[noteColor as NoteColor].border,
                            color === noteColor ? "ring-1 ring-offset-1" : "",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChangeColor(noteColor as NoteColor);
                          }}
                          aria-label={`Change to ${noteColor} color`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
