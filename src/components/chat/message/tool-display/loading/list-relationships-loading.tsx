"use client";

import { motion } from "framer-motion";
import { LinkIcon, Loader2 } from "lucide-react"; // Using LinkIcon

export function ListRelationshipsLoading() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-lg border border-pink-500/20 bg-pink-500/5 p-3 text-sm text-pink-600/90 shadow-sm dark:border-pink-400/20 dark:bg-pink-400/5 dark:text-pink-400/90"
    >
      <motion.div
        animate={{
          // Subtle floating animation
          y: [0, -1.5, 0, 1.5, 0],
          filter: ["saturate(1)", "saturate(1.5)", "saturate(1)"],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <LinkIcon className="h-5 w-5" />
      </motion.div>

      <span className="font-medium">Finding connections...</span>

      <Loader2 className="ml-auto h-4 w-4 animate-spin text-pink-500/70 dark:text-pink-400/70" />
    </motion.div>
  );
}
