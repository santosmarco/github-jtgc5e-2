"use client";

import { motion } from "framer-motion";

import { cn } from "~/lib/utils";

interface CardBackgroundEffectsProps {
  title: string;
  isHovered: boolean;
}

export function CardBackgroundEffects({
  title,
  isHovered,
}: CardBackgroundEffectsProps) {
  const formattedTitle = title.toLowerCase().replace(/[\s$$$$]+/g, "-");

  return (
    <>
      {/* Background pattern */}
      <motion.div
        className={cn(
          "pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-40",
        )}
        style={{
          backgroundImage: `url(/skills/${formattedTitle}.svg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        animate={{
          opacity: isHovered ? 0.5 : 0.4,
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Glow effect on hover */}
      <motion.div
        className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0"
        animate={{ opacity: isHovered ? 0.8 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </>
  );
}
