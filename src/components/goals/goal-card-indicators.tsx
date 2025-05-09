"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from "lucide-react";

import { cn } from "~/lib/utils";

export type PercentageChangeIndicatorProps = {
  percentageChange: number;
  previousDate?: Date | string | null;
  variant?: "default" | "solid" | "outline";
  className?: string;
};

export function PercentageChangeIndicator({
  percentageChange,
  previousDate,
  variant = "default",
  className,
}: PercentageChangeIndicatorProps) {
  const isPositive = percentageChange > 0;
  const isZero = percentageChange === 0;

  // Format the date if available
  const formattedDate = previousDate
    ? dayjs(previousDate).format("MMM D")
    : null;

  // No previous data
  if (isZero && !previousDate) {
    return null;
  }

  const Icon = isPositive
    ? ArrowUpIcon
    : isZero
      ? ArrowRightIcon
      : ArrowDownIcon;

  const badgeClasses = cn(
    "inline-flex items-center gap-x-0.5 rounded-sm text-sm font-medium",
    variant === "solid" && [
      "gap-x-0 px-1",
      isPositive &&
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-500",
      isZero &&
        "bg-gray-100 text-gray-700 dark:bg-gray-400/20 dark:text-gray-500",
      !isPositive &&
        !isZero &&
        "bg-rose-100 text-rose-700 dark:bg-rose-400/20 dark:text-rose-500",
    ],
    variant === "outline" && [
      "ring-1 ring-inset",
      isPositive &&
        "text-emerald-700 ring-emerald-600/20 dark:text-emerald-500 dark:ring-emerald-500/20",
      isZero &&
        "text-gray-700 ring-gray-600/20 dark:text-gray-400 dark:ring-gray-500/20",
      !isPositive &&
        !isZero &&
        "text-rose-700 ring-rose-600/20 dark:text-rose-500 dark:ring-rose-500/20",
    ],
    variant === "default" && [
      isPositive && "text-emerald-600 dark:text-emerald-500",
      isZero && "text-gray-600 dark:text-gray-400",
      !isPositive && !isZero && "text-rose-600 dark:text-rose-500",
    ],
    className,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex items-center gap-2"
    >
      <motion.span
        className={badgeClasses}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
          delay: 0.3,
        }}
      >
        <motion.span
          initial={{ y: isPositive ? 5 : -5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            delay: 0.35,
          }}
        >
          <Icon className="h-4 w-4" />
        </motion.span>
        {!isZero && (
          <span className="font-semibold">
            {Math.abs(percentageChange).toFixed(1)}%
          </span>
        )}
        {isZero && <span className="font-semibold">No change</span>}
      </motion.span>

      {formattedDate && (
        <motion.span
          className="-mb-0.5 text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          vs {formattedDate}
        </motion.span>
      )}
    </motion.div>
  );
}
