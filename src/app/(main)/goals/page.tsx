"use client";

import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import _ from "lodash";
import { GoalIcon, Loader2Icon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { GoalAnimation } from "~/components/goals/goal-animation";
import { SkillCard } from "~/components/goals/goal-card";
import {
  GoalCreationDrawer,
  type GoalFormValues,
} from "~/components/goals/goal-creation-drawer";
import { GoalSuccess } from "~/components/goals/goal-success";
import { GoalsEmptyState } from "~/components/goals/goals-empty-state";
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function GoalsPage() {
  const supabase = createClient();
  const { profile } = useProfile();
  const apiUtils = api.useUtils();

  const [isEditingGoalId, setIsEditingGoalId] = useState<string | null>(null);
  const [pendingGoal, setPendingGoal] = useState<
    | (Pick<Tables<"goals">, "text" | "user_provided_context" | "skill_id"> & {
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

  const { data: skills, isLoading: isSkillsLoading } =
    api.skills.getAllSkills.useQuery({
      profileId: profile?.id ?? user?.id ?? "",
    });

  const [completedGoal, setCompletedGoal] = useState<string | null>(null);

  const handleAddGoal = useCallback(async (values: { text: string }) => {
    setPendingGoal({
      text: values.text,
      user_provided_context: "",
      signals: [],
      skill_id: "", // @todo: fix this
    });
  }, []);

  const handleGoalComplete = useCallback(
    async (id: string): Promise<void> => {
      const goalToComplete = goals?.find((goal) => goal.id === id);
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

      setCompletedGoal(goalToComplete?.text || "");

      toast.success("Goal completed! 🎉", {
        description: "Great job on achieving your goal!",
      });

      await apiUtils.goals.getGoals.invalidate();
    },
    [supabase, apiUtils.goals.getGoals, goals],
  );

  const handleGoalUncomplete = useCallback(
    async (id: string): Promise<void> => {
      const { error } = await supabase
        .from("goals")
        .update({
          progress: 0,
          completed_at: null,
        })
        .eq("id", id);

      if (error) {
        toast.error("Failed to uncomplete goal", {
          description: error.message,
        });
        return;
      }

      toast.success("Goal marked as incomplete", {
        description: "You can continue working towards this goal.",
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
        skill_id: goal.skill_id,
      });
    },
    [],
  );

  const handleGoalSubmit = useCallback(
    async (
      values: GoalFormValues & { skillId: string },
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
      profile?.id,
      pendingGoal?.text,
      isEditingGoalId,
      supabase,
      apiUtils.goals.getGoals,
    ],
  );

  if (
    !profile ||
    !user ||
    !goals ||
    !skills ||
    isUserLoading ||
    isGoalsLoading ||
    isSkillsLoading
  ) {
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
            Loading skill library...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const hasSkills = skills.length > 0;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerAnimation}
      className="container mx-auto space-y-6 py-6"
    >
      {hasSkills ? (
        <>
          <div className="flex flex-col gap-4 pb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
            <p className="text-muted-foreground">
              Browse our curated collection of high-impact skills. Toggle any
              skill to generate personalized assessments and track your
              progress.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-6"
          >
            <AnimatePresence mode="popLayout">
              {skills
                .sort((a, b) => {
                  // Assign a numeric score to each skill (lower = higher priority)
                  let aScore = 0;
                  let bScore = 0;

                  // Get enabled status
                  const aIsEnabled = a.goals.some((goal) => goal.is_default);
                  const bIsEnabled = b.goals.some((goal) => goal.is_default);

                  // Disabled skills get highest score (lowest priority - group 6)
                  if (!aIsEnabled) aScore += 100;
                  if (!bIsEnabled) bScore += 100;

                  // If both are disabled, just sort by name
                  if (!aIsEnabled && !bIsEnabled) {
                    return a.title.localeCompare(b.title);
                  }

                  // Get the latest assessment for each skill
                  const aLatestAssessment = _.orderBy(
                    a.reports.filter((r) =>
                      r.report_goals
                        .map((rg) => rg.goal_id)
                        .some((goalId) =>
                          a.goals
                            .filter((g) => g.is_default)
                            .some((g) => g.id === goalId),
                        ),
                    ),
                    [(report) => dayjs(report.created_at).toDate()],
                    ["desc"],
                  )[0];

                  const bLatestAssessment = _.orderBy(
                    b.reports.filter((r) =>
                      r.report_goals
                        .map((rg) => rg.goal_id)
                        .some((goalId) =>
                          b.goals
                            .filter((g) => g.is_default)
                            .some((g) => g.id === goalId),
                        ),
                    ),
                    [(report) => dayjs(report.created_at).toDate()],
                    ["desc"],
                  )[0];

                  // Store creation dates for sorting within groups
                  const aCreatedAt = aLatestAssessment?.created_at;
                  const bCreatedAt = bLatestAssessment?.created_at;

                  // Check if assessments exist
                  const aHasAssessment = Boolean(aLatestAssessment);
                  const bHasAssessment = Boolean(bLatestAssessment);

                  // No assessments (enabled skills with no assessments - group 5)
                  if (!aHasAssessment && aIsEnabled) aScore += 50;
                  if (!bHasAssessment && bIsEnabled) bScore += 50;

                  // If neither has assessments, compare by skill creation date
                  if (
                    !aHasAssessment &&
                    !bHasAssessment &&
                    aIsEnabled &&
                    bIsEnabled
                  ) {
                    if (a.created_at && b.created_at) {
                      return dayjs(b.created_at).isAfter(dayjs(a.created_at))
                        ? 1
                        : -1;
                    }
                    return a.title.localeCompare(b.title);
                  }

                  // Get the latest assessment status for each skill
                  if (aHasAssessment && aLatestAssessment) {
                    const aLatestStatus = _.first(
                      _.orderBy(
                        a.statuses,
                        [(s) => dayjs(s.created_at).toDate()],
                        ["desc"],
                      ).filter((s) =>
                        s.goal_ids?.some((id) =>
                          a.report_goals.some((rg) => rg.goal_id === id),
                        ),
                      ),
                    );

                    // Failed status (lowest priority among skills with assessments - group 4+)
                    if (aLatestStatus?.status === "failed") {
                      aScore += 60; // ❌ Increase score for failed to make it last
                    }
                    // Pending status (second lowest priority - group 4)
                    else if (aLatestStatus?.status === "pending") {
                      aScore += 30;
                    } else {
                      // Calculate review status
                      const aReviewedCount =
                        aLatestAssessment.report_goals.filter(
                          (rg) => rg.is_reviewed,
                        ).length;

                      const aTotalGoals = aLatestAssessment.report_goals.length;

                      // Fully reviewed (group 3)
                      if (aReviewedCount === aTotalGoals && aTotalGoals > 0) {
                        aScore += 20;
                      }
                      // Partially reviewed (group 2)
                      else if (aReviewedCount > 0) {
                        aScore += 10;
                      }
                      // Totally unreviewed (group 1 - highest priority)
                      // aScore remains 0 for unreviewed (or aScore + 0)
                    }
                  }

                  if (bHasAssessment && bLatestAssessment) {
                    const bLatestStatus = _.first(
                      _.orderBy(
                        b.statuses,
                        [(s) => dayjs(s.created_at).toDate()],
                        ["desc"],
                      ).filter((s) =>
                        s.goal_ids?.some((id) =>
                          b.report_goals.some((rg) => rg.goal_id === id),
                        ),
                      ),
                    );

                    // Failed status (lowest priority among skills with assessments)
                    if (bLatestStatus?.status === "failed") {
                      bScore += 60; // ❌ Increase score for failed to make it last
                    }
                    // Pending status (second lowest priority)
                    else if (bLatestStatus?.status === "pending") {
                      bScore += 30;
                    } else {
                      // Calculate review status
                      const bReviewedCount =
                        bLatestAssessment.report_goals.filter(
                          (rg) => rg.is_reviewed,
                        ).length;

                      const bTotalGoals = bLatestAssessment.report_goals.length;

                      // Fully reviewed
                      if (bReviewedCount === bTotalGoals && bTotalGoals > 0) {
                        bScore += 20;
                      }
                      // Partially reviewed
                      else if (bReviewedCount > 0) {
                        bScore += 10;
                      }
                      // Totally unreviewed (highest priority)
                      // bScore remains 0 for unreviewed (or bScore + 0)
                    }
                  }

                  // First sort by score (lower scores = higher priority)
                  if (aScore !== bScore) {
                    return aScore - bScore;
                  }

                  // If scores are equal, sort by assessment creation date (newer first)
                  if (aCreatedAt && bCreatedAt) {
                    return dayjs(bCreatedAt).isAfter(dayjs(aCreatedAt))
                      ? 1
                      : -1;
                  }

                  // Final fallback: sort alphabetically
                  return a.title.localeCompare(b.title);
                })
                .map((skill) => (
                  <motion.div key={skill.id} variants={itemVariants} layout>
                    <SkillCard
                      profileId={profile.id ?? user.id ?? ""}
                      skill={skill}
                      onSkillEnabled={() => {
                        apiUtils.skills.getAllSkills.invalidate();
                      }}
                    />
                  </motion.div>
                ))}
            </AnimatePresence>
          </motion.div>
        </>
      ) : (
        <GoalsEmptyState onSubmit={handleAddGoal} />
      )}

      <GoalCreationDrawer
        mode={isEditingGoalId ? "edit" : "create"}
        goal={
          pendingGoal &&
          skills.find((skill) => skill.id === pendingGoal.skill_id)
            ? pendingGoal
            : null
        }
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

      {/* Goal completion success dialog */}
      <GoalSuccess
        isOpen={Boolean(completedGoal)}
        goalText={completedGoal || ""}
        onClose={() => setCompletedGoal(null)}
      />

      {/* Creation animation for new goals */}
      <AnimatePresence>
        {pendingGoal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <GoalAnimation type="creation" size="md" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
