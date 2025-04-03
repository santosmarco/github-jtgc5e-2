"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import _ from "lodash";
import { ChevronLeft, ChevronRight, FileX2Icon, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { GoalCardMinimal } from "~/components/goals/goal-card-minimal";

import {
  GoalCreationDrawer,
  type GoalFormValues,
} from "~/components/goals/goal-creation-drawer";
import { MomentsPlayer } from "~/components/player/moments-player";
import { CommentsPanel } from "~/components/reports/comments-panel";
import { GoalHeader } from "~/components/reports/goal-header";
import { PersonalityProfile } from "~/components/reports/personality-profile";
import { ReportMetrics } from "~/components/reports/report-metrics";
import { SectionsList } from "~/components/reports/sections-list";
import { Button } from "~/components/ui/button";
import { transformMoment } from "~/lib/db/moments";
import { createClient } from "~/lib/supabase/client";
import type { Tables } from "~/lib/supabase/database.types";
import { api } from "~/trpc/react";
import type { ReportComment } from "~/types/reports";

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
  const [currentTab, setCurrentTab] = useState<"positive" | "negative">(
    "negative",
  );

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
          skill_id: groupReports.reports[0]?.skill?.id ?? values.skillId,
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

      // Clear states
      setIsEditingGoalId(null);
      setPendingGoal(null);

      toast.success("Goal updated successfully");

      // Invalidate query after a delay
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

      // If we're expanding the goal, select its first negative section
      if (newState[goalId]) {
        const report = groupReports.reports.find((r) =>
          r.report_goals.some((rg) => rg.goal_id === goalId),
        );

        if (report) {
          const firstNegativeSection = report.report_sections.find(
            (section) => section.direction === "negative",
          );

          if (firstNegativeSection) {
            setSelectedReportSectionId(firstNegativeSection.id);
          }
        }
      } else {
        // If we're closing the goal, find the next expanded goal's first negative section
        const nextExpandedReport = groupReports.reports.find((r) => {
          const reportGoalId = r.report_goals[0]?.goal_id;
          return (
            reportGoalId && reportGoalId !== goalId && newState[reportGoalId]
          );
        });

        if (nextExpandedReport) {
          const firstNegativeSection = nextExpandedReport.report_sections.find(
            (section) => section.direction === "negative",
          );

          if (firstNegativeSection) {
            setSelectedReportSectionId(firstNegativeSection.id);
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

    // Set first negative section as selected if none selected
    if (selectedReportSectionId === null && groupReports) {
      const report = groupReports.reports[0];
      if (report) {
        // Filter valid moments
        const validReportMoments = report.report_moments.filter(
          (rm) =>
            !rm.moment._internal_thumbs_down ||
            rm.moment._internal_thumbs_down <= 0,
        );

        // Calculate section scores for initial selection
        const sectionScores = report.report_sections.map((section) => {
          const sectionMoments = validReportMoments.filter(
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

        // Find the section with the highest scoring moment
        const highestScoringMoment = _.maxBy(
          validReportMoments,
          (rm) => rm.score,
        );
        const sectionWithHighestMoment = highestScoringMoment
          ? sectionScores.find(
              (s) => s.id === highestScoringMoment.report_section_id,
            )
          : null;

        // Get highest scoring negative section
        const sortedNegativeSections = _.orderBy(
          sectionScores.filter((s) => s.direction === "negative"),
          ["totalScore"],
          ["desc"],
        );

        // Prioritize section with highest moment if it's negative, otherwise use highest scoring negative section
        if (sectionWithHighestMoment?.direction === "negative") {
          setSelectedReportSectionId(sectionWithHighestMoment.id);
        } else {
          const firstNegativeSection = sortedNegativeSections[0];
          setSelectedReportSectionId(firstNegativeSection?.id ?? null);
        }
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
    setCurrentTab(
      groupReports?.reports[0]?.report_sections.find((s) => s.id === sectionId)
        ?.direction ?? "negative",
    );
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center bg-black">
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
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center bg-black">
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
    <div className="-mx-8 min-h-screen">
      {/* Date Range Navigation */}
      <div className="sticky top-12 z-40 -mx-4 mb-6 flex items-center justify-between border-b border-border bg-background/60 px-2 py-2 backdrop-blur-xl">
        <motion.div whileHover={{ x: -5 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground"
          >
            <motion.div
              initial={{ x: 0 }}
              animate={{ x: [0, -4, 0] }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
                duration: 1.5,
                ease: "easeInOut",
                repeatDelay: 1,
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.div>
            <span>Previous</span>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-1"
        >
          <h2 className="text-base font-medium tracking-tight">
            {dayjs(groupReports.reports[0]?.start_date).format("MMM D")} to{" "}
            {dayjs(groupReports.reports[0]?.end_date).format("MMM D")}
          </h2>
        </motion.div>

        <motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground"
          >
            <span>Next</span>
            <motion.div
              initial={{ x: 0 }}
              animate={{ x: [0, 4, 0] }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
                duration: 1.5,
                ease: "easeInOut",
                repeatDelay: 1,
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.div>
          </Button>
        </motion.div>
      </div>

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
        const reportSkillPositiveScaleTags =
          report.skill?.scales.map((s) => s.positive_tag_title) ?? [];
        const reportSkillNegativeScaleTags =
          report.skill?.scales.map((s) => s.negative_tag_title) ?? [];
        const reportSkillScaleTags = [
          ...reportSkillPositiveScaleTags.flatMap((t) => t.split(",")),
          ...reportSkillNegativeScaleTags.flatMap((t) => t.split(",")),
        ];
        const momentSubtagFrequencies = _.countBy(
          reportMoments.flatMap((rm) =>
            rm.moment.subtags
              .map((s) => s.tag)
              .filter((t) => t && reportSkillScaleTags.includes(t)),
          ),
        );
        const momentSubtagFrequenciesTotal = _.sum(
          Object.values(momentSubtagFrequencies),
        );

        const metrics = reportSkillPositiveScaleTags.map((pt, i) => {
          const nt = reportSkillNegativeScaleTags[i] ?? "";
          const positiveCount = momentSubtagFrequencies[pt ?? ""] ?? 0;
          const negativeCount = momentSubtagFrequencies[nt] ?? 0;
          const total = positiveCount + negativeCount || 1;

          return {
            id: `${pt ?? ""}-${nt}`,
            leftLabel: nt,
            rightLabel: pt ?? "",
            value: 100 * (positiveCount / total),
          };
        });

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

        // Find the section with the highest scoring moment
        const highestScoringMoment = _.maxBy(reportMoments, (rm) => rm.score);
        const sectionWithHighestMoment = highestScoringMoment
          ? sectionScores.find(
              (s) => s.id === highestScoringMoment.report_section_id,
            )
          : null;

        // Sort sections by total score, but prioritize the section with highest moment
        const sortedPositiveSections = _.orderBy(
          sectionScores.filter((s) => s.direction === "positive"),
          [
            (s) =>
              s.id === sectionWithHighestMoment?.id
                ? Number.POSITIVE_INFINITY
                : s.totalScore,
          ],
          ["desc"],
        );

        const sortedNegativeSections = _.orderBy(
          sectionScores.filter((s) => s.direction === "negative"),
          [
            (s) =>
              s.id === sectionWithHighestMoment?.id
                ? Number.POSITIVE_INFINITY
                : s.totalScore,
          ],
          ["desc"],
        );

        const filteredReportMoments = reportMoments.filter(
          (rm) => rm.report_section_id === selectedReportSectionId,
        );

        return (
          <div key={report.id} className="space-y-6 px-6">
            {/* First Row - Three Cards */}
            <div className="grid grid-cols-4 gap-6">
              {report.skill && report.profile_id && (
                <GoalCardMinimal
                  skill={{
                    ...report.skill,
                    report_goals: report.report_goals,
                  }}
                  profileId={report.profile_id}
                />
              )}

              {/* Score Card */}
              <div className="col-span-2 h-full">
                <ReportMetrics metrics={metrics} selectedTab={currentTab} />
              </div>

              <PersonalityProfile report={report} />
            </div>

            {/* Second Row - Content */}
            <div className="grid grid-cols-5 gap-6">
              {/* Strengths & Growth Areas */}
              <div className="col-span-3">
                <SectionsList
                  positiveSections={sortedPositiveSections}
                  negativeSections={sortedNegativeSections}
                  reportMoments={reportMoments}
                  selectedSectionId={selectedReportSectionId}
                  onSectionSelect={handleSectionSelect}
                  isAdmin={user?.is_admin}
                />
              </div>

              {/* Video Player */}
              <div className="col-span-2">
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
              </div>
            </div>

            {/* Hidden components that can be toggled */}
            <div className="hidden">
              <GoalHeader
                goal={goal}
                videoCount={videoApiIds.length}
                momentCount={momentIds.length}
                commentCount={report.report_comments.length}
                isExpanded={isExpanded}
                onExpand={(goalId) => handleExpand(report.id, goalId)}
                onEdit={handleGoalEdit}
              />

              <CommentsPanel
                reportId={report.id}
                comments={report.report_comments as ReportComment[]}
                isVisible={isCommentsVisible}
                onToggleVisibility={() => setIsCommentsVisible((prev) => !prev)}
                onSubmitComment={handleSubmitComment}
                isPendingSubmit={createComment.isPending}
              />
            </div>
          </div>
        );
      })}

      <GoalCreationDrawer
        mode="edit"
        goal={
          pendingGoal && groupReports.group.skill_id
            ? { ...pendingGoal, skill_id: groupReports.group.skill_id }
            : null
        }
        setGoal={(goal) => {
          if (!goal) {
            setPendingGoal(null);
            setIsEditingGoalId(null);
          } else {
            setPendingGoal(goal);
          }
        }}
        onSubmit={handleGoalSubmit}
      />
    </div>
  );
}
