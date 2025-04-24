import { motion } from "framer-motion";
import { ArrowUpRight, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useIsMobile } from "~/hooks/use-mobile";
import type { Enums } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { RouterOutputs } from "~/trpc/react";
import { SectionCard } from "./section-card";

type SectionWithScore = {
  totalScore: number;
  created_at: string;
  direction: Enums<"goal_signal_direction_type"> | null;
  id: string;
  index: number | null;
  report_id: string | null;
  summary: string | null;
  title: string | null;
};

interface SectionsListProps {
  positiveSections: ReadonlyArray<SectionWithScore>;
  negativeSections: ReadonlyArray<SectionWithScore>;
  reportMoments: RouterOutputs["reports"]["getGroupReports"]["reports"][number]["report_moments"];
  selectedSectionId: string | null;
  onSectionSelect: (sectionId: string) => void;
  isAdmin?: boolean;
}

const ANIMATION_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  },
  tabContent: {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  },
} as const;

export const SectionsList = ({
  positiveSections,
  negativeSections,
  reportMoments,
  selectedSectionId,
  onSectionSelect,
  isAdmin = false,
}: SectionsListProps): JSX.Element => {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("negative");
  const isMobile = useIsMobile();

  // Set the active tab based on the selected section
  useEffect(() => {
    if (selectedSectionId && isMobile) {
      const isInPositive = positiveSections.some(
        (s) => s.id === selectedSectionId,
      );
      const isInNegative = negativeSections.some(
        (s) => s.id === selectedSectionId,
      );

      if (isInPositive) setActiveTab("positive");
      if (isInNegative) setActiveTab("negative");
    }
  }, [selectedSectionId, positiveSections, negativeSections, isMobile]);

  const renderSectionList = (
    sections: ReadonlyArray<SectionWithScore>,
    type: "positive" | "negative",
  ): JSX.Element => {
    const isEmpty = sections.length === 0;
    const isPositive = type === "positive";
    const color = isPositive ? "primary" : "amber-500";
    const Icon = isPositive ? TrendingUp : Target;
    const title = isPositive ? "Doing Well" : "Growth Areas";
    const emptyMessage = isPositive
      ? "No strengths identified yet"
      : "No growth areas identified yet";
    const EmptyIcon = isPositive ? ArrowUpRight : Target;

    return (
      <div className="space-y-3">
        {!isMobile && (
          <motion.div
            variants={ANIMATION_VARIANTS.item}
            className="flex items-center justify-between"
          >
            <h3
              className={cn(
                "flex items-center gap-2 text-lg font-semibold",
                isPositive ? "text-primary" : "text-amber-500",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{title}</span>
            </h3>
            <div
              className={cn(
                "mx-4 h-1 flex-1 rounded-md",
                isPositive
                  ? "bg-gradient-to-r from-primary/20 to-primary/5"
                  : "bg-gradient-to-r from-amber-500/20 to-amber-500/5",
              )}
            />
          </motion.div>
        )}

        <motion.div
          variants={
            isMobile ? ANIMATION_VARIANTS.tabContent : ANIMATION_VARIANTS.item
          }
          className="space-y-2"
        >
          {isEmpty && (
            <motion.div
              variants={ANIMATION_VARIANTS.item}
              className={cn(
                "flex flex-col items-center justify-center rounded-md bg-background/50 py-8 text-center",
                isMobile && "py-6",
              )}
            >
              <EmptyIcon
                className={cn(
                  "mb-2 text-muted-foreground/50",
                  isMobile ? "h-6 w-6" : "h-8 w-8",
                )}
              />
              <p
                className={cn(
                  "font-medium text-muted-foreground",
                  isMobile ? "text-xs" : "text-sm",
                )}
              >
                {emptyMessage}
              </p>
            </motion.div>
          )}

          {sections.map((section, index) => {
            const sectionMoments = reportMoments.filter(
              (moment) => moment.report_section_id === section.id,
            );
            const shouldShow = isAdmin || sectionMoments.length > 0;

            if (!shouldShow) return null;

            const isHovered = hoveredSection === section.id;
            const isSelected = selectedSectionId === section.id;

            return (
              <motion.div
                key={section.id}
                variants={ANIMATION_VARIANTS.item}
                onMouseEnter={() => setHoveredSection(section.id)}
                onMouseLeave={() => setHoveredSection(null)}
                className={cn(
                  "overflow-hidden rounded-md border shadow-sm transition-all duration-300",
                  isPositive
                    ? "border-primary/10 bg-gradient-to-r from-primary/5 to-transparent"
                    : "border-amber-500/10 bg-gradient-to-r from-amber-500/5 to-transparent",
                  isHovered &&
                    (isPositive ? "border-primary/30" : "border-amber-500/30"),
                  isHovered && "shadow-md",
                  isSelected &&
                    (isPositive ? "border-primary/50" : "border-amber-500/50"),
                  isSelected &&
                    (isPositive ? "shadow-primary/10" : "shadow-amber-500/10"),
                  isMobile && "active:scale-[0.98]",
                )}
              >
                <SectionCard
                  section={section}
                  index={index}
                  isSelected={isSelected}
                  onSelect={() => onSectionSelect(section.id)}
                  isAdmin={isAdmin}
                  hasMoments={sectionMoments.length > 0}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    );
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={ANIMATION_VARIANTS.container}
      className={cn(
        "flex flex-col gap-6 rounded-md bg-gradient-to-br from-background/80 to-background/40 pb-5 shadow-lg backdrop-blur-sm",
        isMobile && "gap-3 pb-3",
      )}
    >
      {isMobile ? (
        <Tabs
          defaultValue="negative"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="sticky top-0 z-10 bg-background/90 pt-2 backdrop-blur-md">
            <TabsList
              className={cn(
                "grid w-full grid-cols-2 rounded-md bg-muted/30 p-0.5",
                "border-0 shadow-sm",
              )}
            >
              <TabsTrigger
                value="positive"
                className={cn(
                  "border-0 text-xs font-medium",
                  "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
                  "rounded-md transition-all duration-200",
                )}
              >
                <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                <span>Doing Well</span>
                <span className="ml-1.5 text-[10px] text-muted-foreground/80">
                  {positiveSections.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="negative"
                className={cn(
                  "border-0 text-xs font-medium",
                  "data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500 data-[state=active]:shadow-none",
                  "rounded-md transition-all duration-200",
                )}
              >
                <Target className="mr-1.5 h-3.5 w-3.5" />
                <span>Growth Areas</span>
                <span className="ml-1.5 text-[10px] text-muted-foreground/80">
                  {negativeSections.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="positive"
            className="mt-2 focus-visible:outline-none"
          >
            {renderSectionList(positiveSections, "positive")}
          </TabsContent>
          <TabsContent
            value="negative"
            className="mt-2 focus-visible:outline-none"
          >
            {renderSectionList(negativeSections, "negative")}
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {renderSectionList(positiveSections, "positive")}
          {renderSectionList(negativeSections, "negative")}
        </>
      )}
    </motion.div>
  );
};
