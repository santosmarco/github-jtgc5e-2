import { motion } from "framer-motion";
import { GoalIcon } from "lucide-react";

import { NewGoalForm, type NewGoalFormProps } from "./new-goal-form";

export type GoalsEmptyStateProps = {
  onSubmit: NewGoalFormProps["onSubmit"];
};

export function GoalsEmptyState({ onSubmit }: GoalsEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mt-16 flex flex-col items-center justify-center text-center"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.2,
        }}
        className="relative rounded-full bg-primary/10 p-4"
      >
        <motion.div
          animate={{
            rotate: [0, 10, -10, 10, 0],
          }}
          transition={{
            duration: 1,
            delay: 1,
            ease: "easeInOut",
          }}
        >
          <GoalIcon className="h-8 w-8 text-primary" />
        </motion.div>
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="mt-4 text-lg font-semibold"
      >
        No goals created yet
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="mt-2 max-w-sm text-sm text-muted-foreground"
      >
        Get started by creating your first goal. We'll help you track your
        progress and achieve what matters most to you.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="mt-6 w-full max-w-lg"
      >
        <NewGoalForm onSubmit={onSubmit} placeholder="Set your first goal..." />
      </motion.div>
    </motion.div>
  );
}
