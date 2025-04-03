import { motion } from "framer-motion";
import { ArrowUpRight, Target, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { Enums } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
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
      <div className="space-y-4">
        <motion.div
          variants={ANIMATION_VARIANTS.item}
          className="flex items-center justify-between"
        >
          <h3
            className={`flex items-center gap-2 text-lg font-semibold text-${color}`}
          >
            <Icon className="h-5 w-5" />
            <span>{title}</span>
          </h3>
          <div
            className={`mx-4 h-1 flex-1 rounded-full bg-gradient-to-r from-${color}/20 to-${color}/5`}
          />
        </motion.div>

        <motion.div variants={ANIMATION_VARIANTS.item} className="space-y-2">
          {isEmpty && (
            <motion.div
              variants={ANIMATION_VARIANTS.item}
              className="flex flex-col items-center justify-center rounded-lg bg-background/50 py-8 text-center"
            >
              <EmptyIcon className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
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
                  `overflow-hidden rounded-lg border border-${color}/10 bg-gradient-to-r from-${color}/5 to-transparent shadow-sm transition-all duration-300`,
                  isHovered && `border-${color}/30 shadow-md`,
                  isSelected && `border-${color}/50 shadow-${color}/10`,
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
      className="flex flex-col gap-6 rounded-xl bg-gradient-to-br from-background/80 to-background/40 pb-5 shadow-lg backdrop-blur-sm"
    >
      {renderSectionList(positiveSections, "positive")}
      {renderSectionList(negativeSections, "negative")}
    </motion.div>
  );
};
