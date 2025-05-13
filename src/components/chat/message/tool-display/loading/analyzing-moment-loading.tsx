"use client";

import { motion } from "framer-motion";
import { Loader2, TagIcon } from "lucide-react";

export function AnalyzingMomentLoading() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 text-sm text-orange-600/90 shadow-sm dark:border-orange-400/20 dark:bg-orange-400/5 dark:text-orange-400/90"
    >
      <motion.div
        animate={{
          // Zoom in/out effect
          scale: [1, 1.1, 1, 0.9, 1],
          opacity: [0.8, 1, 0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <TagIcon className="h-5 w-5" />
      </motion.div>
      <span className="font-medium">Analyzing moment...</span>
      <Loader2 className="ml-auto h-4 w-4 animate-spin text-orange-500/70 dark:text-orange-400/70" />
    </motion.div>
  );
}
