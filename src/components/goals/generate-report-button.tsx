"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import type { Tables } from "~/lib/supabase/database.types";
import { api } from "~/trpc/react";

type GenerateReportButtonProps = {
  goals: Tables<"goals">[];
};

export function GenerateReportButton({ goals }: GenerateReportButtonProps) {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const generateReportMutation = api.goals.generateReport.useMutation({
    onSuccess: (data) => {
      if (data.success && data.job_id) {
        setCurrentJobId(data.job_id);
        setReportStatus("processing");
        toast.success("Report generation initiated");

        // Start polling for status
        const interval = setInterval(() => {
          void (async () => {
            try {
              const status = await apiUtils.reports.getGroupReportStatus.fetch({
                groupId: data.job_id,
              });

              if (status) {
                setReportStatus(status.status);
                if (status.status === "completed") {
                  clearInterval(interval);
                  setIsGeneratingReport(false);
                  setReportSuccess(true);
                  router.push(`/reports/${data.job_id}`);
                } else if (status.status === "failed") {
                  clearInterval(interval);
                  setIsGeneratingReport(false);
                  setReportSuccess(false);
                  toast.error("Report generation failed");
                }
              }
            } catch (error) {
              clearInterval(interval);
              setIsGeneratingReport(false);
              setReportSuccess(false);
              toast.error("Failed to check report status");
            }
          })();
        }, 2000); // Poll every 2 seconds

        // Cleanup interval after 5 minutes (timeout)
        setTimeout(
          () => {
            clearInterval(interval);
            if (reportStatus === "processing") {
              setIsGeneratingReport(false);
              setReportSuccess(false);
              toast.error("Report generation timed out");
            }
          },
          5 * 60 * 1000,
        );
      } else {
        toast.error(data.error ?? "Failed to initiate report generation");
        setIsGeneratingReport(false);
      }
    },
    onError: (error) => {
      toast.error("Failed to generate report", {
        description: error.message,
      });
      setIsGeneratingReport(false);
    },
  });

  const handleGenerateReport = async () => {
    if (!goals?.length) {
      toast.error("No goals found to generate report");
      return;
    }

    setIsGeneratingReport(true);
    setReportSuccess(false);
    setReportStatus(null);

    generateReportMutation.mutate({
      goal_ids: goals.map((goal) => goal.id),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
    >
      <Button
        onClick={handleGenerateReport}
        disabled={isGeneratingReport}
        className="relative"
        size="sm"
        variant="secondary"
      >
        <AnimatePresence mode="wait">
          {isGeneratingReport && !reportStatus ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Loader2Icon className="h-4 w-4 animate-spin" />
              Initiating...
            </motion.div>
          ) : reportStatus === "processing" ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Loader2Icon className="h-4 w-4 animate-spin" />
              Processing...
            </motion.div>
          ) : reportSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 text-green-500"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{ duration: 0.5 }}
              >
                <SparklesIcon className="h-4 w-4" />
              </motion.div>
              Generated!
            </motion.div>
          ) : (
            <motion.div
              key="default"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <SparklesIcon className="h-4 w-4" />
              Generate Report
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
}
