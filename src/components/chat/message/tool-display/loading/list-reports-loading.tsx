"use client";

import { motion } from "framer-motion";
import { FileTextIcon, Loader2 } from "lucide-react";

export function ListReportsLoading() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-lg border border-teal-500/20 bg-teal-500/5 p-3 text-sm text-teal-600/90 shadow-sm dark:border-teal-400/20 dark:bg-teal-400/5 dark:text-teal-400/90"
    >
      <motion.div
        animate={{
          // Paper stack animation
          y: [0, -2, 0, 2, 0],
          skewX: [0, 1, -1, 1, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <FileTextIcon className="h-5 w-5" />
      </motion.div>

      <span className="font-medium">Fetching reports...</span>

      <Loader2 className="ml-auto h-4 w-4 animate-spin text-teal-500/70 dark:text-teal-400/70" />
    </motion.div>
  );
}
