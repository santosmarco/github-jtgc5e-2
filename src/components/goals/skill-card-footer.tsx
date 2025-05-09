"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Button } from "~/components/ui/button";
import type { SkillAssessment } from "~/hooks/use-skill-data";

import { PercentageChangeIndicator } from "./goal-card-indicators";

type SkillCardFooterProps = {
  isEnabled: boolean;
  isLoading: boolean;
  latestAssessment: SkillAssessment | null;
  latestValidAssessment: SkillAssessment | null;
  nextReportDate: Date | null | undefined;
  skillScoreStatus: string | undefined;
  hasValidFallbackScore: boolean;
  percentageChange?: number;
  previousAssessmentDate?: Date | string | null;
  onEnableSkill: () => void;
  onNavigateToReport: () => void;
  className?: string;
};

export function SkillCardFooter({
  isEnabled,
  isLoading,
  latestAssessment,
  latestValidAssessment,
  nextReportDate,
  skillScoreStatus,
  hasValidFallbackScore,
  percentageChange = 0,
  previousAssessmentDate,
  onEnableSkill,
  onNavigateToReport,
  className,
}: SkillCardFooterProps) {
  if (isEnabled) {
    const showPercentageChange =
      latestAssessment &&
      (skillScoreStatus === "success" || hasValidFallbackScore) &&
      (percentageChange !== 0 || previousAssessmentDate);

    return (
      <motion.div
        className={`relative -mx-6 mt-auto flex h-16 items-center justify-between pb-4 ${className}`}
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              type: "spring",
              stiffness: 100,
              damping: 20,
              delay: 0.8,
            },
          },
        }}
      >
        {/* Gradient overlay for better text visibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/80 to-transparent" />

        <div className="z-10 flex items-center pl-6">
          <div>
            <p className="text-xs font-medium uppercase leading-none tracking-widest opacity-80">
              {latestAssessment &&
              (skillScoreStatus === "success" || hasValidFallbackScore)
                ? "LATEST REPORT"
                : "NEXT REPORT"}
            </p>

            <div className="mt-1.5 flex items-center gap-1.5">
              <p className="text-lg font-semibold leading-none tracking-tight">
                {latestAssessment &&
                (skillScoreStatus === "success" || hasValidFallbackScore) ? (
                  <>
                    {dayjs(latestAssessment.start_date).format("MMM D")} to{" "}
                    {dayjs(latestAssessment.end_date).format("MMM D")}
                  </>
                ) : (
                  <span className="text-primary">
                    {nextReportDate
                      ? dayjs(nextReportDate).format("MMM D")
                      : "Soon"}
                  </span>
                )}
              </p>

              {showPercentageChange && (
                <PercentageChangeIndicator
                  percentageChange={percentageChange}
                  previousDate={null} // Don't show date here to save space
                  variant="solid"
                />
              )}
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          className="group z-10 mr-6 flex items-center gap-2 rounded-full bg-background/50 backdrop-blur-3xl transition-all duration-300 hover:scale-105 hover:bg-background/70 hover:shadow-lg"
          disabled={
            isLoading ||
            !latestValidAssessment ||
            (skillScoreStatus !== "success" && !hasValidFallbackScore)
          }
          onClick={(e) => {
            e.stopPropagation();
            if (latestValidAssessment) {
              onNavigateToReport();
            }
          }}
        >
          <span className="font-medium tracking-wide">Review</span>
          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`flex h-16 items-center justify-center pb-4 ${className}`}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 100,
            damping: 20,
            delay: 0.8,
          },
        },
      }}
    >
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onEnableSkill();
        }}
        disabled={isLoading}
        className="group z-20 flex items-center gap-2 bg-primary/90 hover:bg-primary"
      >
        <span>Enable skill</span>
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </Button>
    </motion.div>
  );
}
