"use client";

import { motion } from "framer-motion";
import { Loader2, VideoIcon } from "lucide-react";

export function ListMeetingsLoading() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-sm text-green-600/90 shadow-sm dark:border-green-400/20 dark:bg-green-400/5 dark:text-green-400/90"
    >
      <motion.div
        animate={{
          // Simple pulse for video icon
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 1.2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <VideoIcon className="h-5 w-5" />
      </motion.div>

      <span className="font-medium">Searching meetings...</span>

      <Loader2 className="ml-auto h-4 w-4 animate-spin text-green-500/70 dark:text-green-400/70" />
    </motion.div>
  );
}
