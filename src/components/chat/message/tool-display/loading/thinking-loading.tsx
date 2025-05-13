"use client";

import { motion } from "framer-motion";
import { BrainIcon, Loader2 } from "lucide-react";

export function ThinkingLoading() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-sm text-primary/90 shadow-sm"
    >
      <motion.div
        animate={{
          rotate: [0, 5, -5, 5, 0],
          scale: [1, 1.05, 1, 1.05, 1],
          filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"],
        }}
        transition={{
          duration: 1.5,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="text-primary"
      >
        <BrainIcon className="h-5 w-5" />
      </motion.div>

      <span className="font-medium">Titan is thinking...</span>

      <Loader2 className="ml-auto h-4 w-4 animate-spin text-primary/70" />
    </motion.div>
  );
}
