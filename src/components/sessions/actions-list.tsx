"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, Filter, PlusCircle, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { useValidatedForm } from "~/hooks/use-validated-form";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import ActionCard from "./action-card";

interface ActionsListProps {
  actions: readonly Tables<"meeting_action_items">[];
  videoId: string;
  isLoading?: boolean;
}

const ActionFormSchema = z.object({
  content: z.string().min(1, "Action item content is required"),
});

type ActionFormValues = z.infer<typeof ActionFormSchema>;

export function ActionsList({
  actions,
  videoId,
  isLoading = false,
}: ActionsListProps): JSX.Element {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [filterCompleted, setFilterCompleted] = useState<boolean | null>(null);

  const utils = api.useUtils();

  const { mutate: addActionItem } = api.actionItems.create.useMutation({
    onSuccess: () => {
      void utils.actionItems.getByVideoId.invalidate();
      toast.success("Action item added");
    },
    onError: (error) => {
      toast.error("Failed to add action item", {
        description: error.message,
      });
    },
  });

  const form = useValidatedForm(ActionFormSchema, {
    defaultValues: {
      content: "",
    },
  });

  // Apply filters
  const filteredActions =
    filterCompleted === null
      ? actions
      : actions.filter((action) => !!action.completed_at === filterCompleted);

  const handleAddAction = async (values: ActionFormValues): Promise<void> => {
    addActionItem({
      text: values.content,
      videoId: videoId,
    });
    setIsDialogOpen(false);
    form.reset();
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, delay: 0.2 },
    },
    hover: {
      scale: 1.02,
    },
    tap: {
      scale: 0.98,
    },
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={`action-skeleton-${i}-${Math.random().toString(36).substring(2, 9)}`}
            className="h-12 w-full rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      {/* Header with filter options */}
      {actions.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="mb-2 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            {filterCompleted !== null && (
              <Badge
                variant="outline"
                className={cn(
                  "flex items-center gap-1",
                  filterCompleted
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/30 dark:bg-emerald-900/10 dark:text-emerald-400"
                    : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/30 dark:bg-blue-900/10 dark:text-blue-400",
                )}
              >
                {filterCompleted ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Completed</span>
                  </>
                ) : (
                  <>
                    <Circle className="h-3.5 w-3.5" />
                    <span>Pending</span>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "ml-1 h-4 w-4 rounded-full p-0",
                    filterCompleted
                      ? "text-emerald-700 hover:bg-emerald-200/50 hover:text-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-800/30"
                      : "text-blue-700 hover:bg-blue-200/50 hover:text-blue-900 dark:text-blue-400 dark:hover:bg-blue-800/30",
                  )}
                  onClick={() => setFilterCompleted(null)}
                  aria-label="Clear filter"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>

          <div className="-mt-10 flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none p-0 hover:bg-transparent hover:text-muted-foreground/40 focus-visible:ring-0"
                  aria-label="Filter actions"
                >
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  className={
                    filterCompleted === false
                      ? "bg-blue-50 dark:bg-blue-900/10"
                      : ""
                  }
                  onClick={() =>
                    setFilterCompleted(filterCompleted === false ? null : false)
                  }
                >
                  <Circle className="mr-2 h-3.5 w-3.5 text-blue-500" />
                  <span>Show pending</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={
                    filterCompleted === true
                      ? "bg-emerald-50 dark:bg-emerald-900/10"
                      : ""
                  }
                  onClick={() =>
                    setFilterCompleted(filterCompleted === true ? null : true)
                  }
                >
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                  <span>Show completed</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              className="-ml-0.5 h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none p-0 text-blue-700 hover:bg-transparent focus-visible:ring-0 dark:text-blue-400"
              onClick={() => setIsDialogOpen(true)}
              aria-label="Add action item"
            >
              <PlusCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        {filteredActions.length > 0 ? (
          filteredActions.map((action) => (
            <ActionCard
              key={action.id}
              item={action}
              index={filteredActions.indexOf(action)}
            />
          ))
        ) : (
          <motion.button
            variants={itemVariants}
            className="mt-2 w-full cursor-pointer rounded-lg border border-dashed border-muted-foreground/20 bg-muted/30 p-3 text-center text-muted-foreground/60 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary/70"
            onClick={() => setIsDialogOpen(true)}
          >
            <p className="flex items-center justify-center gap-2 text-sm">
              {filterCompleted !== null ? (
                `No ${filterCompleted ? "completed" : "pending"} action items`
              ) : (
                <>
                  <span>No action items yet. Click to add one.</span>
                </>
              )}
            </p>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Add Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Action Item</DialogTitle>
            <DialogDescription>
              Add a new action item for this session.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleAddAction)}
              className="space-y-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Action Item</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="What needs to be done?"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={form.formState.isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="min-w-[80px]"
                >
                  <AnimatePresence mode="popLayout">
                    {form.formState.isSubmitting ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2"
                      >
                        <span>Adding...</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        Add Action
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
