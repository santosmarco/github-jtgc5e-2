"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Info } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface SimpleListProps {
  items: Array<{
    id?: string;
    name: string;
    description?: string;
    count?: number;
    confidence?: number;
  }>;
  icon: LucideIcon;
  emptyMessage?: string;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2 },
  },
};

export function SimpleList({
  items,
  icon: Icon,
  emptyMessage = "No items found",
  className,
}: SimpleListProps) {
  if (!items?.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Info className="h-4 w-4" />
        <span>{emptyMessage}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-2", className)}
    >
      {items.map((item, index) => (
        <motion.div
          key={item.id || `${item.name}-${index}`}
          variants={itemVariants}
          className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 p-3 transition-colors hover:border-primary/20"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <span className="font-medium">{item.name}</span>
            {item.count !== undefined && (
              <span className="text-sm text-muted-foreground">
                ({item.count})
              </span>
            )}
          </div>

          {item.confidence && (
            <Badge variant="secondary" className="text-xs">
              {(item.confidence * 100).toFixed(0)}%
            </Badge>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
