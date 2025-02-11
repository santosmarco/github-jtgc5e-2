"use client";

import { motion, stagger } from "framer-motion";
import { ArrowRight, Goal, Loader2, Trophy, XCircle } from "lucide-react";

import dayjs from "dayjs";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";
import { Link } from "../ui/link";
import { Separator } from "../ui/separator";

type GoalProgressCardProps = {
  goal: RouterOutputs["goals"]["getGoals"][number];
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.15,
    },
  },
};

const contentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const iconVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      duration: 0.4,
    },
  },
};

export function GoalProgressCard({ goal }: GoalProgressCardProps) {
  if (goal.completed_at) {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden"
      >
        <Card className="bg-gradient-to-br from-background via-background to-background transition-all duration-300 hover:from-primary/5 hover:via-background hover:to-background">
          <CardHeader>
            <motion.div className="flex flex-col items-center justify-center">
              <motion.div variants={iconVariants}>
                <Trophy className="h-12 w-12 text-emerald-500" />
              </motion.div>
              <motion.h3
                variants={contentVariants}
                className="mt-4 text-center text-lg font-semibold"
              >
                Goal Completed!
              </motion.h3>
              <motion.p
                variants={contentVariants}
                className="mt-2 text-center text-sm text-muted-foreground"
              >
                Congratulations on achieving your goal on{" "}
                {new Date(goal.completed_at).toLocaleDateString()}
              </motion.p>
            </motion.div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  const goalReport = goal.reports[0];
  const goalReportGoal = goal.report_goals.find(
    (rg) => rg.report_id === goalReport?.id && rg.goal_id === goal.id,
  );
  const goalReportProcessingStatus = goal.reportProcessingStatus;

  if (!goalReport || !goalReportGoal) {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden"
      >
        <Card className="bg-gradient-to-br from-background via-background to-background transition-all duration-300 hover:from-primary/5 hover:via-background hover:to-background">
          <CardHeader>
            <motion.div className="flex flex-col items-center justify-center">
              <motion.div variants={iconVariants}>
                <Goal className="h-12 w-12 text-muted-foreground/50" />
              </motion.div>
              <motion.h3
                variants={contentVariants}
                className="mt-4 text-center text-lg font-semibold"
              >
                No Progress Report Yet
              </motion.h3>
              <motion.p
                variants={contentVariants}
                className="mt-2 text-center text-sm text-muted-foreground"
              >
                Your first progress report will appear here once it's generated.
              </motion.p>
            </motion.div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  if (goalReportProcessingStatus?.status === "pending") {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden"
      >
        <Card className="bg-gradient-to-br from-background via-background to-background transition-all duration-300 hover:from-primary/5 hover:via-background hover:to-background">
          <CardHeader>
            <motion.div className="flex flex-col items-center justify-center py-6">
              <motion.div variants={iconVariants} className="relative mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </motion.div>
              <motion.h3
                variants={contentVariants}
                className="text-center text-lg font-semibold"
              >
                Analyzing Your Progress
              </motion.h3>
              <motion.p
                variants={contentVariants}
                className="mt-2 text-center text-sm text-muted-foreground"
              >
                We're processing your latest activity data to generate
                insights...
              </motion.p>
            </motion.div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  if (goalReportProcessingStatus?.status === "failed") {
    return (
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden"
      >
        <Card className="bg-gradient-to-br from-background via-background to-background transition-all duration-300 hover:from-primary/5 hover:via-background hover:to-background">
          <CardHeader>
            <motion.div className="flex flex-col items-center justify-center">
              <motion.div variants={iconVariants}>
                <XCircle className="h-12 w-12 text-destructive" />
              </motion.div>
              <motion.h3
                variants={contentVariants}
                className="mt-4 text-center text-lg font-semibold"
              >
                Processing Failed
              </motion.h3>
              <motion.p
                variants={contentVariants}
                className="mt-2 text-center text-sm text-muted-foreground"
              >
                We encountered an issue while analyzing your progress. Please
                try again later.
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
      <Card className="bg-gradient-to-br from-background via-background to-background transition-all duration-300 hover:from-primary/5 hover:via-background hover:to-background">
        <div className="space-y-4">
          <CardHeader className="pb-0">
            <motion.div className="flex flex-row items-center justify-between">
              <motion.h3
                variants={contentVariants}
                className="text-center text-lg font-semibold leading-none"
              >
                Goal Progress
              </motion.h3>
              <motion.div
                variants={contentVariants}
                className="flex items-center gap-2"
              >
                <motion.div
                  variants={iconVariants}
                  className={cn(
                    "h-2 w-2 rounded-full",
                    goalReportGoal.is_reviewed
                      ? "bg-emerald-400"
                      : "bg-orange-400",
                  )}
                />
                <span className="text-sm text-muted-foreground">
                  {goalReportGoal.is_reviewed ? "Reviewed" : "Not Reviewed"}
                </span>
              </motion.div>
            </motion.div>

            <motion.div
              variants={contentVariants}
              className="flex items-center gap-1 pb-1 pt-0.5 text-sm text-muted-foreground"
            >
              <span>{dayjs(goalReport.start_date).format("MMM D")}</span>
              <ArrowRight className="h-3 w-3" />
              <span>{dayjs(goalReport.end_date).format("MMM D")}</span>
            </motion.div>

            <Separator />
          </CardHeader>

          <CardContent>
            <motion.div variants={contentVariants} className="relative">
              <p className="text-center text-sm text-muted-foreground">
                {goalReport.summary?.replace(/^['"]|['"]$/g, "")}
              </p>
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
            </motion.div>
          </CardContent>

          {goalReportProcessingStatus?.group_processing_status_id && (
            <CardFooter>
              <Link
                href={`/goals/reports/${goalReportProcessingStatus?.group_processing_status_id}?goalId=${goal.id}`}
                className="w-full"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  variants={contentVariants}
                  className="w-full"
                >
                  <Button className="w-full">Review</Button>
                </motion.div>
              </Link>
            </CardFooter>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
