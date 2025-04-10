import { motion } from "framer-motion";
import { BookText, Info, Tag, Users } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface EntityListProps {
  entities: Array<{
    name: string;
    type: string;
    description: string;
    observations?: string[];
    topicTitle?: string;
    confidence?: number;
    mentionCount?: number;
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

// Map entity types to appropriate icons
const getEntityIcon = (type: string) => {
  const normalizedType = type.toLowerCase();

  if (normalizedType.includes("person") || normalizedType.includes("people")) {
    return Users;
  }

  if (normalizedType.includes("project") || normalizedType.includes("task")) {
    return BookText;
  }

  return Tag;
};

export function EntityList({ entities, className }: EntityListProps) {
  if (!entities?.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Info className="h-4 w-4" />
        <span>No entities found</span>
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
      {entities.map((entity, index) => {
        const EntityIcon = getEntityIcon(entity.type);

        return (
          <motion.div
            key={`${entity.name}-${index}`}
            variants={itemVariants}
            className="rounded-md border border-border/50 bg-background/50 p-3 transition-colors hover:border-primary/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <EntityIcon className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">{entity.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {entity.type}
                  </Badge>
                  {(entity.confidence || entity.score) && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {((entity.confidence || entity.score || 0) * 100).toFixed(
                        0,
                      )}
                      %
                    </Badge>
                  )}
                  {entity.mentionCount !== undefined && (
                    <Badge
                      variant="outline"
                      className="ml-1 border-primary/20 text-xs"
                    >
                      {entity.mentionCount} mentions
                    </Badge>
                  )}
                </div>

                {entity.description && (
                  <p className="text-sm text-muted-foreground">
                    {entity.description}
                  </p>
                )}

                {entity.topicTitle && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Topic: {entity.topicTitle}
                  </div>
                )}

                {entity.observations && entity.observations.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Observations:
                    </p>
                    <ul className="ml-4 list-disc text-xs text-muted-foreground">
                      {entity.observations.slice(0, 3).map((observation, i) => (
                        <li
                          key={`${entity.name}-obs-${observation.substring(0, 15)}-${i}`}
                        >
                          {observation}
                        </li>
                      ))}
                      {entity.observations.length > 3 && (
                        <li className="italic">
                          + {entity.observations.length - 3} more observations
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
