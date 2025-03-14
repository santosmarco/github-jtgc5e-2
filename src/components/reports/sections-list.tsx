import { TabsContent } from "~/components/ui/tabs";
import type { Enums } from "~/lib/supabase/database.types";
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

type SectionsListProps = {
  positiveSections: SectionWithScore[];
  negativeSections: SectionWithScore[];
  reportMoments: RouterOutputs["reports"]["getGroupReports"]["reports"][number]["report_moments"];
  selectedSectionId: string | null;
  onSectionSelect: (sectionId: string) => void;
  isAdmin?: boolean;
};

export const SectionsList = ({
  positiveSections,
  negativeSections,
  reportMoments,
  selectedSectionId,
  onSectionSelect,
  isAdmin = false,
}: SectionsListProps) => {
  return (
    <>
      <TabsContent value="positive" className="mt-6 space-y-4">
        {positiveSections.map((section, index) => {
          const sectionMoments = reportMoments.filter(
            (rm) => rm.report_section_id === section.id,
          );
          const shouldShow = isAdmin || sectionMoments.length > 0;

          if (!shouldShow) return null;

          return (
            <SectionCard
              key={section.id}
              section={section}
              index={index}
              isSelected={selectedSectionId === section.id}
              onSelect={() => onSectionSelect(section.id)}
              isAdmin={isAdmin}
              hasMoments={sectionMoments.length > 0}
            />
          );
        })}
      </TabsContent>

      <TabsContent value="negative" className="mt-6 space-y-4">
        {negativeSections.map((section, index) => {
          const sectionMoments = reportMoments.filter(
            (rm) => rm.report_section_id === section.id,
          );
          const shouldShow = isAdmin || sectionMoments.length > 0;

          if (!shouldShow) return null;

          return (
            <SectionCard
              key={section.id}
              section={section}
              index={index}
              isSelected={selectedSectionId === section.id}
              onSelect={() => onSectionSelect(section.id)}
              isAdmin={isAdmin}
              hasMoments={sectionMoments.length > 0}
            />
          );
        })}
      </TabsContent>
    </>
  );
};
