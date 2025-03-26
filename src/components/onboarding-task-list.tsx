"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";

import { Progress } from "./ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface TaskListProps {
  tasks: RouterOutputs["onboarding"]["getTaskList"] | undefined;
}

export function TaskList({ tasks = [] }: TaskListProps) {
  const completedTasks = tasks.filter((task) => task.completed).length;
  const progress = (completedTasks / tasks.length) * 100;

  return (
    <AnimatePresence>
      {tasks.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col border-t border-border bg-gradient-to-b from-background to-background/80 px-6 py-4"
        >
          <div className="space-y-4">
            <div className="space-y-2.5">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Start exploring
              </h2>

              <div className="space-y-1.5">
                <Progress value={progress} className="h-1" />
                <p className="text-xs text-muted-foreground">
                  {completedTasks} of {tasks.length} completed
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {tasks.map((task) => (
                  <TooltipProvider key={task.name}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={{ duration: 0.15 }}
                          className="group relative flex w-full cursor-default items-center gap-2.5 rounded-sm py-1 outline-none"
                        >
                          <div
                            className={`relative flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-colors ${
                              task.completed
                                ? "bg-primary"
                                : "bg-secondary hover:bg-secondary/80"
                            }`}
                          >
                            <AnimatePresence>
                              {task.completed && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.15 }}
                                >
                                  <Check className="h-2 w-2 text-primary-foreground" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <span
                            className={`text-xs transition-colors ${
                              task.completed
                                ? "text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {task.title}
                          </span>
                        </motion.div>
                      </TooltipTrigger>
                      {task.description && (
                        <TooltipContent
                          side="right"
                          className="max-w-[280px] border border-border bg-popover text-[11px] leading-normal text-popover-foreground"
                        >
                          {task.description}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
