"use client";

import { motion } from "framer-motion";
import { FileX2Icon, Loader2 } from "lucide-react";
import Link from "next/link";

import { ReportCard } from "~/components/report-card";
import { useProfile } from "~/hooks/use-profile";
import { api } from "~/trpc/react";

export default function ReportsPage() {
  const { profile } = useProfile();
  const { data: reports, isLoading } = api.reports.listForUser.useQuery({
    userId: profile?.id ?? "",
  });

  if (isLoading) {
    return (
      <div className="mt-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading reports...</p>
        </motion.div>
      </div>
    );
  }

  if (!reports?.length) {
    return (
      <div className="mt-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <FileX2Icon className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No reports found</p>
        </motion.div>
      </div>
    );
  }

  const sortedReports = [...reports].sort((a, b) => {
    if (a.status === "failed" && b.status !== "failed") return 1;
    if (a.status !== "failed" && b.status === "failed") return -1;
    return 0;
  });

  return (
    <div className="container mx-auto space-y-8 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {sortedReports.map((report, index) => (
          <Link
            key={report.id}
            href={`/goals/reports/${report.id}`}
            className="block h-full"
            tabIndex={0}
          >
            <ReportCard
              report={report}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            />
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
