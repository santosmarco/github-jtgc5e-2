"use client";

import { motion } from "framer-motion";
import { Loader2, ZapIcon } from "lucide-react";
import type React from "react";

import { cn } from "~/lib/utils";

interface LoadingIndicatorProps {
  message?: string;
  className?: string;
  icon?: React.ElementType;
}

export function LoadingIndicator({
  message,
  className,
  icon: Icon = ZapIcon,
}: LoadingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.95 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-border/60 bg-gradient-to-br from-background via-muted/30 to-background p-2.5 text-xs shadow-sm",
        className,
      )}
    >
      <motion.div
        animate={{ rotate: [0, 15, -15, 0], opacity: [0.7, 1, 0.7] }}
        transition={{
          duration: 1.5,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <Icon className="h-4 w-4 text-primary/80" />
      </motion.div>
      <span className="font-medium text-muted-foreground/90">
        {message ?? "Processing your request..."}
      </span>
      <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-primary/70" />
    </motion.div>
  );
}
