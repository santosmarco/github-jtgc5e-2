"use client";

import { AnimatePresence, motion } from "framer-motion";
import _ from "lodash";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  FileX2Icon,
  GoalIcon,
  Loader2,
  MoreVertical,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { createClient } from "~/lib/supabase/client";
import type { Tables } from "~/lib/supabase/database.types";
import { useSearchParams } from "next/navigation";

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
import { transformMoment } from "~/lib/db/moments";
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
  const [isCommentsVisible, setIsCommentsVisible] = useState(true);
  const [commentContent, setCommentContent] = useState("");
  const [isEditingGoalId, setIsEditingGoalId] = useState<string | null>(null);
  const [pendingGoal, setPendingGoal] = useState<
    | (Pick<Tables<"goals">, "text" | "user_provided_context"> & {
        signals?: Tables<"goal_signals">[];
      })
    | null
  >(null);

  const utils = api.useUtils();
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
    // Set both states together to avoid multiple re-renders
    setPendingGoal({
      text: goal.text,
      user_provided_context: goal.user_provided_context,
      signals: [], // We'll load the actual signals in a moment
    });
    setIsEditingGoalId(goal.id);

    // Load the goal's signals
    const { data: signals } = await supabase
      .from("goal_signals")
      .select("*")
      .eq("goal_id", goal.id);

    if (signals) {
      setPendingGoal((prev) => (prev ? { ...prev, signals } : null));
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
    if (selectedReportSectionId === null && groupReports) {
      setSelectedReportSectionId(
        groupReports.reports[0]?.report_sections[0]?.id ?? null,
      );
    }
  }, [groupReports, selectedReportSectionId]);

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
        const reportMoments = report.report_moments;
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
                className={cn(
                  "grid h-full gap-6",
                  isCommentsVisible
                    ? "grid-cols-[1fr,1fr,300px]"
                    : "grid-cols-[1fr,1.5fr,40px]",
                )}
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
                    }}
                  >
                    <TabsList className="flex w-full justify-between gap-4 bg-transparent px-0">
                      <TabsTrigger
                        value="positive"
                        className="flex w-full items-center gap-2 rounded-lg border text-lg font-semibold transition-colors hover:bg-accent data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-500/10 data-[state=inactive]:text-muted-foreground"
                      >
                        <ArrowUpRight className="h-6 w-6 text-emerald-500" />
                        Doing Well
                      </TabsTrigger>
                      <TabsTrigger
                        value="negative"
                        className="flex w-full items-center gap-2 rounded-lg border text-lg font-semibold transition-colors hover:bg-accent data-[state=active]:border-rose-500 data-[state=active]:bg-rose-500/10 data-[state=inactive]:text-muted-foreground"
                      >
                        <ArrowDownRight className="h-6 w-6 text-rose-500" />
                        Growth Opportunities
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="positive" className="mt-6 space-y-4">
                      {report.report_sections
                        .filter((section) => section.direction === "positive")
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
                            onClick={() =>
                              setSelectedReportSectionId(section.id)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                setSelectedReportSectionId(section.id);
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
                            <h3 className="font-semibold">{section.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {section.summary}
                            </p>
                          </motion.div>
                        ))}
                    </TabsContent>
                    <TabsContent value="negative" className="mt-6 space-y-4">
                      {report.report_sections
                        .filter((section) => section.direction === "negative")
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
                            onClick={() =>
                              setSelectedReportSectionId(section.id)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                setSelectedReportSectionId(section.id);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            className={cn(
                              "cursor-pointer rounded-lg border p-4 hover:border-rose-500/50",
                              selectedReportSectionId === section.id &&
                                "border-rose-500/50 bg-rose-500/5",
                            )}
                          >
                            <h3 className="font-semibold">{section.title}</h3>
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
                />

                <div className="relative">
                  <AnimatePresence mode="wait">
                    {isCommentsVisible ? (
                      <motion.div
                        key="comments"
                        initial={{ width: 40, opacity: 0 }}
                        animate={{ width: "300px", opacity: 1 }}
                        exit={{ width: 40, opacity: 0 }}
                        transition={{
                          duration: 0.3,
                          ease: "easeInOut",
                        }}
                        className="absolute right-0 top-0 h-full space-y-4 overflow-hidden rounded-lg border bg-background p-4"
                      >
                        <div className="flex items-center justify-between">
                          <motion.h2
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="font-semibold"
                          >
                            Comments
                          </motion.h2>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsCommentsVisible(false)}
                            className="h-8 w-8"
                          >
                            <motion.div
                              initial={{ rotate: 0 }}
                              animate={{ rotate: 90 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </motion.div>
                          </Button>
                        </div>
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2, duration: 0.2 }}
                          className="w-full space-y-4"
                        >
                          <div className="scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent max-h-[400px] flex-1 space-y-4 overflow-y-auto pr-2">
                            {report.report_comments.map((comment, index) => (
                              <motion.div
                                key={comment.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
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
                        </motion.div>

                        <div className="absolute inset-x-0 bottom-0 overflow-hidden border-t bg-background pt-2">
                          <form
                            onSubmit={(e) => handleSubmitComment(report.id, e)}
                            className="space-y-2 overflow-hidden"
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
                              className="resize-none rounded-lg border-none focus-visible:ring-0"
                              disabled={createComment.isPending}
                            />
                            <button type="submit" className="sr-only">
                              Submit comment
                            </button>
                          </form>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="toggle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute right-0 top-0 h-full"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsCommentsVisible(true)}
                          className="h-8 w-8"
                        >
                          <motion.div
                            initial={{ rotate: 90 }}
                            animate={{ rotate: -90 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </motion.div>
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
