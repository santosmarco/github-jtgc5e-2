"use client";

import { AnimatePresence, motion } from "framer-motion";
import { List } from "lucide-react";
import type { SetOptional } from "type-fest";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";

export type MeetingTopicsProps = {
  topics: SetOptional<
    Pick<
      Tables<"meeting_topics">,
      "id" | "title" | "summary" | "vtt_start_segment_id"
    >,
    "vtt_start_segment_id"
  >[];
  onTopicClick?: (
    topic: SetOptional<
      Pick<
        Tables<"meeting_topics">,
        "id" | "title" | "summary" | "vtt_start_segment_id"
      >,
      "vtt_start_segment_id"
    >,
  ) => void;
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

export function MeetingTopics({ topics, onTopicClick }: MeetingTopicsProps) {
  if (!topics.length) return null;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Header bar (fixed) */}
      <div className="sticky top-0 z-10 flex h-9 flex-shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 py-2 text-sm backdrop-blur">
        <div className="flex items-center gap-x-2">
          <List className="h-4 w-4 text-primary" />
          <span className="font-medium leading-none">Meeting Topics</span>
        </div>
        {topics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-primary/10 bg-primary/15 px-1 text-xs font-medium text-primary"
          >
            {topics.length}
          </motion.div>
        )}
      </div>
      {/* List content (scrollable) */}
      <motion.div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4 pt-4">
        <AnimatePresence>
          {topics.map((topic, index) => (
            <Tooltip key={topic.id}>
              <TooltipTrigger asChild>
                <motion.div
                  variants={itemVariants}
                  className="group/topic-card relative flex items-start gap-3 rounded-md py-1.5 transition-colors hover:bg-accent/50"
                  onClick={() => onTopicClick?.(topic)}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                      delay: index * 0.1,
                    }}
                    className="relative flex h-5 w-5 shrink-0 select-none items-center justify-center"
                  >
                    <div className="absolute inset-0 rounded-full border border-border/50 bg-muted transition-all duration-300 group-hover/topic-card:scale-105 group-hover/topic-card:from-primary/30 group-hover/topic-card:to-primary/20" />
                    <span className="relative text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <motion.h4
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className={cn(
                          "text-sm font-medium group-hover/topic-card:text-primary",
                          onTopicClick && "cursor-pointer",
                        )}
                      >
                        {topic.title}
                      </motion.h4>
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-0.5 line-clamp-2 text-sm text-muted-foreground"
                    >
                      {topic.summary}
                    </motion.p>
                  </div>
                  {/* Animated gradient background */}
                  <motion.div
                    className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 transition-opacity group-hover/topic-card:opacity-100"
                    initial={false}
                    animate={{
                      opacity: [0, 0.5, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  />
                </motion.div>
              </TooltipTrigger>
              <TooltipContent
                align="start"
                side="right"
                sideOffset={2}
                className="max-w-[300px] whitespace-pre-wrap text-sm"
              >
                {topic.summary}
              </TooltipContent>
            </Tooltip>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
