import { motion, useAnimate } from "framer-motion";
import { Sparkles, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { GoalAnimation } from "./goal-animation";
import { NewGoalForm, type NewGoalFormProps } from "./new-goal-form";

export type GoalsEmptyStateProps = {
  onSubmit: NewGoalFormProps["onSubmit"];
};

export function GoalsEmptyState({ onSubmit }: GoalsEmptyStateProps) {
  const [scope, animate] = useAnimate();
  const [showStars, setShowStars] = useState(true);

  useEffect(() => {
    const animateParticles = async () => {
      await Promise.all([
        animate(
          ".particle-1",
          { y: [0, -30], opacity: [0, 1, 0], x: [0, -20] },
          { duration: 2, delay: 0.2 },
        ),
        animate(
          ".particle-2",
          { y: [0, -40], opacity: [0, 1, 0], x: [0, 20] },
          { duration: 2.3, delay: 0.3 },
        ),
        animate(
          ".particle-3",
          { y: [0, -20], opacity: [0, 1, 0], x: [0, -15] },
          { duration: 1.8, delay: 0.4 },
        ),
        animate(
          ".particle-4",
          { y: [0, -35], opacity: [0, 1, 0], x: [0, 15] },
          { duration: 2.1, delay: 0.5 },
        ),
      ]);

      setShowStars(false);
    };

    if (showStars) {
      void animateParticles();
    }
  }, [animate, showStars]);

  return (
    <motion.div
      ref={scope}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mt-16 flex flex-col items-center justify-center text-center"
    >
      <motion.div className="relative">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.2,
          }}
          className="relative rounded-full bg-primary/10 p-6"
        >
          <GoalAnimation type="creation" size="sm" />
        </motion.div>

        {showStars && (
          <>
            <motion.div className="particle-1 absolute -top-2 left-1/2 h-5 w-5 text-yellow-400">
              <Star className="h-full w-full" fill="currentColor" />
            </motion.div>
            <motion.div className="particle-2 absolute -top-2 left-1/2 h-4 w-4 text-primary">
              <Sparkles className="h-full w-full" />
            </motion.div>
            <motion.div className="particle-3 absolute -top-2 left-1/2 h-3 w-3 text-yellow-400">
              <Star className="h-full w-full" fill="currentColor" />
            </motion.div>
            <motion.div className="particle-4 absolute -top-2 left-1/2 h-4 w-4 text-primary">
              <Sparkles className="h-full w-full" />
            </motion.div>
          </>
        )}
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="mt-6 text-xl font-semibold"
      >
        No goals created yet
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="mt-2 max-w-md text-base text-muted-foreground"
      >
        Get started by creating your first goal. We'll help you track your
        progress and achieve what matters most to you.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="mt-8 w-full max-w-lg"
      >
        <NewGoalForm onSubmit={onSubmit} placeholder="Set your first goal..." />
      </motion.div>
    </motion.div>
  );
}
