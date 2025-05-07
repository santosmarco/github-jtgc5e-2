"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChartGantt, ChartSpline } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  XAxis,
  YAxis,
} from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useIsMobile } from "~/hooks/use-mobile";
import { useParticles } from "~/hooks/use-particles";
import { cn } from "~/lib/utils";

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
  currentReportDate: string;
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
  currentReportDate,
}: ReportMetricsProps): JSX.Element {
  const [metricTab, setMetricTab] = useState<"scales" | "timeline">("scales");
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const isMobile = useIsMobile();
  const userInteractedRef = useRef<boolean>(false);

  const { containerRef, setIsActive, ParticleEffect } = useParticles({
    count: isMobile ? 36 : 72,
  });

  // Create a memoized version of the global metric data
  const globalSkillData = useMemo(() => {
    const globalMetric = metrics.find(
      (m) => m.id === "global-skill-score" && m.history && m.history.length > 0,
    );

    if (!globalMetric?.history) return null;

    // Sort the history data by date
    const sortedData = [...globalMetric.history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    if (sortedData.length === 1) {
      const firstDate = new Date(sortedData[0]?.date ?? "");
      firstDate.setDate(firstDate.getDate() - 7); // Subtract 7 days for the first tick

      sortedData.unshift({
        date: firstDate.toISOString().split("T")[0] ?? "",
        value: 0,
      });
    }

    // Add a future date point without a value to create the "to be calculated" impression
    if (sortedData.length > 0) {
      const lastDate = new Date(sortedData[sortedData.length - 1]?.date ?? "");
      const nextDate = new Date(lastDate);
      nextDate.setDate(lastDate.getDate() + 7); // Add 7 days for the next tick

      sortedData.push({
        date: nextDate.toISOString().split("T")[0] ?? "",
        value: Number.NaN, // NaN will not render a point but will create a tick
      });
    }

    return sortedData;
  }, [metrics]);

  // Switch to timeline tab when data loads if user hasn't interacted
  useEffect(() => {
    if (
      globalSkillData &&
      globalSkillData.length > 0 &&
      !userInteractedRef.current
    ) {
      setMetricTab("timeline");
    }
  }, [globalSkillData]);

  // Handle tab change with user interaction tracking
  const handleTabChange = (value: string) => {
    userInteractedRef.current = true;
    setMetricTab(value as "scales" | "timeline");
  };

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
        className="flex items-center gap-1.5 sm:gap-3"
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
            "w-24 truncate text-right text-[10px] leading-none transition-all duration-200 sm:w-40 sm:text-xs",
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
          {/* Center marker */}
          <div className="absolute left-1/2 top-1/2 h-3 w-[1px] -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/30" />

          <motion.div
            initial={{ left: "50%" }}
            animate={{
              left: `${100 - metric.value}%`,
              boxShadow: isHighlighted
                ? selectedTab === "positive"
                  ? "0 0 20px 8px hsl(var(--primary) / 0.3)"
                  : "0 0 20px 8px hsl(var(--amber-500) / 0.3)"
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
              "absolute top-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200",
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
                        ? "0 0 25px 10px hsl(var(--primary) / 0.4)"
                        : "0 0 25px 10px hsl(var(--amber-500) / 0.4)",
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
            "w-24 truncate text-left text-[10px] leading-none transition-all duration-200 sm:w-40 sm:text-xs",
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

  // Memoize the chart config
  const chartConfig = useMemo<ChartConfig>(
    () => ({
      value: {
        label: "Skill Score",
        color:
          selectedTab === "positive"
            ? "hsl(var(--primary))"
            : "hsl(var(--amber-500))",
      },
    }),
    [selectedTab],
  );

  // Find the current report data point for highlighting
  const currentReportDataPoint = useMemo(() => {
    if (!globalSkillData || !currentReportDate) return null;

    const dataPoint = globalSkillData.find(
      (point) => point.date === currentReportDate,
    );
    return dataPoint || null;
  }, [globalSkillData, currentReportDate]);

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
      className="group/metrics relative flex h-full flex-col gap-2 overflow-hidden rounded-xl border border-border/60 bg-card/[0.02] bg-gradient-to-br from-background/90 to-background/70 px-4 py-2 pb-4 text-xs shadow-lg transition-all duration-500 hover:border-primary/70 sm:min-h-[260px] sm:gap-4 sm:px-6 sm:pb-2"
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
        onValueChange={handleTabChange}
        className="relative z-10 h-full w-full flex-col"
      >
        <div className="flex items-center justify-between px-2">
          <TabsList className="-mx-6 bg-background/5 backdrop-blur-sm sm:-mx-4">
            <TabsTrigger
              value="timeline"
              className="flex items-center rounded-sm text-[10px] hover:text-primary data-[state=active]:text-primary sm:text-xs"
            >
              <ChartSpline className="mr-2 h-3.5 w-3.5" />
              Timeline
            </TabsTrigger>
            <TabsTrigger
              value="scales"
              className="flex items-center rounded-sm text-[10px] hover:text-primary data-[state=active]:text-primary sm:text-xs"
            >
              <ChartGantt className="mr-2 h-3.5 w-3.5" />
              Scales
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="scales" className="my-2 sm:my-4">
          <div className="flex h-full flex-col justify-center gap-2.5 pt-1 sm:gap-3 sm:px-2 sm:pt-2">
            <AnimatePresence>
              {metrics
                .filter((m) => m.id !== "global-skill-score")
                .map(renderMetricScale)}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="my-2 sm:my-4">
          <div className="flex h-full flex-col justify-center pt-1 sm:gap-1 sm:px-2 sm:pt-2">
            {!globalSkillData || globalSkillData.length === 0 ? (
              <motion.div
                className="flex h-full w-full flex-col items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  className="flex flex-col items-center gap-3"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <motion.div
                    className="flex space-x-2"
                    initial={{ y: 10 }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-2.5 w-2.5 rounded-full bg-primary/80"
                        initial={{ opacity: 0.3 }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1.2,
                          repeat: Number.POSITIVE_INFINITY,
                          delay: i * 0.2,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </motion.div>
                  <motion.p
                    className="text-center text-sm font-medium text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    Loading timeline data...
                  </motion.p>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                className="-ml-5 h-[166px] w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <AreaChart
                    data={globalSkillData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 15 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      tickFormatter={(value) => {
                        return [value.split("-")[1], value.split("-")[2]].join(
                          "/",
                        );
                      }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      domain={[0, 100]}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={{ stroke: "hsl(var(--border))" }}
                      label={{
                        angle: -90,
                        position: "insideLeft",
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 10,
                        dx: -10,
                      }}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => {
                            const numValue =
                              typeof value === "number"
                                ? value
                                : Number.parseFloat(value as string);
                            if (Number.isNaN(numValue)) {
                              return ["Skill Score: ", "N/A"];
                            }
                            return ["Skill Score: ", `${numValue}`];
                          }}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={0.2}
                      fill="hsl(var(--primary))"
                      dot={{
                        r: 3,
                        fill: "hsl(var(--background))",
                        stroke: "hsl(var(--primary))",
                        strokeWidth: 2,
                      }}
                      activeDot={{
                        r: 5,
                        fill: "hsl(var(--primary))",
                        strokeWidth: 0,
                      }}
                      connectNulls={false}
                    />

                    {/* Highlight the current report date dot */}
                    {currentReportDataPoint &&
                      !Number.isNaN(currentReportDataPoint.value) && (
                        <ReferenceDot
                          x={currentReportDataPoint.date}
                          y={currentReportDataPoint.value}
                          r={6}
                          fill="hsl(var(--background))"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          strokeOpacity={0.9}
                          isFront={true}
                        >
                          <animate
                            attributeName="r"
                            from="6"
                            to="8"
                            dur="1.5s"
                            repeatCount="indefinite"
                          />
                        </ReferenceDot>
                      )}
                  </AreaChart>
                </ChartContainer>
              </motion.div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
