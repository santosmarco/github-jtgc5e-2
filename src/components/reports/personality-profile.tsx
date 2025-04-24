"use client";

import { motion } from "framer-motion";
import type { LucideProps } from "lucide-react";
import { Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { useParticles } from "~/hooks/use-particles";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";

type PersonalityProfileProps = {
  report: Tables<"reports">;
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 70,
      damping: 18,
      mass: 1,
      staggerChildren: 0.08,
    },
  },
};

const badgeVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05 + 0.3,
      duration: 0.5,
      ease: [0.23, 1, 0.32, 1],
    },
  }),
};

const fadeIn = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] },
  },
};

export function PersonalityProfile({
  report,
}: PersonalityProfileProps): JSX.Element {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const { containerRef, setIsActive, ParticleEffect } = useParticles({
    count: 24,
  });

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
          loading: () => <div className="h-5 w-5" />,
          ssr: false,
        },
      ),
    [report.personality_icon],
  );

  return (
    <motion.section
      ref={containerRef}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      onHoverStart={() => {
        setIsHovered(true);
        setIsActive(true);
      }}
      onHoverEnd={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      className={cn(
        "group/personality relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-background/90 to-background/70 shadow-lg transition-all duration-500 hover:border-primary/70 sm:min-h-[260px]",
        "px-1 after:absolute after:inset-0 after:z-0 after:bg-gradient-to-br after:from-background/10 after:to-background/5 after:backdrop-blur-[1px]",
        isHovered && "scale-[1.02]",
      )}
      style={{
        boxShadow: "0 10px 30px rgba(0,0,0,0.1), 0 1px 8px rgba(0,0,0,0.05)",
      }}
    >
      {/* Background glow effect */}
      <motion.div
        className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0"
        animate={{ opacity: isHovered ? 0.8 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Particle effects using the useParticles hook */}
      <ParticleEffect />

      <div className="relative z-20 flex h-full items-center justify-center p-3 sm:p-4">
        {/* Header */}
        <motion.div
          className="absolute left-3 right-3 top-3 flex items-start justify-between sm:left-4 sm:right-4 sm:top-4"
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
          <div className="mt-1 flex items-center gap-1 gap-x-1">
            <div className="relative">
              <motion.div
                className="absolute -inset-1 rounded-full bg-primary/10 opacity-0"
                animate={{ opacity: isHovered ? 0.8 : 0 }}
                transition={{ duration: 0.3 }}
              />
              <Sparkles className="h-3.5 w-3.5 text-primary/70" />
            </div>
            <span className="ml-2 text-xs font-medium tracking-wide text-muted-foreground/80 transition-all duration-700 group-hover/personality:text-foreground">
              Persona
            </span>
          </div>

          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 15,
              delay: 0.3,
            }}
            whileHover={{
              scale: 1.1,
              rotate: 5,
              transition: { duration: 0.2 },
            }}
            className="flex h-8 w-8 items-center justify-center self-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 p-2 shadow-sm sm:h-9 sm:w-9"
          >
            <Icon className="h-6 w-6 text-primary drop-shadow-md sm:h-7 sm:w-7" />
          </motion.div>
        </motion.div>

        <div className="flex flex-col pt-8 sm:pt-4">
          {/* Title with animated underline */}
          <div className="relative mb-2.5">
            <motion.h2
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="text-left text-base font-bold leading-tight text-primary sm:text-lg"
            >
              {report.personality_text}
            </motion.h2>
            <motion.div
              className="absolute -bottom-1 left-0 h-[1px] bg-primary/30"
              initial={{ width: 0 }}
              animate={{ width: isHovered ? "100%" : "40%" }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Description with improved typography */}
          <motion.p
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
            className="mt-1 text-xs leading-relaxed text-muted-foreground/80 transition-all duration-700 group-hover/personality:text-foreground sm:text-sm"
          >
            {report.personality_description}
          </motion.p>

          {/* Badges with improved styling */}
          {/* {report.personality_badges &&
            report.personality_badges.length > 0 && (
              <motion.div
                variants={fadeIn}
                className="mt-3 flex flex-wrap gap-1"
              >
                {report.personality_badges.map((badge, index) => (
                  <motion.span
                    key={badge}
                    custom={index}
                    variants={badgeVariants}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="rounded-full bg-gradient-to-r from-primary/20 to-primary/10 px-2 py-0.5 text-xs font-medium text-primary shadow-sm backdrop-blur-sm"
                  >
                    {badge}
                  </motion.span>
                ))}
              </motion.div>
            )} */}
        </div>
      </div>
    </motion.section>
  );
}
