"use client";

import { AnimatePresence, motion, useInView } from "framer-motion";
import { Check, Copy, Lightbulb, Sparkles, Star } from "lucide-react";
import { useRef, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

export type InsightCardProps = {
  insight: string;
  insightText: string;
  id: string;
  index: number;
  onToggleStar?: (id: string, isStarred: boolean) => void;
  isStarred?: boolean;
  showStarOnHover?: boolean;
};

export default function InsightCard({
  insight,
  insightText,
  id,
  index,
  onToggleStar,
  isStarred = false,
}: InsightCardProps): JSX.Element {
  const [hovered, setHovered] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.3 });

  // Extract first few words for the condensed view
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(insight).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleToggleStar = (): void => {
    onToggleStar?.(id, !isStarred);
  };

  // Animation variants with optimized spring dynamics
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 1,
        delay: index * 0.05,
      },
    },
  };

  const iconVariants = {
    initial: { scale: 1 },
    hover: {
      scale: 1.15,
      rotate: 5,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
      },
    },
    tap: { scale: 0.95, transition: { duration: 0.1 } },
  };

  const sparkleVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: [0, 1, 0],
      scale: [0.5, 1.2, 0.5],
      transition: {
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        repeatDelay: 3,
      },
    },
  };

  const copyButtonVariants = {
    initial: { opacity: 0, x: 10 },
    hover: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
      },
    },
  };

  return (
    <TooltipProvider>
      <article
        ref={cardRef}
        className={cn(
          "group relative rounded-lg border px-3 py-2 shadow-sm transition-all duration-200",
          isStarred
            ? "border-amber-200 bg-gradient-to-r from-amber-50/90 to-amber-100/50 dark:border-amber-900/30 dark:from-amber-900/10 dark:to-amber-800/20"
            : "border-border/60 bg-card/95 hover:border-amber-200/50 hover:bg-amber-50/50 dark:hover:border-amber-900/20 dark:hover:bg-amber-900/10",
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={isStarred ? "Starred insight" : "Insight"}
      >
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          whileHover="hover"
          whileTap="tap"
          variants={cardVariants}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <AnimatePresence initial={false} mode="wait">
                {hovered ? (
                  <motion.button
                    key="star-button"
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: -90 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full p-0 transition-all duration-300",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2",
                    )}
                    onClick={handleToggleStar}
                    aria-label={
                      isStarred ? "Remove from starred" : "Add to starred"
                    }
                  >
                    <Star
                      className={cn(
                        "h-3.5 w-3.5 transition-all duration-300",
                        isStarred
                          ? "fill-amber-500 stroke-amber-600 dark:fill-amber-400 dark:stroke-amber-400"
                          : "fill-transparent stroke-amber-600 dark:stroke-amber-400",
                      )}
                    />
                  </motion.button>
                ) : (
                  <motion.div
                    key="lightbulb"
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: -90 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                  >
                    <Lightbulb className="h-3.5 w-3.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1 pr-8">
              <button
                type="button"
                className={cn(
                  "relative cursor-pointer overflow-hidden transition-all duration-200",
                  "group-hover:text-amber-700 dark:group-hover:text-amber-400",
                )}
                onClick={() => setIsExpanded(!isExpanded)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIsExpanded(!isExpanded);
                  }
                }}
                aria-expanded={isExpanded}
              >
                <p className="text-left text-sm leading-relaxed tracking-normal">
                  {insight}
                </p>
                {isExpanded && (
                  <p className="mt-1 text-left text-xs text-muted-foreground">
                    {insightText}
                  </p>
                )}
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {isStarred && (
                <motion.button
                  variants={iconVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-amber-500"
                  onClick={handleToggleStar}
                  aria-label="Remove from starred"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-500 stroke-amber-600 dark:fill-amber-400 dark:stroke-amber-400" />
                </motion.button>
              )}

              <motion.div
                initial="initial"
                animate={hovered ? "hover" : "initial"}
                variants={copyButtonVariants}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      variants={iconVariants}
                      whileHover="hover"
                      whileTap="tap"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-amber-600"
                      onClick={handleCopy}
                      aria-label={
                        copied ? "Copied to clipboard" : "Copy to clipboard"
                      }
                    >
                      {copied ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 15,
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </motion.div>
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="left" sideOffset={5}>
                    <p>{copied ? "Copied!" : "Copy insight"}</p>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Decorative elements */}
        {isStarred && (
          <>
            <motion.div
              variants={sparkleVariants}
              initial="hidden"
              animate="visible"
              className="absolute -right-1 -top-1 text-amber-300 opacity-70 dark:text-amber-500/30"
              aria-hidden="true"
            >
              <Sparkles className="h-4 w-4" />
            </motion.div>

            <motion.div
              variants={sparkleVariants}
              initial="hidden"
              animate="visible"
              custom={1}
              className="absolute -bottom-1 -left-1 text-amber-300 opacity-70 dark:text-amber-500/30"
              style={{ animationDelay: "1s" }}
              aria-hidden="true"
            >
              <Sparkles className="h-3 w-3" />
            </motion.div>
          </>
        )}
      </article>
    </TooltipProvider>
  );
}
