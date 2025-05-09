"use client";

import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import { CameraIcon } from "lucide-react";
import { parseAsInteger, parseAsStringEnum, useQueryState } from "nuqs";
import { useCallback } from "react";
import { z } from "zod";

import { ChatContextProvider } from "~/components/floating-chat/chat-context-provider";
import { PlayerProvider } from "~/components/player/provider";
import { VideoPlayer } from "~/components/player/video";
import { api } from "~/trpc/react";

import { EmbeddedChatView } from "./_components/layouts/embedded-chat-view";
import { VideoPageHeader } from "./_components/layouts/video-page-header";
import { VideoTabsView } from "./_components/layouts/video-tabs-view";

const TabName = z.enum([
  "summary",
  "topics",
  "moments",
  "action-items",
  "transcript",
]);
type TabName = z.infer<typeof TabName>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
} as const satisfies Variants;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
} as const satisfies Variants;

export type VideoPageClientProps = {
  videoId: string;
};

export function VideoPageClient({ videoId }: VideoPageClientProps) {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringEnum(TabName.options).withDefault("summary"),
  );
  const [startAt] = useQueryState("startAt", parseAsInteger);

  const { data: video, isLoading: videoIsLoading } = api.videos.getOne.useQuery(
    { videoId },
    {
      refetchOnWindowFocus: false,
    },
  );

  api.meetingTopics.getBasicTopicsByVideoId.usePrefetchQuery({
    videoId,
    includeSegmentIds: true,
  });
  api.actionItems.getByVideoId.usePrefetchQuery({ videoId });
  api.transcripts.getOne.usePrefetchQuery({ videoId });

  const handleTabChange = useCallback(
    (value: string) => {
      void setTab(TabName.catch("summary").parse(value));
    },
    [setTab],
  );

  if (!video || videoIsLoading) {
    return (
      <motion.div
        className="flex h-screen flex-col items-center justify-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center gap-4"
        >
          <CameraIcon className="h-10 w-10 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Loading meeting...</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <PlayerProvider>
      <ChatContextProvider>
        <div className="-m-12 flex h-screen flex-col bg-muted/40">
          <VideoPageHeader title={video.title ?? "Meeting"} />

          <motion.main
            className="flex flex-1 overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
              staggerChildren: 0.1,
            }}
          >
            <motion.div
              className="w-1/2 flex-shrink-0 border-r bg-muted/30"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <EmbeddedChatView
                videoId={videoId}
                currentTab={tab}
                className="h-full"
              />
            </motion.div>

            <motion.div
              className="flex flex-1 flex-col overflow-hidden"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="p-4 md:p-6">
                <VideoPlayer video={video} startAt={startAt ?? undefined} />
              </div>

              <div className="flex-grow overflow-y-auto">
                <VideoTabsView
                  activeTab={tab}
                  onTabChange={handleTabChange}
                  video={video}
                />
              </div>
            </motion.div>
          </motion.main>
        </div>
      </ChatContextProvider>
    </PlayerProvider>
  );
}
