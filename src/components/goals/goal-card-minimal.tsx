"use client";

import dayjs from "dayjs";
import { AnimatePresence, motion, useSpring } from "framer-motion";
import _ from "lodash";
import type { LucideProps } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Clock,
  Eye,
  FileWarning,
  Loader2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { transformMoment } from "~/lib/db/moments";
import { cn } from "~/lib/utils";
import { type RouterOutputs, api } from "~/trpc/react";

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
  onSkillEnabled?: () => void;
  onSkillDisabled?: () => void;
};

export const GoalCardMinimal = React.forwardRef<HTMLDivElement, SkillCardProps>(
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
        onSuccess: () => {
          toast.success(`"${skill.title}" enabled`, {
            description: "You can now track your skill progress",
          });
          utils.skills.getAllSkills.invalidate();
          onSkillEnabled?.();
        },
        onError: (error) => {
          console.log(error);
          toast.error(error.message);
        },
      });

    const { mutate: disableSkill, isPending: isDisablingSkill } =
      api.skills.disableSkill.useMutation({
        onSuccess: () => {
          toast.success(`"${skill.title}" disabled`, {
            description: "You can re-enable it anytime",
          });
          utils.skills.getAllSkills.invalidate();
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
    const skillAssessments =
      skill.reports.filter((r) =>
        r.report_goals
          .map((rg) => rg.goal_id)
          .some((goalId) =>
            skill.goals
              .filter((g) => g.is_default)
              .some((g) => g.id === goalId),
          ),
      ) || [];
    const reviewedAssessments =
      skillAssessments.filter((r) =>
        r.report_goals.every((rg) => rg.is_reviewed),
      ) || [];
    const latestAssessment =
      skillAssessments.length > 0
        ? _.orderBy(
            skillAssessments,
            [(r) => dayjs(r.created_at).toDate()],
            ["desc"],
          )[0]
        : null;
    const hasAssessments = skillAssessments.length > 0;

    const skillAssessmentGoal = latestAssessment?.report_goals.find(
      (reportGoal) =>
        skill.goals.some((goal) => goal.id === reportGoal.goal_id),
    );

    const latestSkillAssessmentStatus = _.orderBy(
      skill.statuses,
      [(status) => dayjs(status.created_at).toDate()],
      ["desc"],
    )[0];

    // Determine status for display
    const getStatus = () => {
      // Check if there's a processing status on the first goal
      const processingStatus = _.maxBy(skill.statuses, (status) =>
        dayjs(status.created_at).toDate(),
      )?.status;

      if (processingStatus === "pending") {
        return "Processing";
      }

      if (processingStatus === "failed") {
        return "Failed";
      }

      if (latestAssessment?.report_goals.every((rg) => rg.is_reviewed)) {
        return "Reviewed";
      }

      if (latestAssessment?.report_goals.every((rg) => !rg.is_reviewed)) {
        return "Pending Review";
      }

      return "In Review";
    };

    // Get status icon and color based on status
    const getStatusIconAndColor = () => {
      const status = getStatus();

      switch (status) {
        case "Processing":
          return { icon: Clock, color: "text-chart-4" };
        case "Failed":
          return { icon: AlertTriangle, color: "text-destructive" };
        case "Reviewed":
          return { icon: CheckCircle2, color: "text-chart-2" };
        case "Pending Review":
          return { icon: FileWarning, color: "text-chart-4" };
        case "In Review":
          return { icon: Eye, color: "text-chart-1" };
        default:
          return { icon: ArrowRight, color: "text-primary" };
      }
    };

    const { icon: StatusIcon, color: statusColor } = getStatusIconAndColor();

    const reportSkillPositiveScaleTags =
      skill.scales.map((s) => s.positive_tag_title) ?? [];
    const reportSkillNegativeScaleTags =
      skill.scales.map((s) => s.negative_tag_title) ?? [];
    const reportSkillScaleTags = [
      ...reportSkillPositiveScaleTags.flatMap((t) => t.split(",")),
      ...reportSkillNegativeScaleTags.flatMap((t) => t.split(",")),
    ];
    const momentSubtagFrequencies = _.countBy(
      latestAssessment?.report_moments.flatMap((rm, idx) =>
        transformMoment(rm.moment, idx)
          .subtags.map((s) => s.tag)
          .filter((t) => t && reportSkillScaleTags.includes(t)),
      ),
    );

    const numerator = _.sumBy(
      Object.entries(momentSubtagFrequencies).filter(([label]) =>
        reportSkillNegativeScaleTags.includes(label),
      ),
      ([, qty]) => qty,
    );
    const denominator = _.sum(Object.values(momentSubtagFrequencies));
    const totalScore =
      denominator <= 0 ? 0 : 0.5 + 0.5 * (numerator / denominator);

    const navigateToReport = () => {
      if (
        isEnabled &&
        !isLoading &&
        latestSkillAssessmentStatus &&
        hasAssessments
      ) {
        router.push(
          `/goals/reports/${latestSkillAssessmentStatus?.id}?goalId=${skillAssessmentGoal?.goal_id}`,
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
                  animate={{ opacity: isHovered && isEnabled ? 0.8 : 0 }}
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
            value={totalScore * 100}
            min={0}
            max={100}
            size="md"
            className="h-48"
            hasAssessments={hasAssessments}
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
    <div
      className={cn(
        "flex h-full w-full flex-1 items-center justify-center pt-2",
        className,
      )}
    >
      <motion.div
        className={cn("relative", sizeClasses[size])}
        variants={gaugeVariants}
      >
        {/* SVG gauge */}
        <svg viewBox="0 0 200 200" className="h-full w-full">
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
                className="text-5xl font-bold"
                initial={{ value: min } as any}
                animate={{ value: displayValue } as any}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                {Math.round(displayValue)}
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
