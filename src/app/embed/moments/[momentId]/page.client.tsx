"use client";

import { MomentCard } from "~/components/moment-card";
import type { VideoMoment } from "~/lib/schemas/video-moment";

export type EmbedMomentPageClientProps = {
  moment: VideoMoment;
};

export function EmbedMomentPageClient({ moment }: EmbedMomentPageClientProps) {
  const handleSkipToMoment = () => {
    void window.open(
      `/videos/${moment.video_id}?startAt=${moment.segment_ideal_timestamp_in_seconds ?? moment.segment_start_timestamp_in_seconds}`,
      "_blank",
    );
  };

  return (
    <MomentCard
      noShare
      moment={moment}
      onSkipToMoment={handleSkipToMoment}
      jumpToLabel="Watch"
      className="rounded-lg border-none bg-transparent pb-0"
    />
  );
}
