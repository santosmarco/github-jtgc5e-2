"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import _ from "lodash";
import type { LucideProps } from "lucide-react";
import { ArrowUp } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";

import { getReportScores } from "~/lib/reports/scoring";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

import { calculateSkillScore } from "./goal-card";

// Enhanced animations
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

const gaugeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      delay: 0.2,
    },
  },
};

export type SkillCardProps = {
  skill: RouterOutputs["skills"]["getAllSkills"][number];
  profileId: string;
};

export const GoalCardMinimal = React.forwardRef<HTMLDivElement, SkillCardProps>(
  function SkillCard({ skill, profileId }, ref) {
    const [isHovered, setIsHovered] = useState(false);

    const Icon = useMemo(
      () =>
        dynamic<LucideProps>(
          () =>
            import("lucide-react").then(
              (mod) =>
                mod.icons[
                  skill.icon && skill.icon in mod.icons
                    ? (skill.icon as keyof typeof mod.icons)
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
      [skill.icon],
    );

    // Calculate statistics about reviews and assessments
    const skillAssessments = skill.reports;
    const latestAssessment =
      skillAssessments.length > 0
        ? _.orderBy(
            skillAssessments,
            [(r) => dayjs(r.created_at).toDate()],
            ["desc"],
          )[0]
        : null;

    const skillScore = getReportScores({
      skill: { scales: skill.scales },
      report_moments: latestAssessment?.report_moments ?? [],
    });

    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={cn(
          "relative overflow-hidden rounded-xl bg-gradient-to-br from-background/90 to-background/70 shadow-lg transition-all duration-500 hover:shadow-xl hover:after:backdrop-blur-0",
          isHovered && "scale-[1.02]",
        )}
        style={{
          boxShadow: "0 10px 30px rgba(0,0,0,0.1), 0 1px 8px rgba(0,0,0,0.05)",
        }}
      >
        {/* Background pattern */}
        <motion.div
          className={cn(
            "pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-30 opacity-40",
          )}
          style={{
            backgroundImage: `url(/skills/${skill.title.toLowerCase().replace(/[\s$$$$]+/g, "-")}.svg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
          animate={{
            opacity: isHovered ? 0.5 : 0.4,
          }}
          transition={{ duration: 0.5 }}
        />

        {/* Glow effect for enabled cards */}
        <motion.div
          className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0"
          animate={{ opacity: isHovered ? 0.8 : 0 }}
          transition={{ duration: 0.3 }}
        />

        <div className="relative z-20 flex h-full items-center justify-center">
          {/* Header */}
          <div className="absolute left-4 top-4 flex items-center justify-between">
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
                {skill.title}
              </h2>
            </motion.div>
          </div>

          {/* Content */}
          <SimplifiedGauge
            value={skillScore.finalScore * 100}
            min={0}
            max={100}
            size="md"
            className="sm:h-48"
            hasAssessments={!!latestAssessment}
          />

          <div className="absolute bottom-4 left-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-x-0.5 leading-none">
                  <ArrowUp className="h-4 w-4 text-emerald-500" />
                  <span className="font-bold text-emerald-500">25%</span>
                </div>
                <div className="ml-0.5 pt-0.5 text-xs leading-none text-muted-foreground">
                  vs Feb 2nd
                </div>
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
);

function SimplifiedGauge({
  value,
  min = 0,
  max = 100,
  size = "md",
  className,
  hasAssessments = false,
}: {
  value: number;
  min?: number;
  max?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  hasAssessments?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(min);

  // Normalize the value between min and max
  const normalizedValue = Math.max(min, Math.min(max, value));
  const percentage = ((normalizedValue - min) / (max - min)) * 100;

  // Size mappings
  const sizeClasses = {
    sm: "w-24 h-24 sm:w-32 sm:h-32",
    md: "w-32 h-32 sm:w-48 sm:h-48",
    lg: "w-40 h-40 sm:w-64 sm:h-64",
    xl: "w-48 h-48 sm:w-80 sm:h-80",
  };

  // Animate the displayed value
  useEffect(() => {
    setDisplayValue(normalizedValue);
  }, [normalizedValue]);

  return (
    <div
      className={cn(
        "flex h-full w-full flex-1 items-center justify-center pl-48 pt-2 sm:pl-0",
        className,
      )}
    >
      <motion.div
        className={cn("relative mx-auto my-auto", sizeClasses[size])}
        variants={gaugeVariants}
      >
        {/* SVG gauge */}
        <svg viewBox="0 0 200 200" className="h-full w-full">
          <title>Skill progress gauge</title>
          {/* Background arc with gradient */}
          <defs>
            <linearGradient
              id="gaugeGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="rgba(200, 200, 200, 0.1)" />
              <stop offset="100%" stopColor="rgba(200, 200, 200, 0.2)" />
            </linearGradient>
          </defs>

          {/* Gray background arc */}
          <path
            d="M40 160 A 80 80 0 1 1 160 160"
            fill="none"
            className="stroke-muted-foreground/20"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Progress arc with gradient */}
          <defs>
            <linearGradient
              id="progressGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="rgba(30, 30, 30, 0.9)" />
              <stop offset="100%" stopColor="rgba(50, 50, 50, 1)" />
            </linearGradient>
          </defs>

          {/* Progress arc */}
          <motion.path
            d="M40 160 A 80 80 0 1 1 160 160"
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: percentage / 100 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeDasharray="1 1"
            className="stroke-foreground"
          />
        </svg>

        {/* Center Score Display with animation */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="flex flex-col items-center"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
              delay: 0.7,
            }}
          >
            {hasAssessments ? (
              <motion.span
                className="text-3xl font-bold sm:text-5xl"
                initial={{ value: min } as { value: number }}
                animate={{ value: displayValue } as { value: number }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                {Math.round(displayValue)}
              </motion.span>
            ) : (
              <span className="text-3xl font-bold text-muted-foreground sm:text-5xl">
                N/A
              </span>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
