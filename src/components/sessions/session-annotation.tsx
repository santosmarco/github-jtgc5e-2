"use client";

import { motion } from "framer-motion";
import _ from "lodash";
import { FileText } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";

export interface SessionAnnotationProps {
  annotations: Tables<"session_annotations">[];
  className?: string;
}

export default function SessionAnnotation({
  annotations,
  className,
}: SessionAnnotationProps): JSX.Element {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
      },
    },
  };

  // Function to determine badge color based on type
  const getBadgeColor = (type: string | null): "primary" | "success" | null => {
    switch (type) {
      case "past_session":
        return "primary";
      case "new":
        return "success";
      default:
        return null;
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-2 px-4 pb-4 pt-2", className)}
    >
      {/* Title */}
      <div className="mb-4 flex items-center gap-1.5">
        <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase leading-none text-muted-foreground">
          <FileText className="h-4 w-4 text-primary/70" />
          Suggested Topics
        </h4>
      </div>

      {/* List */}
      <div className="relative space-y-2 rounded-lg">
        {annotations.length > 0 ? (
          <motion.div
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {annotations.map((annotation, index) => (
              <motion.div
                key={annotation.id}
                variants={rowVariants}
                className="group flex flex-col gap-2 rounded-lg border bg-background/50 p-3 shadow-sm transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center justify-between gap-4">
                  <Badge
                    variant="outline"
                    color={getBadgeColor(annotation.type)}
                    size="sm"
                    className="shrink-0"
                  >
                    {annotation.type
                      ? _.upperFirst(
                          annotation.type
                            .split("_")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1),
                            )
                            .join(" "),
                        )
                      : "Unknown"}
                  </Badge>
                  <div className="flex-1 truncate text-sm font-medium">
                    {annotation.title || "Untitled"}
                  </div>
                  {annotation.source_type && (
                    <div className="truncate text-sm text-muted-foreground">
                      {annotation.source_type}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">
              No annotations available
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
