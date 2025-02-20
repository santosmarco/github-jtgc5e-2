"use client";

import { AnimatePresence, motion } from "framer-motion";
import _ from "lodash";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  FileX2Icon,
  GoalIcon,
  Loader2,
  MoreVertical,
  Settings,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";

import {
  GoalCreationDrawer,
  type GoalFormValues,
} from "~/components/goals/goal-creation-drawer";
import { MomentsPlayer } from "~/components/player/moments-player";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { transformMoment } from "~/lib/db/moments";
import { createClient } from "~/lib/supabase/client";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
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

  const handleSubmitComment = (reportId: string, e?: React.FormEvent) => {
    e?.preventDefault();
    if (!commentContent.trim()) return;

    createComment.mutate({
      reportId,
      content: commentContent.trim(),
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
        [groupReports.reports[0]!.report_goals[0]!.goal.id]: true,
      }));
    }

    // Set first positive section as selected if none selected
    if (selectedReportSectionId === null && groupReports) {
      const firstPositiveSection =
        groupReports.reports[0]?.report_sections.find(
          (section) => section.direction === "positive",
        );
      setSelectedReportSectionId(firstPositiveSection?.id ?? null);
    }
  }, [groupReports, selectedReportSectionId, goalId]);

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
          unsortedReportMoments,
          [(rm) => rm.report_section_confidence, (rm) => rm.score],
          ["desc", "desc"],
        );
        const momentIds = _.uniq(reportMoments.map((rm) => rm.moment.id));
        const videoApiIds = _.uniq(
          reportMoments.map((rm) => rm.moment.video_api_id),
        );
        const goal = report.report_goals[0]?.goal;
        const isExpanded = goal ? expandedGoals[goal.id] : false;

        return (
          <div
            key={report.id}
            className={cn(
              "flex flex-col gap-6 pt-6",
              isExpanded && "min-h-[calc(100vh-4rem)]",
            )}
          >
            {/* Goal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="mt-1 rounded-full bg-muted p-2">
                  <GoalIcon className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">{goal?.text}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    based on {videoApiIds.length} meetings • {momentIds.length}{" "}
                    moments • {report.report_comments.length} comments
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => goal && handleExpand(report.id, goal.id)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => goal && handleGoalEdit(goal)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Edit Goal
                    </DropdownMenuItem>
                    <DropdownMenuItem>Share</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {isExpanded && (
              <div
                className={cn("grid h-full grid-cols-[1fr,1.5fr,0px] gap-6")}
              >
                <div className="space-y-6">
                  <Tabs
                    defaultValue="positive"
                    className="w-full"
                    onValueChange={(value) => {
                      const direction =
                        value === "positive" ? "positive" : "negative";
                      const firstSection = report.report_sections.find(
                        (section) => section.direction === direction,
                      );
                      if (firstSection) {
                        setSelectedReportSectionId(firstSection.id);
                      }
                      setCurrentMomentIndex(0);
                    }}
                  >
                    <TabsList className="flex w-full justify-between gap-2 bg-transparent px-0">
                      <TabsTrigger
                        value="positive"
                        className="flex w-full items-center gap-1.5 rounded-md border text-sm font-medium transition-colors hover:bg-accent data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-500/10 data-[state=inactive]:text-muted-foreground"
                      >
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        Doing Well
                      </TabsTrigger>
                      <TabsTrigger
                        value="negative"
                        className="flex w-full items-center gap-1.5 rounded-md border text-sm font-medium transition-colors hover:bg-accent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-500/10 data-[state=inactive]:text-muted-foreground"
                      >
                        <GoalIcon className="h-4 w-4 text-amber-500" />
                        Growth Areas
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="positive" className="mt-6 space-y-4">
                      {report.report_sections
                        .filter((section) => section.direction === "positive")
                        .filter((section) => {
                          const sectionMoments = reportMoments.filter(
                            (rm) => rm.report_section_id === section.id,
                          );
                          return user?.is_admin || sectionMoments.length > 0;
                        })
                        .map((section, index) => (
                          <motion.div
                            key={section.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: index * 0.1,
                              ease: "easeOut",
                            }}
                            onClick={() => {
                              setSelectedReportSectionId(section.id);
                              setCurrentMomentIndex(0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                setSelectedReportSectionId(section.id);
                                setCurrentMomentIndex(0);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            className={cn(
                              "cursor-pointer rounded-lg border p-4 hover:border-emerald-500/50",
                              selectedReportSectionId === section.id &&
                                "border-emerald-500/50 bg-emerald-500/5",
                            )}
                          >
                            <Tooltip open={user?.is_admin ? undefined : false}>
                              <TooltipTrigger>
                                <h3 className="text-left font-semibold">
                                  {section.title}
                                </h3>
                              </TooltipTrigger>
                              <TooltipContent align="start">
                                {section.id}
                              </TooltipContent>
                            </Tooltip>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {section.summary}
                            </p>
                          </motion.div>
                        ))}
                    </TabsContent>
                    <TabsContent value="negative" className="mt-6 space-y-4">
                      {report.report_sections
                        .filter((section) => section.direction === "negative")
                        .filter((section) => {
                          const sectionMoments = reportMoments.filter(
                            (rm) => rm.report_section_id === section.id,
                          );
                          return user?.is_admin || sectionMoments.length > 0;
                        })
                        .map((section, index) => (
                          <motion.div
                            key={section.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: index * 0.1,
                              ease: "easeOut",
                            }}
                            onClick={() => {
                              setSelectedReportSectionId(section.id);
                              setCurrentMomentIndex(0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                setSelectedReportSectionId(section.id);
                                setCurrentMomentIndex(0);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            className={cn(
                              "cursor-pointer rounded-lg border p-4 hover:border-amber-500/50",
                              selectedReportSectionId === section.id &&
                                "border-amber-500/50 bg-amber-500/5",
                            )}
                          >
                            <Tooltip open={user?.is_admin ? undefined : false}>
                              <TooltipTrigger>
                                <h3 className="text-left font-semibold">
                                  {section.title}
                                </h3>
                              </TooltipTrigger>
                              <TooltipContent align="start">
                                {section.id}
                              </TooltipContent>
                            </Tooltip>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {section.summary}
                            </p>
                          </motion.div>
                        ))}
                    </TabsContent>
                  </Tabs>
                </div>

                <MomentsPlayer
                  reportMoments={reportMoments
                    .filter(
                      (rm) => rm.report_section_id === selectedReportSectionId,
                    )
                    .map((rm, idx) => ({
                      ...rm,
                      moment: transformMoment(rm.moment, idx),
                    }))}
                  currentMomentIndex={currentMomentIndex}
                  setCurrentMomentIndex={setCurrentMomentIndex}
                />

                <div className="relative">
                  <AnimatePresence mode="wait">
                    {isCommentsVisible ? (
                      <motion.div
                        key="comments"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 40,
                        }}
                        className="absolute right-0 top-0 z-30 h-full w-[300px] rounded-sm border bg-background shadow-lg"
                      >
                        <div className="flex h-12 items-center justify-between border-b px-4">
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-medium">Comments</h2>
                            {report.report_comments.length > 0 && (
                              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
                                {report.report_comments.length}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsCommentsVisible(false)}
                            className="-mr-2 h-full w-8 text-foreground hover:bg-transparent hover:text-muted-foreground"
                          >
                            <ChevronUp className="h-4 w-4 rotate-90" />
                          </Button>
                        </div>

                        <div className="flex h-[calc(100%-6rem)] flex-col justify-between py-4">
                          <div className="scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent -mr-2 flex-1 space-y-4 overflow-y-auto px-4 pr-6">
                            {report.report_comments.map((comment, index) => (
                              <motion.div
                                key={comment.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group relative flex gap-2 rounded-lg"
                              >
                                <div className="w-full min-w-0">
                                  <div className="flex items-baseline justify-between gap-2 text-sm">
                                    <span className="truncate font-medium text-primary">
                                      {comment.user.nickname}
                                    </span>
                                    <span className="shrink-0 text-[10px] text-muted-foreground">
                                      {new Date(
                                        comment.created_at,
                                      ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "numeric",
                                        minute: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                    {comment.content}
                                  </p>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          <div className="absolute inset-x-0 bottom-0 rounded-b-lg border-t bg-background">
                            <form
                              onSubmit={(e) =>
                                handleSubmitComment(report.id, e)
                              }
                              className="space-y-2"
                            >
                              <Textarea
                                placeholder="Write a comment... (Press Enter to submit)"
                                value={commentContent}
                                onChange={(e) =>
                                  setCommentContent(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmitComment(report.id);
                                  }
                                }}
                                rows={3}
                                className="resize-none rounded-lg border-none bg-muted/50 placeholder:text-muted-foreground/50 focus-visible:ring-0"
                                disabled={createComment.isPending}
                              />
                              <button type="submit" className="sr-only">
                                Submit comment
                              </button>
                            </form>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="toggle"
                        className="absolute -right-14 -top-2 h-8"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsCommentsVisible(true)}
                          className="group relative flex h-8 items-center gap-1 rounded-l-full rounded-r-none border-r px-0 pr-2 shadow-sm"
                        >
                          <div className="relative flex h-8 w-8 items-center justify-center rounded-full">
                            <ChevronLeft className="ml-1 h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                          </div>
                          <span className="pr-4 text-xs font-medium">
                            {report.report_comments.length > 0
                              ? `${report.report_comments.length} Comments`
                              : "Comments"}
                          </span>
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
