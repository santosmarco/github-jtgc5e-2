"use client";

import { motion } from "framer-motion";
import { DatabaseIcon, ListIcon, UsersIcon } from "lucide-react"; // Added Database, Users, List
import { Loader2 } from "lucide-react";

export function ListEntitiesLoading() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3.5 text-sm text-purple-600/90 shadow-sm dark:border-purple-400/20 dark:bg-purple-400/5 dark:text-purple-400/90"
    >
      <motion.div
        animate={{
          // Gentle bounce for the icons with staggered animation
          y: [0, -2, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
          staggerChildren: 0.2,
        }}
        className="flex items-center gap-0.5"
      >
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{
            duration: 1.2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 0,
          }}
        >
          <DatabaseIcon className="h-4 w-4" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{
            duration: 1.2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 0.2,
          }}
        >
          <UsersIcon className="h-4 w-4" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{
            duration: 1.2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 0.4,
          }}
        >
          <ListIcon className="h-4 w-4" />
        </motion.div>
      </motion.div>

      <span className="font-medium">Accessing knowledge base...</span>

      <Loader2 className="ml-auto h-4 w-4 animate-spin text-purple-500/70 dark:text-purple-400/70" />
    </motion.div>
  );
}
