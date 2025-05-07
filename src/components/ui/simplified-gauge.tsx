"use client";

import { motion, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { cn } from "~/lib/utils";

export type SimplifiedGaugeProps = {
  value: number | null;
  min?: number;
  max?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

// Animation variants
const gaugeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      delay: 0.2,
    },
  },
} as const satisfies Variants;

export function SimplifiedGauge({
  value,
  min = 0,
  max = 100,
  size = "md",
  className,
}: SimplifiedGaugeProps) {
  const [displayValue, setDisplayValue] = useState(min);
  const animationRef = useRef<number | null>(null);

  // Normalize the value between min and max
  const normalizedValue = value ? Math.max(min, Math.min(max, value)) : min;
  const percentage = ((normalizedValue - min) / (max - min)) * 100;

  // Size mappings
  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-48 h-48",
    lg: "w-64 h-64",
    xl: "w-80 h-80",
  };

  // Animate the displayed value
  useEffect(() => {
    if (typeof value !== "number") return;

    // Clean up any existing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    const startValue = displayValue;
    const endValue = normalizedValue;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    // Easing function that slows down as it approaches the target
    const easeOutQuart = (t: number): number => 1 - (1 - t) ** 4;

    const updateCounter = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      const easedProgress = easeOutQuart(progress);

      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(endValue);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(updateCounter);

    // Cleanup function
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [normalizedValue, value, displayValue]);

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <motion.div
        className={cn("relative", sizeClasses[size])}
        variants={gaugeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* SVG gauge */}
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <title>Skill progress gauge</title>
          {/* Background arc with gradient */}
          <defs>
            <linearGradient
              id="gaugeGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="rgba(200, 200, 200, 0.1)" />
              <stop offset="100%" stopColor="rgba(200, 200, 200, 0.2)" />
            </linearGradient>
          </defs>

          {/* Gray background arc */}
          <path
            d="M40 160 A 80 80 0 1 1 160 160"
            fill="none"
            className="stroke-muted-foreground/20"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Progress arc with gradient */}
          <defs>
            <linearGradient
              id="progressGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="rgba(30, 30, 30, 0.9)" />
              <stop offset="100%" stopColor="rgba(50, 50, 50, 1)" />
            </linearGradient>
          </defs>

          {/* Progress arc */}
          <motion.path
            d="M40 160 A 80 80 0 1 1 160 160"
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: percentage / 100 }}
            transition={{
              duration: 2,
              ease: "easeOut",
            }}
            strokeDasharray="1 1"
            className="stroke-foreground"
          />
        </svg>

        {/* Center Score Display with animation */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="flex flex-col items-center"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
              delay: 0.7,
            }}
          >
            {typeof value === "number" ? (
              <motion.span
                className="text-5xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {Math.round(displayValue)}
                </motion.span>
              </motion.span>
            ) : (
              <span className="text-5xl font-bold text-muted-foreground">
                N/A
              </span>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
