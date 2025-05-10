"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import _ from "lodash";
import { ChevronLeft, ChevronRight, FileX2Icon, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ReportMetrics } from "~/components/reports/report-metrics";
import { SectionsList } from "~/components/reports/sections-list";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useProfile } from "~/hooks/use-profile";
import { transformMoment } from "~/lib/db/moments";
import { checkUserFlags, Flag } from "~/lib/flags/flags";
import { getReportScores } from "~/lib/reports/scoring";
import { createClient } from "~/lib/supabase/client";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { ReportComment } from "~/types/reports";

export default function ReportPage({
  params,
}: {
  params: { reportId: string };
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
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
    "positive",
  );

  const utils = api.useUtils();
  const { data: user } = api.auth.getUser.useQuery();
  const { profile: selectedProfile } = useProfile();
  const { data: groupReports, isLoading } =
    api.reports.getGroupReports.useQuery({
      groupId: params.reportId,
    });

  // Fetch timeline data for the skill when we have the group reports
  const { data: timelineData } =
    api.reports.getReportsTimelineDataForUser.useQuery(
      {
        userId: selectedProfile?.id ?? user?.id ?? "",
        skillId: groupReports?.reports[0]?.skill_id ?? "",
      },
      {
        enabled:
          !!(selectedProfile?.id || user?.id) &&
          !!groupReports?.reports[0]?.skill_id,
      },
    );

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
          const firstPositiveSection = report.report_sections.find(
            (section) => section.direction === "positive",
          );

          if (firstPositiveSection) {
            setSelectedReportSectionId(firstPositiveSection.id);
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

        // Get highest scoring positive section
        const sortedPositiveSections = _.orderBy(
          sectionScores.filter((s) => s.direction === "positive"),
          ["totalScore"],
          ["desc"],
        );

        // Prioritize section with highest moment if it's positive, otherwise use highest scoring positive section
        if (sectionWithHighestMoment?.direction === "positive") {
          setSelectedReportSectionId(sectionWithHighestMoment.id);
        } else {
          const firstPositiveSection = sortedPositiveSections[0];
          setSelectedReportSectionId(firstPositiveSection?.id ?? null);
        }
      }
    }
  }, [groupReports, selectedReportSectionId, goalId]);

  const handleSectionSelect = (sectionId: string) => {
    setSelectedReportSectionId(sectionId);
    setCurrentMomentIndex(0);
    setHasJustUpdatedCurrentMomentIndex(true);
    setCurrentTab(
      groupReports?.reports[0]?.report_sections.find((s) => s.id === sectionId)
        ?.direction ?? "negative",
    );
  };

  const currentReportIndex =
    timelineData?.timelineData.findIndex(
      (t) =>
        groupReports?.reports.find(
          (r) => dayjs(r.end_date).format("YYYY-MM-DD") === t.x,
        ) !== undefined,
    ) ?? 0;
  const previousReport =
    timelineData?.timelineData[currentReportIndex - 1]?.entry;
  const nextReport = timelineData?.timelineData[currentReportIndex + 1]?.entry;

  const navigateToPreviousReport = () => {
    if (previousReport) {
      router.push(`/goals/reports/${previousReport.report.id}`);
    }
  };

  const navigateToNextReport = () => {
    if (nextReport) {
      router.push(`/goals/reports/${nextReport.report.id}`);
    }
  };

  useEffect(() => {
    if (!timelineData) return;

    for (const { entry } of timelineData.timelineData) {
      router.prefetch(`/goals/reports/${entry.report.id}`);
    }
  }, [timelineData, router]);

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
    <div className="-mx-4 -mt-2 min-h-screen shadow-sm backdrop-blur-sm sm:-mx-8 sm:-mt-12">
      {/* Date Range Navigation */}
      <div className="sticky top-0 z-40 mb-6 flex items-center justify-between border-b border-border bg-background/60 px-2 py-1 backdrop-blur-xl sm:-mx-4 sm:min-h-0 sm:py-2">
        <div className="w-[73px]">
          <Button
            variant="ghost"
            className="hidden items-center gap-2 text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground sm:flex"
            onClick={() => router.push("/goals")}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground",
                    !previousReport && "cursor-not-allowed opacity-50",
                  )}
                  onClick={navigateToPreviousReport}
                  disabled={!previousReport}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              {previousReport && (
                <TooltipContent side="bottom" sideOffset={5}>
                  <p className="text-sm">
                    {dayjs(previousReport?.report.start_date ?? "").format(
                      "MMM D",
                    )}{" "}
                    to{" "}
                    {dayjs(previousReport?.report.end_date ?? "").format(
                      "MMM D",
                    )}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <h2 className="text-base font-medium tracking-tight">
              {dayjs(groupReports?.reports[0]?.start_date).format("MMM D")} to{" "}
              {dayjs(groupReports?.reports[0]?.end_date).format("MMM D")}
            </h2>
          </motion.div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground",
                    !nextReport && "cursor-not-allowed opacity-50",
                  )}
                  onClick={navigateToNextReport}
                  disabled={!nextReport}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              {nextReport && (
                <TooltipContent side="bottom" sideOffset={5}>
                  <p className="text-sm">
                    {dayjs(nextReport?.report.start_date ?? "").format("MMM D")}
                    to{" "}
                    {dayjs(nextReport?.report.end_date ?? "").format("MMM D")}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Empty div to balance the layout */}
        <div className="w-[73px]" />
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

        const reportMetrics = getReportScores(report);

        // Filter timeline data only for the current skill
        const skillTimelineHistory =
          timelineData?.timelineData
            .filter((item) => item.x !== "" && item.y !== undefined)
            .map((item) => ({
              date: item.x,
              value: item.y,
              groupId:
                item.entry.report.processing_statuses[0]
                  ?.group_processing_status_id ?? item.entry.report.id,
            })) ?? [];

        // Create a type-safe metrics array
        const typeCheckedMetrics = [
          ...(reportMetrics.metrics ?? []).map((metric) => ({
            ...metric,
            history: undefined,
          })),
          {
            id: "global-skill-score",
            leftLabel: "Lower Skill Score",
            rightLabel: "Higher Skill Score",
            value: 50, // Default value doesn't matter for timeline view
            history: skillTimelineHistory,
          },
        ];

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
          <div key={report.id} className="space-y-4 px-4 sm:space-y-6 sm:px-6">
            {/* First Row - Three Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-6">
              {report.skill && report.profile_id && (
                <GoalCardMinimal
                  report={{
                    ...report,
                    skill: { ...report.skill },
                  }}
                  historicalScores={
                    timelineData?.timelineData.map((data) => data.entry) ?? null
                  }
                />
              )}

              {/* Expanded Metrics: Timeline and Scales side by side */}
              <div className="grid h-full grid-cols-1 gap-4 sm:col-span-3 sm:grid-cols-2">
                <ReportMetrics
                  metrics={typeCheckedMetrics}
                  selectedTab={currentTab}
                  currentReportDate={dayjs(report.end_date).format(
                    "YYYY-MM-DD",
                  )}
                  mode="timeline"
                />
                <ReportMetrics
                  metrics={typeCheckedMetrics}
                  selectedTab={currentTab}
                  currentReportDate={dayjs(report.end_date).format(
                    "YYYY-MM-DD",
                  )}
                  mode="scales"
                />
              </div>
            </div>

            {/* Second Row - Content */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:gap-6">
              {/* Strengths & Growth Areas */}
              <div className="sm:col-span-3">
                <SectionsList
                  positiveSections={sortedPositiveSections}
                  negativeSections={sortedNegativeSections}
                  reportMoments={reportMoments}
                  selectedSectionId={selectedReportSectionId}
                  onSectionSelect={handleSectionSelect}
                  isAdmin={checkUserFlags(user, [
                    Flag.ALLOW_REPORT_SECTION_DEBUG_DISPLAY,
                  ])}
                />
              </div>

              {/* Video Player */}
              <div className="hidden pt-0 sm:col-span-2 sm:block sm:pt-3">
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
