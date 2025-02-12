"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/shared";

type GroupReports = RouterOutputs["reports"]["getGroupReports"];
type Report = GroupReports["reports"][number];

type ReportNavigationProps = {
  reports: Report[];
};

export function ReportNavigation({ reports }: ReportNavigationProps) {
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  useEffect(() => {
    // Set up intersection observer for each report section
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveReportId(entry.target.id);
          }
        }
      },
      {
        rootMargin: "-20% 0px -70% 0px", // Adjust these values to control when the active state changes
        threshold: 0,
      },
    );

    // Observe all report sections
    for (const report of reports) {
      const element = document.getElementById(`report-${report.id}`);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [reports]);

  const handleReportClick = (reportId: string) => {
    const element = document.getElementById(`report-${reportId}`);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 108;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-0 -ml-12 h-screen w-72 overflow-y-auto bg-background/95 px-6 pb-6 pt-[6.75rem] backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="mb-6 text-sm font-medium text-muted-foreground">
        In this report
      </div>
      {reports.map((report, index) => {
        const goal = report.report_goals[0]?.goal;
        if (!goal) return null;

        return (
          <motion.button
            key={report.id}
            onClick={() => handleReportClick(report.id)}
            className="group -ml-1 mb-1 w-full rounded-sm px-2 py-1 text-left text-sm transition-all hover:text-primary"
            whileHover={{ x: 4 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/30 transition-all group-hover:bg-muted-foreground/50",
                  activeReportId === `report-${report.id}` &&
                    "bg-primary group-hover:bg-primary",
                )}
              />
              <span
                className={cn(
                  "line-clamp-1 text-xs",
                  activeReportId !== `report-${report.id}` &&
                    "text-muted-foreground",
                )}
              >
                {goal.text}
              </span>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
