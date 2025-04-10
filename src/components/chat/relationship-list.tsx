import { motion } from "framer-motion";
import { ArrowRight, Info, Link } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface RelationshipListProps {
  relationships: Array<{
    relationship: string;
    subject?: string;
    object?: string;
    otherEntity?: string;
    isSubject?: boolean;
    observations?: string[];
    topicTitle?: string;
    topicId?: string;
    confidence?: number;
    score?: number;
  }>;
  entityName?: string;
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

export function RelationshipList({
  relationships,
  entityName,
  className,
}: RelationshipListProps) {
  if (!relationships?.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Info className="h-4 w-4" />
        <span>No relationships found</span>
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
      {relationships.map((rel, index) => {
        // Handle different relationship data structures
        const mainEntity =
          entityName || (rel.isSubject ? rel.subject : rel.object);
        const relatedEntity =
          rel.isSubject !== undefined
            ? rel.isSubject
              ? rel.otherEntity
              : rel.otherEntity
            : rel.subject && rel.object
              ? entityName === rel.subject
                ? rel.object
                : rel.subject
              : rel.otherEntity;

        return (
          <motion.div
            key={`${rel.relationship}-${mainEntity}-${relatedEntity}-${index}`}
            variants={itemVariants}
            className="rounded-md border border-border/50 bg-background/50 p-3 transition-colors hover:border-primary/20"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{mainEntity}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      {rel.relationship}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{relatedEntity}</span>
                  </div>

                  {(rel.confidence || rel.score) && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {((rel.confidence || rel.score || 0) * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </div>

              {rel.topicTitle && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Link className="h-3 w-3" />
                  Topic: {rel.topicTitle}
                </div>
              )}

              {rel.observations && rel.observations.length > 0 && (
                <div className="mt-1 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Observations:
                  </p>
                  <ul className="ml-4 list-disc text-xs text-muted-foreground">
                    {rel.observations
                      .slice(0, 2)
                      .map((observation, obsIndex) => (
                        <li key={`${index}-obs-${obsIndex}`}>{observation}</li>
                      ))}
                    {rel.observations.length > 2 && (
                      <li className="italic">
                        + {rel.observations.length - 2} more observations
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
