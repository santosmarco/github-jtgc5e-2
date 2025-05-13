"use client";

import { motion } from "framer-motion";
import { Loader2, SearchIcon, TagIcon } from "lucide-react";

export function SearchMomentsLoading() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm text-blue-600/90 shadow-sm dark:border-blue-400/20 dark:bg-blue-400/5 dark:text-blue-400/90"
    >
      <motion.div
        animate={{
          rotate: [0, 10, -10, 10, 0],
          scale: [1, 1.1, 1, 1.1, 1],
        }}
        transition={{
          duration: 1.8,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="flex items-center justify-center"
      >
        <SearchIcon className="mr-1 h-4 w-4" />
        <TagIcon className="h-5 w-5" />
      </motion.div>

      <span className="font-medium">Searching for relevant moments...</span>

      <Loader2 className="ml-auto h-4 w-4 animate-spin text-blue-500/70 dark:text-blue-400/70" />
    </motion.div>
  );
}
