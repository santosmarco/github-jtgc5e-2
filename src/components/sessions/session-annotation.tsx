"use client";

import { AnimatePresence, motion } from "framer-motion";
import _ from "lodash";
import {
  ArrowRight,
  Bookmark,
  Calendar,
  CheckSquare,
  FileText,
  Goal,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";

export interface SessionAnnotationProps {
  annotations: (Tables<"session_annotations"> & {
    sources: Tables<"session_annotation_sources">[];
  })[];
  className?: string;
}

export default function SessionAnnotation({
  annotations,
  className,
}: SessionAnnotationProps): JSX.Element {
  // Animation variants with improved physics
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for smooth entrance
        staggerChildren: 0.08,
      },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 25,
        mass: 0.8,
      },
    },
  };

  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 25,
        delay: 0.1,
      },
    },
  };

  const sourceVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 25,
        delay: 0.15 + i * 0.05,
      },
    }),
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

  // Function to get icon for source type
  const getSourceIcon = (sourceType: string) => {
    const iconProps = {
      className: "h-3 w-3",
      style: { transformOrigin: "center" },
    };

    switch (sourceType) {
      case "goal":
        return <Goal {...iconProps} />;
      case "session_topic":
      case "meeting_topic":
        return <MessageSquare {...iconProps} />;
      case "session_action_item":
      case "meeting_action_item":
        return <CheckSquare {...iconProps} />;
      case "moment":
        return <Bookmark {...iconProps} />;
      case "transcript_excerpt":
        return <Calendar {...iconProps} />;
      default:
        return <ArrowRight {...iconProps} />;
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-2 px-4 pb-4 pt-2", className)}
    >
      {/* Title with subtle animation */}
      <motion.div
        className="mb-4 flex items-center gap-1.5"
        initial={{ opacity: 0, y: -10 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 500,
            damping: 25,
          },
        }}
      >
        <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase leading-none text-muted-foreground">
          <motion.div
            initial={{ rotate: -5, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 25,
              delay: 0.2,
            }}
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </motion.div>
          Suggested Topics
        </h4>
      </motion.div>

      {/* List with improved animations */}
      <div className="relative space-y-2 rounded-lg">
        <AnimatePresence>
          {annotations.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {annotations.map((annotation, index) => (
                <motion.div
                  key={annotation.id}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  className="group flex flex-col gap-2 rounded-lg border bg-background/50 p-3 shadow-sm"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Subtle background gradient */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/5 to-transparent opacity-30" />

                  <div className="relative z-10 flex items-center gap-4">
                    <motion.div variants={badgeVariants}>
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
                                    word.charAt(0).toUpperCase() +
                                    word.slice(1),
                                )
                                .join(" "),
                            )
                          : "Unknown"}
                      </Badge>
                    </motion.div>
                    <motion.div className="flex-1 text-left text-sm font-medium">
                      {annotation.title || "Untitled"}
                    </motion.div>
                  </div>

                  {annotation.sources && annotation.sources.length > 0 && (
                    <motion.div
                      className="relative z-10 mt-2 flex flex-wrap gap-1.5"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: 1,
                        transition: {
                          delay: 0.1,
                          duration: 0.3,
                        },
                      }}
                    >
                      {annotation.sources.map((source, i) => (
                        <motion.div
                          key={source.id}
                          custom={i}
                          variants={sourceVariants}
                        >
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1 bg-muted/50 text-xs"
                          >
                            {getSourceIcon(source.source_type)}
                            <span className="max-w-[120px] truncate">
                              {source.source_type.split("_").join(" ")}
                            </span>
                          </Badge>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  delay: 0.2,
                  duration: 0.5,
                  ease: "easeOut",
                },
              }}
              className="flex items-center justify-center py-8"
            >
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <motion.div
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    scale: [0.95, 1.05, 0.95],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                >
                  <FileText className="h-4 w-4 text-primary opacity-70" />
                </motion.div>
                No annotations available
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
