"use client";

import { AnimatePresence, motion } from "framer-motion";
import _ from "lodash";
import { FileX2Icon, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";

import { GoalHeader } from "~/components/reports/goal-header";
import { SectionsList } from "~/components/reports/sections-list";
import { CommentsPanel } from "~/components/reports/comments-panel";
import {
  GoalCreationDrawer,
  type GoalFormValues,
} from "~/components/goals/goal-creation-drawer";
import { MomentsPlayer } from "~/components/player/moments-player";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/lib/utils";
import { transformMoment } from "~/lib/db/moments";
import { createClient } from "~/lib/supabase/client";
import type { Tables } from "~/lib/supabase/database.types";
import type {
  ReportMoment,
  ReportComment,
  ReportSection,
} from "~/types/reports";
import { api } from "~/trpc/react";

export default function ReportPage({
  params,
}: {
  params: { reportId: string };
}) {
  const searchParams = useSearchParams();
  const goalId = searchParams.get("goalId");
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>(
    () => ({
      ...(goalId ? { [goalId]: true } : {}),
    }),
  );
  const [selectedReportSectionId, setSelectedReportSectionId] = useState<
    string | null
  >(null);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [isEditingGoalId, setIsEditingGoalId] = useState<string | null>(null);
  const [pendingGoal, setPendingGoal] = useState<
    | (Pick<Tables<"goals">, "text" | "user_provided_context"> & {
        signals?: Tables<"goal_signals">[];
      })
    | null
  >(null);
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const [
    hasJustUpdatedCurrentMomentIndex,
    setHasJustUpdatedCurrentMomentIndex,
  ] = useState(false);

  const utils = api.useUtils();
  const { data: user } = api.auth.getUser.useQuery();
  const { data: groupReports, isLoading } =
    api.reports.getGroupReports.useQuery({
      groupId: params.reportId,
    });

  const reviewGoal = api.reports.reviewGoal.useMutation();

  const createComment = api.reports.createComment.useMutation({
    onSuccess: () => {
      setCommentContent("");
      void utils.reports.getGroupReports.invalidate({
        groupId: params.reportId,
      });
    },
  });

  const supabase = createClient();

  const handleSubmitComment = (reportId: string, content: string) => {
    if (!content.trim()) return;
    createComment.mutate({
      reportId,
      content: content.trim(),
    });
  };

  const handleGoalEdit = async (goal: Tables<"goals">) => {
    try {
      // Load the goal's signals first
      const { data: signals, error } = await supabase
        .from("goal_signals")
        .select("*")
        .eq("goal_id", goal.id);

      if (error) {
        toast.error("Failed to load goal signals");
        return;
      }

      // Set both states together to avoid multiple re-renders
      setPendingGoal({
        text: goal.text,
        user_provided_context: goal.user_provided_context,
        signals: signals ?? [], // Include the loaded signals
      });
      setIsEditingGoalId(goal.id);
    } catch (error) {
      toast.error("Failed to load goal data");
      console.error(error);
    }
  };

  const handleGoalSubmit = async (values: z.infer<typeof GoalFormValues>) => {
    if (
      !isEditingGoalId ||
      !groupReports?.reports[0]?.report_goals[0]?.goal.profile_id
    )
      return;

    try {
      // Set current goal to not current
      const { error: updateCurrentError } = await supabase
        .from("goals")
        .update({ is_current: false })
        .eq("id", isEditingGoalId);

      if (updateCurrentError) {
        toast.error("Failed to update goal history", {
          description: updateCurrentError.message,
        });
        return;
      }

      // Create new goal with updated data
      const { data: goal, error: goalError } = await supabase
        .from("goals")
        .insert({
          text: values.text,
          user_provided_context: values.context || null,
          profile_id: groupReports.reports[0].report_goals[0].goal.profile_id,
          is_current: true,
          previous_goal_id: isEditingGoalId,
        })
        .select("*")
        .single();

      if (goalError) {
        toast.error("Failed to update goal", {
          description: goalError.message,
        });
        return;
      }

      // Create signals
      if (values.signals?.length) {
        const { error: signalsError } = await supabase
          .from("goal_signals")
          .insert(
            values.signals.map((signal) => ({
              text: signal.text,
              direction: signal.direction,
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
      }

      // Clear states before invalidating query
      setIsEditingGoalId(null);
      setPendingGoal(null);

      toast.success("Goal updated successfully");

      // Invalidate query after a delay and only if component is still mounted
      const timeoutId = setTimeout(() => {
        void utils.reports.getGroupReports.invalidate({
          groupId: params.reportId,
        });
        clearTimeout(timeoutId);
      }, 500);
    } catch (error) {
      toast.error("Failed to update goal");
      console.error(error);
    }
  };

  const handleExpand = (reportId: string, goalId: string) => {
    reviewGoal.mutate({ reportId, goalId });
    setExpandedGoals((prev) => {
      const newState = { ...prev, [goalId]: !prev[goalId] };

      if (!groupReports) return newState;

      // If we're expanding the goal, select its first positive section
      if (newState[goalId]) {
        const report = groupReports.reports.find((r) =>
          r.report_goals.some((rg) => rg.goal_id === goalId),
        );

        if (report) {
          const firstPositiveSection = report.report_sections.find(
            (section) => section.direction === "positive",
          );

          if (firstPositiveSection) {
            setSelectedReportSectionId(firstPositiveSection.id);
          }
        }
      } else {
        // If we're closing the goal, find the next expanded goal's first positive section
        const nextExpandedReport = groupReports.reports.find((r) => {
          const reportGoalId = r.report_goals[0]?.goal_id;
          return (
            reportGoalId && reportGoalId !== goalId && newState[reportGoalId]
          );
        });

        if (nextExpandedReport) {
          const firstPositiveSection = nextExpandedReport.report_sections.find(
            (section) => section.direction === "positive",
          );

          if (firstPositiveSection) {
            setSelectedReportSectionId(firstPositiveSection.id);
          }
        }
      }

      return newState;
    });
  };

  useEffect(() => {
    // Set first goal as expanded by default if no goalId in URL
    if (!goalId && groupReports?.reports[0]?.report_goals[0]?.goal.id) {
      setExpandedGoals((prev) => ({
        ...prev,
        [groupReports.reports[0]?.report_goals[0]?.goal.id ?? ""]: true,
      }));
    }

    // Set first positive section as selected if none selected
    if (selectedReportSectionId === null && groupReports) {
      const report = groupReports.reports[0];
      if (report) {
        // Calculate section scores for initial selection
        const sectionScores = report.report_sections.map((section) => {
          const sectionMoments = report.report_moments.filter(
            (rm) =>
              rm.report_section_id === section.id &&
              (!rm.moment._internal_thumbs_down ||
                rm.moment._internal_thumbs_down <= 0),
          );
          const totalScore = sectionMoments.reduce(
            (sum, rm) => sum + (rm.score ?? 0),
            0,
          );
          return {
            ...section,
            totalScore,
          };
        });

        // Get highest scoring positive section
        const sortedPositiveSections = _.orderBy(
          sectionScores.filter((s) => s.direction === "positive"),
          ["totalScore"],
          ["desc"],
        );

        const firstPositiveSection = sortedPositiveSections[0];
        setSelectedReportSectionId(firstPositiveSection?.id ?? null);
      }
    }
  }, [groupReports, selectedReportSectionId, goalId]);

  // Update section selection when tab changes
  const handleTabChange = (
    value: string,
    report: NonNullable<typeof groupReports>["reports"][number],
  ) => {
    const direction = value === "positive" ? "positive" : "negative";

    // Calculate section scores
    const sectionScores = report.report_sections.map((section) => {
      const sectionMoments = report.report_moments.filter(
        (rm) =>
          rm.report_section_id === section.id &&
          (!rm.moment._internal_thumbs_down ||
            rm.moment._internal_thumbs_down <= 0),
      );
      const totalScore = sectionMoments.reduce(
        (sum, rm) => sum + (rm.score ?? 0),
        0,
      );
      return {
        ...section,
        totalScore,
      };
    });

    // Get highest scoring section for the selected direction
    const sortedSections = _.orderBy(
      sectionScores.filter((s) => s.direction === direction),
      ["totalScore"],
      ["desc"],
    );

    const firstSection = sortedSections[0];
    if (firstSection) {
      setSelectedReportSectionId(firstSection.id);
      setCurrentMomentIndex(0);
      setHasJustUpdatedCurrentMomentIndex(true);
    }
  };

  const handleSectionSelect = (sectionId: string) => {
    setSelectedReportSectionId(sectionId);
    setCurrentMomentIndex(0);
    setHasJustUpdatedCurrentMomentIndex(true);
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center">
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

  if (!groupReports) {
    return (
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center">
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

  return (
    <>
      {groupReports.reports.map((report) => {
        const unsortedReportMoments = report.report_moments;
        const reportMoments = _.orderBy(
          unsortedReportMoments.filter(
            (rm) =>
              !rm.moment._internal_thumbs_down ||
              rm.moment._internal_thumbs_down <= 0,
          ),
          [(rm) => rm.score],
          ["desc"],
        );
        const momentIds = _.uniq(reportMoments.map((rm) => rm.moment.id));
        const videoApiIds = _.uniq(
          reportMoments.map((rm) => rm.moment.video_api_id),
        );
        const goal = report.report_goals[0]?.goal;
        const isExpanded = !!(goal && expandedGoals[goal.id]);

        // Calculate section scores
        const sectionScores = report.report_sections.map((section) => {
          const sectionMoments = reportMoments.filter(
            (rm) => rm.report_section_id === section.id,
          );
          const totalScore = sectionMoments.reduce(
            (sum, rm) => sum + (rm.score ?? 0),
            0,
          );
          return {
            ...section,
            totalScore,
          };
        });

        // Sort sections by total score
        const sortedPositiveSections = _.orderBy(
          sectionScores.filter((s) => s.direction === "positive"),
          ["totalScore"],
          ["desc"],
        );

        const sortedNegativeSections = _.orderBy(
          sectionScores.filter((s) => s.direction === "negative"),
          ["totalScore"],
          ["desc"],
        );

        const filteredReportMoments = reportMoments.filter(
          (rm) => rm.report_section_id === selectedReportSectionId,
        );

        return (
          <div
            key={report.id}
            className={cn(
              "flex flex-col gap-6 pt-6",
              isExpanded && "min-h-[calc(100vh-4rem)]",
            )}
          >
            {/* Goal Header */}
            <GoalHeader
              goal={goal}
              videoCount={videoApiIds.length}
              momentCount={momentIds.length}
              commentCount={report.report_comments.length}
              isExpanded={isExpanded}
              onExpand={(goalId) => handleExpand(report.id, goalId)}
              onEdit={handleGoalEdit}
            />

            {isExpanded && (
              <div
                className={cn("grid h-full grid-cols-[1fr,1.5fr,0px] gap-6")}
              >
                <SectionsList
                  positiveSections={sortedPositiveSections}
                  negativeSections={sortedNegativeSections}
                  reportMoments={reportMoments}
                  selectedSectionId={selectedReportSectionId}
                  onSectionSelect={handleSectionSelect}
                  isAdmin={user?.is_admin}
                  onTabChange={(value) => handleTabChange(value, report)}
                />

                <MomentsPlayer
                  reportMoments={filteredReportMoments.map((rm, idx) => ({
                    ...rm,
                    moment: transformMoment(rm.moment, idx),
                  }))}
                  currentMomentIndex={currentMomentIndex}
                  setCurrentMomentIndex={setCurrentMomentIndex}
                  hasJustUpdatedCurrentMomentIndex={
                    hasJustUpdatedCurrentMomentIndex
                  }
                  setHasJustUpdatedCurrentMomentIndex={
                    setHasJustUpdatedCurrentMomentIndex
                  }
                />

                <CommentsPanel
                  reportId={report.id}
                  comments={report.report_comments as ReportComment[]}
                  isVisible={isCommentsVisible}
                  onToggleVisibility={() =>
                    setIsCommentsVisible(!isCommentsVisible)
                  }
                  onSubmitComment={handleSubmitComment}
                  isPendingSubmit={createComment.isPending}
                />
              </div>
            )}
          </div>
        );
      })}

      <GoalCreationDrawer
        mode="edit"
        goal={pendingGoal}
        setGoal={(goal) => {
          if (!goal) {
            // Clear both states together to avoid multiple re-renders
            setPendingGoal(null);
            setIsEditingGoalId(null);
          } else {
            setPendingGoal(goal);
          }
        }}
        onSubmit={handleGoalSubmit}
      />
    </>
  );
}
