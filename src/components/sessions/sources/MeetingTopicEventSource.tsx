import { Calendar, MessageSquare } from "lucide-react";

import {
  AnimatedBadge,
  CompactContainer,
  ContentSection,
  MetadataItem,
  SourceContainer,
  SourceHeader,
} from "./SourceBaseComponents";
import type { MeetingTopicEventData, SourceProps } from "./SourceItemFactory";

export function MeetingTopicEventSource({
  data,
  compact = false,
}: SourceProps<MeetingTopicEventData>) {
  if (compact) {
    return (
      <CompactContainer icon={<MessageSquare className="h-3.5 w-3.5" />}>
        <div className="flex gap-1.5 text-xs">
          <span className="line-clamp-1 font-medium">
            {data.data.topic.title}
          </span>
          {data.data.timestamp && (
            <span className="flex-shrink-0 text-[10px] text-muted-foreground">
              {data.data.timestamp}
            </span>
          )}
        </div>
      </CompactContainer>
    );
  }

  return (
    <SourceContainer>
      <SourceHeader
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        title={data.data.topic.title}
        badge={<AnimatedBadge>Topic Event</AnimatedBadge>}
        subtitle={
          data.data.description && (
            <div className="mt-0.5 text-xs text-muted-foreground">
              <span>{data.data.description}</span>
            </div>
          )
        }
      />

      {data.data.timestamp && (
        <MetadataItem icon={<Calendar className="h-3 w-3 text-primary/50" />}>
          {data.data.timestamp}
        </MetadataItem>
      )}

      {data.data.description && (
        <ContentSection label="Description">
          <p className="text-xs leading-relaxed text-foreground/90">
            {data.data.description}
          </p>
        </ContentSection>
      )}
    </SourceContainer>
  );
}
