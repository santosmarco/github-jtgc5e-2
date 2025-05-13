"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import { CalendarDaysIcon, HashIcon, UserIcon, VideoIcon } from "lucide-react";

import { CollapsibleSection } from "~/components/chat/collapsible-section";
import type { ListMeetingsToolOutput } from "~/lib/ai/tools";

type MeetingItem = NonNullable<ListMeetingsToolOutput["data"]>[number];

export type MeetingCardProps = {
  meeting: MeetingItem;
  index: number;
};

function MeetingCard({ meeting, index }: MeetingCardProps) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: index * 0.1,
      },
    },
  };

  const handleOpenMeeting = () => {
    if (meeting.id) {
      window.open(`/videos/${meeting.id}`, "_blank");
    }
  };

  return (
    <motion.button
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      onClick={handleOpenMeeting}
      className="group w-full rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"
    >
      <div className="flex items-start justify-between">
        <h4 className="mb-2.5 text-base font-semibold text-primary group-hover:text-primary/90">
          {meeting.name || "Untitled Meeting"}
        </h4>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        {meeting.date && (
          <div className="flex items-center gap-1.5">
            <CalendarDaysIcon className="h-3.5 w-3.5 text-primary/60" />
            <span>{dayjs(meeting.date).format("MMM D, YYYY, h:mm A")}</span>
          </div>
        )}

        {meeting.speaker && (
          <div className="flex items-center gap-1.5">
            <UserIcon className="h-3.5 w-3.5 text-primary/60" />
            <span className="font-medium">Speaker:</span>
            <span>{meeting.speaker}</span>
          </div>
        )}

        {meeting.momentIds && meeting.momentIds.length > 0 && (
          <div className="flex items-center gap-1.5">
            <HashIcon className="h-3.5 w-3.5 text-primary/60" />
            <span>
              {meeting.momentIds.length} moment
              {meeting.momentIds.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </motion.button>
  );
}

export type ListMeetingsResultUIProps = {
  data: MeetingItem[] | null;
  args?: Record<string, unknown>;
};

export function ListMeetingsResultUI({
  data,
  args,
}: ListMeetingsResultUIProps) {
  if (!data?.length) {
    return (
      <CollapsibleSection
        title="Found Meetings"
        icon={VideoIcon}
        count={0}
        args={args}
        defaultOpen={true}
      >
        <p className="p-3 text-sm text-muted-foreground">
          No meetings found matching your criteria.
        </p>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title="Found Meetings"
      icon={VideoIcon}
      count={data.length}
      args={args}
      defaultOpen={true}
    >
      <div className="flex flex-wrap gap-3 py-2">
        {data.map((meeting, index) => (
          <MeetingCard key={meeting.id} meeting={meeting} index={index} />
        ))}
      </div>
    </CollapsibleSection>
  );
}
