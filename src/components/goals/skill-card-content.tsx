"use client";

import { Slot } from "@radix-ui/react-slot";
import { motion, type Variants } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CalendarIcon,
  InfoIcon,
  Trophy,
} from "lucide-react";

import { SimplifiedGauge } from "~/components/ui/simplified-gauge";
import { cn } from "~/lib/utils";

// Animation variants
const gaugeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      delay: 0.2,
    },
  },
} as const satisfies Variants;

type ContentProps = {
  className?: string;
};

// Standardized animated icon component using Radix UI Slot
interface AnimatedIconProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

function AnimatedIcon({
  children,
  delay = 0.3,
  className = "",
}: AnimatedIconProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, duration: 0.4 }}
      className={cn("mb-4 rounded-full p-4", className)}
    >
      <Slot className="h-8 w-8">{children}</Slot>
    </motion.div>
  );
}

export function SuccessContent({
  finalScore,
  hasValidFallbackScore,
  className,
}: ContentProps & {
  finalScore: number | null;
  hasValidFallbackScore: boolean;
}) {
  return (
    <motion.div
      variants={gaugeVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {hasValidFallbackScore && (
        <motion.div
          className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-full bg-amber-500/10 px-4 py-2 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 20,
            delay: 0.5,
          }}
        >
          <div className="flex items-center gap-2">
            <InfoIcon className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-amber-600">
              Showing previous report data due to issues with the latest report
            </span>
          </div>
        </motion.div>
      )}
      <SimplifiedGauge
        value={finalScore}
        min={0}
        max={100}
        size="md"
        className="h-48"
      />
    </motion.div>
  );
}

export function NoSkillContent({ className }: ContentProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 text-center",
        className,
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 20,
        delay: 0.2,
      }}
    >
      <AnimatedIcon className="bg-muted/30">
        <AlertCircle className="text-muted-foreground" />
      </AnimatedIcon>
      <span className="bg-gradient-to-r from-muted-foreground to-muted-foreground/70 bg-clip-text text-xl font-semibold text-transparent">
        No Skill Data
      </span>
      <span className="text-xs text-muted-foreground/70">
        Skill configuration needed
      </span>
    </motion.div>
  );
}

export function NotEnoughDataContent({ className }: ContentProps) {
  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 text-center",
        className,
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 20,
        delay: 0.2,
      }}
    >
      <AnimatedIcon className="bg-amber-500/10">
        <AlertTriangle className="text-amber-500/80" />
      </AnimatedIcon>
      <span className="bg-gradient-to-r from-amber-500/90 to-amber-400/90 bg-clip-text text-xl font-semibold text-transparent">
        Not Enough Data
      </span>
      <span className="text-xs text-muted-foreground/70">
        More sessions needed
      </span>
    </motion.div>
  );
}

export function ScheduledReportContent({ className }: ContentProps) {
  return (
    <motion.div
      className={cn(
        "z-20 flex flex-col items-center justify-center py-4 text-center",
        className,
      )}
      variants={gaugeVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatedIcon className="bg-primary/20">
        <CalendarIcon className="text-primary" />
      </AnimatedIcon>
      <motion.p
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate="visible"
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 20,
          delay: 0.4,
          duration: 0.2,
        }}
        className="mb-2 text-lg font-medium text-foreground"
      >
        Report Scheduled
      </motion.p>
      <motion.p
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate="visible"
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 20,
          delay: 0.5,
          duration: 0.2,
        }}
        className="max-w-xs text-center text-sm text-muted-foreground"
      >
        Your skill report will be generated in the next report window
      </motion.p>
    </motion.div>
  );
}

export function DisabledContent({ className }: ContentProps) {
  return (
    <motion.div
      className={cn(
        "z-20 flex flex-col items-center justify-center py-4 text-center",
        className,
      )}
      variants={gaugeVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatedIcon className="bg-primary/20">
        <Trophy className="text-primary" />
      </AnimatedIcon>
      <motion.p
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate="visible"
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 20,
          delay: 0.4,
          duration: 0.2,
        }}
        className="mb-4 max-w-xs text-center text-base text-foreground"
      >
        Enable this skill to track your progress and receive personalized
        feedback.
      </motion.p>
    </motion.div>
  );
}
