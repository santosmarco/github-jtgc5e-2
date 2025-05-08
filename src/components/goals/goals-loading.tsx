"use client";

import { motion } from "framer-motion";
import { GoalIcon, Loader2Icon } from "lucide-react";

import { LOADING_ANIMATION_DURATION } from "./goal-animations";

export function GoalsLoading() {
  return (
    <div className="mt-20 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: LOADING_ANIMATION_DURATION }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <Loader2Icon className="h-8 w-8 animate-spin text-primary/20" />
          <GoalIcon className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-primary" />
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm font-medium text-muted-foreground"
        >
          Loading skill library...
        </motion.p>
      </motion.div>
    </div>
  );
}
