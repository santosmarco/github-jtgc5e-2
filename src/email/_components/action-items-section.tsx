import { Text } from "@react-email/components";
import type { RouterOutputs } from "~/trpc/react";
import { SectionContainer } from "./section-container";

type ActionItemsSectionProps = {
  actionItems: RouterOutputs["actionItems"]["getByVideoId"];
};

export function ActionItemsSection({ actionItems }: ActionItemsSectionProps) {
  if (!actionItems?.length) return null;

  return (
    <SectionContainer
      title="Action Items"
      emoji="⚡"
      className="mt-4 rounded-lg bg-green-50 px-4 py-3"
      titleClassName="text-sm leading-6 text-green-900"
    >
      {actionItems.map((item) => (
        <Text key={item.id} className="text-sm leading-6 text-green-800">
          • {item.text}
          {item.assignees?.map(({ assignee }) => (
            <span
              key={assignee.id}
              className="ml-1 font-medium text-green-600 hover:text-green-700"
            >
              @{assignee.name}
            </span>
          ))}
        </Text>
      ))}
    </SectionContainer>
  );
}
