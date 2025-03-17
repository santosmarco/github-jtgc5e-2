"use client";

import type { CoreMessage } from "ai";
import { motion } from "framer-motion";
import _ from "lodash";
import { BotOffIcon, MessageCircleMoreIcon } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useState } from "react";

import { ChatContainer } from "~/components/chat/chat-container";
import { ChatInterface } from "~/components/insights/chat-interface";
import { useProfile } from "~/hooks/use-profile";
import { api } from "~/trpc/react";

export const maxDuration = 30;

const MIN_MEETINGS = 10;

export default function InsightsPage() {
  const [selectedVideo] = useQueryState(
    "video",
    parseAsString.withDefault("all").withOptions({ history: "push" }),
  );
  const [selectedTopic, setSelectedTopic] = useQueryState(
    "topic",
    parseAsString.withOptions({ history: "push" }),
  );
  const [, setShouldShowLockScreen] = useState(true);

  const { profile } = useProfile();
  const { data: user, isLoading: userLoading } = api.auth.getUser.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    },
  );

  const { data: frameworks, isLoading: frameworksLoading } =
    api.coachingFrameworks.list.useQuery(undefined, {
      refetchOnWindowFocus: false,
    });

  const userId = profile?.id ?? user?.id ?? "";

  // Use the optimized video fetching procedure
  const {
    data: videosData,
    isFetching: videosLoading,
    fetchNextPage: fetchNextVideosPage,
    hasNextPage: hasNextVideosPage,
    isFetchingNextPage: isFetchingNextVideosPage,
  } = api.videos.listForInsights.useInfiniteQuery(
    {
      userId,
      limit: 36,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
      enabled: !!userId,
    },
  );

  // Only fetch moments when we have a topic selected
  const topic = selectedTopic ?? "";

  // Use the optimized moments query with minimal data
  const { data: momentsData, isFetching: momentsLoading } =
    api.moments.listForInsights.useInfiniteQuery(
      {
        userId,
        videoId: selectedVideo !== "all" ? selectedVideo : undefined,
        topic: selectedTopic || undefined, // Convert empty string to undefined
        limit: 100,
        // Don't include full details to improve performance
        includeFullDetails: false,
      },
      {
        getNextPageParam: (lastPage) => lastPage?.nextCursor,
        refetchOnWindowFocus: false,
        enabled: !!userId && !!selectedTopic,
      },
    );

  const { data: chat, isFetching: chatLoading } = api.chats.get.useQuery(
    {
      userId,
      topic,
    },
    {
      refetchOnWindowFocus: false,
      enabled: !!userId,
    },
  );

  // Extract data from the queries
  const filteredVideos = videosData?.pages.flatMap((page) => page.videos) ?? [];
  const filteredMoments =
    momentsData?.pages.flatMap((page) => page?.moments ?? []) ?? [];

  // Extract unique topics from videos for topic selection
  const topics = Array.from(
    new Set(
      filteredVideos.flatMap((video) => {
        // Filter out null values and ensure we have strings
        return (video.topics || []).filter((t): t is string => !!t);
      }),
    ),
  ).sort();

  // Adapt the new video structure to match what ChatInterface expects
  const adaptedVideos = filteredVideos.map((video) => ({
    ...video,
    meeting: undefined, // ChatInterface expects this property
    moments: [], // ChatInterface expects this property
    vtt: "", // ChatInterface expects this property
  }));

  // Load more videos when scrolling near the bottom
  useEffect(() => {
    if (hasNextVideosPage && !isFetchingNextVideosPage) {
      _.debounce(() => {
        const scrolledToBottom =
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 1000;
        if (scrolledToBottom) {
          void fetchNextVideosPage();
        }
      }, 100)();
    }
  }, [hasNextVideosPage, isFetchingNextVideosPage, fetchNextVideosPage]);

  if (userLoading || frameworksLoading || chatLoading || !userId) {
    return (
      <div className="mt-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <MessageCircleMoreIcon className="h-10 w-10 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Preparing chat...</p>
        </motion.div>
      </div>
    );
  }

  if (!videosLoading && !filteredVideos.length) {
    return (
      <ChatContainer
        progress={{
          completedMeetings: filteredVideos.length,
          requiredMeetings: MIN_MEETINGS,
        }}
      >
        <div className="mt-20 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 text-center"
          >
            <motion.div
              initial={{ rotate: -10 }}
              animate={{ rotate: [10, -10, 10, 0] }}
              transition={{
                duration: 1.5,
                times: [0.2, 0.4, 0.6, 1],
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <BotOffIcon className="h-16 w-16 text-muted-foreground" />
            </motion.div>
            <div className="max-w-sm space-y-2">
              <p className="font-semibold">No meetings found</p>
              <p className="text-sm text-muted-foreground">
                Sorry, we are unable to provide insights if we don&apos;t have
                any meetings to analyze.
              </p>
            </div>
          </motion.div>
        </div>
      </ChatContainer>
    );
  }

  return (
    <ChatContainer
      progress={{
        completedMeetings: filteredVideos.length,
        requiredMeetings: MIN_MEETINGS,
      }}
    >
      <ChatInterface
        frameworks={frameworks ?? []}
        userId={userId}
        selectedTopic={topic}
        topics={topics}
        relevantMoments={filteredMoments}
        relevantVideos={adaptedVideos}
        initialMessages={
          (chat?.data?.messages as CoreMessage[] | undefined) ?? []
        }
        onTopicSelect={(topic) => void setSelectedTopic(topic)}
        onClick={() => setShouldShowLockScreen(true)}
        isLoading={hasNextVideosPage}
        disabled={videosLoading && filteredVideos.length < MIN_MEETINGS}
      />
    </ChatContainer>
  );
}
