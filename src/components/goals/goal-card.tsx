"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Check, Goal, Pencil, PlusCircle } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
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

      // Only fire confetti after successful completion
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

  // Count positive and negative signals
  const signalCounts = goal.signals.reduce(
    (acc, signal) => {
      if (signal.direction === "positive") acc.positive++;
      if (signal.direction === "negative") acc.negative++;
      return acc;
    },
    { positive: 0, negative: 0 },
  );

  console.log(goal);

  return (
    <div className="grid grid-cols-[1fr,350px] gap-4 border-b border-border pb-4">
      <motion.div
        className={cn(
          "group relative h-full overflow-hidden transition-all",
          className,
        )}
      >
        <Card className="flex h-full flex-col border-none bg-transparent p-6">
          <div className="flex h-full flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Goal
                    className={cn(
                      "h-5 w-5 shrink-0 text-primary",
                      isCompleted && "text-emerald-500",
                    )}
                  />
                  <h3 className="text-lg font-semibold">{goal.text}</h3>
                </div>
              </div>

              {goal.user_provided_context ? (
                <p className="text-sm text-muted-foreground">
                  {goal.user_provided_context}
                </p>
              ) : (
                <motion.button
                  onClick={() => onGoalEdit?.(goal)}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-dashed border-muted bg-muted/5 px-3 py-2 transition-colors hover:border-muted-foreground/25 hover:bg-muted/10"
                >
                  <PlusCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Add context to help track this goal
                  </span>
                </motion.button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {signalCounts.positive > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <div className="flex items-center gap-0.5">
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                      <span className="font-medium text-emerald-500">
                        {signalCounts.positive}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      positive signals
                    </span>
                  </div>
                )}
                {signalCounts.negative > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <div className="flex items-center gap-0.5">
                      <ArrowUpRight className="h-4 w-4 rotate-90 text-red-500" />
                      <span className="font-medium text-red-500">
                        {signalCounts.negative}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      negative signals
                    </span>
                  </div>
                )}
              </div>

              {isCompleted ? (
                <span className="text-sm text-muted-foreground">
                  Completed at{" "}
                  {new Date(goal.completed_at ?? "").toLocaleDateString()}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onGoalEdit?.(goal)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    ref={completeButtonRef}
                    size="icon"
                    variant="secondary"
                    onClick={handleComplete}
                    className="h-8 w-8"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <GoalProgressCard goal={goal} />
    </div>
  );
}
