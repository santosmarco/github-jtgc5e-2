"use client";

import { motion } from "framer-motion";
import _ from "lodash";
import { CameraIcon, ChevronLeft, Beaker } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { memo, useState, useCallback } from "react";
import { ActionItemList } from "~/components/action-items/action-item-list";
import { DeleteMeetingButton } from "~/components/meetings/delete-meeting-button";
import { MeetingTopics } from "~/components/meetings/meeting-topics";
import { PlayerProvider, usePlayer } from "~/components/player/provider";
import { VideoPlayer } from "~/components/player/video";
import { TranscriptView } from "~/components/transcript-view";
import { Button } from "~/components/ui/button";
import { useProfile } from "~/hooks/use-profile";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import { emotionToMoment, getVideoEmotions } from "~/lib/videos";
import { api } from "~/trpc/react";

import { MeetingSummary } from "./_components/meeting-summary";
import { VideoMoments } from "./_components/video-moments";
import { VideoTags } from "./_components/video-tags";

export type VideoPageClientProps = {
  videoId: string;
};

export function VideoPageClient({ videoId }: VideoPageClientProps) {
  const router = useRouter();
  const { profile } = useProfile();
  const { data: user } = api.auth.getUser.useQuery();
  // Split data fetching into basic info and moments for better performance
  const { data: videoBasic, isLoading: isLoadingBasic } =
    api.videos.getBasicInfo.useQuery({
      videoId,
    });

  const { data: moments_ } = api.moments.listBasicByVideo.useQuery(
    {
      videoId,
      includeReactions: true,
      includeNonRelevant:
        user?.is_admin && (!profile || user.id === profile.id),
    },
    {
      // Only fetch moments if we have basic video data
      enabled: !!videoBasic,
    },
  );

  // Combine the data to maintain compatibility with existing code
  const video = videoBasic
    ? {
        ...videoBasic,
        moments: moments_ || [],
      }
    : undefined;
  const [category, setCategory] = useQueryState("category", parseAsString);
  const [startAt, setStartAt] = useQueryState("startAt", parseAsInteger);
  const [isQAMode, setIsQAMode] = useQueryState(
    "qa",
    parseAsString.withDefault("false"),
  );
  const vtt = video?.vtt ?? "";
  const summary = video?.summary;
  const moments = video?.moments ?? [];
  const emotions = video ? getVideoEmotions(video) : [];
  const emotionMoments = video
    ? (emotions ?? []).map((emotion) => emotionToMoment(emotion, video, vtt))
    : [];
  const allMoments = [...moments, ...emotionMoments];
  const sortedMoments = _.sortBy(
    _.sortBy(allMoments, (moment) => moment.segment_start_timestamp_in_seconds),
    (moment) => (moment.relevant ? 0 : 1),
    (m) =>
      m.reactions.reduce(
        (acc, r) =>
          acc +
          (r.reaction_type === "thumbs_up" ? -1 : 1) *
            (user?.is_admin && (!profile || user.id === profile.id) ? -1 : 1),
        0,
      ),
  );

  const handleCategoryChange = (category: string) => {
    void setCategory(category);
  };

  const handleSkipToMoment: React.ComponentProps<
    typeof VideoMoments
  >["onSkipToMoment"] = (moment) => {
    void setStartAt(
      moment.segment_ideal_timestamp_in_seconds ??
        moment.segment_start_timestamp_in_seconds,
    );
  };

  if (!video) {
    return (
      <div className="mt-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <CameraIcon className="h-10 w-10 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Loading meeting...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <PlayerProvider>
      <header className="fixed left-0 right-0 top-16 z-50 flex h-[4.75rem] items-center justify-between border-b border-border bg-background pl-0 lg:left-72 lg:top-0 lg:flex lg:border-border lg:p-4">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center"
        >
          <motion.div
            whileHover={{ scale: 1.2, x: -5 }}
            className="hidden lg:block"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              aria-label="Go back"
              className="h-[3.25rem] w-10 hover:bg-transparent lg:h-16"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="pl-4 lg:pl-0"
          >
            <div className="text-sm text-muted-foreground lg:text-sm">
              You are watching
            </div>
            <div className="font-bold lg:text-base">{video.title}</div>
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mr-4 flex items-center gap-2"
        >
          {user?.is_admin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setIsQAMode(isQAMode === "true" ? "false" : "true")
              }
              className="flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Beaker className="h-4 w-4" />
              <span className="text-sm">QA Mode</span>
            </Button>
          )}
          {user?.role !== "coach" && (
            <DeleteMeetingButton meetingId={video.videoId} />
          )}
        </motion.div>
      </header>

      <div className="container mx-auto space-y-8 pt-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2 lg:space-y-6">
            <VideoPlayer
              video={video}
              momentsShown={sortedMoments.filter(
                ({ activity }) => !category || activity === category,
              )}
              startAt={startAt ?? undefined}
              isQAMode={isQAMode === "true"}
            />
            {summary && (
              <div className="block space-y-2 pb-2 lg:hidden">
                <MeetingSummary summary={summary} />
                <VideoTags video={video} />
              </div>
            )}
            {isQAMode === "true" ? (
              <div className="grid grid-cols-2 gap-8">
                <div className="border-r border-border pr-8">
                  <VideoMoments
                    moments={sortedMoments}
                    selectedCategory={category ?? undefined}
                    onCategoryChange={handleCategoryChange}
                    onSkipToMoment={handleSkipToMoment}
                  />
                </div>
                <div>
                  <VideoMoments
                    moments={sortedMoments}
                    selectedCategory={category ?? undefined}
                    onCategoryChange={handleCategoryChange}
                    onSkipToMoment={handleSkipToMoment}
                    variant="qa"
                  />
                </div>
              </div>
            ) : (
              <VideoMoments
                moments={sortedMoments}
                selectedCategory={category ?? undefined}
                onCategoryChange={handleCategoryChange}
                onSkipToMoment={handleSkipToMoment}
              />
            )}
          </div>
          <div className="hidden space-y-3 lg:block">
            {summary && <MeetingSummary summary={summary} />}
            <VideoTags video={video} />
            <InnerMeetingTopics videoId={videoId} />
            <ActionItemList videoId={videoId} />
            <InnerTranscriptView videoId={videoId} />
          </div>
        </div>
      </div>
    </PlayerProvider>
  );
}

type InnerMeetingTopicsProps = {
  videoId: string;
};

const InnerMeetingTopics = memo(function InnerMeetingTopics({
  videoId,
}: InnerMeetingTopicsProps) {
  const { seek } = usePlayer();
  // Use the optimized endpoint that only returns the fields we need
  const { data: topics, error } =
    api.meetingTopics.getBasicTopicsByVideoId.useQuery({
      videoId,
      // Only include segment IDs if we want topic navigation
      includeSegmentIds: true,
    });

  if (error) return null;

  return (
    <MeetingTopics
      topics={topics ?? []}
      onTopicClick={(topic) => {
        if ("vtt_start_segment_id" in topic && topic.vtt_start_segment_id) {
          seek(topic.vtt_start_segment_id);
        }
      }}
    />
  );
});

type InnerTranscriptViewProps = {
  videoId: string;
};

const InnerTranscriptView = memo(function InnerTranscriptView({
  videoId,
}: InnerTranscriptViewProps) {
  const { currentTime, seek } = usePlayer();
  const [isFullTranscriptLoaded, setIsFullTranscriptLoaded] = useState(false);

  // First load minimal transcript for faster initial render
  const { data: minimalTranscript } =
    api.transcripts.getMinimalTranscript.useQuery(
      {
        videoId,
        limit: 20,
      },
      {
        // Don't refetch if we've already loaded full transcript
        enabled: !isFullTranscriptLoaded,
      },
    );

  // Load full transcript data only when needed (after user interaction or after minimal is loaded)
  const { data: fullTranscript, error } = api.transcripts.getOne.useQuery(
    { videoId },
    {
      enabled: isFullTranscriptLoaded,
      // @ts-ignore
      onSuccess: () => {
        setIsFullTranscriptLoaded(true);
      },
    },
  );

  // Function to load full transcript when user interacts
  const handleLoadFullTranscript = useCallback(() => {
    setIsFullTranscriptLoaded(true);
  }, []);

  if (error) return null;

  return (
    <>
      {isFullTranscriptLoaded ? (
        <TranscriptView
          transcript={fullTranscript}
          currentTime={currentTime ?? 0}
          onWordClick={seek}
        />
      ) : (
        <div className="space-y-4">
          <TranscriptView
            transcript={minimalTranscript?.slices ?? []}
            currentTime={currentTime ?? 0}
            onWordClick={seek}
          />
          {!minimalTranscript?.isComplete && (
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={handleLoadFullTranscript}
            >
              Load Full Transcript
            </Button>
          )}
        </div>
      )}
    </>
  );
});
