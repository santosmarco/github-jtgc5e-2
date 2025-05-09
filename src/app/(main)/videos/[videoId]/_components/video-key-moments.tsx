"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { orderBy } from "lodash";
import { FilterIcon } from "lucide-react";
import { useCallback, useMemo } from "react";

import { Badge } from "~/components/ui/badge";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
  activeCategory: string;
  onCategoryChange: (category: string) => void;
};

function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  if (categories.length === 0) return null;

  return (
    <Tabs
      value={activeCategory}
      onValueChange={onCategoryChange}
      className="mb-6"
    >
      <ScrollArea className="pb-2">
        <TabsList className="inline-flex h-10 items-center justify-start gap-2 rounded-full bg-muted/50 p-1">
          {categories.map((category) => (
            <TabsTrigger
              key={category.value}
              value={category.value}
              className="relative inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {category.label}
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary-foreground/90 data-[state=active]:bg-primary-foreground/20">
                {category.count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </Tabs>
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
      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory ?? "all"}
        onCategoryChange={setActiveCategory}
      />

      <ScrollArea className="flex-1 pr-2">
        {sortedMoments.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div
            className="space-y-4"
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
