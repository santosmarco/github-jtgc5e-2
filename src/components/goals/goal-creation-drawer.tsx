"use client";

import { AnimatePresence, motion, stagger } from "framer-motion";
import {
  FileStackIcon,
  GoalIcon,
  HelpCircleIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray } from "react-hook-form";
import { z } from "zod";

import { GoalSignal } from "~/components/goals/goal-signal";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Form } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useValidatedForm } from "~/hooks/use-validated-form";
import { GoalSignalInput } from "~/lib/goals/schemas";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export type GoalCreationDrawerProps = {
  mode: "create" | "edit";
  goal:
    | (Pick<Tables<"goals">, "text" | "user_provided_context"> & {
        signals?: Tables<"goal_signals">[];
      })
    | null;
  setGoal: (goal: GoalCreationDrawerProps["goal"] | null) => void;
  onSubmit: (values: GoalFormValues) => void | Promise<void>;
  contextDefaultOpen?: boolean;
};

export const GoalFormValues = z.object({
  text: z.string().min(1, "Goal text is required"),
  context: z.string().optional(),
  signals: z
    .array(GoalSignalInput)
    .min(1, "At least one signal must be provided")
    .max(10, "No more than 10 signals can be provided")
    .refine(
      (signals) => signals.every((signal) => signal.text.trim().length > 0),
      "Each signal must have at least 1 character",
    ),
});
export type GoalFormValues = z.infer<typeof GoalFormValues>;

export function GoalCreationDrawer({
  mode,
  goal,
  setGoal,
  onSubmit,
  contextDefaultOpen = false,
}: GoalCreationDrawerProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContext, setShowContext] = useState(
    () => contextDefaultOpen || !!goal?.user_provided_context,
  );
  const [contextQuestions, setContextQuestions] = useState<string[]>([]);
  const [didInitializeOnEdit, setDidInitializeOnEdit] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);

  const goalForm = useValidatedForm(GoalFormValues, {
    defaultValues: {
      text: "",
      context: "",
      signals: [],
    },
  });

  const goalSignalFields = useFieldArray({
    control: goalForm.control,
    name: "signals",
  });

  const generateGoalContextQuestions =
    api.goals.generateGoalContextQuestions.useMutation({
      onSuccess: (data) => {
        setContextQuestions(data);
      },
    });
  const generateGoalSignals = api.goals.generateGoalSignals.useMutation({
    onSuccess: (data) => {
      goalForm.setValue("signals", data);
    },
  });

  const handleOpenChange = useCallback(
    (open: boolean) => {
      goalForm.reset();
      generateGoalContextQuestions.reset();
      generateGoalSignals.reset();
      setIsHelpOpen(false);
      setIsSubmitting(false);
      setShowContext(false);
      setContextQuestions([]);
      setDidInitializeOnEdit(false);
      setIsEditingText(false);
      if (!open) {
        setGoal(null);
      }
    },
    [goalForm, generateGoalContextQuestions, generateGoalSignals, setGoal],
  );

  const handleSubmit = useCallback(
    async (values: GoalFormValues) => {
      await goalForm.trigger();
      setIsSubmitting(true);
      try {
        await onSubmit(values);
        handleOpenChange(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [goalForm, onSubmit, handleOpenChange],
  );

  const initializeGoal = useCallback(
    (goalToInit: NonNullable<typeof goal>) => {
      goalForm.setValue("text", goalToInit.text);
      if (!goalToInit.user_provided_context) {
        generateGoalContextQuestions.mutate({ goal_text: goalToInit.text });
      } else {
        goalForm.setValue("context", goalToInit.user_provided_context ?? "");
      }

      if (mode === "create" && !goalToInit.signals?.length) {
        generateGoalSignals.mutate({ goal_text: goalToInit.text });
      } else {
        goalForm.setValue("signals", goalToInit.signals ?? []);
      }
    },
    [generateGoalContextQuestions, generateGoalSignals, goalForm, mode],
  );

  useEffect(() => {
    if (!goal || didInitializeOnEdit) return;

    setDidInitializeOnEdit(true);
    initializeGoal(goal);
  }, [goal, didInitializeOnEdit, initializeGoal]);

  const isLoading =
    mode === "create" &&
    goal &&
    !goal.signals?.length &&
    !generateGoalSignals.data;
  const formErrors = goalForm.formState.errors;

  const handleTextEdit = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        void goalForm.register("text").onChange(e);
        setIsEditingText(false);
      }
    },
    [goalForm],
  );

  const handleSignalAdd = useCallback(() => {
    goalSignalFields.append({
      text: "",
      direction: "positive",
    });
  }, [goalSignalFields]);

  return (
    <>
      <Form {...goalForm}>
        <form onSubmit={goalForm.handleSubmit(handleSubmit)}>
          <Drawer open={!!goal} onOpenChange={handleOpenChange}>
            <DrawerContent className="[&_*]:!outline-none">
              <div className="container mx-auto">
                <DrawerHeader className="gap-0 px-7 pb-0">
                  <div className="flex items-baseline justify-between">
                    <div className="text-xs text-muted-foreground">
                      {mode === "create" ? "Creating" : "Editing"} goal:
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="-mr-3 h-4 cursor-help items-center gap-1 text-xs text-muted-foreground hover:bg-transparent"
                      onClick={() => setIsHelpOpen(true)}
                      tabIndex={-1}
                    >
                      <div>What is this?</div>
                      <HelpCircleIcon className="!h-3.5 !w-3.5" />
                    </Button>
                  </div>

                  <DrawerTitle
                    onClick={() => setIsEditingText(true)}
                    className="group flex cursor-pointer flex-col gap-3 pb-2 pt-[1.375rem]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex w-full items-center gap-2">
                        <div className="flex h-7 items-center">
                          <GoalIcon className="h-5 w-5 flex-shrink-0" />
                        </div>
                        {isEditingText ? (
                          <Input
                            {...goalForm.register("text")}
                            placeholder="Enter your goal..."
                            autoFocus
                            onBlur={() => setIsEditingText(false)}
                            onKeyDown={handleTextEdit}
                            className="-mb-1 -mr-3 h-7 w-full focus-visible:ring-0"
                          />
                        ) : (
                          <div className="flex w-full items-baseline gap-2">
                            <span className="relative">
                              <span className="group-hover:text-primary">
                                {goalForm.watch("text") || "Enter your goal..."}
                              </span>
                              <span className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-primary/50 transition-transform duration-200 ease-out group-hover:scale-x-100" />
                            </span>
                            <PencilIcon className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
                          </div>
                        )}
                      </div>
                    </div>
                  </DrawerTitle>
                </DrawerHeader>

                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="signals:generating"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="flex h-[254px] flex-col items-center justify-center space-y-4"
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                        className="relative"
                      >
                        <Loader2Icon className="h-8 w-8 text-primary" />
                        <motion.div
                          className="absolute inset-0"
                          animate={{
                            scale: [1, 1.4, 1],
                            opacity: [0.3, 0, 0.3],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
                        >
                          <Loader2Icon className="h-8 w-8 text-primary" />
                        </motion.div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-center"
                      >
                        <div className="text-sm font-medium text-primary">
                          Analyzing your goal
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Generating personalized signal suggestions...
                        </div>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <div key="signals:fields" className="space-y-2 px-4 py-4">
                      <div className="space-y-2">
                        <AnimatePresence mode="wait">
                          {!isLoading && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className={cn(!showContext && "pb-2")}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowContext(!showContext)}
                                className="group flex w-full items-center justify-start gap-2 rounded-md border border-dashed border-primary/20 bg-primary/5 py-1.5 text-sm text-primary/80 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                              >
                                <div className="flex h-5 w-5 items-center justify-center">
                                  <FileStackIcon className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                                </div>
                                <div className="flex flex-1 items-baseline justify-between">
                                  <span>
                                    {goalForm.watch("context")?.trim()
                                      .length === 0
                                      ? "Add context"
                                      : "Edit context"}
                                  </span>
                                  <span className="text-xs text-primary/50">
                                    Context helps Titan understand your goal
                                    better
                                  </span>
                                </div>
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <AnimatePresence mode="wait">
                          {showContext && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden pb-2"
                            >
                              <Textarea
                                {...goalForm.register("context")}
                                autoFocus={showContext}
                                placeholder={
                                  contextQuestions.length
                                    ? contextQuestions.join("\n")
                                    : "Add any helpful context or notes about your goal..."
                                }
                                className="min-h-[100px] resize-none rounded-md border-primary/20 bg-primary/5 text-sm placeholder:text-primary/40 focus:border-primary/30 focus:bg-primary/10 focus:ring-primary/20 focus-visible:ring-primary/20"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <AnimatePresence mode="wait">
                        {formErrors.signals && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-2 flex min-h-9 items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 text-sm text-destructive"
                          >
                            <div className="flex h-5 w-5 items-center justify-center">
                              <XCircleIcon className="h-4 w-4" />
                            </div>
                            <span>
                              {formErrors.signals.message ??
                                formErrors.signals.root?.message}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {goalSignalFields.fields.map((signal, index) => (
                        <motion.div
                          key={signal.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{
                            duration: 0.2,
                            delay: stagger(0.1, { startDelay: 0.2 })(
                              index,
                              goalSignalFields.fields.length,
                            ),
                          }}
                          className="flex-shrink-0"
                        >
                          <GoalSignal
                            index={index}
                            control={goalForm.control}
                            onDelete={() => goalSignalFields.remove(index)}
                          />
                        </motion.div>
                      ))}

                      <Button
                        variant="ghost"
                        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border/80 bg-background/50 py-2 text-sm text-muted-foreground hover:border-border hover:bg-background/80"
                        onClick={handleSignalAdd}
                        tabIndex={-1}
                        disabled={
                          isSubmitting || goalSignalFields.fields.length >= 10
                        }
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add signal
                        {goalSignalFields.fields.length >= 10 && (
                          <span className="ml-1 text-xs text-destructive">
                            (Max 10 signals)
                          </span>
                        )}
                      </Button>
                    </div>
                  )}
                </AnimatePresence>

                <div className="flex justify-end space-x-2 p-4">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    tabIndex={-1}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    onClick={() => goalForm.handleSubmit(handleSubmit)()}
                    tabIndex={-1}
                    disabled={isSubmitting}
                    className="relative min-w-[100px] overflow-hidden"
                  >
                    <AnimatePresence mode="wait">
                      {isSubmitting ? (
                        <motion.div
                          key="submitting"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"
                            animate={{
                              x: ["0%", "200%"],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "linear",
                            }}
                          />
                          <motion.div
                            animate={{
                              rotate: 360,
                              scale: [1, 1.2, 1],
                            }}
                            transition={{
                              rotate: {
                                duration: 1.5,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "linear",
                              },
                              scale: {
                                duration: 1,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "easeInOut",
                              },
                            }}
                            className="relative z-10"
                          >
                            <SparklesIcon className="h-4 w-4" />
                          </motion.div>
                          <span className="relative z-10">Saving Goal...</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="default"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          Save Goal
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </form>
      </Form>

      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>About Goals and Goal Signals</DialogTitle>
          </DialogHeader>

          <div className="prose prose-sm text-muted-foreground">
            <section>
              <h4 className="font-medium">What are Goals?</h4>
              <p className="mt-2">
                Goals help you track and improve specific behaviors or outcomes.
              </p>
              <p className="mt-2">
                For example, you might set a goal to &quot;improve my ability to
                give feedback during engineering discussions&quot;.
              </p>
            </section>

            <section>
              <h4 className="font-medium">Understanding Goal Signals</h4>
              <p className="mt-2">
                Goal Signals are specific indicators that help track progress
                towards your goal:
              </p>

              <ul className="mt-2">
                <li>Positive signals show you&apos;re making progress</li>
                <li>
                  Negative signals warn when you&apos;re getting off track
                </li>
              </ul>
            </section>

            <section>
              <h4 className="font-medium">How We Help</h4>
              <p className="mt-2">
                We analyze your goal and suggest relevant signals to help you
                stay accountable and measure your success over time. These
                signals will be used to automatically identify key moments and
                generate insights for your coaching sessions.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
