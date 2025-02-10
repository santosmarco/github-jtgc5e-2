"use client";

import { ArrowRight, Goal, Loader2, Trophy, XCircle } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import type { RouterOutputs } from "~/trpc/react";
import { Link } from "../ui/link";
import { Separator } from "../ui/separator";
import dayjs from "dayjs";
import { cn } from "~/lib/utils";

type GoalProgressCardProps = {
  goal: RouterOutputs["goals"]["getGoals"][number];
};

export function GoalProgressCard({ goal }: GoalProgressCardProps) {
  if (goal.completed_at) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col items-center justify-center">
            <Trophy className="h-12 w-12 text-emerald-500" />
            <h3 className="mt-4 text-lg font-semibold">Goal Completed!</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Congratulations on achieving your goal on{" "}
              {new Date(goal.completed_at).toLocaleDateString()}
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const goalReport = goal.reports[0];
  const goalReportGoal = goal.report_goals.find(
    (rg) => rg.report_id === goalReport?.id && rg.goal_id === goal.id,
  );
  const goalReportProcessingStatus = goal.reportProcessingStatus;

  if (!goalReport || !goalReportGoal) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col items-center justify-center">
            <Goal className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              No Progress Report Yet
            </h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Your first progress report will appear here once it's generated.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (goalReportProcessingStatus?.status === "pending") {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="relative mb-4"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </motion.div>
            <h3 className="text-lg font-semibold">Analyzing Your Progress</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              We're processing your latest activity data to generate insights...
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (goalReportProcessingStatus?.status === "failed") {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <XCircle className="h-12 w-12 text-destructive" />
            </motion.div>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center"
            >
              <h3 className="mt-4 text-lg font-semibold">Processing Failed</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                We encountered an issue while analyzing your progress. Please
                try again later.
              </p>
            </motion.div>
            {/* @todo: add retry button
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-6"
            >
              <Button variant="outline">Retry Analysis</Button>
            </motion.div>
            */}
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <CardHeader className="pb-0">
          <div className="flex flex-row items-center justify-between">
            <h3 className="text-lg font-semibold leading-none">
              Goal Progress
            </h3>
            <div className="flex items-center gap-2">
              <div
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
            </div>
          </div>

          <div className="flex items-center gap-1 pb-1 pt-0.5 text-sm text-muted-foreground">
            <span>{dayjs(goalReport.start_date).format("MMM D")}</span>
            <ArrowRight className="h-3 w-3" />
            <span>{dayjs(goalReport.end_date).format("MMM D")}</span>
          </div>

          <Separator />
        </CardHeader>

        <CardContent>
          <div className="relative">
            <p className="text-sm text-muted-foreground">
              {goalReport.summary?.replace(/^['"]|['"]$/g, "")}
            </p>
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
          </div>
        </CardContent>

        {goalReportProcessingStatus?.group_processing_status_id && (
          <CardFooter>
            <Link
              href={`/goals/reports/${goalReportProcessingStatus?.group_processing_status_id}`}
              className="w-full"
            >
              <Button className="w-full">Review</Button>
            </Link>
          </CardFooter>
        )}
      </div>
    </Card>
  );
}
