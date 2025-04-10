import { motion } from "framer-motion";
import { BookOpen, Info } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface TopicListProps {
  topics: Array<{
    topicId: string;
    title: string;
    score?: number;
  }>;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2 },
  },
};

export function TopicList({ topics, className }: TopicListProps) {
  if (!topics?.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Info className="h-4 w-4" />
        <span>No topics found</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-2", className)}
    >
      {topics.map((topic) => (
        <motion.div
          key={topic.topicId}
          variants={itemVariants}
          className="rounded-md border border-border/50 bg-background/50 p-3 transition-colors hover:border-primary/20"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h4 className="truncate font-medium">{topic.title}</h4>
            </div>

            {topic.score && (
              <Badge variant="secondary" className="text-xs">
                {(topic.score * 100).toFixed(0)}% match
              </Badge>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
