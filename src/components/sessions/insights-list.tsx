"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Filter, PlusCircle, Sparkles, X } from "lucide-react";
import { useState } from "react";
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
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { useValidatedForm } from "~/hooks/use-validated-form";
import type { RouterOutputs } from "~/trpc/shared";

import InsightCard from "./insight-card";

export type Insight = {
  id: string;
  content: string;
  isStarred: boolean;
};

export type InsightsListProps = {
  insights: NonNullable<
    RouterOutputs["sessions"]["getAllSessionsForUser"][number]["meeting"]
  >["insights"];
  isLoading?: boolean;
  onAddInsight?: (content: string) => void;
  onToggleStar?: (id: string, isStarred: boolean) => void;
  maxInitialItems?: number;
};

const InsightFormSchema = z.object({
  content: z.string().min(1, "Insight content is required"),
});

type InsightFormValues = z.infer<typeof InsightFormSchema>;

export function InsightsList({
  insights = [],
  isLoading = false,
  onAddInsight,
  onToggleStar,
}: InsightsListProps): JSX.Element {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [starredInsights, setStarredInsights] = useState<
    Record<string, boolean>
  >({});
  const [filterStarred, setFilterStarred] = useState<boolean>(false);

  const form = useValidatedForm(InsightFormSchema, {
    defaultValues: {
      content: "",
    },
  });

  // Apply filters
  const filteredInsights = insights;

  const handleAddInsight = async (values: InsightFormValues): Promise<void> => {
    if (onAddInsight) {
      onAddInsight(values.content);
      setIsDialogOpen(false);
      form.reset();
    }
  };

  const handleToggleStar = (id: string, isStarred: boolean): void => {
    // Update local state for immediate feedback
    setStarredInsights((prev) => ({
      ...prev,
      [id]: isStarred,
    }));

    // Call the parent handler if provided
    if (onToggleStar) {
      onToggleStar(id, isStarred);
    }
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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={`insight-skeleton-${i}-${Math.random().toString(36).substring(2, 9)}`}
            className="h-12 w-full rounded-lg"
          />
        ))}
      </div>
    );
  }

  const toggleFilter = (): void => setFilterStarred(!filterStarred);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      {/* Header with filter options */}
      {insights.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="mb-2 flex h-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            {filterStarred && (
              <Badge
                variant="outline"
                className="flex items-center gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/10 dark:text-amber-400"
              >
                <Sparkles className="h-3 w-3" />
                Starred
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-1 h-4 w-4 rounded-full p-0 text-amber-700 hover:bg-amber-200/50 hover:text-amber-900 dark:text-amber-400 dark:hover:bg-amber-800/30"
                  onClick={() => setFilterStarred(false)}
                  aria-label="Clear starred filter"
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
                  className="h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none p-0 hover:bg-transparent focus-visible:ring-0"
                  aria-label="Filter options"
                >
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  className={
                    filterStarred ? "bg-amber-50 dark:bg-amber-900/10" : ""
                  }
                  onClick={toggleFilter}
                >
                  <Sparkles className="mr-2 h-3.5 w-3.5 text-amber-500" />
                  {filterStarred ? "Show all" : "Show starred"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              className="-ml-0.5 h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none p-0 text-amber-700/80 hover:bg-transparent focus-visible:ring-0 dark:text-amber-400/80"
              onClick={() => setIsDialogOpen(true)}
              aria-label="Add insight"
            >
              <PlusCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        {filteredInsights.length > 0 ? (
          filteredInsights.map((insight, index) => (
            <InsightCard
              key={insight.id}
              id={insight.id}
              insight={insight.title}
              insightText={insight.summary}
              index={index}
              isStarred={false}
              onToggleStar={handleToggleStar}
            />
          ))
        ) : (
          <motion.button
            variants={itemVariants}
            className="mt-2 w-full cursor-pointer rounded-lg border border-dashed border-muted-foreground/20 bg-muted/30 p-3 text-center text-muted-foreground/60 transition-colors hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-500/70"
            onClick={() => setIsDialogOpen(true)}
          >
            <p className="flex items-center justify-center gap-2 text-sm">
              {filterStarred ? (
                "No starred insights yet"
              ) : (
                <>
                  <span>No insights yet. Click to add one.</span>
                </>
              )}
            </p>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Add Insight Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Insight</DialogTitle>
            <DialogDescription>
              Add a new insight from this session.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleAddInsight)}
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
                      <FormLabel>Insight</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="What did you learn or discover?"
                          className="min-h-[100px]"
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
                        Add Insight
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
