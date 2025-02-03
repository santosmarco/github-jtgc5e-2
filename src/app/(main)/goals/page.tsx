"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3Icon,
  CalendarDaysIcon,
  GoalIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { GoalCard } from "~/components/goals/goal-card";
import {
  GoalCreationDrawer,
  type GoalFormValues,
} from "~/components/goals/goal-creation-drawer";
import { NewGoalForm } from "~/components/goals/new-goal-form";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useProfile } from "~/hooks/use-profile";
import { createClient } from "~/lib/supabase/client";
import type { Tables } from "~/lib/supabase/database.types";
import { api } from "~/trpc/react";

const ANIMATION_STAGGER_DELAY = 0.05;
const LOADING_ANIMATION_DURATION = 0.5;

const staggerAnimation = {
  animate: {
    transition: {
      staggerChildren: ANIMATION_STAGGER_DELAY,
    },
  },
} as const;

type ReportProcessingStatus = Tables<"report_processing_status">;

export default function GoalsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { profile } = useProfile();
  const apiUtils = api.useUtils();

  const [isEditingGoalId, setIsEditingGoalId] = useState<string | null>(null);
  const [pendingGoal, setPendingGoal] = useState<
    | (Pick<Tables<"goals">, "text" | "user_provided_context"> & {
        signals?: Tables<"goal_signals">[];
      })
    | null
  >(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const { data: user, isLoading: isUserLoading } = api.auth.getUser.useQuery(
    undefined,
    { refetchOnWindowFocus: false },
  );

  const { data: goals, isLoading: isGoalsLoading } =
    api.goals.getGoals.useQuery(
      { user_id: profile?.id ?? user?.id },
      {
        refetchOnWindowFocus: false,
        enabled: Boolean(user?.id),
      },
    );

  const generateReportMutation = api.goals.generateReport.useMutation({
    onSuccess: (data) => {
      if (data.success && data.job_id) {
        setCurrentJobId(data.job_id);
        toast.success("Report generation initiated");
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

  const handleAddGoal = async (values: { text: string }) => {
    setPendingGoal({
      text: values.text,
      user_provided_context: "",
      signals: [],
    });
  };

  const handleGoalDelete = async (id: string) => {
    const { error } = await supabase
      .from("goals")
      .update({
        is_current: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to remove goal", {
        description: error.message,
      });
      return;
    }

    await apiUtils.goals.getGoals.invalidate();
  };

  const handleGoalComplete = async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("goals")
      .update({
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to complete goal", {
        description: error.message,
      });
      return;
    }

    toast.success("Goal completed! 🎉", {
      description: "Great job on achieving your goal!",
    });

    await apiUtils.goals.getGoals.invalidate();
  };

  const handleGoalEdit = (
    goal: Tables<"goals"> & { signals: Tables<"goal_signals">[] },
  ) => {
    setIsEditingGoalId(goal.id);
    setPendingGoal({
      text: goal.text,
      user_provided_context: goal.user_provided_context,
      signals: goal.signals,
    });
  };

  const handleGoalSubmit = async (
    values: GoalFormValues,
    mode: "create" | "edit",
  ) => {
    if (!profile?.id || !pendingGoal?.text) {
      toast.error("Failed to add goal");
      return;
    }

    if (mode === "edit") {
      // Set current goal and signals to not current
      const { error: updateCurrentError } = await supabase
        .from("goals")
        .update({ is_current: false })
        .eq("id", isEditingGoalId ?? "");

      if (updateCurrentError) {
        toast.error("Failed to update goal history", {
          description: updateCurrentError.message,
        });
        return;
      }

      setIsEditingGoalId(null);

      await handleGoalSubmit(values, "create");

      const timeout = setTimeout(() => {
        toast.success("Goal updated successfully");
        clearTimeout(timeout);
      }, 1500);
    } else {
      // Handle creating new goal
      const { data: goal, error: goalError } = await supabase
        .from("goals")
        .insert({
          profile_id: profile.id,
          text: values.text,
          user_provided_context: values.context,
          is_current: true,
        })
        .select("*")
        .single();

      if (goalError) {
        toast.error("Failed to add goal", {
          description: goalError.message,
        });
        return;
      }

      const { error: signalsError } = await supabase
        .from("goal_signals")
        .insert(
          values.signals.map((signal) => ({
            ...signal,
            goal_id: goal.id,
          })),
        );

      if (signalsError) {
        toast.error("Failed to add goal signals", {
          description: signalsError.message,
        });
        await supabase.from("goals").delete().eq("id", goal.id);
        return;
      }

      const timeout = setTimeout(() => {
        toast.success("Goal created successfully");
        clearTimeout(timeout);
      }, 1500);
    }

    await apiUtils.goals.getGoals.invalidate();
    setPendingGoal(null);
    setIsEditingGoalId(null);
  };

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

  if (!profile || !user || !goals || isUserLoading || isGoalsLoading) {
    return (
      <div className="mt-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: LOADING_ANIMATION_DURATION }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary/20" />
            <GoalIcon className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-primary" />
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-medium text-muted-foreground"
          >
            Loading your goals...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Tabs
        value={pathname.startsWith("/reports") ? "reports" : "goals"}
        className="-mt-12 w-full"
      >
        <div className="sticky top-0 z-10 -mx-12 border-b bg-background/80 backdrop-blur-lg">
          <div className="container mx-auto flex items-center justify-between px-6 py-2 md:px-8">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TabsList className="inline-flex gap-1 rounded-lg bg-muted/50 p-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50">
                        <CalendarDaysIcon className="h-4 w-4 stroke-[2.5px]" />
                        Summary
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Coming soon</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TabsTrigger
                  value="goals"
                  className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:text-primary data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  onClick={() => router.push("/goals")}
                >
                  <GoalIcon className="h-4 w-4 stroke-[2.5px]" />
                  Goals
                </TabsTrigger>
                <TabsTrigger
                  value="reports"
                  className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:text-primary data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  onClick={() => router.push("/reports")}
                >
                  <BarChart3Icon className="h-4 w-4 stroke-[2.5px]" />
                  Reports
                </TabsTrigger>
              </TabsList>
            </motion.div>

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
          </div>
        </div>

        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerAnimation}
          className="container mx-auto space-y-6 px-6 py-6 md:px-8"
        >
          <TabsContent
            value="summary"
            className="space-y-6 focus-visible:outline-none"
          >
            {/* Summary content will go here */}
          </TabsContent>
          <TabsContent
            value="goals"
            className="space-y-6 focus-visible:outline-none"
          >
            <div className="pb-2">
              <NewGoalForm onSubmit={handleAddGoal} />
            </div>

            <AnimatePresence mode="popLayout">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  mode="view"
                  onGoalComplete={handleGoalComplete}
                  onGoalDelete={handleGoalDelete}
                  onGoalEdit={handleGoalEdit}
                />
              ))}
            </AnimatePresence>
          </TabsContent>
          <TabsContent
            value="reports"
            className="space-y-6 focus-visible:outline-none"
          >
            {/* Reports content will go here */}
          </TabsContent>
        </motion.div>

        <GoalCreationDrawer
          mode={isEditingGoalId ? "edit" : "create"}
          goal={pendingGoal}
          setGoal={(goal) => {
            setPendingGoal(goal);
            if (!goal) {
              setIsEditingGoalId(null);
            }
          }}
          onSubmit={(values) =>
            handleGoalSubmit(values, isEditingGoalId ? "edit" : "create")
          }
        />
      </Tabs>
    </>
  );
}
