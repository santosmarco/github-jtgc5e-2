"use client";

import dayjs from "dayjs";
import { AnimatePresence, motion, useSpring } from "framer-motion";
import _ from "lodash";
import type { LucideProps } from "lucide-react";
import { ArrowRight, Loader2, Trophy } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { getReportScores } from "~/lib/reports/scoring";
import { cn } from "~/lib/utils";
import { type RouterOutputs, api } from "~/trpc/react";

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
  onSkillEnabled?: () => void;
  onSkillDisabled?: () => void;
};

export const SkillCard = React.forwardRef<HTMLDivElement, SkillCardProps>(
  function SkillCard(
    { skill, profileId, onSkillEnabled, onSkillDisabled },
    ref,
  ) {
    const utils = api.useUtils();
    const router = useRouter();
    const [score, setScore] = useState(0);
    const springScore = useSpring(0, {
      stiffness: 100,
      damping: 30,
      mass: 1,
    });
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
      springScore.set(73);
    }, [springScore]);

    useEffect(() => {
      const unsubscribe = springScore.on("change", (latest) => {
        setScore(Math.round(latest));
      });
      return () => unsubscribe();
    }, [springScore]);

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

    const { mutate: enableSkill, isPending: isEnablingSkill } =
      api.skills.enableSkill.useMutation({
        onSuccess: async () => {
          toast.success(`"${skill.title}" enabled`, {
            description: "You can now track your skill progress",
          });
          await utils.skills.getAllSkills.invalidate();
          onSkillEnabled?.();
        },
        onError: (error) => {
          console.log(error);
          toast.error(error.message);
        },
      });

    const { mutate: disableSkill, isPending: isDisablingSkill } =
      api.skills.disableSkill.useMutation({
        onSuccess: async () => {
          toast.success(`"${skill.title}" disabled`, {
            description: "You can re-enable it anytime",
          });
          await utils.skills.getAllSkills.invalidate();
          onSkillDisabled?.();
        },
        onError: (error) => {
          console.log(error);
          toast.error(error.message);
        },
      });

    const handleSkillEnable = () => {
      enableSkill({
        skillId: skill.id,
        profileId: profileId,
        generateAssessment:
          profileId === "71b372dc-3d42-40c1-838d-248460d1e50d",
      });
    };

    const handleSkillDisable = () => {
      disableSkill({
        skillId: skill.id,
        profileId: profileId,
      });
    };

    const isEnabled = skill.goals.some((goal) => goal.is_default);
    const isLoading = isEnablingSkill || isDisablingSkill;

    // Calculate statistics about reviews and assessments
    const skillAssessments = skill.reports || [];
    const hasAssessments = skillAssessments.length > 0;
    const latestAssessment = hasAssessments
      ? _.orderBy(
          skillAssessments,
          [(r) => dayjs(r.created_at).toDate()],
          ["desc"],
        )[0]
      : null;

    const skillAssessmentGoal = latestAssessment?.report_goals.find(
      (reportGoal) =>
        skill.goals.some((goal) => goal.id === reportGoal.goal_id),
    );

    // Calculate next report date (2 weeks after the end_date of the previous one or after goal.created_at)
    const getNextReportDate = () => {
      if (hasAssessments && latestAssessment?.end_date) {
        return dayjs(latestAssessment.end_date)
          .add(2, "weeks")
          .format("MMM D, YYYY");
      }

      if (skill.goals.length > 0) {
        const defaultGoal = skill.goals.find((goal) => goal.is_default);
        if (defaultGoal?.created_at) {
          return dayjs(defaultGoal.created_at)
            .add(2, "weeks")
            .format("MMM D, YYYY");
        }
      }

      return "Soon";
    };

    const skillScore = latestAssessment
      ? getReportScores(latestAssessment)
      : null;

    const navigateToReport = () => {
      if (isEnabled && !isLoading && latestAssessment && hasAssessments) {
        router.push(
          `/goals/reports/${latestAssessment?.id}${skillAssessmentGoal?.goal_id ? `?goalId=${skillAssessmentGoal?.goal_id}` : ""}`,
        );
      }
    };

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
            hasAssessments &&
            "cursor-pointer hover:shadow-xl hover:after:backdrop-blur-0",
          isHovered && isEnabled && hasAssessments && "scale-[1.02]",
        )}
        onClick={isEnabled && hasAssessments ? navigateToReport : undefined}
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
                  {isEnablingSkill ? "Enabling skill..." : "Disabling skill..."}
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
                  skill.goal_templates.length > 0
                    ? isEnabled
                      ? handleSkillDisable
                      : handleSkillEnable
                    : undefined
                }
                disabled={skill.goal_templates.length === 0 || isLoading}
              />
            </motion.div>
          </div>

          {/* Content */}
          {isEnabled ? (
            <motion.div
              variants={gaugeVariants}
              initial="hidden"
              animate="visible"
              className="relative z-20 h-48"
            >
              <SimplifiedGauge
                value={skillScore?.finalScore ?? null}
                min={0}
                max={100}
                size="md"
                className="h-48"
              />
            </motion.div>
          ) : (
            <motion.div
              className="z-20 flex h-48 flex-col items-center justify-center py-4 text-center"
              variants={gaugeVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                className="mb-4 rounded-full bg-primary/20 p-4"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                initial="hidden"
                animate="visible"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Trophy className="h-8 w-8 text-primary" />
              </motion.div>
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                initial="hidden"
                animate="visible"
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 20,
                  delay: 0.4,
                  duration: 0.2,
                }}
                className="mb-4 max-w-xs text-center text-base text-foreground"
              >
                Enable this skill to track your progress and receive
                personalized feedback.
              </motion.p>
            </motion.div>
          )}

          {/* Footer */}
          {isEnabled ? (
            <motion.div
              className="relative -mx-6 mt-auto flex h-16 items-center justify-between pb-4"
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

              <div className="z-10 pl-6">
                <p className="text-xs font-medium uppercase leading-none tracking-widest opacity-80">
                  {latestAssessment ? "LATEST REPORT" : "NEXT REPORT"}
                </p>
                <p className="mt-1.5 text-lg font-semibold leading-none tracking-tight">
                  {latestAssessment ? (
                    <>
                      {dayjs(latestAssessment.start_date).format("MMM D")} to{" "}
                      {dayjs(latestAssessment.end_date).format("MMM D")}
                    </>
                  ) : (
                    <span className="text-primary">{getNextReportDate()}</span>
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                className="group z-10 mr-6 flex items-center gap-2 rounded-full bg-background/50 backdrop-blur-3xl transition-all duration-300 hover:scale-105 hover:bg-background/70 hover:shadow-lg"
                disabled={isLoading || !hasAssessments}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasAssessments) {
                    router.push(
                      `/goals/reports/${latestAssessment?.id}${skillAssessmentGoal?.goal_id ? `?goalId=${skillAssessmentGoal?.goal_id}` : ""}`,
                    );
                  }
                }}
              >
                <span className="font-medium tracking-wide">Review</span>
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              className="flex h-16 items-center justify-center pb-4"
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
                  handleSkillEnable();
                }}
                disabled={isLoading || skill.goal_templates.length === 0}
                className="group z-20 flex items-center gap-2 bg-primary/90 hover:bg-primary"
              >
                <span>Enable skill</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  },
);

function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "text-xs font-medium transition-colors duration-200",
          checked ? "text-muted-foreground" : "text-foreground/80",
        )}
      >
        Off
      </span>
      <div
        className={cn(
          "relative h-6 w-12 cursor-pointer rounded-full p-1 transition-colors duration-300",
          checked
            ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
            : "bg-muted",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onClick={() => !disabled && onCheckedChange?.(!checked)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (disabled) return;
            onCheckedChange?.(!checked);
          }
        }}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md"
          initial={false}
          animate={{
            opacity: checked ? 1 : 0,
            scale: checked ? 1.2 : 1,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Track */}
        <div className="relative z-10 h-full w-full">
          {/* Thumb */}
          <motion.div
            className="absolute top-0 h-4 w-4 rounded-full bg-white shadow-md"
            initial={false}
            animate={{
              x: checked ? "150%" : "0%",
              scale: checked ? 1.1 : 1,
              backgroundColor: checked ? "#ffffff" : "#ffffff",
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          />
        </div>
      </div>
      <span
        className={cn(
          "text-xs font-medium transition-colors duration-200",
          checked ? "text-emerald-500" : "text-muted-foreground",
        )}
      >
        On
      </span>
    </div>
  );
}

function SimplifiedGauge({
  value,
  min = 0,
  max = 100,
  size = "md",
  className,
}: {
  value: number | null;
  min?: number;
  max?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(min);

  // Normalize the value between min and max
  const normalizedValue = value ? Math.max(min, Math.min(max, value)) : min;
  const percentage = ((normalizedValue - min) / (max - min)) * 100;

  // Size mappings
  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-48 h-48",
    lg: "w-64 h-64",
    xl: "w-80 h-80",
  };

  // Animate the displayed value
  useEffect(() => {
    setDisplayValue(normalizedValue);
  }, [normalizedValue]);

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <motion.div
        className={cn("relative", sizeClasses[size])}
        variants={gaugeVariants}
        initial="hidden"
        animate="visible"
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
            {typeof value === "number" ? (
              <motion.span
                className="text-5xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {Math.round(displayValue)}
                </motion.span>
              </motion.span>
            ) : (
              <span className="text-5xl font-bold text-muted-foreground">
                N/A
              </span>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
