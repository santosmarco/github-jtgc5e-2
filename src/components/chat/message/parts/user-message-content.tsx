"use client";

import { TagIcon, VideoIcon } from "lucide-react";

import type { ChatRequestBody } from "~/app/api/chat/route";
import { Markdown } from "~/components/markdown/markdown";
import { Badge } from "~/components/ui/badge";

export type UserMessageContentProps = {
  id: string;
  pinnedContent: NonNullable<
    ChatRequestBody["selectedMoments" | "selectedVideos"]
  >[number][];
  content: string;
};

export function UserMessageContent({
  id,
  pinnedContent,
  content: contentWithoutContext,
}: UserMessageContentProps) {
  return (
    <div className="text-primary-foreground">
      {pinnedContent.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5 border-b border-primary/10 pb-1.5">
          {pinnedContent.map((item) => (
            <Badge
              key={"id" in item ? item.id : item.videoId}
              variant="outline"
              className="flex items-center gap-1.5 border-primary/20 bg-primary/10 font-normal text-primary-foreground/90"
            >
              {"videoId" in item ? (
                <VideoIcon className="h-3 w-3" />
              ) : (
                <TagIcon className="h-3 w-3" />
              )}
              {item.title}
            </Badge>
          ))}
        </div>
      )}

      <Markdown id={id} content={contentWithoutContext} />
    </div>
  );
}
