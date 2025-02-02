"use client";

import { motion } from "framer-motion";
import { FileText, FileX2Icon } from "lucide-react";
import Link from "next/link";

import { ReportCard } from "~/components/report-card";
import { useProfile } from "~/hooks/use-profile";
import { api } from "~/trpc/react";

export default function ReportsPage() {
  const { profile } = useProfile();
  const { data: user } = api.auth.getUser.useQuery();
  const { data, isLoading } = api.notion.listAll.useQuery();
  const reports =
    user?.is_admin && (!profile || user.id === profile.id)
      ? data
      : data?.filter(
          (v) =>
            v.properties.Client?.type === "select" &&
            v.properties.Client.select?.name === profile?.nickname,
        );

  if (isLoading) {
    return (
      <div className="mt-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <FileText className="h-10 w-10 animate-pulse text-primary" />
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

  return (
    <div className="container mx-auto space-y-8 py-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Reports</h1>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {reports.map((report, index) => (
          <Link key={report.id} href={`/reports/${report.id}`}>
            <ReportCard
              report={report}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            />
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
