"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import * as React from "react";

import { Button } from "~/components/ui/button";
import { createConfettiEmitter } from "~/lib/confetti";
import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

import { Link } from "./ui/link";

export type OnboardingStep = {
  title: React.ReactNode;
  description: React.ReactNode;
  gifUrl?: string;
};

interface OnboardingFlowStage2Props {
  user: RouterOutputs["auth"]["getUser"];
}

const steps: OnboardingStep[] = [
  {
    title: "Welcome to Your Explore Chat",
    description: (
      <div>
        The <strong>Explore Tab</strong> is a powerful tool designed to help you
        uncover actionable insights from your meeting data. Get started with
        guided queries, like &apos;Explore My Feedback&apos;.{" "}
        <Link
          href="https://www.withtitan.com/documentation-articles/guided-insights"
          target="_blank"
        >
          Learn more
        </Link>
      </div>
    ),
    gifUrl: "/onboarding/stage-2/step-1.gif",
  },
  {
    title: "Dive Deeper with Commands",
    description: (
      <div>
        Dive deeper with custom queries and commands (&apos;/moments&apos;) that
        help you search your meetings for key moments and find patterns across
        you and your team.{" "}
        <Link
          href="https://www.withtitan.com/documentation-articles/custom-queries"
          target="_blank"
        >
          Learn more
        </Link>
      </div>
    ),
    gifUrl: "/onboarding/stage-2/step-2.gif",
  },
  {
    title: "Start Exploring Your Performance",
    description: (
      <div>
        The best way to learn is by diving in alone or with your coach. Jump
        into moments by clicking on them. Want a fresh start? You can{" "}
        <span className="font-bold text-primary">Reset</span> the chat anytime.
      </div>
    ),
    gifUrl: "/onboarding/stage-2/step-3.gif",
  },
];

export function OnboardingFlowStage2({ user }: OnboardingFlowStage2Props) {
  const [currentStepIdx, setCurrentStepIdx] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(
    () => user.did_complete_post_ten_meeting_onboarding,
  );

  const apiUtils = api.useUtils();
  const { mutate: completePostTenMeetingOnboarding } =
    api.auth.completePostTenMeetingOnboarding.useMutation({
      onSuccess: () => {
        void apiUtils.auth.getUser.invalidate();
      },
    });

  const nextStep = async () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    } else if (currentStepIdx === steps.length - 1) {
      void createConfettiEmitter({ y: 0.3 }).fireDefault();
      setIsComplete(true);
      completePostTenMeetingOnboarding({ userId: user.id });
    }
  };

  const previousStep = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const currentStep = steps[currentStepIdx];

  if (!currentStep) return null;

  return (
    <AnimatePresence mode="wait">
      {!isComplete ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="relative w-full max-w-4xl rounded-lg border border-border bg-card/50 p-6 shadow-lg backdrop-blur-3xl"
          >
            <div className="flex flex-col items-center gap-6 bg-background/50 text-center backdrop-blur-3xl">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                {typeof user.user_metadata.avatar_url === "string" ? (
                  <div className="-mt-20 h-20 w-20 overflow-hidden rounded-full bg-muted">
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      width={80}
                      height={80}
                      className="object-cover"
                    />
                  </div>
                ) : null}
              </motion.div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStepIdx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="flex flex-col items-center"
                >
                  <motion.h2
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-10 px-8 text-3xl font-bold"
                  >
                    {currentStep.title}
                  </motion.h2>

                  {currentStep.gifUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: {
                          type: "spring",
                          stiffness: 100,
                          damping: 20,
                          delay: 0.3,
                        },
                      }}
                      className="aspect-video relative mb-7 overflow-hidden rounded-xl border border-border"
                    >
                      <motion.div
                        initial={{ scale: 1.1 }}
                        animate={{
                          scale: 1,
                          transition: {
                            duration: 0.6,
                            ease: "easeOut",
                            delay: 0.4,
                          },
                        }}
                      >
                        <Image
                          src={currentStep.gifUrl}
                          alt={`Tutorial step ${currentStepIdx + 1}`}
                          className="h-[420px] w-full object-contain"
                          height={420}
                          width={800}
                        />
                      </motion.div>
                    </motion.div>
                  )}

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-10 flex min-h-[84px] flex-col items-center justify-center px-12 text-sm leading-loose text-muted-foreground"
                  >
                    {currentStep.description}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mb-8 flex gap-3"
                  >
                    {steps.map((step, index) => (
                      <motion.div
                        key={`${index}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className={`h-2 w-2 rounded-full ${
                          index === currentStepIdx ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    ))}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex w-full gap-3"
                  >
                    {currentStepIdx > 0 && (
                      <Button
                        variant="outline"
                        onClick={previousStep}
                        className="flex-1"
                      >
                        Back
                      </Button>
                    )}
                    <Button
                      onClick={nextStep}
                      className="flex-1 bg-primary hover:bg-primary/90"
                    >
                      {currentStepIdx === steps.length - 1
                        ? "Get Started"
                        : "Next"}
                    </Button>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
