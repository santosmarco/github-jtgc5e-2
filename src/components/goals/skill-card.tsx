"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LucideProps } from "lucide-react";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useMemo, useState } from "react";

import { ToggleSwitch } from "~/components/ui/toggle-switch";
import { useSkillData } from "~/hooks/use-skill-data";
import { useSkillManagement } from "~/hooks/use-skill-management";
import { useSkillNavigation } from "~/hooks/use-skill-navigation";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

import {
  DisabledContent,
  NoSkillContent,
  NotEnoughDataContent,
  ScheduledReportContent,
  SuccessContent,
} from "./skill-card-content";
import { SkillCardFooter } from "./skill-card-footer";

// Enhanced animations
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
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

export type SkillCardProps = {
  skill: RouterOutputs["skills"]["getAllSkills"][number];
  profileId: string;
  onSkillEnabled?: () => void;
  onSkillDisabled?: () => void;
};

export const SkillCard = React.forwardRef<HTMLDivElement, SkillCardProps>(
  function SkillCard(
    { skill, profileId, onSkillEnabled, onSkillDisabled },
    ref,
  ) {
    const [isHovered, setIsHovered] = useState(false);

    // Custom hooks for organization and reusability
    const {
      latestAssessment,
      nextReportDate,
      latestValidAssessment,
      skillScore,
      reportUrl,
      hasValidFallbackScore,
      scoreToShow,
      isEnabled,
    } = useSkillData(skill, profileId);

    const { enableSkill, disableSkill, isLoading } = useSkillManagement(
      skill,
      profileId,
      onSkillEnabled,
      onSkillDisabled,
    );

    const { navigateToReport } = useSkillNavigation(
      reportUrl,
      latestValidAssessment,
      profileId,
      skill.id,
      isEnabled,
      isLoading,
    );

    // Dynamic Icon loading with fallback
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

    // Derive if skill template exists for conditional UI
    const hasSkillTemplates = skill.goal_templates.length > 0;

    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={cn(
          "relative overflow-hidden rounded-xl bg-gradient-to-br from-background/90 to-background/70 shadow-lg transition-all duration-500",
          isLoading && "pointer-events-none opacity-80",
          !isEnabled
            ? "after:absolute after:inset-0 after:z-10 after:bg-background/50 after:backdrop-blur-[6px]"
            : "after:absolute after:inset-0 after:z-0 after:bg-gradient-to-br after:from-background/10 after:to-background/5 after:backdrop-blur-[1px]",
          isEnabled &&
            !isLoading &&
            latestValidAssessment &&
            "cursor-pointer hover:shadow-xl hover:after:backdrop-blur-0",
          isHovered && isEnabled && latestValidAssessment && "scale-[1.02]",
        )}
        onClick={
          isEnabled && latestValidAssessment ? navigateToReport : undefined
        }
        style={{
          boxShadow: isEnabled
            ? "0 10px 30px rgba(0,0,0,0.1), 0 1px 8px rgba(0,0,0,0.05)"
            : "0 10px 30px rgba(0,0,0,0.05), 0 1px 5px rgba(0,0,0,0.03)",
        }}
      >
        {/* Background pattern */}
        <motion.div
          className={cn(
            "pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-30",
            isEnabled ? "opacity-40" : "opacity-20",
          )}
          style={{
            backgroundImage: `url(/skills/${skill.title.toLowerCase().replace(/[\s$$$$]+/g, "-")}.svg)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
          animate={{
            opacity: isEnabled ? (isHovered ? 0.5 : 0.4) : 0.2,
          }}
          transition={{ duration: 0.5 }}
        />

        {/* Glow effect for enabled cards */}
        {isEnabled && (
          <motion.div
            className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0"
            animate={{ opacity: isHovered ? 0.8 : 0 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Loading overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  <Loader2 className="h-8 w-8 text-primary" />
                </motion.div>
                <p className="font-medium text-primary">
                  {skill.goals.some((goal) => goal.is_default)
                    ? "Disabling skill..."
                    : "Enabling skill..."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-20 px-6">
          {/* Header */}
          <div className="relative flex h-16 items-center justify-between">
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
                  animate={{ opacity: isHovered && isEnabled ? 0.8 : 0 }}
                  transition={{ duration: 0.3 }}
                />
                <Icon className="h-8 w-8 drop-shadow-md" />
              </div>
              <h2 className="text-lg font-bold leading-none tracking-tight drop-shadow-sm">
                {skill.title}
              </h2>
            </motion.div>

            {/* Toggle Switch */}
            <motion.div
              className="flex items-center gap-3 pl-4"
              variants={{
                hidden: { opacity: 0, x: 20 },
                visible: {
                  opacity: 1,
                  x: 0,
                  transition: {
                    type: "spring",
                    stiffness: 100,
                    damping: 20,
                    delay: 0.1,
                  },
                },
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <ToggleSwitch
                checked={isEnabled}
                onCheckedChange={
                  hasSkillTemplates
                    ? isEnabled
                      ? disableSkill
                      : enableSkill
                    : undefined
                }
                disabled={!hasSkillTemplates || isLoading}
              />
            </motion.div>
          </div>

          {/* Content - Simplified with component extraction */}
          {isEnabled ? (
            scoreToShow?.status === "success" || hasValidFallbackScore ? (
              <SuccessContent
                finalScore={scoreToShow?.finalScore ?? null}
                hasValidFallbackScore={hasValidFallbackScore}
                className="relative z-20 h-48"
              />
            ) : scoreToShow?.status === "no_skill" ? (
              <NoSkillContent className="h-48" />
            ) : scoreToShow?.status === "not_enough_moments" ? (
              <NotEnoughDataContent className="h-48" />
            ) : (
              <ScheduledReportContent className="h-48" />
            )
          ) : (
            <DisabledContent className="h-48" />
          )}

          {/* Footer - Extracted to separate component */}
          <SkillCardFooter
            isEnabled={isEnabled}
            isLoading={isLoading}
            latestAssessment={latestAssessment ?? null}
            latestValidAssessment={latestValidAssessment ?? null}
            nextReportDate={nextReportDate ? new Date(nextReportDate) : null}
            skillScoreStatus={skillScore?.status}
            hasValidFallbackScore={hasValidFallbackScore}
            onEnableSkill={enableSkill}
            onNavigateToReport={navigateToReport}
          />
        </div>
      </motion.div>
    );
  },
);
