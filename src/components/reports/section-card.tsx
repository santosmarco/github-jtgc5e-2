"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Enums } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";

type Direction = Enums<"goal_signal_direction_type"> | null;

interface Section {
  id: string;
  title: string | null;
  summary: string | null;
  direction: Direction;
}

interface SectionCardProps {
  section: Section;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  isAdmin: boolean;
  hasMoments: boolean;
}

export const SectionCard = ({
  section,
  index,
  isSelected,
  onSelect,
  isAdmin,
  hasMoments,
}: SectionCardProps): JSX.Element => {
  const isPositive = section.direction === "positive";

  const getDirectionalStyles = (isPositive: boolean) => ({
    hoverBorder: isPositive
      ? "hover:border-primary/70"
      : "hover:border-amber-500/70",
    selectedBg: isPositive
      ? "border-primary/70 bg-primary/5"
      : "border-amber-500/70 bg-amber-500/5",
    hoverText: isPositive
      ? "group-hover:text-primary"
      : "group-hover:text-amber-500",
    selectedText: isPositive
      ? "font-semibold text-primary"
      : "font-semibold text-amber-500",
    borderColor: isPositive ? "border-l-primary" : "border-l-amber-500",
    accentColor: isPositive
      ? "hsl(217.2 91.2% 57%)"
      : "hsl(37.7deg, 92.1%, 50.2%)",
  });

  const styles = getDirectionalStyles(isPositive);

  // Animation variants
  const cardVariants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.2,
        delay: index * 0.05,
        ease: "easeOut",
      },
    },
  };

  const borderVariants = {
    initial: {
      scaleY: 0,
      backgroundColor: styles.accentColor,
      originY: 0,
    },
    hover: {
      scaleY: 1,
      backgroundColor: styles.accentColor,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
    selected: {
      scaleY: 1,
      backgroundColor: styles.accentColor,
    },
  };

  const indicatorVariants = {
    initial: { opacity: 0, x: -5 },
    hover: { opacity: 1, x: 2, scale: 1.15 },
    selected: { opacity: 1, x: 0 },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      className="relative"
    >
      <motion.div
        className={cn(
          "group relative w-full overflow-hidden",
          isSelected && styles.selectedBg,
        )}
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
          className={cn(
            "relative flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md border-transparent px-4 py-3.5 text-left transition-all",
            styles.hoverBorder,
            isSelected && styles.selectedBg,
          )}
        >
          {/* Left vertical line animation */}
          <motion.div
            variants={borderVariants}
            className={cn(
              "absolute bottom-0 left-0 top-0 w-[0.1875rem] border-y border-l",
              styles.borderColor,
            )}
          />

          <div className="-mr-6 w-full">
            <div className="relative flex items-start justify-between">
              <Tooltip open={isAdmin ? undefined : false}>
                <TooltipTrigger asChild>
                  <h3
                    className={cn(
                      "mb-1 w-full pb-1 text-left text-base font-medium leading-none transition-all",
                      styles.hoverText,
                      isSelected && styles.selectedText,
                    )}
                  >
                    {section.title}
                  </h3>
                </TooltipTrigger>
                <TooltipContent align="start">{section.id}</TooltipContent>
              </Tooltip>
            </div>
            <p
              className={cn(
                "text-pretty break-words pr-8 text-sm leading-snug transition-all",
                isSelected ? "text-foreground/90" : "text-muted-foreground",
                "group-hover:text-foreground/80",
              )}
            >
              {section.summary}
            </p>
          </div>

          <motion.div
            variants={indicatorVariants}
            className="flex-shrink-0 text-muted-foreground"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-all",
                isSelected && "text-foreground",
              )}
            />
          </motion.div>
        </motion.button>
      </motion.div>

      {isAdmin && !hasMoments && (
        <span className="absolute right-2 top-2 h-4 px-1 py-0 text-[11px] text-muted-foreground">
          Hidden
        </span>
      )}
    </motion.div>
  );
};
