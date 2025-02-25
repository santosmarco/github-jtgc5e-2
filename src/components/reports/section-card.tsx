"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, GoalIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Enums } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";

type SectionCardProps = {
  section: {
    id: string;
    title: string | null;
    summary: string | null;
    direction: Enums<"goal_signal_direction_type"> | null;
  };
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  isAdmin: boolean;
  hasMoments: boolean;
};

export const SectionCard = ({
  section,
  index,
  isSelected,
  onSelect,
  isAdmin,
  hasMoments,
}: SectionCardProps) => {
  const isPositive = section.direction === "positive";

  // Define variants for animations
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        delay: index * 0.1,
        ease: "easeOut",
      },
    },
  };

  const borderVariants = {
    initial: {
      scaleY: 0,
      backgroundColor: isPositive
        ? "rgba(16, 185, 129, 0.2)"
        : "rgba(245, 158, 11, 0.2)",
      originY: 0,
    },
    hover: {
      scaleY: 1,
      backgroundColor: isPositive
        ? "rgba(16, 185, 129, 1)"
        : "rgba(245, 158, 11, 1)",
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1], // Cubic bezier for more natural motion
      },
    },
    selected: {
      scaleY: 1,
      backgroundColor: isPositive
        ? "rgba(16, 185, 129, 1)"
        : "rgba(245, 158, 11, 1)",
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      className="relative"
    >
      <motion.div
        className="group relative w-full"
        initial="initial"
        whileHover="hover"
        animate={isSelected ? "selected" : "initial"}
      >
        <motion.button
          onClick={onSelect}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onSelect();
            }
          }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "relative w-full cursor-pointer overflow-hidden rounded-lg border px-5 py-3 text-left shadow-sm transition-all hover:shadow-md",
            isPositive
              ? "hover:border-emerald-500/70"
              : "hover:border-amber-500/70",
            isSelected &&
              (isPositive
                ? "border-emerald-500/70 bg-emerald-500/5"
                : "border-amber-500/70 bg-amber-500/5"),
          )}
        >
          {/* Left vertical line animation */}
          <motion.div
            variants={borderVariants}
            className={cn(
              "absolute bottom-0 left-0 top-0 w-1 border-l-emerald-500",
              isPositive && "border-l-amber-500",
            )}
          />

          {isAdmin && !hasMoments && (
            <Badge className="absolute right-3 top-2.5" variant="secondary">
              Hidden for the user
            </Badge>
          )}
          <Tooltip open={isAdmin ? undefined : false}>
            <TooltipTrigger>
              <h3
                className={cn(
                  "text-left font-semibold transition-all",
                  isPositive
                    ? "group-hover:text-emerald-500"
                    : "group-hover:text-amber-500",
                  isSelected &&
                    (isPositive
                      ? "font-semibold text-emerald-500"
                      : "font-semibold text-amber-500"),
                )}
              >
                {section.title}
              </h3>
            </TooltipTrigger>
            <TooltipContent align="start">{section.id}</TooltipContent>
          </Tooltip>
          <p
            className={cn(
              "mt-1.5 text-sm transition-all",
              "group-hover:opacity-100",
              isSelected ? "text-foreground/90" : "text-muted-foreground",
              "group-hover:text-foreground/80",
            )}
          >
            {section.summary}
          </p>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
