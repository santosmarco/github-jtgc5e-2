"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { cn } from "~/lib/utils";

export type PercentageChangeIndicatorProps = {
  percentageChange: number;
  previousDate?: Date | string | null;
};

export function PercentageChangeIndicator({
  percentageChange,
  previousDate,
}: PercentageChangeIndicatorProps) {
  const isPositive = percentageChange > 0;
  const isZero = percentageChange === 0;

  // Format the date if available
  const formattedDate = previousDate
    ? dayjs(previousDate).format("MMM D")
    : null;

  // No previous data
  if (isZero && !previousDate) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-muted-foreground"
      >
        No previous data
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex items-center gap-2"
    >
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        {!isZero && (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className="flex items-center justify-center gap-x-0.5 leading-none"
          >
            {isPositive ? (
              <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 text-rose-600" />
            )}
            <span
              className={cn(
                "font-bold",
                isPositive ? "text-emerald-500" : "text-rose-600",
              )}
            >
              {Math.abs(percentageChange).toFixed(1)}%
            </span>
          </motion.div>
        )}
        {isZero && (
          <span className="font-bold text-muted-foreground">No change</span>
        )}
        {formattedDate && (
          <div className="ml-0.5 pt-0.5 text-xs leading-none text-muted-foreground">
            vs {formattedDate}
          </div>
        )}
      </span>
    </motion.div>
  );
}
