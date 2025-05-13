"use client";

import { FileText } from "lucide-react";

import type { RouterOutputs } from "~/trpc/shared";

import { VideoTags } from "./video-tags";

export type MeetingSummaryProps = {
  video: RouterOutputs["videos"]["getOne"];
};

export function MeetingSummary({ video }: MeetingSummaryProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header bar (fixed) */}
      <div className="sticky top-0 z-10 flex h-9 flex-shrink-0 items-center border-b border-border bg-background/80 px-4 py-2 text-sm backdrop-blur">
        <div className="flex items-center gap-x-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-medium leading-none">Meeting Summary</span>
        </div>
      </div>

      {/* Summary content */}
      <div className="px-4 pb-4 pt-4">
        <div className="text-sm text-muted-foreground">
          {video.meeting?.summary}
        </div>

        <VideoTags video={video} />
      </div>
    </div>
  );
}
