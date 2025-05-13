"use client";

import { TagIcon, ClockIcon, UserIcon, ActivityIcon } from "lucide-react";

import { CollapsibleSection } from "~/components/chat/collapsible-section";
import { MomentDisplay } from "~/components/chat/moment-display";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import { Badge } from "~/components/ui/badge";

export type DisplayMomentResultUIProps = {
  id: string;
  moment: VideoMoment;
  reasoning?: string;
  args?: Record<string, unknown>;
};

export function DisplayMomentResultUI({
  id,
  moment,
  reasoning,
  args,
}: DisplayMomentResultUIProps) {
  if (!moment) {
    return null;
  }

  const duration =
    moment.segment_end_timestamp_in_seconds -
    moment.segment_start_timestamp_in_seconds;
  const formattedDuration = () => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.round(duration % 60);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <CollapsibleSection
      title={moment.title || "Displayed Moment"}
      icon={TagIcon}
      args={args}
      defaultOpen={true}
    >
      <div className="space-y-2 p-2">
        {(moment.activity_type ||
          moment.target_person_type ||
          duration > 0) && (
          <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-border pb-2">
            {moment.activity_type && (
              <Badge
                variant="outline"
                className="flex items-center gap-1 text-xs"
              >
                <ActivityIcon className="h-3 w-3" />
                {moment.activity_type}
              </Badge>
            )}
            {moment.target_person_type && (
              <Badge
                variant="outline"
                className="flex items-center gap-1 text-xs"
              >
                <UserIcon className="h-3 w-3" />
                {moment.target_person_type}
              </Badge>
            )}
            {duration > 0 && (
              <Badge
                variant="outline"
                className="flex items-center gap-1 text-xs"
              >
                <ClockIcon className="h-3 w-3" />
                {formattedDuration()}
              </Badge>
            )}
          </div>
        )}
        <MomentDisplay id={id} reasoning={reasoning} />
      </div>
    </CollapsibleSection>
  );
}
