import { UsersIcon } from "lucide-react";
import { z } from "zod";

import { CollapsibleSection } from "~/components/chat/collapsible-section";
import { Badge } from "~/components/ui/badge";
import type { Video } from "~/lib/schemas/video";

export type VideoTagsProps = {
  video: Video;
};

export function VideoTags({ video }: VideoTagsProps) {
  return (
    <CollapsibleSection title="Meeting Participants" icon={UsersIcon}>
      <div className="flex flex-wrap gap-2 px-2 pb-2">
        {video.tags
          ?.filter((tag) => !isUuid(tag))
          .map((tag, index) => (
            <Badge
              key={index}
              variant="secondary"
              size="sm"
              className="flex items-center gap-1 rounded-sm border border-border px-2 py-1"
            >
              <span className="text-xs">{tag}</span>
            </Badge>
          ))}
      </div>
    </CollapsibleSection>
  );
}

function isUuid(tag: string) {
  return z.string().uuid().safeParse(tag).success;
}
