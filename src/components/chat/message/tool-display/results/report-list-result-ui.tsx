"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import { CalendarDaysIcon, FileTextIcon, TagIcon } from "lucide-react";

import { CollapsibleSection } from "~/components/chat/collapsible-section";
import type { ListReportsToolOutput } from "~/lib/ai/tools";

type ReportItem = ListReportsToolOutput[number]["reports"][number];

export type ReportCardProps = {
  report: ReportItem;
  index: number;
};

export function ReportCard({ report, index }: ReportCardProps) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: index * 0.08,
      },
    },
  };

  return (
    <motion.a
      href={report.id ? `/reports/${report.id}` : "#"}
      target="_blank"
      rel="noopener noreferrer"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="group flex flex-col rounded-lg border border-border bg-card p-0 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    >
      {/* Card header with title and badge */}
      <div className="flex items-start justify-between bg-muted/30 px-3 pt-3">
        <h5 className="text-xs font-semibold text-foreground transition-all hover:text-primary group-hover:text-primary/90">
          {(report.summary || "Untitled Report").replace(/^["']|["']$/g, "")}
        </h5>
      </div>

      {/* Card body with metadata and summary */}
      <div className="flex flex-1 flex-col gap-2 p-3 pt-[0.5625rem]">
        {/* Metadata section with icons */}
        <div className="flex flex-wrap gap-x-3 gap-y-2">
          {report.skill?.title && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TagIcon className="h-3 w-3 text-muted-foreground" />
              <span>{report.skill.title}</span>
            </div>
          )}

          {(report.start_date || report.end_date) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDaysIcon className="h-3 w-3 text-muted-foreground" />
              <span>
                {report.start_date
                  ? dayjs(report.start_date).format("MMM D")
                  : "Start Date"}{" "}
                to{" "}
                {report.end_date
                  ? dayjs(report.end_date).format("MMM D")
                  : "Present"}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.a>
  );
}

export type ReportListResultUIProps = {
  data: ListReportsToolOutput;
  args?: Record<string, unknown>;
};

export function ReportListResultUI({ data, args }: ReportListResultUIProps) {
  const reportsFlattened = data?.flatMap((r) => r.reports).filter(Boolean);

  if (!reportsFlattened?.length) {
    return (
      <CollapsibleSection
        title="Found Reports"
        icon={FileTextIcon}
        count={0}
        args={args}
        defaultOpen={true}
      >
        <p className="p-3 text-sm text-muted-foreground">No reports found.</p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title="Found Reports"
      icon={FileTextIcon}
      count={reportsFlattened.length}
      args={args}
      defaultOpen={true}
    >
      <div className="grid gap-3 py-2">
        {reportsFlattened.map((report, index) => (
          <ReportCard key={report.id} report={report} index={index} />
        ))}
      </div>
    </CollapsibleSection>
  );
}
