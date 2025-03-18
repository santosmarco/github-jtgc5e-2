"use client";

import dayjs from "dayjs";
import { motion, AnimatePresence, type MotionProps } from "framer-motion";
import {
  AlertTriangle,
  FileText,
  Goal,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";

type Report = RouterOutputs["reports"]["listForUser"][number];

type ReportCardProps = MotionProps & {
  report: Report;
  className?: string;
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
      mass: 1,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10,
    },
  },
};

const statusVariants = {
  processing: {
    rotate: 360,
    transition: {
      duration: 2,
      repeat: Number.POSITIVE_INFINITY,
      ease: "linear",
    },
  },
};

export function ReportCard({
  report: initialReport,
  className,
  ...props
}: ReportCardProps) {
  const router = useRouter();
  const [report, setReport] = useState(initialReport);
  const { data: updatedReport } = api.reports.getGroupReportStatus.useQuery(
    { groupId: report.id },
    {
      enabled: report.status !== "completed" && report.status !== "failed",
      refetchInterval: 2000,
    },
  );

  useEffect(() => {
    if (updatedReport) {
      setReport((current) => ({
        ...current,
        status: updatedReport.status,
      }));
    }
  }, [updatedReport]);

  const isProcessing =
    report.status === "pending" || report.status === "partial";
  const isFailed = report.status === "failed";
  const isComplete = report.status === "completed";
  const goals = report.report_goals ?? [];
  const remainingGoals = Math.max(0, goals.length - 2);

  // Only allow interaction for completed reports
  const isInteractive = isComplete;

  const handleClick = (e: React.MouseEvent) => {
    if (!isInteractive) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    router.push(`/goals/reports/${report.id}`);
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "group relative min-h-[8.25rem] overflow-hidden rounded-xl border bg-gradient-to-br from-background to-muted/30 p-6 text-card-foreground shadow-lg transition-all duration-300",
        isInteractive &&
          "hover:border-primary hover:from-background hover:to-muted/50 hover:shadow-xl",
        isFailed && "border-destructive/20 bg-destructive/5",
        !isInteractive && "cursor-not-allowed opacity-80",
        className,
      )}
      onClick={handleClick}
      {...props}
    >
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(var(--primary-rgb),0.1),transparent)]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Hover animation background effect - only for interactive cards */}
      {isInteractive && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-primary/0 to-primary/5 opacity-0 transition-opacity duration-300"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%"],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            ease: "linear",
          }}
        />
      )}

      <div className="relative space-y-6">
        <motion.div
          variants={itemVariants}
          className="flex items-start justify-between"
        >
          <motion.div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg border shadow-inner",
                isComplete
                  ? "border-primary/20 bg-primary/10"
                  : isFailed
                    ? "border-destructive/20 bg-destructive/10"
                    : "border-muted bg-muted/10",
              )}
            >
              <FileText
                className={cn(
                  "h-5 w-5",
                  isComplete
                    ? "text-primary"
                    : isFailed
                      ? "text-destructive"
                      : "text-muted-foreground",
                )}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium leading-none">
                Assessment {dayjs(report.created_at).format("MMM D, YYYY")}
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {goals.length} goal{goals.length !== 1 ? "s" : ""} reviewed
              </p>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1"
              >
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">
                  Complete
                </span>
              </motion.div>
            )}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="flex items-center gap-2 rounded-full bg-muted/20 px-3 py-1"
              >
                <motion.div variants={statusVariants} animate="processing">
                  <Loader2 className="h-4 w-4 text-primary" />
                </motion.div>
                <span className="text-xs font-medium text-primary">
                  Processing
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-2">
          {goals.slice(0, 2).map((goal, index) => (
            <motion.div
              key={goal.id}
              variants={itemVariants}
              custom={index}
              className="flex items-center gap-3"
            >
              <Goal className="h-4 w-4 text-primary/60" />
              <span className="text-sm text-muted-foreground">{goal.text}</span>
            </motion.div>
          ))}
          {remainingGoals > 0 && (
            <motion.div
              variants={itemVariants}
              custom={2}
              className="flex items-center gap-2"
            >
              <Goal className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                +{remainingGoals} more goals
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {(isFailed || isProcessing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex w-full flex-col items-center gap-3 rounded-xl bg-background/80 p-6 shadow-lg"
            >
              {isFailed ? (
                <>
                  <div className="rounded-full bg-destructive/10 p-2">
                    <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-destructive">
                      Processing Failed
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Please try again later
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-primary/10 p-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    >
                      <Loader2 className="h-4.5 w-4.5 text-primary" />
                    </motion.div>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">
                      Processing Assessment
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This may take a few moments
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
