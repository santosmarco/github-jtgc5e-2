"use client";

import dayjs from "dayjs";
import { motion } from "framer-motion";
import _ from "lodash";
import { FrownIcon, SearchX, TrendingUpDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

import { MomentCard } from "~/components/moment-card";
import { MomentFilters } from "~/components/moments/moment-filters";
import { MomentSkeletonGrid } from "~/components/moments/moment-skeleton";
import { useProfile } from "~/hooks/use-profile";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import { emotionToMoment, getVideoEmotions } from "~/lib/videos";
import { api } from "~/trpc/react";

export default function MomentsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useQueryState("search", parseAsString);
  const [searchQueryDebounced, setSearchQueryDebounced] = useState(searchQuery);
  const [selectedVideo, setSelectedVideo] = useQueryState(
    "video",
    parseAsString,
  );
  const [selectedCategory, setSelectedCategory] = useQueryState(
    "category",
    parseAsString,
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { profile } = useProfile();
  const { data: user, isLoading: userLoading } = api.auth.getUser.useQuery();
  const {
    data: videosData,
    isLoading: videosLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.videos.list.useInfiniteQuery(
    {
      limit: 12,
      options: {
        moments: {
          includeNonRelevant: !profile || user?.id === profile.id,
        },
        user_id: !profile || user?.id === profile.id ? undefined : profile.id,
      },
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    },
  );

  const filteredVideos = videosData?.pages.flatMap((page) => page.videos) ?? [];

  const videosEnriched = filteredVideos.map((video) => {
    const moments = video.moments ?? [];
    const emotions = getVideoEmotions(video) ?? [];
    const emotionMoments = emotions
      .map((emotion) => video.vtt && emotionToMoment(emotion, video, video.vtt))
      .filter((m): m is Exclude<typeof m, "" | null | undefined> => !!m);
    const allMoments = [...moments, ...emotionMoments];
    return { video, moments, emotions, emotionMoments, allMoments };
  });

  const moments = videosEnriched.flatMap((v) => v.allMoments);

  // Filter and sort moments based on user selections
  const filteredMoments = moments
    .filter((moment) => {
      if (selectedVideo === "all") return true;
      return moment.video_id === selectedVideo;
    })
    .filter((moment) => {
      if (selectedCategory === "all") return true;
      return moment.activity === selectedCategory;
    })
    .filter((moment) => {
      if (!searchQueryDebounced) return true;
      const searchTerms = searchQueryDebounced.toLowerCase().split(/\s+/);
      const momentText = [
        moment.activity,
        moment.summary,
        videosEnriched.find((v) => v.video.videoId === moment.video_id)?.video
          .title ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return searchTerms.every((term) => momentText.includes(term));
    })
    .filter((moment) => {
      if (!dateRange?.from) return true;
      const videoDate = videosEnriched.find(
        (v) => v.video.videoId === moment.video_id,
      )?.video.publishedAt;
      if (!videoDate) return true;
      const date = dayjs(new Date(videoDate));
      if (dateRange.to) {
        return date.isAfter(dateRange.from) && date.isBefore(dateRange.to);
      }
      return date.isAfter(dateRange.from);
    });

  const sortedMoments = _.orderBy(
    filteredMoments.slice(),
    [
      (m) => {
        const videoDate = videosEnriched.find(
          (v) => v.video.videoId === m.video_id,
        )?.video.publishedAt;
        return videoDate ? new Date(videoDate).getTime() : 0;
      },
      (m) =>
        m.reactions.reduce(
          (acc, r) => acc + (r.reaction_type === "thumbs_up" ? -1 : 1),
          0,
        ),
      (m) => !m.relevant,
    ],
    sortOrder === "desc"
      ? ["desc", "asc", "asc", "asc"]
      : ["asc", "desc", "asc", "asc"],
  );

  const categories = _.sortBy(
    Array.from(new Set(moments.map((m) => m.activity))),
    (x) => x,
  );

  const handleSkipToMoment = (moment: VideoMoment) => () => {
    void router.push(
      `/videos/${moment.video_id}?startAt=${moment.segment_ideal_timestamp_in_seconds ?? moment.segment_start_timestamp_in_seconds}`,
    );
  };

  const debouncedSetSearchQueryDebounced = _.debounce((value: string) => {
    setSearchQueryDebounced(value);
  }, 300);

  const handleSearchChange = (value: string) => {
    void setSearchQuery(value);
    debouncedSetSearchQueryDebounced(value);
  };

  useEffect(
    function resetCategoryOnVideoChange() {
      void setSelectedCategory("all");
    },
    [selectedVideo, setSelectedCategory],
  );

  useEffect(
    function resetVideoAndCategoryOnProfileChange() {
      void setSelectedVideo("all");
      void setSelectedCategory("all");
    },
    [profile, setSelectedVideo, setSelectedCategory],
  );

  // Automatically fetch next page when available
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (videosLoading || userLoading) {
    return (
      <div className="container mx-auto space-y-8 py-6">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">All Moments</h1>
          <MomentFilters
            onSearchChange={handleSearchChange}
            onDateRangeChange={setDateRange}
            onSortOrderChange={setSortOrder}
            onCategoryChange={(category) => void setSelectedCategory(category)}
            onVideoChange={(videoId) => void setSelectedVideo(videoId)}
            categories={categories}
            selectedCategory={selectedCategory}
            selectedVideo={selectedVideo}
            videos={videosEnriched}
          />
        </div>
        <MomentSkeletonGrid />
      </div>
    );
  }

  if (!videosEnriched.length) {
    return (
      <div className="mt-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <FrownIcon className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No moments found</p>
        </motion.div>
      </div>
    );
  }

  const hasNoResults =
    sortedMoments.length === 0 && (searchQuery || selectedCategory !== "all");

  return (
    <div className="container mx-auto space-y-8 py-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">All Moments</h1>
        <MomentFilters
          onSearchChange={handleSearchChange}
          onDateRangeChange={setDateRange}
          onSortOrderChange={setSortOrder}
          onCategoryChange={(category) => void setSelectedCategory(category)}
          onVideoChange={(videoId) => void setSelectedVideo(videoId)}
          categories={categories}
          selectedCategory={selectedCategory}
          selectedVideo={selectedVideo}
          videos={videosEnriched}
        />
      </div>

      {hasNoResults ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 py-12 text-center"
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
            <SearchX className="h-16 w-16 text-muted-foreground" />
          </motion.div>
          <div className="max-w-sm space-y-2">
            <p className="font-semibold">
              No moments found matching your filters
            </p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search terms or filters to see more moments
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {sortedMoments.map((moment, index) => (
            <MomentCard
              key={moment.id}
              moment={moment}
              index={index}
              onSkipToMoment={handleSkipToMoment(moment)}
              jumpToLabel="Watch"
              videoTitle={
                videosEnriched.find((v) => v.video.videoId === moment.video_id)
                  ?.video.title ?? undefined
              }
              videoDate={
                videosEnriched.find((v) => v.video.videoId === moment.video_id)
                  ?.video.publishedAt
              }
            />
          ))}
        </div>
      )}

      {/* Loading and End States */}
      <div className="mt-12 w-full">
        {isFetchingNextPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-8"
          >
            <TrendingUpDownIcon className="h-8 w-8 animate-pulse text-primary" />
          </motion.div>
        )}

        {!hasNextPage && moments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-4 pt-8"
          >
            <div className="text-center">
              <p className="font-medium">You&apos;re all caught up! 🎉</p>
              <p className="text-sm text-muted-foreground">
                Check back later for new moments
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
