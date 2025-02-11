"use client";

import { AnimatePresence, motion } from "framer-motion";
import { GoalIcon, Loader2Icon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { GoalCard } from "~/components/goals/goal-card";
import {
  GoalCreationDrawer,
  type GoalFormValues,
} from "~/components/goals/goal-creation-drawer";
import { GoalsEmptyState } from "~/components/goals/goals-empty-state";
import { NewGoalForm } from "~/components/goals/new-goal-form";
import { useProfile } from "~/hooks/use-profile";
import { createClient } from "~/lib/supabase/client";
import type { Tables, TablesInsert } from "~/lib/supabase/database.types";
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

export default function GoalsPage() {
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
        refetchInterval: ({ state: { data } }) => {
          const hasProcessingReports =
            data?.some(
              (goal) => goal.reportProcessingStatus?.status !== "completed",
            ) ?? false;
          return hasProcessingReports ? 1000 : false;
        },
      },
    );

  const handleAddGoal = useCallback(async (values: { text: string }) => {
    setPendingGoal({
      text: values.text,
      user_provided_context: "",
      signals: [],
    });
  }, []);

  const handleGoalComplete = useCallback(
    async (id: string): Promise<void> => {
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
    },
    [supabase, apiUtils.goals.getGoals],
  );

  const handleGoalEdit = useCallback(
    async (goal: Tables<"goals"> & { signals: Tables<"goal_signals">[] }) => {
      setIsEditingGoalId(goal.id);
      setPendingGoal({
        text: goal.text,
        user_provided_context: goal.user_provided_context,
        signals: goal.signals,
      });
    },
    [],
  );

  const handleGoalSubmit = useCallback(
    async (values: GoalFormValues, mode: "create" | "edit") => {
      if (!profile?.id || !pendingGoal?.text) {
        toast.error("Failed to add goal");
        return;
      }

      if (mode === "edit") {
        // Set current goal and signals to not current
        const { error: updateCurrentError } = await supabase
          .from("goals")
          .update({
            is_current: false,
            previous_goal_id: isEditingGoalId,
          })
          .eq("id", isEditingGoalId ?? "");

        if (updateCurrentError) {
          toast.error("Failed to create/update goal", {
            description: updateCurrentError.message,
          });
          return;
        }

        const { error: signalsError } = await supabase
          .from("goal_signals")
          .update({
            is_current: false,
            // @todo: add previous_signal_goal_id
          })
          .eq("goal_id", isEditingGoalId ?? "");

        if (signalsError) {
          toast.error("Failed to create/update goal", {
            description: signalsError.message,
          });
          await supabase
            .from("goals")
            .update({
              is_current: true,
              // @todo: revert previous_goal_id
            })
            .eq("id", isEditingGoalId ?? "");
          return;
        }

        setIsEditingGoalId(null);
      }

      const { data: goal, error: goalError } = await supabase
        .from("goals")
        .insert({
          profile_id: profile.id,
          text: values.text,
          hidden_text: values.text,
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
          values.signals.map(
            (signal) =>
              ({
                ...signal,
                hidden_text: signal.text,
                is_current: true,
                goal_id: goal.id,
              }) satisfies TablesInsert<"goal_signals">,
          ),
        );

      if (signalsError) {
        toast.error("Failed to create/update goal", {
          description: signalsError.message,
        });
        await supabase.from("goals").delete().eq("id", goal.id);
        return;
      }

      toast.success("Goal created/updated successfully");

      await apiUtils.goals.getGoals.invalidate();

      setPendingGoal(null);
      setIsEditingGoalId(null);
    },
    [
      profile?.id,
      pendingGoal?.text,
      isEditingGoalId,
      supabase,
      apiUtils.goals.getGoals,
    ],
  );

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

  const hasGoals = goals.length > 0;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerAnimation}
      className="container mx-auto space-y-6 py-6"
    >
      {hasGoals ? (
        <>
          <div className="flex items-center gap-x-8 pb-6">
            <h1 className="text-2xl font-semibold tracking-tight">My Goals</h1>
            <div className="max-w-xl flex-1">
              <NewGoalForm onSubmit={handleAddGoal} />
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onGoalComplete={handleGoalComplete}
                onGoalEdit={handleGoalEdit}
              />
            ))}
          </AnimatePresence>
        </>
      ) : (
        <GoalsEmptyState onSubmit={handleAddGoal} />
      )}

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
    </motion.div>
  );
}
