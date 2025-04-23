import { format } from "date-fns";
import { Calendar, Video } from "lucide-react";

import {
  AnimatedBadge,
  CompactContainer,
  ContentSection,
  MetadataItem,
  SourceContainer,
  SourceHeader,
} from "./SourceBaseComponents";
import type { MeetingData, SourceProps } from "./SourceItemFactory";

export function MeetingSource({
  data,
  compact = false,
}: SourceProps<MeetingData>) {
  if (compact) {
    return (
      <CompactContainer icon={<Video className="h-3.5 w-3.5" />}>
        <div className="flex gap-1.5 text-xs">
          <span className="line-clamp-1 font-medium">
            {data.data.name ?? "Meeting"}
          </span>
          {data.data.date && (
            <span className="flex-shrink-0 text-[10px] text-muted-foreground">
              {format(new Date(data.data.date), "MMM d")}
            </span>
          )}
        </div>
      </CompactContainer>
    );
  }

  return (
    <SourceContainer>
      <SourceHeader
        icon={<Calendar className="h-3.5 w-3.5" />}
        title={data.data.name ?? "Meeting"}
        badge={<AnimatedBadge>Meeting</AnimatedBadge>}
      />

      {data.data.date && (
        <MetadataItem icon={<Calendar className="h-3 w-3 text-primary/50" />}>
          {format(new Date(data.data.date), "MMMM d, yyyy")}
        </MetadataItem>
      )}

      {data.data.summary && (
        <ContentSection label="Summary">
          <p className="text-xs leading-relaxed text-foreground/90">
            {data.data.summary}
          </p>
        </ContentSection>
      )}
    </SourceContainer>
  );
}
