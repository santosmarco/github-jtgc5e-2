"use client";

import dayjs from "dayjs";
import { AnimatePresence, motion, stagger } from "framer-motion";
import {
  CheckCircleIcon,
  GoalIcon,
  Loader2Icon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { forwardRef, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { createConfettiEmitter } from "~/lib/confetti";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";

import { GoalSignal } from "./goal-signal";

export type GoalCardMode = "view" | "edit" | "muted";

export type GoalCardProps = {
  goal: Tables<"goals"> & { signals: Tables<"goal_signals">[] };
  mode: GoalCardMode;
  onGoalTextEditComplete?: (goalId: string, newText: string) => void;
  onGoalComplete?: (goalId: string) => void;
  onGoalDelete?: (goalId: string) => void;
  onGoalEdit?: (
    goal: Tables<"goals"> & { signals: Tables<"goal_signals">[] },
  ) => void;
};

export const GoalCard = forwardRef<HTMLDivElement, GoalCardProps>(
  (
    {
      goal,
      mode,
      onGoalTextEditComplete,
      onGoalComplete,
      onGoalDelete,
      onGoalEdit,
    },
    ref,
  ) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(goal.text);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const completeButtonRef = useRef<HTMLButtonElement>(null);

    const isCompleted = Boolean(goal.completed_at);

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

    const handleEdit = () => {
      onGoalEdit?.(goal);
    };

    const handleDelete = () => {
      onGoalDelete?.(goal.id);
      setShowDeleteDialog(false);
    };

    return (
      <>
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Goal</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this goal? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <motion.div
          ref={ref}
          key={goal.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: mode === "muted" ? 0.5 : 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
          className="mb-4"
        >
          <Card
            className={cn(
              "overflow-hidden bg-card shadow-md transition-shadow duration-300 hover:shadow-lg",
              mode === "edit" && "border-primary",
              mode === "muted" && "pointer-events-none",
              isCompleted && "border-primary",
              isCompleting && "pointer-events-none opacity-80",
            )}
          >
            <CardHeader className="p-4 px-5">
              <CardTitle className="flex items-center justify-between">
                <div className="flex h-6 flex-grow items-center gap-2">
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative h-5 w-5 flex-shrink-0"
                  >
                    <GoalIcon
                      className={cn(
                        "absolute h-5 w-5",
                        isCompleted ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <div
                      className="absolute bottom-0 h-5 w-5 overflow-hidden"
                      style={{
                        height: isCompleted ? "100%" : `${goal.progress ?? 0}%`,
                      }}
                    >
                      <GoalIcon className="h-5 w-5 text-primary" />
                    </div>
                  </motion.div>
                  <motion.div
                    key="text"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="flex-1 text-base"
                  >
                    {goal.text}
                  </motion.div>
                </div>

                {isCompleted ? (
                  <div className="text-sm text-muted-foreground">
                    You completed this on{" "}
                    {dayjs(goal.completed_at).format("MMMM D, YYYY")}
                  </div>
                ) : (
                  mode !== "edit" &&
                  mode !== "muted" && (
                    <div className="flex items-center gap-x-3 pl-2">
                      <AnimatePresence>
                        {!isEditing && onGoalEdit && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: 0.2 }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleEdit}
                              className="h-4 w-4 p-0 transition-colors hover:bg-card hover:text-primary"
                              disabled={isEditing || isCompleting}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {onGoalComplete && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: 0.3 }}
                        >
                          <Button
                            ref={completeButtonRef}
                            variant="ghost"
                            size="sm"
                            onClick={handleComplete}
                            className={cn(
                              "h-4 w-4 p-0 transition-colors hover:bg-card hover:text-emerald-700 hover:dark:text-emerald-400",
                              isCompleting &&
                                "text-primary disabled:text-primary",
                            )}
                            disabled={isEditing || isCompleting}
                          >
                            {isCompleting ? (
                              <Loader2Icon className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircleIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </motion.div>
                      )}
                      {onGoalDelete && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: 0.4 }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteDialog(true)}
                            className="h-4 w-4 p-0 transition-colors hover:bg-card hover:text-destructive"
                            disabled={isEditing || isCompleting}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  )
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2 px-4 pb-4">
              {goal.signals.map((signal, index) => (
                <motion.div
                  key={signal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{
                    duration: 0.2,
                    delay: stagger(0.1, { startDelay: 0.2 })(
                      index,
                      goal.signals.length,
                    ),
                  }}
                  className="flex-shrink-0"
                >
                  <GoalSignal index={index} data={signal} />
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </>
    );
  },
);
GoalCard.displayName = "GoalCard";
