"use client";

import { motion } from "framer-motion";
import { Calendar, FileText, Info } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import type { ListReportsToolOutput } from "~/lib/ai/tools";
import { cn } from "~/lib/utils";

interface ReportListProps {
  reports: ListReportsToolOutput;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2 },
  },
};

export function ReportList({ reports, className }: ReportListProps) {
  const reportsFlattened = reports.flatMap((r) => r.reports);

  if (!reportsFlattened.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Info className="h-4 w-4" />
        <span>No reports found</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("space-y-2", className)}
    >
      {reportsFlattened.map((report) => (
        <motion.div
          key={report.id}
          variants={itemVariants}
          onClick={() => {
            window.open(`/reports/${report.id}`, "_blank");
          }}
          className="group flex cursor-pointer flex-col gap-2 rounded-md border border-border/50 bg-background/50 p-3 transition-colors hover:border-primary/20"
        >
          {/* Title and Skill */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h4 className="font-medium group-hover:text-primary">
                {report.summary || "Untitled Report"}
              </h4>
            </div>
            {report.skill?.title && (
              <Badge variant="outline" className="text-xs">
                {report.skill.title}
              </Badge>
            )}
          </div>

          {/* Date Range */}
          {(report.start_date || report.end_date) && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {report.start_date
                  ? new Date(report.start_date).toLocaleDateString()
                  : "Start"}{" "}
                -{" "}
                {report.end_date
                  ? new Date(report.end_date).toLocaleDateString()
                  : "Present"}
              </span>
            </div>
          )}

          {/* Summary */}
          {report.summary && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {report.summary}
            </p>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
