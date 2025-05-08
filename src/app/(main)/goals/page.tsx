"use client";

import { AnimatePresence, motion } from "framer-motion";

import { GoalAnimation } from "~/components/goals/goal-animation";
import { staggerAnimation } from "~/components/goals/goal-animations";
import { GoalCreationDrawer } from "~/components/goals/goal-creation-drawer";
import { GoalSuccess } from "~/components/goals/goal-success";
import { GoalsEmptyState } from "~/components/goals/goals-empty-state";
import { GoalsLoading } from "~/components/goals/goals-loading";
import { SkillsGrid } from "~/components/goals/skills-grid";
import { SkillsHeader } from "~/components/goals/skills-header";
import { useGoalManagement } from "~/hooks/use-goal-management";
import { useProfile } from "~/hooks/use-profile";
import { api } from "~/trpc/react";

export default function GoalsPage() {
  const { profile } = useProfile();
  const apiUtils = api.useUtils();

  const {
    isEditingGoalId,
    pendingGoal,
    setPendingGoal,
    completedGoal,
    setCompletedGoal,
    handleAddGoal,
    handleGoalSubmit,
    setIsEditingGoalId,
  } = useGoalManagement(profile?.id);

  // Fetch user data
  const { data: user, isLoading: isUserLoading } = api.auth.getUser.useQuery(
    undefined,
    { refetchOnWindowFocus: false },
  );

  // Fetch goals data
  const { data: goals, isLoading: isGoalsLoading } =
    api.goals.getGoals.useQuery(
      { user_id: profile?.id ?? user?.id },
      {
        refetchOnWindowFocus: false,
        enabled: Boolean(user?.id),
      },
    );

  // Fetch skills data
  const { data: skills, isLoading: isSkillsLoading } =
    api.skills.getAllSkills.useQuery({
      profileId: profile?.id ?? user?.id ?? "",
    });

  // Handle skill status changes
  const handleSkillStatusChange = async () => {
    await apiUtils.skills.getAllSkills.invalidate();
  };

  // Show loading state
  if (
    !profile ||
    !user ||
    !goals ||
    !skills ||
    isUserLoading ||
    isGoalsLoading ||
    isSkillsLoading
  ) {
    return <GoalsLoading />;
  }

  const hasSkills = skills.length > 0;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerAnimation}
      className="container mx-auto max-w-screen-xl space-y-6 py-6"
    >
      {hasSkills ? (
        <>
          <SkillsHeader />
          <SkillsGrid
            skills={skills}
            profileId={profile.id ?? user.id ?? ""}
            onSkillStatusChange={handleSkillStatusChange}
          />
        </>
      ) : (
        <GoalsEmptyState onSubmit={handleAddGoal} />
      )}

      {/* Creation drawer */}
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
