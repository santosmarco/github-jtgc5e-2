"use client";

import { motion } from "framer-motion";
import React, { useState } from "react";

import { SimplifiedGauge } from "~/components/ui/simplified-gauge";
import type {
  HistoricalSkillScore,
  ScorableReport,
} from "~/lib/reports/scoring";
import { cn } from "~/lib/utils";
import type { Intersect, Select } from "~/lib/utils/types";

import { cardVariants } from "./goal-animations";
import { CardBackgroundEffects } from "./goal-card-effects";
import { CardHeader } from "./goal-card-header";
import { PercentageChangeIndicator } from "./goal-card-indicators";

export type GoalCardMinimalProps = {
  report: Intersect<
    ScorableReport,
    {
      skill: Select<"skills", "icon" | "title">;
    }
  >;
  historicalScores: HistoricalSkillScore["scores"] | null;
};

export const GoalCardMinimal = React.forwardRef<
  HTMLDivElement,
  GoalCardMinimalProps
>(function GoalCardMinimal({ report, historicalScores }, ref) {
  const [isHovered, setIsHovered] = useState(false);
  const { skill } = report;

  // Calculate scores and percentage change
  const skillScoreIndex =
    historicalScores?.findIndex((score) => score.report.id === report.id) ?? -1;
  const skillScore =
    skillScoreIndex === -1
      ? null
      : (historicalScores?.[skillScoreIndex] ?? null);
  const previousScore =
    skillScoreIndex === -1 || skillScoreIndex === 0
      ? null
      : (historicalScores?.[skillScoreIndex - 1] ?? null);

  const percentageChange =
    skillScore &&
    typeof skillScore.finalScore === "number" &&
    previousScore &&
    typeof previousScore.finalScore === "number" &&
    previousScore.finalScore !== 0
      ? ((skillScore.finalScore - previousScore.finalScore) /
          previousScore.finalScore) *
        100
      : 0;

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
      <CardBackgroundEffects title={skill.title} isHovered={isHovered} />

      <div className="relative z-20 flex h-full items-center justify-center">
        {/* Header */}
        <div className="absolute left-4 top-4 flex items-center justify-between">
          <CardHeader
            title={skill.title}
            icon={skill.icon}
            isHovered={isHovered}
          />
        </div>

        {/* Content */}
        <SimplifiedGauge
          value={skillScore?.finalScore ?? null}
          min={0}
          max={100}
          size="md"
          className={previousScore ? "sm:h-48" : "sm:h-48 sm:pt-9"}
        />

        {/* Percentage change indicator */}
        {previousScore && (
          <div className="absolute bottom-0 left-0 right-0 flex w-full items-center justify-between">
            <div className="w-full rounded-lg bg-gradient-to-t from-background to-transparent p-4 pt-8">
              <PercentageChangeIndicator
                percentageChange={percentageChange}
                previousDate={previousScore.date}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});
