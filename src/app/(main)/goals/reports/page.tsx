"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, FileX2Icon, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { ReportCard } from "~/components/report-card";
import { useProfile } from "~/hooks/use-profile";
import { api } from "~/trpc/react";

export default function ReportsPage() {
  const { profile } = useProfile();
  const [page, setPage] = useState(1);
  const pageSize = 9;
  const utils = api.useUtils();

  const { data, isLoading } = api.reports.listForUser.useQuery({
    userId: profile?.id ?? "",
    page,
    pageSize,
  });

  const reports = data?.reports;
  const pagination = data?.pagination;

  // Prefetch next page data when current page changes
  useEffect(() => {
    if (pagination && page < pagination.totalPages && profile?.id) {
      // Prefetch the next page in the background
      void utils.reports.listForUser.prefetch({
        userId: profile.id,
        page: page + 1,
        pageSize,
      });
    }
  }, [page, pagination, profile?.id, utils.reports.listForUser]);

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
          <p className="text-sm text-muted-foreground">
            Loading assessments...
          </p>
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
          <p className="text-sm text-muted-foreground">No assessments found</p>
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
      <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {sortedReports.map((report, index) => (
          <Link
            key={report.id}
            href={`/goals/reports/${report.id}`}
            className="flex h-full"
            tabIndex={0}
          >
            <ReportCard
              report={report}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="h-full w-full"
            />
          </Link>
        ))}
      </motion.div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setPage((prev) => Math.min(prev + 1, pagination.totalPages))
            }
            disabled={page === pagination.totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
