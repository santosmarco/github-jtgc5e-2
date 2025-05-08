import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { GoalFormValues } from "~/components/goals/goal-creation-drawer";
import { createClient } from "~/lib/supabase/client";
import type { Tables, TablesInsert } from "~/lib/supabase/database.types";
import { api } from "~/trpc/react";

export function useGoalManagement(profileId: string | undefined) {
  const supabase = createClient();
  const apiUtils = api.useUtils();

  const [isEditingGoalId, setIsEditingGoalId] = useState<string | null>(null);
  const [pendingGoal, setPendingGoal] = useState<
    | (Pick<Tables<"goals">, "text" | "user_provided_context" | "skill_id"> & {
        signals?: Tables<"goal_signals">[];
      })
    | null
  >(null);
  const [completedGoal, setCompletedGoal] = useState<string | null>(null);

  const handleAddGoal = useCallback(async (values: { text: string }) => {
    setPendingGoal({
      text: values.text,
      user_provided_context: "",
      signals: [],
      skill_id: "", // @todo: fix this
    });
  }, []);

  const handleGoalSubmit = useCallback(
    async (
      values: GoalFormValues & { skillId: string },
      mode: "create" | "edit",
    ) => {
      if (!profileId || !pendingGoal?.text) {
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
          profile_id: profileId,
          text: values.text,
          hidden_text: values.text,
          user_provided_context: values.context,
          is_current: true,
          skill_id: values.skillId,
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
      profileId,
      pendingGoal?.text,
      isEditingGoalId,
      supabase,
      apiUtils.goals.getGoals,
    ],
  );

  return {
    isEditingGoalId,
    setIsEditingGoalId,
    pendingGoal,
    setPendingGoal,
    completedGoal,
    setCompletedGoal,
    handleAddGoal,
    handleGoalSubmit,
  };
}
