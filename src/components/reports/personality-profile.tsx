"use client";

import { motion } from "framer-motion";
import type { LucideProps } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";

export type PersonalityProfileProps = {
  report: Tables<"reports">;
};

export function PersonalityProfile({ report }: PersonalityProfileProps) {
  const Icon = useMemo(
    () =>
      dynamic<LucideProps>(
        () =>
          import("lucide-react").then(
            (mod) =>
              mod.icons[
                report.personality_icon && report.personality_icon in mod.icons
                  ? (report.personality_icon as keyof typeof mod.icons)
                  : "UserRound"
              ],
          ),
        {
          loading: () => <div className="h-8 w-8" />,
          ssr: false,
        },
      ),
    [report.personality_icon],
  );

  const badgeVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  };

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "relative overflow-hidden rounded-xl",
        "bg-gradient-to-br from-indigo-600 to-indigo-600/10",
      )}
    >
      {/* Subtle "Persona" text in top right */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="absolute right-10 top-6 z-20 text-lg font-bold"
      >
        Your Persona
      </motion.div>

      {/* Animated Background pattern with repeated icons */}
      <div className="absolute -right-6 -top-6 grid rotate-45 grid-cols-6 gap-4 overflow-hidden">
        {Array.from({ length: 42 }).map((_, i) => {
          const randomId = `bg-icon-${Math.random().toString(36).substr(2, 9)}`;
          return (
            <motion.div
              key={randomId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 1,
                delay: 0.8 + (i % 6) * 0.05,
              }}
              className="flex items-center justify-center"
            >
              <Icon className="h-24 w-24 text-indigo-600/20" />
            </motion.div>
          );
        })}
      </div>

      <div className="relative z-10 max-w-full px-6 py-8">
        <div className="flex flex-col md:flex-row">
          <div className="mb-6 md:mb-0 md:w-2/3">
            {report.personality_badges &&
              report.personality_badges.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {report.personality_badges.map((badge, index) => (
                    <motion.span
                      key={badge}
                      custom={index}
                      variants={badgeVariants}
                      initial="hidden"
                      animate="visible"
                      className="rounded-full bg-black/20 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {badge}
                    </motion.span>
                  ))}
                </div>
              )}

            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-4 text-4xl font-bold text-foreground"
            >
              {report.personality_text}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="max-w-2xl text-lg text-foreground"
            >
              {report.personality_description}
            </motion.p>
          </div>

          {/* <div className="flex items-center justify-center md:w-1/3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.6,
              }}
              className="relative h-40 w-40 md:h-48 md:w-48"
            >
              <Icon className="h-full w-full text-foreground" />
            </motion.div>
          </div> */}
        </div>
      </div>
    </motion.section>
  );
}
