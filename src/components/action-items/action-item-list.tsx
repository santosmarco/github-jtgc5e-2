"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ListTodo, PlusCircle, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CollapsibleSection } from "~/components/chat/collapsible-section";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { ActionItemCard } from "./action-item-card";
import { ActionItemForm } from "./action-item-form";

export type ActionItemListProps = {
  videoId: string;
};

export function ActionItemList({ videoId }: ActionItemListProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [optimisticDeletes, setOptimisticDeletes] = useState(new Set<string>());
  const [optimisticCompletions, setOptimisticCompletions] = useState(
    new Map<string, boolean>(),
  );

  const utils = api.useUtils();
  const { data: actionItems, isLoading } =
    api.actionItems.getByVideoId.useQuery({
      videoId,
    });

  const createActionItem = api.actionItems.create.useMutation({
    onSuccess: () => {
      void utils.actionItems.getByVideoId.invalidate();
      setIsCreating(false);
      toast.success("Action item created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create action item", {
        description: error.message,
      });
    },
  });

  const deleteActionItem = api.actionItems.delete.useMutation({
    onMutate: async (deleteInput) => {
      await utils.actionItems.getByVideoId.cancel();
      const previousItems = utils.actionItems.getByVideoId.getData({ videoId });
      setOptimisticDeletes((prev) => new Set([...prev, deleteInput.id]));
      return { previousItems };
    },
    onError: (error, deleteInput, context) => {
      setOptimisticDeletes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(deleteInput.id);
        return newSet;
      });
      if (context?.previousItems) {
        utils.actionItems.getByVideoId.setData(
          { videoId },
          context.previousItems,
        );
      }
      toast.error("Failed to delete action item", {
        description: error.message,
      });
    },
    onSuccess: () => {
      toast.success("Action item deleted successfully");
    },
    onSettled: () => {
      void utils.actionItems.getByVideoId.invalidate();
    },
  });

  const toggleComplete = api.actionItems.toggleComplete.useMutation({
    onMutate: async ({ id, completed }) => {
      await utils.actionItems.getByVideoId.cancel();
      const previousItems = utils.actionItems.getByVideoId.getData({
        videoId,
      });
      setOptimisticCompletions((prev) => new Map(prev).set(id, completed));
      return { previousItems };
    },
    onError: (error, { id }, context) => {
      setOptimisticCompletions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
      if (context?.previousItems) {
        utils.actionItems.getByVideoId.setData(
          { videoId },
          context.previousItems,
        );
      }
      toast.error("Failed to update action item", {
        description: error.message,
      });
    },
    onSettled: () => {
      void utils.actionItems.getByVideoId.invalidate();
    },
  });

  const handleCreateActionItem = async (values: {
    text: string;
    dueDate?: Date;
    assigneeIds: string[];
  }) => {
    await createActionItem.mutateAsync({
      videoId,
      text: values.text,
      dueDate: values.dueDate?.toISOString(),
      assigneeIds: values.assigneeIds,
    });
  };

  // Apply optimistic updates to items
  const processedItems = useMemo(() => {
    if (!actionItems) return [];

    return actionItems
      .filter((item) => !optimisticDeletes.has(item.id))
      .map((item) => ({
        ...item,
        completed_at: optimisticCompletions.has(item.id)
          ? optimisticCompletions.get(item.id)
            ? new Date().toISOString()
            : null
          : item.completed_at,
      }));
  }, [actionItems, optimisticDeletes, optimisticCompletions]);

  const activeItems = useMemo(
    () => processedItems.filter((item) => !item.completed_at) ?? [],
    [processedItems],
  );

  const completedItems = useMemo(
    () => processedItems.filter((item) => item.completed_at) ?? [],
    [processedItems],
  );

  const allItemsCompleted =
    processedItems.length > 0 && activeItems.length === 0;

  const headerActions = useMemo(() => {
    return (
      <div
        className="flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
          }
        }}
        role="presentation"
      >
        {activeItems.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary/15 px-1 text-xs font-medium text-primary"
              >
                {activeItems.length}
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="top" align="end">
              {activeItems.length} pending action
              {activeItems.length === 1 ? "" : "s"}
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-transparent"
              onClick={() => setIsCreating(true)}
            >
              <PlusCircle className="h-4 w-4 text-muted-foreground transition-colors hover:text-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" align="end">
            Add action item
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }, [activeItems.length]);

  return (
    <CollapsibleSection
      title="Action Items"
      icon={ListTodo}
      open={!isLoading && isOpen}
      onOpenChange={setIsOpen}
      headerActions={headerActions}
    >
      <div
        className={cn(
          "space-y-2 pb-4",
          ((allItemsCompleted && !showCompleted) ||
            (activeItems.length === 0 && completedItems.length === 0)) &&
            "pb-0",
        )}
      >
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "py-4 text-center",
              (activeItems.length !== 0 || completedItems.length !== 0) &&
                "pb-8",
            )}
          >
            <p className="text-sm text-muted-foreground">
              Loading action items...
            </p>
          </motion.div>
        ) : (
          <>
            <ActionItemForm
              isOpen={isCreating}
              onOpenChange={setIsCreating}
              onSubmit={handleCreateActionItem}
            />

            <AnimatePresence mode="popLayout">
              {activeItems.length === 0 && completedItems.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="py-4 text-center"
                >
                  <p className="text-sm text-muted-foreground">
                    No action items yet. Add your first one!
                  </p>
                </motion.div>
              )}

              {allItemsCompleted && !showCompleted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="py-4 text-center"
                >
                  <motion.div
                    initial={{ y: 20 }}
                    animate={{ y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                  >
                    <motion.div
                      animate={{
                        rotate: [0, -10, 10, -10, 10, 0],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                        repeatDelay: 2,
                      }}
                      className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
                    >
                      <Trophy className="h-6 w-6 text-primary" />
                    </motion.div>
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-2 text-base font-medium"
                  >
                    All items completed!
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-4 text-sm text-muted-foreground"
                  >
                    Great job! You've completed all your action items.
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCompleted(true)}
                      className="h-7"
                    >
                      Show completed items
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                <>
                  <div className="space-y-2">
                    {activeItems.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <ActionItemCard
                          item={item}
                          onDelete={() =>
                            deleteActionItem.mutate({ id: item.id })
                          }
                          onToggleComplete={(completed) =>
                            toggleComplete.mutate({ id: item.id, completed })
                          }
                        />
                      </motion.div>
                    ))}
                  </div>

                  {completedItems.length > 0 &&
                    (showCompleted || !allItemsCompleted) && (
                      <div className="space-y-2">
                        <div className="my-4 flex items-center gap-2">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-xs text-muted-foreground">
                            Completed
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>

                        {completedItems.map((item) => (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <ActionItemCard
                              item={item}
                              onDelete={() =>
                                deleteActionItem.mutate({ id: item.id })
                              }
                              onToggleComplete={(completed) =>
                                toggleComplete.mutate({
                                  id: item.id,
                                  completed,
                                })
                              }
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}
                </>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </CollapsibleSection>
  );
}
