"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChartGantt, ChartSpline } from "lucide-react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useParticles } from "~/hooks/use-particles";
import { cn, isTruthy } from "~/lib/utils";

export type ReportMetric = {
  id: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  history?: Array<{ date: string; value: number }>;
};

export interface ReportMetricsProps {
  metrics: ReadonlyArray<ReportMetric>;
  selectedTab: "positive" | "negative";
}

// Enhanced animations matching goal-card-minimal
const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 70,
      damping: 18,
      mass: 1,
      staggerChildren: 0.08,
    },
  },
};

export function ReportMetrics({
  metrics,
  selectedTab,
}: ReportMetricsProps): JSX.Element {
  const [metricTab, setMetricTab] = useState<"scales" | "timeline">("scales");
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const { containerRef, setIsActive, ParticleEffect } = useParticles({
    count: 72,
  });

  const renderMetricScale = (metric: ReportMetric, index: number) => {
    const isHighlighted =
      selectedTab === "positive"
        ? metric.value <= 50
        : selectedTab === "negative"
          ? metric.value > 50
          : false;

    return (
      <motion.div
        key={metric.id}
        className="flex items-center gap-3"
        variants={{
          hidden: { opacity: 0, x: -20 },
          visible: {
            opacity: 1,
            x: 0,
            transition: {
              type: "spring",
              stiffness: 100,
              damping: 20,
              delay: index * 0.05,
            },
          },
        }}
      >
        <div
          className={cn(
            "w-40 truncate text-right leading-none transition-all duration-200",
            selectedTab === "negative"
              ? isHighlighted
                ? "font-medium text-amber-500"
                : "text-amber-500/40 group-hover/metrics:text-amber-500/50"
              : "text-amber-500/40 group-hover/metrics:text-amber-500/50",
          )}
        >
          {metric.leftLabel}
        </div>

        <div className="relative h-1.5 flex-1 rounded-full bg-accent-foreground/5">
          <motion.div
            initial={{ left: "50%" }}
            animate={{
              left: `${100 - metric.value}%`,
              boxShadow: isHighlighted
                ? selectedTab === "positive"
                  ? "0 0 20px 8px hsla(217.2,91.2%,57%,0.3)"
                  : "0 0 20px 8px hsla(38,92%,50%,0.3)"
                : "none",
            }}
            transition={{
              left: { duration: 0.5, delay: 0.5, ease: "easeOut" },
              boxShadow: {
                duration: 0.05,
                ease: [0.19, 1, 0.22, 1], // Custom easing for smoother effect
              },
            }}
            className={cn(
              "absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200",
              isHighlighted && selectedTab === "positive"
                ? "scale-125 bg-primary"
                : isHighlighted && selectedTab === "negative"
                  ? "scale-125 bg-amber-500"
                  : metric.value <= 50
                    ? "bg-primary/40 group-hover/metrics:bg-primary/50"
                    : "bg-amber-500/40 group-hover/metrics:bg-amber-500/50",
            )}
            // Add a subtle pulsing animation for highlighted circles
            whileHover={
              isHighlighted
                ? {
                    boxShadow:
                      selectedTab === "positive"
                        ? "0 0 25px 10px hsla(217.2,91.2%,57%,0.4)"
                        : "0 0 25px 10px hsla(38,92%,50%,0.4)",
                    transition: {
                      duration: 0.3,
                      ease: "easeOut",
                    },
                  }
                : {}
            }
          />
        </div>

        <div
          className={cn(
            "w-40 truncate text-left leading-none transition-all duration-200",
            selectedTab === "positive"
              ? isHighlighted
                ? "font-medium text-primary"
                : "text-primary/40 group-hover/metrics:text-primary/50"
              : "text-primary/40 group-hover/metrics:text-primary/50",
          )}
        >
          {metric.rightLabel}
        </div>
      </motion.div>
    );
  };

  const renderMetricTimeline = (metric: ReportMetric, index: number) => {
    if (!metric.history || metric.history.length === 0) {
      return (
        <motion.div
          key={metric.id}
          className="flex h-full w-full flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated coming soon message with staggered letters */}
          <motion.div className="flex items-center justify-center">
            {Array.from("Coming Soon").map((letter, i) => (
              <motion.span
                key={`letter-${i}`}
                className="text-lg font-medium text-primary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: i * 0.05,
                  ease: "easeOut",
                }}
                whileHover={{
                  scale: 1.2,
                  color: "#60a5fa",
                  transition: { duration: 0.2 },
                }}
              >
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            ))}
          </motion.div>

          {/* Animated pulsing dots */}
          <motion.div
            className="mt-4 flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[0, 1, 2].map((dot) => (
              <motion.div
                key={`dot-${dot}`}
                className="h-2 w-2 rounded-full bg-primary/80"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: dot * 0.3,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>

          {/* Decorative animated elements */}
          <motion.div className="relative h-12 w-full">
            {/* Horizontal line with gradient */}
            <motion.div
              className="absolute left-1/2 top-1/2 h-0.5 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
              initial={{ width: 0 }}
              animate={{ width: "80%" }}
              transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
            />

            {/* Animated circles */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={`circle-${i}`}
                className="absolute h-3 w-3 rounded-full bg-primary/20"
                initial={{
                  x: `calc(${50 + (i - 2) * 15}% - 6px)`,
                  y: "calc(50% - 6px)",
                  opacity: 0,
                }}
                animate={{
                  y: [
                    "calc(50% - 6px)",
                    `calc(50% - ${10 + i * 3}px)`,
                    "calc(50% - 6px)",
                  ],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: 1 + i * 0.2,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 1,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>

          <motion.p
            className="text-center text-xs text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            Timeline visualization is being crafted for a better experience
          </motion.p>
        </motion.div>
      );
    }
  };

  return (
    <motion.div
      ref={containerRef}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      onHoverStart={() => {
        setIsHovered(true);
        setIsActive(true);
      }}
      onHoverEnd={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      className="group/metrics relative flex h-full min-h-[260px] flex-col gap-4 overflow-hidden rounded-xl border border-border/60 bg-card/[0.02] bg-gradient-to-br from-background/90 to-background/70 py-2 text-xs shadow-lg transition-all duration-500 hover:border-primary/70"
      style={{
        boxShadow: "0 10px 30px rgba(0,0,0,0.1), 0 1px 8px rgba(0,0,0,0.05)",
      }}
    >
      {/* Background glow effect */}
      <motion.div
        className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0"
        animate={{ opacity: isHovered ? 0.8 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Subtle particle effects */}
      <ParticleEffect />

      <Tabs
        value={metricTab}
        onValueChange={(value) => setMetricTab(value as "scales" | "timeline")}
        className="relative z-10 h-full w-full flex-col"
      >
        <div className="flex items-center justify-between px-2">
          <TabsList className="bg-background/5 backdrop-blur-sm">
            <TabsTrigger
              value="scales"
              className="flex items-center rounded-sm text-xs hover:text-primary data-[state=active]:text-primary"
            >
              <ChartGantt className="mr-2 h-3.5 w-3.5" />
              Scales
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="flex items-center rounded-sm text-xs hover:text-primary data-[state=active]:text-primary"
            >
              <ChartSpline className="mr-2 h-3.5 w-3.5" />
              Timeline
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="scales" className="my-4">
          <div className="flex h-full flex-col justify-center gap-4 px-2 pt-2">
            <AnimatePresence>{metrics.map(renderMetricScale)}</AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="my-4">
          <div className="flex h-full flex-col justify-center gap-4 px-2">
            {[metrics[0]].filter(isTruthy).map(renderMetricTimeline)}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
