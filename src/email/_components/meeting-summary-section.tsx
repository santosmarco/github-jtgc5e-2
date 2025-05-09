import { Text } from "@react-email/components";

import { SectionContainer } from "./section-container";

type MeetingSummarySectionProps = {
  summary: string | null;
};

export function MeetingSummarySection({ summary }: MeetingSummarySectionProps) {
  if (!summary) return null;

  return (
    <SectionContainer
      className="mt-4 rounded-lg bg-blue-50 px-4 py-3"
      title="Key Takeaways"
      emoji="🎯"
      titleClassName="text-sm leading-6 text-blue-900"
    >
      <Text className="text-sm leading-6 text-blue-800">{summary}</Text>
    </SectionContainer>
  );
}
