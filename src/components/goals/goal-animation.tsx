"use client";

import {
  motion,
  useAnimate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { GoalIcon, CheckCircle2, TrendingUp, Star, Trophy } from "lucide-react";
import { cn } from "~/lib/utils";

type GoalAnimationProps = {
  type: "creation" | "completion" | "progress" | "achievement";
  onComplete?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  duration?: number;
  autoPlay?: boolean;
};

export type GoalAnimationRef = {
  play: () => void;
};

export const GoalAnimation = forwardRef<GoalAnimationRef, GoalAnimationProps>(
  function GoalAnimation(
    {
      type = "creation",
      onComplete,
      className,
      size = "md",
      duration = 2,
      autoPlay = true,
    },
    ref,
  ) {
    const [isAnimating, setIsAnimating] = useState(autoPlay);
    const [scope, animate] = useAnimate();

    const progress = useMotionValue(0);
    const smoothProgress = useSpring(progress, { damping: 30, stiffness: 300 });

    const scale = useTransform(
      smoothProgress,
      [0, 0.4, 0.8, 1],
      [0.5, 1.2, 0.9, 1],
    );
    const rotate = useTransform(
      smoothProgress,
      [0, 0.3, 0.7, 1],
      [0, 15, -15, 0],
    );
    const opacity = useTransform(
      smoothProgress,
      [0, 0.2, 0.8, 1],
      [0, 1, 1, 0],
    );

    const sizeClasses = {
      sm: "w-20 h-20",
      md: "w-32 h-32",
      lg: "w-48 h-48",
    };

    useEffect(() => {
      if (!isAnimating) return;

      // Define different animations based on the type
      const runAnimation = async () => {
        if (type === "creation") {
          await animate(
            scope.current,
            { scale: [0, 1.2, 1] },
            { duration: duration * 0.3, ease: "easeOut" },
          );

          // Animate stars flying out
          await Promise.all([
            animate(
              ".star-1",
              { x: [-5, 30], y: [-5, -30], opacity: [0, 1, 0] },
              { duration: duration * 0.5, delay: duration * 0.2 },
            ),
            animate(
              ".star-2",
              { x: [5, -30], y: [-5, -40], opacity: [0, 1, 0] },
              { duration: duration * 0.6, delay: duration * 0.1 },
            ),
            animate(
              ".star-3",
              { x: [0, 40], y: [0, 10], opacity: [0, 1, 0] },
              { duration: duration * 0.7 },
            ),
            animate(
              ".star-4",
              { x: [0, -40], y: [0, 20], opacity: [0, 1, 0] },
              { duration: duration * 0.6, delay: duration * 0.15 },
            ),
            animate(
              ".goal-icon",
              { rotate: [0, 10, -10, 0] },
              { duration: duration * 0.5, delay: duration * 0.3 },
            ),
          ]);
        } else if (type === "completion") {
          await animate(
            scope.current,
            { scale: [0.8, 1.1, 1] },
            { duration: duration * 0.3 },
          );

          // Confetti and checkmark animation
          await Promise.all([
            animate(
              ".confetti-1",
              {
                y: [-20, 30],
                x: [-10, -30],
                opacity: [0, 1, 0],
                rotate: [0, 180],
              },
              { duration: duration * 0.7 },
            ),
            animate(
              ".confetti-2",
              {
                y: [-20, 30],
                x: [10, 30],
                opacity: [0, 1, 0],
                rotate: [0, -180],
              },
              { duration: duration * 0.6 },
            ),
            animate(
              ".confetti-3",
              {
                y: [-10, 40],
                x: [5, -20],
                opacity: [0, 1, 0],
                rotate: [0, 90],
              },
              { duration: duration * 0.8 },
            ),
            animate(
              ".confetti-4",
              {
                y: [-10, 40],
                x: [-5, 20],
                opacity: [0, 1, 0],
                rotate: [0, -90],
              },
              { duration: duration * 0.7 },
            ),
            animate(
              ".check-icon",
              { scale: [0, 1.2, 1], opacity: [0, 1] },
              { duration: duration * 0.5, delay: duration * 0.2 },
            ),
          ]);
        } else if (type === "progress") {
          await animate(
            scope.current,
            { scale: [0.9, 1] },
            { duration: duration * 0.3 },
          );

          // Progress bars and trend line animation
          await Promise.all([
            animate(
              ".progress-bar-1",
              { scaleX: [0, 1], opacity: [0, 1] },
              { duration: duration * 0.5 },
            ),
            animate(
              ".progress-bar-2",
              { scaleX: [0, 0.7], opacity: [0, 1] },
              { duration: duration * 0.4, delay: duration * 0.1 },
            ),
            animate(
              ".progress-bar-3",
              { scaleX: [0, 0.9], opacity: [0, 1] },
              { duration: duration * 0.6, delay: duration * 0.2 },
            ),
            animate(
              ".trend-icon",
              { y: [10, 0], opacity: [0, 1] },
              { duration: duration * 0.4, delay: duration * 0.3 },
            ),
          ]);
        } else if (type === "achievement") {
          await animate(
            scope.current,
            { scale: [0.8, 1.2, 1] },
            { duration: duration * 0.4 },
          );

          // Trophy and glow animation
          await Promise.all([
            animate(
              ".trophy-icon",
              { y: [10, 0], opacity: [0, 1], scale: [0.8, 1.2, 1] },
              { duration: duration * 0.6 },
            ),
            animate(
              ".glow",
              { opacity: [0, 0.8, 0], scale: [0.8, 1.5, 2] },
              { duration: duration * 1.2, repeat: 1 },
            ),
            animate(
              ".achievement-star-1",
              { scale: [0, 1.2, 1], opacity: [0, 1], rotate: [0, 45] },
              { duration: duration * 0.5, delay: duration * 0.2 },
            ),
            animate(
              ".achievement-star-2",
              { scale: [0, 1.2, 1], opacity: [0, 1], rotate: [0, -45] },
              { duration: duration * 0.5, delay: duration * 0.3 },
            ),
          ]);
        }

        // Animation complete
        setIsAnimating(false);
        onComplete?.();
      };

      void runAnimation();
    }, [animate, isAnimating, onComplete, scope, type, duration]);

    // Reset animation - now a named function we'll expose via the ref
    const play = () => {
      if (!isAnimating) {
        setIsAnimating(true);
        progress.set(0);
      }
    };

    // Expose the play method via ref
    useImperativeHandle(ref, () => ({
      play,
    }));

    return (
      <motion.div
        ref={scope}
        className={cn(
          "relative flex items-center justify-center",
          sizeClasses[size],
          className,
        )}
        style={{ scale: isAnimating ? scale : 1 }}
        onAnimationComplete={() => setTimeout(() => onComplete?.(), 500)}
      >
        {/* Creation animation */}
        {type === "creation" && (
          <motion.div className="absolute inset-0">
            <motion.div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="rounded-full bg-primary/20 p-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <GoalIcon className="goal-icon h-10 w-10 text-primary" />
              </motion.div>
            </motion.div>
            <motion.div className="star-1 absolute h-3 w-3 text-yellow-400">
              <Star className="h-full w-full fill-yellow-400" />
            </motion.div>
            <motion.div className="star-2 absolute h-4 w-4 text-yellow-400">
              <Star className="h-full w-full fill-yellow-400" />
            </motion.div>
            <motion.div className="star-3 absolute h-2 w-2 text-yellow-400">
              <Star className="h-full w-full fill-yellow-400" />
            </motion.div>
            <motion.div className="star-4 absolute h-3 w-3 text-yellow-400">
              <Star className="h-full w-full fill-yellow-400" />
            </motion.div>
          </motion.div>
        )}

        {/* Completion animation */}
        {type === "completion" && (
          <motion.div className="absolute inset-0">
            <motion.div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="rounded-full bg-green-100 p-6 dark:bg-green-900/30"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <CheckCircle2 className="check-icon h-10 w-10 text-green-600 dark:text-green-400" />
              </motion.div>
            </motion.div>
            <motion.div className="confetti-1 absolute h-4 w-4 rounded-sm bg-green-400" />
            <motion.div className="confetti-2 absolute h-4 w-4 rounded-sm bg-blue-400" />
            <motion.div className="confetti-3 absolute h-3 w-3 rounded-full bg-yellow-400" />
            <motion.div className="confetti-4 absolute h-3 w-3 rounded-full bg-pink-400" />
          </motion.div>
        )}

        {/* Progress animation */}
        {type === "progress" && (
          <motion.div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-8">
            <motion.div className="progress-bar-1 h-2 w-full origin-left rounded-full bg-blue-400" />
            <motion.div className="progress-bar-2 h-2 w-full origin-left rounded-full bg-green-400" />
            <motion.div className="progress-bar-3 h-2 w-full origin-left rounded-full bg-purple-400" />
            <motion.div className="trend-icon mt-2">
              <TrendingUp className="h-8 w-8 text-primary" />
            </motion.div>
          </motion.div>
        )}

        {/* Achievement animation */}
        {type === "achievement" && (
          <motion.div className="absolute inset-0">
            <motion.div className="absolute inset-0 flex items-center justify-center">
              <motion.div className="glow absolute h-full w-full rounded-full bg-yellow-400/20" />
              <motion.div className="trophy-icon">
                <Trophy className="h-12 w-12 text-yellow-500" />
              </motion.div>
            </motion.div>
            <motion.div className="achievement-star-1 absolute -right-2 -top-2 h-5 w-5 text-yellow-400">
              <Star className="h-full w-full fill-yellow-400" />
            </motion.div>
            <motion.div className="achievement-star-2 absolute -bottom-2 -left-2 h-5 w-5 text-yellow-400">
              <Star className="h-full w-full fill-yellow-400" />
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    );
  },
);
