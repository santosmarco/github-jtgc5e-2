"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ListIcon } from "lucide-react";

import { CollapsibleSection } from "~/components/chat/collapsible-section";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";

export type MeetingTopicsProps = {
  topics: Tables<"meeting_topics">[];
  onTopicClick?: (topic: Tables<"meeting_topics">) => void;
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
    <CollapsibleSection
      title="Topics Discussed"
      icon={ListIcon}
      count={topics.length}
    >
      <AnimatePresence>
        <motion.div className="space-y-2 pb-4">
          {topics.map((topic, index) => (
            <Tooltip key={topic.id}>
              <TooltipTrigger asChild>
                <motion.div
                  variants={itemVariants}
                  className="group relative flex items-start gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
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
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 transition-all duration-300 group-hover:scale-105 group-hover:from-primary/30 group-hover:to-primary/20" />
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
                          "text-sm font-medium group-hover:text-primary",
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
                      className="mt-0.5 line-clamp-3 text-sm text-muted-foreground"
                    >
                      {topic.summary}
                    </motion.p>
                  </div>

                  {/* Animated gradient background */}
                  <motion.div
                    className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 transition-opacity group-hover:opacity-100"
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
        </motion.div>
      </AnimatePresence>
    </CollapsibleSection>
  );
}
