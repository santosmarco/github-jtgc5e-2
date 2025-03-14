"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import _ from "lodash";
import {
  ArrowRight,
  Goal,
  Loader2,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardHeader } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";
import { Link } from "../ui/link";
import { Separator } from "../ui/separator";

export type SkillProgressCardProps = {
  skill: RouterOutputs["skills"]["getAllSkills"][number];
  disabled?: boolean;
  loading?: boolean;
  completed?: boolean;
  completedAt?: string;
  onEnable?: () => void;
};

// Animation variants
const cardVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 70,
      damping: 20,
      mass: 1,
      staggerChildren: 0.08,
    },
  },
};

const contentVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 12,
    },
  },
};

const iconContainerVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const backgroundAnimation = {
  scale: [1, 1.05, 1],
  opacity: [0.2, 0.3, 0.2],
  transition: {
    duration: 6,
    repeat: Number.POSITIVE_INFINITY,
    ease: "easeInOut",
  },
};

export function SkillProgressCard({
  skill,
  disabled = false,
  loading = false,
  completed = false,
  completedAt,
  onEnable,
}: SkillProgressCardProps) {
  const baseCardClasses =
    "relative h-60 w-[350px] bg-gradient-to-br from-background to-muted/20 " +
    "transition-all duration-300 hover:from-primary/5 hover:to-background " +
    "border border-border/40 backdrop-blur-sm";

  if (disabled || loading) {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden"
      >
        <Card className={baseCardClasses}>
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(var(--primary-rgb),0.05),transparent_70%)]"
            animate={backgroundAnimation}
          />

          <CardHeader className="relative flex h-full items-center justify-center">
            <motion.div className="flex flex-col items-center justify-center">
              <motion.h3
                variants={contentVariants}
                className="text-center text-lg font-medium"
              >
                Enable Skill Tracking
              </motion.h3>
              <motion.p
                variants={contentVariants}
                className="mt-2 text-center text-sm text-muted-foreground/80"
              >
                Get insights and feedback on your development
              </motion.p>

              <motion.div variants={contentVariants} className="mt-5">
                <Button
                  onClick={onEnable}
                  className="bg-primary/90 transition-all duration-300 hover:bg-primary"
                  size="sm"
                  disabled={loading}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1.5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                      className="mr-2 h-4 w-4 rounded-full border-2 border-background border-t-transparent"
                    />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {loading ? "Enabling..." : "Enable"}
                </Button>
              </motion.div>
            </motion.div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  if (completed && completedAt) {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden"
      >
        <Card className={`${baseCardClasses} border-emerald-500/10`}>
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.08),transparent_70%)]"
            animate={backgroundAnimation}
          />

          <CardHeader className="relative flex h-full items-center justify-center">
            <motion.div className="flex flex-col items-center justify-center">
              <motion.div
                variants={iconContainerVariants}
                className="from-emerald-500/8 relative flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/20 bg-gradient-to-br to-background shadow-sm"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{
                    background:
                      "conic-gradient(from 0deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05), rgba(16,185,129,0.2))",
                  }}
                />
                <Trophy className="h-10 w-10 text-emerald-500" />
              </motion.div>

              <motion.h3
                variants={contentVariants}
                className="mt-5 text-center text-lg font-medium text-foreground/90"
              >
                Goal Completed!
              </motion.h3>
              <motion.p
                variants={contentVariants}
                className="mt-2 text-center text-sm text-muted-foreground/80"
              >
                Achieved on{" "}
                {new Date(completedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </motion.p>
            </motion.div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  const latestSkillAssessment = _.orderBy(
    skill.reports,
    [(report) => dayjs(report.created_at).toDate()],
    ["desc"],
  )[0];

  const latestSkillAssessmentStatus = _.orderBy(
    skill.statuses,
    [(status) => dayjs(status.created_at).toDate()],
    ["desc"],
  )[0];

  const latestSkillAssessmentProcessingStatus =
    latestSkillAssessmentStatus?.status;

  const skillAssessmentGoal = latestSkillAssessment?.report_goals.find(
    (reportGoal) => skill.goals.some((goal) => goal.id === reportGoal.goal_id),
  );

  if (!latestSkillAssessment || !skillAssessmentGoal) {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden"
      >
        <Card className={baseCardClasses}>
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(var(--muted-rgb),0.08),transparent_70%)]"
            animate={backgroundAnimation}
          />

          <CardHeader className="relative flex h-full items-center justify-center">
            <motion.div className="flex flex-col items-center justify-center">
              <motion.div
                variants={iconContainerVariants}
                className="relative flex h-20 w-20 items-center justify-center rounded-full border border-muted/50 bg-gradient-to-br from-muted/10 to-background shadow-sm"
              >
                <Goal className="h-10 w-10 text-muted-foreground/60" />
              </motion.div>

              <motion.h3
                variants={contentVariants}
                className="mt-5 text-center text-lg font-medium"
              >
                No Assessment Yet
              </motion.h3>
              <motion.p
                variants={contentVariants}
                className="mt-2 text-center text-sm text-muted-foreground/80"
              >
                Your progress data will appear here soon
              </motion.p>
            </motion.div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  if (latestSkillAssessmentProcessingStatus === "pending") {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden"
      >
        <Card className={baseCardClasses}>
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(var(--primary-rgb),0.08),transparent_70%)]"
            animate={backgroundAnimation}
          />

          <CardHeader className="relative flex h-full items-center justify-center">
            <motion.div className="flex flex-col items-center justify-center">
              <motion.div
                variants={iconContainerVariants}
                className="from-primary/8 relative flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-gradient-to-br to-background shadow-sm"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  <Loader2 className="h-10 w-10 text-primary/80" />
                </motion.div>
              </motion.div>

              <motion.h3
                variants={contentVariants}
                className="mt-5 text-center text-lg font-medium"
              >
                Analyzing Progress
              </motion.h3>
              <motion.p
                variants={contentVariants}
                className="mt-2 text-center text-sm text-muted-foreground/80"
              >
                Processing your activity data...
              </motion.p>
            </motion.div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  if (latestSkillAssessmentProcessingStatus === "failed") {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden"
      >
        <Card className={baseCardClasses}>
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(var(--destructive-rgb),0.05),transparent_70%)]"
            animate={backgroundAnimation}
          />

          <CardHeader className="relative flex h-full items-center justify-center">
            <motion.div className="flex flex-col items-center justify-center">
              <motion.div
                variants={iconContainerVariants}
                className="relative flex h-20 w-20 items-center justify-center rounded-full border border-destructive/20 bg-gradient-to-br from-destructive/5 to-background shadow-sm"
              >
                <XCircle className="h-10 w-10 text-destructive/80" />
              </motion.div>

              <motion.h3
                variants={contentVariants}
                className="mt-5 text-center text-lg font-medium"
              >
                Processing Failed
              </motion.h3>
              <motion.p
                variants={contentVariants}
                className="mt-2 text-center text-sm text-muted-foreground/80"
              >
                We encountered an issue with your data
              </motion.p>
            </motion.div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden"
    >
      <Card className={baseCardClasses}>
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(var(--primary-rgb),0.08),transparent_70%)]"
          animate={backgroundAnimation}
        />

        <div className="flex h-full flex-col justify-between p-6">
          <div className="space-y-3">
            <motion.div
              variants={contentVariants}
              className="flex flex-row items-center justify-between"
            >
              <motion.h3
                variants={contentVariants}
                className="text-md font-medium leading-none tracking-tight"
              >
                Progress Insights
              </motion.h3>
              <motion.div
                variants={contentVariants}
                className="flex items-center gap-2"
              >
                <motion.div
                  variants={iconContainerVariants}
                  className={cn(
                    "h-2 w-2 rounded-full shadow-sm",
                    skillAssessmentGoal.is_reviewed
                      ? "bg-emerald-500"
                      : "bg-amber-400",
                  )}
                />
                <span className="text-xs text-muted-foreground/80">
                  {skillAssessmentGoal.is_reviewed ? "Reviewed" : "New"}
                </span>
              </motion.div>
            </motion.div>

            <motion.div
              variants={contentVariants}
              className="flex items-center gap-1 pb-1 pt-0.5 text-xs text-muted-foreground/70"
            >
              <span>
                {dayjs(latestSkillAssessment.start_date).format("MMM D")}
              </span>
              <ArrowRight className="h-3 w-3" />
              <span>
                {dayjs(latestSkillAssessment.end_date).format("MMM D")}
              </span>
            </motion.div>

            <Separator className="my-3 opacity-30" />

            <motion.div
              variants={contentVariants}
              className="relative flex-grow pb-2 pt-1"
            >
              <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground/90">
                {latestSkillAssessment.summary?.replace(/^['"]|['"]$/g, "")}
              </p>
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent" />
            </motion.div>
          </div>

          {latestSkillAssessmentStatus?.id && (
            <motion.div
              variants={contentVariants}
              className="relative z-10 mt-auto pt-2"
            >
              <Link
                href={`/goals/reports/${latestSkillAssessmentStatus.id}?goalId=${skillAssessmentGoal.goal_id}`}
                className="block w-full"
              >
                <Button
                  className="pointer-events-auto w-full bg-primary/90 transition-all duration-300 hover:bg-primary"
                  size="sm"
                >
                  Review
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
