"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  ChevronRight,
  FileText,
  List,
  MessageSquare,
  SparkleIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ActionItemList } from "~/components/action-items/action-item-list";
import { MeetingTopics } from "~/components/meetings/meeting-topics";
import { usePlayer } from "~/components/player/provider";
import { TranscriptView } from "~/components/transcript-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useTabData } from "~/hooks/use-tab-data";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";

import { MeetingSummary } from "../meeting-summary";
import { VideoKeyMoments } from "../video-key-moments";
import { VideoTags } from "../video-tags";
import { TabContentWrapper } from "./tab-content-wrapper";
import { VideoPlayer } from "~/components/player/video";
import { useIsMobile } from "~/hooks/use-mobile";

export type VideoTabsViewProps = {
  activeTab: string;
  onTabChange: (value: string) => void;
  video: RouterOutputs["videos"]["getOne"];
};

export function VideoTabsView({
  activeTab,
  onTabChange,
  video,
}: VideoTabsViewProps) {
  const { currentTime, seek } = usePlayer();
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [showRightIndicator, setShowRightIndicator] = useState(false);
  const isMobile = useIsMobile();

  const topicsData = useTabData(
    api.meetingTopics.getBasicTopicsByVideoId.useQuery(
      {
        videoId: video.videoId,
        includeSegmentIds: true,
      },
      {
        refetchOnWindowFocus: false,
      },
    ),
    {
      isEmpty: (data) => !data || data.length === 0,
      defaultEmptyMessage: "No topics were identified for this meeting.",
      defaultLoadingMessage: "Loading topics...",
      defaultErrorMessage:
        "Failed to load meeting topics. Please try again later.",
    },
  );

  const actionItemsData = useTabData(
    api.actionItems.getByVideoId.useQuery({
      videoId: video.videoId,
    }),
    {
      isEmpty: (data) => !data || data.length === 0,
      defaultEmptyMessage: "No action items were found for this meeting.",
      defaultLoadingMessage: "Loading action items...",
      defaultErrorMessage:
        "Failed to load action items. Please try again later.",
    },
  );

  const transcriptData = useTabData(
    api.transcripts.getOne.useQuery(
      {
        videoId: video.videoId,
      },
      {
        refetchOnWindowFocus: false,
      },
    ),
    {
      isEmpty: (data) => !data || data.length === 0,
      defaultEmptyMessage: "No transcript is available for this meeting.",
      defaultLoadingMessage: "Loading transcript...",
      defaultErrorMessage:
        "Failed to load the transcript. Please try again later.",
    },
  );

  // Check if there's horizontal overflow in the tabs list
  useEffect(() => {
    const checkOverflow = () => {
      if (tabsListRef.current) {
        const { scrollWidth, clientWidth } = tabsListRef.current;
        setShowRightIndicator(scrollWidth > clientWidth);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, []);

  const handleScrollRight = () => {
    if (tabsListRef.current) {
      tabsListRef.current.scrollBy({ left: 200, behavior: "smooth" });
    }
  };

  const handleTopicClick = useCallback<
    NonNullable<React.ComponentProps<typeof MeetingTopics>["onTopicClick"]>
  >(
    (topic) => {
      if (!("vtt_start_segment_id" in topic) || !topic.vtt_start_segment_id)
        return;

      const vttLines = video.vtt?.split("\n") ?? [];
      const vttSegmentIndex = vttLines.findIndex(
        (line) => line === `${topic.vtt_start_segment_id}`,
      );

      if (vttSegmentIndex === -1) return;

      const [, vttStart] = vttLines[vttSegmentIndex + 1]?.split(" --> ") ?? [];
      if (!vttStart) return;

      const [hours, minutes, secondsWithMs] = vttStart.split(":") ?? [];
      if (!hours || !minutes || !secondsWithMs) return;

      const [seconds, milliseconds] = secondsWithMs.split(".") ?? [];
      if (!seconds) return;

      const timeInSeconds =
        Number(hours) * 3600 +
        Number(minutes) * 60 +
        Number(seconds) +
        (milliseconds ? Number(milliseconds) / 1000 : 0);

      if (!Number.isNaN(timeInSeconds)) {
        seek(timeInSeconds);
      }
    },
    [video.vtt, seek],
  );

  const handleJumpToMoment = useCallback(
    (timestamp: string) => {
      // Parse the timestamp format "00:03:15" to seconds
      const parts = timestamp.split(":").map(Number);

      // Safely access array elements with defaults if undefined
      const hours = parts[0] || 0;
      const minutes = parts[1] || 0;
      const seconds = parts[2] || 0;

      const timeInSeconds = hours * 3600 + minutes * 60 + seconds;

      if (!Number.isNaN(timeInSeconds)) {
        seek(timeInSeconds);
      }
    },
    [seek],
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={onTabChange}
      className="flex h-full flex-col overflow-hidden"
    >
      <div className="relative">
        <TabsList
          ref={tabsListRef}
          className="scrollbar-hide flex h-12 items-center justify-start gap-2 overflow-x-auto rounded-none bg-transparent px-6 py-0"
        >
          <motion.div
            className="flex min-w-max items-center gap-2"
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {isMobile && (
              <TabsTrigger
                value="video"
                className={cn(
                  "whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent",
                )}
              >
                Video
              </TabsTrigger>
            )}
            <TabsTrigger
              value="summary"
              className={cn(
                "whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent",
              )}
            >
              Meeting Summary
            </TabsTrigger>
            <TabsTrigger
              value="topics"
              className={cn(
                "whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent",
              )}
            >
              Topics Discussed
            </TabsTrigger>
            <TabsTrigger
              value="moments"
              className={cn(
                "whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent",
              )}
            >
              Key Moments
            </TabsTrigger>
            <TabsTrigger
              value="action-items"
              className={cn(
                "whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent",
              )}
            >
              Action Items
            </TabsTrigger>
            <TabsTrigger
              value="transcript"
              className={cn(
                "whitespace-nowrap rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent",
              )}
            >
              Transcript
            </TabsTrigger>
          </motion.div>
        </TabsList>

        {/* Right indicator with chevron */}
        {showRightIndicator && (
          <motion.div
            className="absolute right-0 top-0 flex h-12 items-center bg-gradient-to-l from-background to-transparent pl-6 pr-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              onClick={handleScrollRight}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/10"
              aria-label="Scroll to see more tabs"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {isMobile && (
            <TabsContent value="video" className="mt-0 h-full">
              <TabContentWrapper title="Video">
                <VideoPlayer video={video} />
              </TabContentWrapper>
            </TabsContent>
          )}
          <TabsContent value="summary" className="mt-0 h-full">
            <TabContentWrapper
              title="Meeting Summary"
              empty={!video.meeting?.summary}
              emptyMessage="No summary is available for this meeting."
              icon={<FileText className="h-5 w-5 text-muted-foreground" />}
              subtitle="Get an overview of what was discussed in this meeting"
            >
              <MeetingSummary video={video} />
            </TabContentWrapper>
          </TabsContent>

          <TabsContent value="topics" className="mt-0 h-full">
            <TabContentWrapper
              title="Topics Discussed"
              empty={topicsData.isEmpty}
              emptyMessage={topicsData.emptyMessage}
              isLoading={topicsData.isLoading}
              loadingMessage={topicsData.loadingMessage}
              icon={<List className="h-5 w-5 text-muted-foreground" />}
              subtitle="Click on any topic to jump to that point in the video"
            >
              <MeetingTopics
                topics={topicsData.data ?? []}
                onTopicClick={handleTopicClick}
              />
            </TabContentWrapper>
          </TabsContent>

          <TabsContent value="moments" className="mt-0 h-full">
            <TabContentWrapper
              title="Key Moments"
              subtitle="Important moments captured from this meeting"
              icon={<SparkleIcon className="h-5 w-5 text-muted-foreground" />}
            >
              <VideoKeyMoments moments={video.moments} onJumpToMoment={seek} />
            </TabContentWrapper>
          </TabsContent>

          <TabsContent value="action-items" className="mt-0 h-full">
            <TabContentWrapper
              title="Action Items"
              subtitle="Tasks that need to be completed from this meeting"
              empty={actionItemsData.isEmpty}
              emptyMessage={actionItemsData.emptyMessage}
              isLoading={actionItemsData.isLoading}
              loadingMessage={actionItemsData.loadingMessage}
              icon={<CalendarClock className="h-5 w-5 text-muted-foreground" />}
            >
              {actionItemsData.data && (
                <ActionItemList
                  videoId={video.videoId}
                  items={actionItemsData.data}
                  isLoading={actionItemsData.isLoading}
                />
              )}
            </TabContentWrapper>
          </TabsContent>

          <TabsContent value="transcript" className="mt-0 h-full">
            <TabContentWrapper
              title="Full Transcript"
              subtitle="Complete text of the meeting conversation"
              isLoading={transcriptData.isLoading}
              empty={transcriptData.isEmpty}
              emptyMessage={transcriptData.emptyMessage}
              icon={<MessageSquare className="h-5 w-5 text-muted-foreground" />}
            >
              <TranscriptView
                transcript={transcriptData.data}
                currentTime={currentTime}
                onWordClick={seek}
              />
            </TabContentWrapper>
          </TabsContent>
        </AnimatePresence>
      </div>
    </Tabs>
  );
}
