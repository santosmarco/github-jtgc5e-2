"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { orderBy } from "lodash";
import { ChevronDown, FilterIcon, Sparkles } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/shared";

import { useVideoMoments } from "./hooks/use-video-moments";
import { MomentCard } from "./moment-card";

type VideoMoment = RouterOutputs["videos"]["getOne"]["moments"][number];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      when: "beforeChildren",
    },
  },
} as const satisfies Variants;

type EmptyStateProps = {
  message?: string;
};

function EmptyState({
  message = "No moments match the current filter criteria",
}: EmptyStateProps) {
  return (
    <motion.div
      key="empty-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <FilterIcon className="mb-2 h-10 w-10 text-muted-foreground/50" />
      <h3 className="text-lg font-medium">No moments found</h3>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </motion.div>
  );
}

type CategoryFilterProps = {
  categories: Array<{ value: string; label: string; count: number }>;
  activeCategory: string | undefined;
  onCategoryChange: (category: string | undefined) => void;
};

function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  if (categories.length === 0) return null;

  const activeItem = categories.find((cat) => cat.value === activeCategory);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="group flex h-7 items-center gap-1 bg-background/70 px-2 text-xs hover:bg-accent/40"
        >
          {activeItem ? activeItem.label : "All Activities"}

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-primary/10 bg-primary/15 px-1 text-xs font-medium text-primary"
          >
            {activeItem?.count ||
              categories.reduce((acc, cat) => acc + cat.count, 0)}
          </motion.div>

          <ChevronDown className="-mr-1 ml-1 size-4 transition duration-200 group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={2} className="min-w-48">
        {categories.map((category) => (
          <DropdownMenuItem
            key={category.value}
            onClick={() => onCategoryChange(category.value)}
            className={cn(
              "flex items-center justify-between text-xs",
              category.value === activeCategory && "font-semibold text-primary",
            )}
          >
            <span>{category.label}</span>
            <span className="ml-2 rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {category.count >= 10 ? "" : " "}
              {category.count}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onClick={() => onCategoryChange(categories[0]?.value)}
          className="mt-1 text-xs text-muted-foreground"
        >
          Show All
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type VideoKeyMomentsProps = {
  moments: VideoMoment[];
  onJumpToMoment: (timeInSeconds: number) => void;
};

export function VideoKeyMoments({
  moments,
  onJumpToMoment,
}: VideoKeyMomentsProps) {
  const { categories, activeCategory, setActiveCategory, filteredMoments } =
    useVideoMoments(moments);

  // Sort moments by reaction score, relevance, and timestamp
  const sortedMoments = useMemo(() => {
    return orderBy(
      filteredMoments,
      [
        // Primary sort: Reaction score (thumbs up vs thumbs down)
        (m) => {
          if (!Array.isArray(m.reactions)) return 0;

          return m.reactions.reduce(
            (acc, r) => acc + (r.reaction_type === "thumbs_up" ? -1 : 1),
            0,
          );
        },
        // Secondary sort: Relevance (relevant moments first)
        (m) => !m.relevant,
        // Tertiary sort: Timestamp in video (chronological)
        (m) => m.segment_start_timestamp_in_seconds || 0,
      ],
      ["asc", "asc", "asc"], // Lower reaction scores (more thumbs up), relevant first, earlier timestamps first
    );
  }, [filteredMoments]);

  const handleJumpToMoment = useCallback(
    (moment: VideoMoment) => {
      if (moment.segment_start_timestamp_in_seconds) {
        onJumpToMoment(moment.segment_start_timestamp_in_seconds);
      }
    },
    [onJumpToMoment],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header bar (fixed) */}
      <div className="sticky top-0 z-10 flex h-9 flex-shrink-0 items-center justify-between gap-2 border-b border-border bg-background/80 px-2 py-1 pl-4 text-sm backdrop-blur">
        <div className="flex items-center gap-x-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium leading-none">Key Moments</span>
        </div>
        <div className="flex items-center gap-2">
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory ?? categories[0]?.value}
            onCategoryChange={setActiveCategory}
          />
        </div>
      </div>

      {/* List content */}
      <ScrollArea className="flex-1 px-2 pb-12">
        {sortedMoments.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            className="space-y-2 pb-8 pt-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="wait">
              {sortedMoments.map((moment, index) => (
                <MomentCard
                  key={moment.id}
                  moment={moment}
                  index={index}
                  onJumpToMoment={handleJumpToMoment}
                  className="w-full"
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </ScrollArea>
    </div>
  );
}
