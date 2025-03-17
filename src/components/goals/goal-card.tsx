"use client";

import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import _ from "lodash";
import type { LucideProps } from "lucide-react";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  TrendingUp,
  AlertTriangle,
  FileWarning,
  Eye,
  CheckCheckIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import React, { useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { type RouterOutputs, api } from "~/trpc/react";
import { SkillProgressCard } from "./goal-progress-card";

export type SkillCardProps = {
  skill: RouterOutputs["skills"]["getAllSkills"][number];
  profileId: string;
  onSkillEnabled?: () => void;
};

// Refined animations for a more elegant feel
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

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
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

// Stats animations
const statsVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 12,
      delay: 0.2,
    },
  },
};

// Subtle pattern animation
const patternAnimation = {
  scale: [1, 1.05, 1],
  opacity: [0.2, 0.3, 0.2],
  transition: {
    duration: 6,
    repeat: Number.POSITIVE_INFINITY,
    ease: "easeInOut",
  },
};

export const SkillCard = React.forwardRef<HTMLDivElement, SkillCardProps>(
  function SkillCard({ skill, profileId, onSkillEnabled }, ref) {
    const Icon = useMemo(
      () =>
        dynamic<LucideProps>(
          () =>
            import("lucide-react").then(
              (mod) =>
                mod.icons[
                  skill.icon && skill.icon in mod.icons
                    ? (skill.icon as keyof typeof mod.icons)
                    : "Target"
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
          onSkillEnabled?.();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      });

    const handleSkillEnable = () => {
      enableSkill({
        skillId: skill.id,
        profileId: profileId,
      });
    };

    const isEnabled = skill.goals.some((goal) => goal.is_default);

    const isCompleted =
      skill.goals && skill.goals.length > 0
        ? skill.goals.every((goal) => Boolean(goal.completed_at))
        : false;
    const completedAt = _.maxBy(
      skill.goals.filter((x) => x.completed_at),
      (x) => dayjs(x.completed_at),
    )?.completed_at;

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
    const totalReviews = reviewedAssessments.length;
    const latestAssessment =
      skillAssessments.length > 0
        ? _.orderBy(
            skillAssessments,
            [(r) => dayjs(r.created_at).toDate()],
            ["desc"],
          )[0]
        : null;
    const latestReview =
      reviewedAssessments.length > 0
        ? _.orderBy(
            reviewedAssessments,
            [(r) => dayjs(r.created_at).toDate()],
            ["desc"],
          )[0]
        : null;
    const hasAssessments = skillAssessments.length > 0;

    const skillAssessmentGoal = latestAssessment?.report_goals.find(
      (reportGoal) =>
        skill.goals.some((goal) => goal.id === reportGoal.goal_id),
    );

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
          return { icon: Clock, color: "text-amber-500/70" };
        case "Failed":
          return { icon: AlertTriangle, color: "text-rose-500/80" };
        case "Reviewed":
          return { icon: CheckCircle2, color: "text-emerald-500/70" };
        case "Pending Review":
          return { icon: FileWarning, color: "text-amber-500/70" };
        case "In Review":
          return { icon: Eye, color: "text-indigo-500/80" };
        default:
          return { icon: ArrowRight, color: "text-primary/70" };
      }
    };

    const { icon: StatusIcon, color: statusColor } = getStatusIconAndColor();

    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="h-full overflow-visible border-b border-border/40 pb-5"
      >
        <div className="grid h-full grid-cols-4 gap-x-4 overflow-visible">
          <Card className="relative col-span-3 flex h-full flex-col overflow-visible border border-border/40 bg-gradient-to-br from-background to-muted/20 shadow-sm backdrop-blur-sm">
            <div className="flex h-full w-full flex-col justify-between overflow-visible">
              <div className="flex flex-col justify-between overflow-visible">
                <motion.div
                  variants={itemVariants}
                  className="flex items-start justify-between gap-5 p-5"
                >
                  <div className="flex items-start gap-5">
                    <motion.div
                      variants={iconContainerVariants}
                      className={cn(
                        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border shadow-sm transition-all duration-300",
                        isCompleted
                          ? "border-muted/50 from-muted/40 to-background"
                          : "border-primary/20 from-primary/5 to-background",
                      )}
                      style={{ height: "100px", width: "100px" }}
                    >
                      {/* Animated background patterns */}
                      <motion.div className="absolute inset-0">
                        <motion.div
                          className={cn(
                            "absolute inset-0",
                            isCompleted
                              ? "bg-[radial-gradient(circle_at_50%_50%,rgba(161,161,170,0.08),transparent)]"
                              : "bg-[radial-gradient(circle_at_50%_50%,rgba(45.3,121,245,0.08),transparent)]",
                          )}
                          animate={patternAnimation}
                        />
                      </motion.div>

                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 100,
                          damping: 15,
                          delay: 0.1,
                        }}
                      >
                        <Icon
                          className={cn(
                            "relative h-12 w-12 transition-all duration-300",
                            isCompleted
                              ? "text-muted-foreground/60"
                              : "text-primary drop-shadow-sm",
                          )}
                        />
                      </motion.div>

                      {isCompleted && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 15,
                          }}
                          className="absolute bottom-3 right-3 rounded-full bg-background/70 p-1 backdrop-blur-sm"
                        >
                          <Check className="h-5 w-5 text-emerald-500" />
                        </motion.div>
                      )}
                    </motion.div>

                    <div>
                      <div className="flex items-center gap-2">
                        <motion.h3
                          variants={itemVariants}
                          className={cn(
                            "text-xl font-medium tracking-tight",
                            isCompleted
                              ? "text-muted-foreground/70"
                              : "text-foreground",
                          )}
                        >
                          {skill.title}
                        </motion.h3>

                        {/* {totalReviews > 0 && (
                          <motion.div
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            <Badge
                              variant="secondary"
                              className="ml-1 flex items-center gap-1 bg-primary/10 text-xs font-normal text-primary"
                            >
                              <ClipboardCheck className="h-3 w-3" />
                              <span>
                                {totalReviews}{" "}
                                {totalReviews === 1 ? "review" : "reviews"}
                              </span>
                            </Badge>
                          </motion.div>
                        )} */}
                      </div>

                      <AnimatePresence mode="wait">
                        {skill.description && (
                          <motion.p
                            key="context"
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className={cn(
                              "mt-1 text-sm leading-relaxed",
                              isCompleted
                                ? "text-muted-foreground/60"
                                : "text-muted-foreground/80",
                            )}
                          >
                            {skill.description}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      {/* Enhanced Stats section with improved visual hierarchy */}

                      <motion.div
                        variants={statsVariants}
                        className="mt-3 flex flex-col gap-3"
                      >
                        <div className="flex items-center gap-8">
                          <AnimatePresence mode="wait">
                            {latestAssessment || latestReview ? (
                              <motion.div
                                className="flex w-full items-center gap-10 pb-4"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 100,
                                  damping: 15,
                                  staggerChildren: 0.05,
                                  delayChildren: 0.1,
                                }}
                              >
                                <motion.div
                                  className="flex flex-col rounded-md bg-muted/5 transition-colors hover:bg-muted/10"
                                  initial={{ scale: 0.9, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.2, delay: 0.1 }}
                                >
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80">
                                    <CalendarCheck className="-mt-0.5 h-3.5 w-3.5 text-primary/70" />
                                    <span>
                                      Latest{" "}
                                      {latestReview ? "Review" : "Assessment"}
                                    </span>
                                  </div>
                                  <p className="mt-1 pl-5 text-xs font-medium">
                                    {(latestReview
                                      ? dayjs(latestReview.created_at)
                                      : dayjs(latestAssessment?.created_at)
                                    ).format("MMM D, YYYY")}
                                  </p>
                                </motion.div>

                                <motion.div
                                  className="flex flex-col rounded-md bg-muted/5 transition-colors hover:bg-muted/10"
                                  initial={{ scale: 0.9, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.2, delay: 0.15 }}
                                >
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80">
                                    <StatusIcon
                                      className={`h-3.5 w-3.5 ${statusColor}`}
                                    />
                                    <span>Status</span>
                                  </div>
                                  <p className="mt-1 pl-5 text-xs font-medium">
                                    {getStatus()}
                                  </p>
                                </motion.div>

                                <motion.div
                                  className="flex flex-col rounded-md bg-muted/5 transition-colors hover:bg-muted/10"
                                  initial={{ scale: 0.9, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.2, delay: 0.2 }}
                                >
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80">
                                    <TrendingUp className="h-3.5 w-3.5 text-primary/70" />
                                    <span>Progress</span>
                                  </div>
                                  <p className="mt-1 pl-5 text-xs font-medium">
                                    {skillAssessments.length > 1
                                      ? "Improving"
                                      : "Initial"}
                                  </p>
                                </motion.div>
                              </motion.div>
                            ) : isEnabled ? (
                              <motion.div
                                className="p col-span-3 flex w-full items-center rounded-md bg-muted/5 pb-9 pl-0"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 100,
                                  damping: 15,
                                }}
                              >
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{
                                    duration: 1.5,
                                    repeat: Number.POSITIVE_INFINITY,
                                    ease: "linear",
                                  }}
                                  className="mr-2 h-3 w-3 rounded-full border-2 border-primary/30 border-t-primary"
                                />
                                <p className="text-xs text-muted-foreground/80">
                                  Waiting for your first skill assessment...
                                </p>
                              </motion.div>
                            ) : (
                              <motion.div
                                className="col-span-3 mb-[1.625rem] flex items-center justify-center rounded-md border border-primary/20 bg-primary/5 px-2 py-1"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{
                                  opacity: 1,
                                  y: 0,
                                  transition: {
                                    type: "spring",
                                    stiffness: 100,
                                    damping: 15,
                                  },
                                }}
                                exit={{ opacity: 0, y: -5 }}
                              >
                                <p className="text-center text-xs font-medium text-primary/90">
                                  Enable skill tracking to see progress
                                  statistics
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </Card>

          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{
                type: "spring",
                stiffness: 70,
                damping: 18,
                delay: 0.1,
              }}
              className="col-span-1 h-full w-full"
            >
              <SkillProgressCard
                skill={skill}
                disabled={!isEnabled}
                loading={isEnablingSkill}
                completed={isCompleted}
                completedAt={completedAt ?? undefined}
                onEnable={handleSkillEnable}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    );
  },
);
