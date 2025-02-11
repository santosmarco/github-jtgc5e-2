"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Check, Goal, Pencil, PlusCircle } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
import { type RouterOutputs, api } from "~/trpc/react";

import { createConfettiEmitter } from "~/lib/confetti";
import { GoalProgressCard } from "./goal-progress-card";

export type GoalCardProps = {
  goal: RouterOutputs["goals"]["getGoals"][number];
  onGoalComplete?: (goalId: string) => Promise<void>;
  onGoalEdit?: (
    goal: Tables<"goals"> & { signals: Tables<"goal_signals">[] },
  ) => Promise<void>;
  className?: string;
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

const iconVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
};

export function GoalCard({
  goal,
  onGoalComplete,
  onGoalEdit,
  className,
}: GoalCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const completeButtonRef = useRef<HTMLButtonElement>(null);

  const isCompleted = Boolean(goal.completed_at);
  const utils = api.useUtils();

  const handleComplete = async () => {
    setIsCompleting(true);

    try {
      await onGoalComplete?.(goal.id);

      const button = completeButtonRef.current;
      if (button) {
        const rect = button.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        const confetti = createConfettiEmitter({ x, y });
        void confetti.fireDefault();
      }
    } finally {
      setIsCompleting(false);
    }
  };

  const signalCounts = goal.signals.reduce(
    (acc, signal) => {
      if (signal.direction === "positive") acc.positive++;
      if (signal.direction === "negative") acc.negative++;
      return acc;
    },
    { positive: 0, negative: 0 },
  );

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-[1fr,350px] gap-4 overflow-visible border-b border-border pb-4"
    >
      <motion.div
        className={cn(
          "group relative h-full overflow-visible transition-all",
          className,
        )}
      >
        <Card className="flex h-full flex-col overflow-visible border-none bg-transparent pb-6 pl-0 pr-6">
          <div className="flex h-full flex-col justify-between space-y-4 overflow-visible">
            <div className="space-y-4 overflow-visible">
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <motion.div variants={iconVariants}>
                    <Goal
                      className={cn(
                        "h-5 w-5 shrink-0 text-primary",
                        isCompleted && "text-emerald-500",
                      )}
                    />
                  </motion.div>
                  <motion.h3
                    variants={itemVariants}
                    className="text-lg font-semibold"
                  >
                    {goal.text}
                  </motion.h3>
                </div>
              </motion.div>

              {goal.user_provided_context ? (
                <motion.p
                  variants={itemVariants}
                  className="text-sm text-muted-foreground"
                >
                  {goal.user_provided_context}
                </motion.p>
              ) : (
                !goal.completed_at && (
                  <motion.button
                    onClick={() => onGoalEdit?.(goal)}
                    variants={itemVariants}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="group/add-context relative -ml-[0.34375rem] flex w-[calc(100%+0.6875rem)] cursor-pointer items-center gap-2 rounded-md border border-dashed bg-muted/5 px-3 py-2 transition-colors hover:border-primary/25 hover:bg-primary/5"
                    style={{
                      borderColor: "hsl(var(--muted))",
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-md bg-primary/10"
                      animate={{
                        opacity: [0, 0.5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-md border border-dashed border-primary/80"
                      animate={{
                        opacity: [0.2, 1, 0.2],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                        delay: 0.5,
                      }}
                    />
                    <PlusCircle className="relative h-4 w-4 text-muted-foreground transition-colors group-hover/add-context:text-primary" />
                    <span className="relative text-sm text-muted-foreground transition-colors group-hover/add-context:text-primary">
                      Add context to help track this goal
                    </span>
                  </motion.button>
                )
              )}
            </div>

            <motion.div
              variants={itemVariants}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <motion.div
                  variants={itemVariants}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <div className="flex items-center gap-0.5">
                    <ArrowUpRight className="-mb-0.5 h-4 w-4 text-emerald-500" />
                    <span className="font-medium text-emerald-500">
                      {signalCounts.positive}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    positive signal{signalCounts.positive === 1 ? "" : "s"}
                  </span>
                </motion.div>
                <motion.div
                  variants={itemVariants}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <div className="flex items-center gap-0.5">
                    <ArrowUpRight className="-mb-0.5 h-4 w-4 rotate-90 text-red-500" />
                    <span className="font-medium text-red-500">
                      {signalCounts.negative}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    negative signal{signalCounts.negative === 1 ? "" : "s"}
                  </span>
                </motion.div>
              </div>

              {isCompleted ? (
                <motion.span
                  variants={itemVariants}
                  className="text-sm text-muted-foreground"
                >
                  Completed at{" "}
                  {new Date(goal.completed_at ?? "").toLocaleDateString()}
                </motion.span>
              ) : (
                <motion.div
                  variants={itemVariants}
                  className="flex items-center gap-2"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onGoalEdit?.(goal)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit goal</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        ref={completeButtonRef}
                        size="icon"
                        variant="secondary"
                        onClick={handleComplete}
                        className="h-8 w-8"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark as complete</TooltipContent>
                  </Tooltip>
                </motion.div>
              )}
            </motion.div>
          </div>
        </Card>
      </motion.div>

      <GoalProgressCard goal={goal} />
    </motion.div>
  );
}
