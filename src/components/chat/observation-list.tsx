import { motion } from "framer-motion";
import { Eye, Info } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface ObservationListProps {
  observations: Array<{
    observation: string;
    topicTitle?: string;
    confidence?: number;
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

export function ObservationList({
  observations,
  className,
}: ObservationListProps) {
  if (!observations?.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Info className="h-4 w-4" />
        <span>No observations found</span>
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
      {observations.map((obs, index) => (
        <motion.div
          key={`${obs.observation.substring(0, 20)}-${index}`}
          variants={itemVariants}
          className="rounded-md border border-border/50 bg-background/50 p-3 transition-colors hover:border-primary/20"
        >
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Eye className="mt-0.5 h-4 w-4 text-primary" />
                <p className="text-sm">{obs.observation}</p>
              </div>

              {obs.confidence && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {(obs.confidence * 100).toFixed(0)}%
                </Badge>
              )}
            </div>

            {obs.topicTitle && (
              <div className="text-xs text-muted-foreground">
                From topic: {obs.topicTitle}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
