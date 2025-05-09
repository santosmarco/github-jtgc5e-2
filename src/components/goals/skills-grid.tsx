"use client";

import dayjs from "dayjs";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import _ from "lodash";

import { getReportScores } from "~/lib/reports/scoring";
import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

import { SkillCard } from "./skill-card";

export type SkillsGridProps = {
  skills: RouterOutputs["skills"]["getAllSkills"];
  profileId: string;
  onSkillStatusChange: () => Promise<void>;
  isLoading?: boolean;
};

function useSkillHistoricalScores(profileId: string, skillId: string) {
  const { data: timelineData } =
    api.reports.getReportsTimelineDataForUser.useQuery({
      userId: profileId,
      skillId,
    });

  return timelineData?.timelineData.map((data) => data.entry) ?? null;
}

function SkillCardContainer({
  skill,
  profileId,
  onSkillEnabled,
  onSkillDisabled,
  index,
}: {
  skill: RouterOutputs["skills"]["getAllSkills"][number];
  profileId: string;
  onSkillEnabled: () => Promise<void>;
  onSkillDisabled: () => Promise<void>;
  index: number;
}) {
  const historicalScores = useSkillHistoricalScores(profileId, skill.id);

  return (
    <motion.div
      key={skill.id}
      variants={itemVariants}
      layout
      custom={index}
      transition={{
        layout: { type: "spring", stiffness: 50, damping: 15 },
      }}
    >
      <SkillCard
        profileId={profileId}
        skill={skill}
        historicalScores={historicalScores}
        onSkillEnabled={onSkillEnabled}
        onSkillDisabled={onSkillDisabled}
      />
    </motion.div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
} as const satisfies Variants;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 70,
      damping: 18,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
    },
  },
} as const satisfies Variants;

export function SkillsGrid({
  skills,
  profileId,
  onSkillStatusChange,
  isLoading = false,
}: SkillsGridProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="grid auto-rows-max grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
    >
      <AnimatePresence mode="popLayout">
        {_.chain(skills)
          .sortBy((skill) => {
            // Sort alphabetically by title (used as fallback)
            return skill.title.toLowerCase();
          })
          .sortBy((skill) => {
            // Determine if skill is enabled
            const isEnabled = _.some(
              skill.goals,
              (goal) => goal.is_default && goal.is_current && !goal.deleted_at,
            );

            if (!isEnabled) return 1; // Disabled skills last

            // For enabled skills, get latest assessment dates
            const latestAssessment = _.chain(skill.reports)
              .orderBy([(r) => dayjs(r.created_at).toDate()], ["desc"])
              .head()
              .value();

            const latestValidAssessment = _.chain(skill.reports)
              .filter((report) => {
                const score = getReportScores(report);
                return score.status === "success";
              })
              .orderBy([(r) => dayjs(r.created_at).toDate()], ["desc"])
              .head()
              .value();

            const hasValidAssessment = !_.isNil(latestValidAssessment);

            // Sort by valid assessment existence (valid assessments first)
            if (!hasValidAssessment) {
              // If no valid assessment but has any assessment, sort by latest assessment date
              if (latestAssessment) {
                return -dayjs(latestAssessment.created_at).valueOf() * 0.5; // Use a multiplier to keep these below valid assessments but still sorted by date
              }
              return 0; // No assessments at all
            }

            // Sort by assessment date (most recent first)
            return -dayjs(latestValidAssessment.created_at).valueOf();
          })
          .value()
          .map((skill, index) => (
            <SkillCardContainer
              key={skill.id}
              skill={skill}
              profileId={profileId}
              onSkillEnabled={onSkillStatusChange}
              onSkillDisabled={onSkillStatusChange}
              index={index}
            />
          ))}
      </AnimatePresence>
    </motion.div>
  );
}
