import { MessageSquare } from "lucide-react";

import {
  AnimatedBadge,
  CompactContainer,
  ContentSection,
  SourceContainer,
  SourceHeader,
} from "./SourceBaseComponents";
import type { SourceProps, TopicDiscussedData } from "./SourceItemFactory";

export function TopicDiscussedSource({
  data,
  compact = false,
}: SourceProps<TopicDiscussedData>) {
  if (compact) {
    return (
      <CompactContainer icon={<MessageSquare className="h-3.5 w-3.5" />}>
        <div className="line-clamp-1 text-xs font-medium">
          {data.data.title}
        </div>
      </CompactContainer>
    );
  }

  return (
    <SourceContainer>
      <SourceHeader
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        title={data.data.title}
        badge={<AnimatedBadge>Topic Discussed</AnimatedBadge>}
      />

      <ContentSection>
        <p className="text-xs leading-relaxed text-foreground/90">
          {data.data.summary}
        </p>
      </ContentSection>
    </SourceContainer>
  );
}
