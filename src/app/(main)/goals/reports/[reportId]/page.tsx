"use client";

import { motion } from "framer-motion";
import { FileX2Icon, Loader2 } from "lucide-react";

import { ReportPageClient } from "./page.client";
import { api } from "~/trpc/react";

export default function ReportPage({
  params,
}: {
  params: { reportId: string };
}) {
  const { data, isLoading } = api.reports.getGroupReports.useQuery({
    groupId: params.reportId,
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
          <p className="text-sm text-muted-foreground">Loading report...</p>
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <FileX2Icon className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Report not found</p>
        </motion.div>
      </div>
    );
  }

  return <ReportPageClient group={data.group} reports={data.reports} />;
}
