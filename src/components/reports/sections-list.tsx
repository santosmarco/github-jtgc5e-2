import { ArrowUpRight, GoalIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
  onTabChange: (value: string) => void;
};

export const SectionsList = ({
  positiveSections,
  negativeSections,
  reportMoments,
  selectedSectionId,
  onSectionSelect,
  isAdmin = false,
  onTabChange,
}: SectionsListProps) => {
  return (
    <Tabs
      defaultValue="positive"
      className="w-full"
      onValueChange={onTabChange}
    >
      <TabsList className="flex w-full justify-between gap-2 bg-transparent px-0">
        <TabsTrigger
          value="positive"
          className="flex w-full items-center gap-1.5 rounded-md border text-sm font-medium transition-colors hover:bg-accent data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-500/10 data-[state=inactive]:text-muted-foreground"
        >
          <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          Doing Well
        </TabsTrigger>
        <TabsTrigger
          value="negative"
          className="flex w-full items-center gap-1.5 rounded-md border text-sm font-medium transition-colors hover:bg-accent data-[state=active]:border-amber-500 data-[state=active]:bg-amber-500/10 data-[state=inactive]:text-muted-foreground"
        >
          <GoalIcon className="h-4 w-4 text-amber-500" />
          Growth Areas
        </TabsTrigger>
      </TabsList>

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
    </Tabs>
  );
};
