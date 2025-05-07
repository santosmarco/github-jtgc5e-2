"use client";

import { motion } from "framer-motion";
import type { LucideProps } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo } from "react";

interface CardHeaderProps {
  title: string;
  icon: string | null;
  isHovered: boolean;
}

export function CardHeader({ title, icon, isHovered }: CardHeaderProps) {
  // Dynamic Icon loading with fallback
  const Icon = useMemo(
    () =>
      dynamic<LucideProps>(
        () =>
          import("lucide-react").then(
            (mod) =>
              mod.icons[
                icon && icon in mod.icons
                  ? (icon as keyof typeof mod.icons)
                  : "Mic"
              ],
          ),
        {
          loading: () => (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
              className="border-3 h-12 w-12 rounded-full border-primary/30 border-t-primary"
            />
          ),
          ssr: false,
        },
      ),
    [icon],
  );

  return (
    <motion.div
      className="flex items-center gap-4"
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: {
          opacity: 1,
          x: 0,
          transition: {
            type: "spring",
            stiffness: 100,
            damping: 20,
          },
        },
      }}
    >
      <div className="relative">
        <motion.div
          className="absolute -inset-1 rounded-full bg-primary/10 opacity-0"
          animate={{ opacity: isHovered ? 0.8 : 0 }}
          transition={{ duration: 0.3 }}
        />
        <Icon className="h-6 w-6 drop-shadow-md" />
      </div>
      <h2 className="text-base font-bold leading-none tracking-tight drop-shadow-sm">
        {title}
      </h2>
    </motion.div>
  );
}
