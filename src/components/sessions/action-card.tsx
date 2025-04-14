"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { CalendarClock, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export type ActionCardProps = {
  item: Tables<"meeting_action_items"> & {
    assignees?: Array<{
      assignee: Tables<"entities">;
    }>;
  };
  index: number;
  dueDate?: string;
};

export default function ActionCard({
  item,
  index,
  dueDate,
}: ActionCardProps): JSX.Element {
  const [hovered, setHovered] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.3 });
  const utils = api.useUtils();

  // Extract text for the view
  const hasMoreText = item.text.split(" ").length > 6;
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Optimistic UI state
  const [optimisticCompleted, setOptimisticCompleted] = useState<
    boolean | null
  >(null);
  const [optimisticDeleted, setOptimisticDeleted] = useState<boolean>(false);

  // Determine if completed based on optimistic state or actual data
  const isCompleted =
    optimisticCompleted !== null ? optimisticCompleted : !!item.completed_at;

  const toggleCompleteMutation = api.actionItems.toggleComplete.useMutation({
    onMutate: async ({ completed }) => {
      // Set optimistic state
      setOptimisticCompleted(completed);

      // Cancel outgoing refetches
      await utils.actionItems.getByVideoId.cancel();

      // Return previous state for rollback
      return { previousCompleted: optimisticCompleted };
    },
    onSuccess: (_, { completed }) => {
      void utils.actionItems.getByVideoId.invalidate();
      toast.success(
        completed
          ? "Action item completed"
          : "Action item marked as incomplete",
      );
    },
    onError: (error, _, context) => {
      // Rollback to previous state
      setOptimisticCompleted(context?.previousCompleted ?? null);
      toast.error("Failed to update action item", {
        description: error.message,
      });
    },
    onSettled: () => {
      void utils.actionItems.getByVideoId.invalidate();
    },
  });

  const deleteActionItemMutation = api.actionItems.delete.useMutation({
    onMutate: async () => {
      // Set optimistic state
      setOptimisticDeleted(true);

      // Cancel outgoing refetches
      await utils.actionItems.getByVideoId.cancel();

      return { previousDeleted: false };
    },
    onSuccess: () => {
      void utils.actionItems.getByVideoId.invalidate();
      toast.success("Action item deleted");
    },
    onError: (error) => {
      // Rollback to previous state
      setOptimisticDeleted(false);
      toast.error("Failed to delete action item", {
        description: error.message,
      });
    },
    onSettled: () => {
      void utils.actionItems.getByVideoId.invalidate();
    },
  });

  const handleToggleComplete = (e: React.MouseEvent): void => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Set optimistic UI state immediately
    setOptimisticCompleted(!isCompleted);

    try {
      toggleCompleteMutation.mutate({
        id: item.id,
        completed: !isCompleted,
      });
    } catch (error) {
      // Revert optimistic update if there's an error
      setOptimisticCompleted(isCompleted);
    }
  };

  const handleDelete = (e: React.MouseEvent): void => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Set optimistic UI state immediately
    setOptimisticDeleted(true);

    try {
      deleteActionItemMutation.mutate({
        id: item.id,
      });
    } catch (error) {
      // Revert optimistic update if there's an error
      setOptimisticDeleted(false);
    }
  };

  // Don't render if optimistically deleted
  if (optimisticDeleted) {
    return <></>;
  }

  // Animation variants with optimized spring dynamics
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 1,
        delay: index * 0.05,
      },
    },
  };

  const checkVariants = {
    unchecked: {
      scale: 1,
      opacity: 0.7,
    },
    checked: {
      scale: 1,
      opacity: 1,
    },
    hover: {
      scale: 1.15,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 25,
      },
    },
    tap: {
      scale: 0.9,
      transition: {
        type: "spring",
        stiffness: 700,
        damping: 15,
      },
    },
  };

  const deleteVariants = {
    initial: { opacity: 0, x: 10 },
    hover: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
      },
    },
  };

  return (
    <TooltipProvider>
      <motion.article
        ref={cardRef}
        className={cn(
          "group relative flex items-start gap-2 rounded-lg border px-3 py-2.5 shadow-sm transition-all duration-200",
          isCompleted
            ? "border-emerald-200 bg-gradient-to-r from-emerald-50/90 to-emerald-100/50 dark:border-emerald-900/30 dark:from-emerald-900/10 dark:to-emerald-800/20"
            : "border-border/60 bg-card/95 hover:border-blue-200/50 hover:bg-blue-50/50 dark:hover:border-blue-900/20 dark:hover:bg-blue-900/10",
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={isCompleted ? "Completed action" : "Action item"}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={cardVariants}
      >
        {/* Status indicator */}
        <button
          type="button"
          className="relative z-20 mt-[0.0625rem] h-5 w-5 shrink-0 cursor-pointer"
          onClick={handleToggleComplete}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggleComplete(e as unknown as React.MouseEvent);
            }
          }}
          disabled={toggleCompleteMutation.isPending}
          aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
        >
          <motion.div
            initial={isCompleted ? "checked" : "unchecked"}
            animate={isCompleted ? "checked" : "unchecked"}
            whileHover="hover"
            whileTap="tap"
            variants={checkVariants}
            className={cn(
              "flex h-full w-full items-center justify-center rounded-full transition-colors",
              isCompleted
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:text-primary",
            )}
          >
            <AnimatePresence mode="wait">
              {isCompleted ? (
                <motion.div
                  key="checked"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="unchecked"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Circle className="h-3.5 w-3.5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </button>

        <div className="flex-1 pr-8">
          <button
            type="button"
            className={cn(
              "relative cursor-pointer overflow-hidden transition-all duration-200",
              isCompleted
                ? "text-emerald-700 line-through dark:text-emerald-400"
                : "group-hover:text-blue-700 dark:group-hover:text-blue-400",
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (hasMoreText) {
                setIsExpanded((curr) => !curr);
              }
            }}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (hasMoreText) {
                  setIsExpanded((curr) => !curr);
                }
              }
            }}
            aria-expanded={isExpanded}
          >
            <p className="text-left text-sm leading-relaxed tracking-normal">
              {item.text}
            </p>
          </button>

          {/* Assignees */}
          {item.assignees && item.assignees.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-1.5 flex flex-wrap gap-1"
            >
              {item.assignees.map(({ assignee }, idx) => (
                <motion.span
                  key={assignee.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {assignee.name}
                </motion.span>
              ))}
            </motion.div>
          )}

          {/* Due date with improved visual hierarchy */}
          {dueDate && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground/80">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>{dueDate}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-transparent hover:text-destructive group-hover:opacity-100"
          onClick={handleDelete}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleDelete(e as unknown as React.MouseEvent);
            }
          }}
          disabled={deleteActionItemMutation.isPending}
          aria-label="Delete action"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Trash2 className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={5}>
              <p>Delete action</p>
            </TooltipContent>
          </Tooltip>
        </button>
      </motion.article>
    </TooltipProvider>
  );
}
