"use client";

import { motion } from "framer-motion";
import {
  CameraIcon,
  CheckCheckIcon,
  FileVideo,
  SearchX,
  VideoOffIcon,
} from "lucide-react";
import * as React from "react";
import { useInView } from "react-intersection-observer";

import { SearchBar } from "~/components/search-bar";
import { useDebounce } from "~/hooks/use-debounce";
import { useProfile } from "~/hooks/use-profile";
import { api } from "~/trpc/react";

import { VideoGrid } from "./_components/video-grid";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

export default function HomePage() {
  const { profile } = useProfile();
  const { data: user, isLoading: userIsLoading } = api.auth.getUser.useQuery();
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.5,
    rootMargin: "0px 0px 400px 0px",
  });

  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const {
    data,
    isLoading: videosLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.videos.list.useInfiniteQuery(
    {
      limit: 12,
      options: {
        tags:
          user?.is_admin && (!profile || user.id === profile.id)
            ? undefined
            : [profile?.id ?? user?.id ?? ""],
      },
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
      enabled: !!user?.did_complete_onboarding,
    },
  );

  // Filter videos based on user role, profile, and search query
  const videos = React.useMemo(() => {
    const allVideos = data?.pages.flatMap((page) =>
      user?.is_admin && (!profile || user.id === profile.id)
        ? page.videos
        : page.videos.filter((v) =>
            v.tags.includes(profile?.id ?? user?.id ?? ""),
          ),
    );

    if (!allVideos || !debouncedSearchQuery) return allVideos;

    const searchLower = debouncedSearchQuery.toLowerCase();
    return allVideos.filter(
      (video) =>
        video.title?.toLowerCase().includes(searchLower) ||
        video.description?.toLowerCase().includes(searchLower),
    );
  }, [data?.pages, user, profile, debouncedSearchQuery]);

  const hasVideos = data?.pages.some((page) => page.videos.length > 0);

  // Fetch next page when scrolling near the bottom
  React.useEffect(() => {
    if (
      user?.did_complete_onboarding &&
      inView &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, user]);

  if (videosLoading || userIsLoading) {
    return (
      <div className="mt-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <FileVideo className="h-10 w-10 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Loading meetings...</p>
        </motion.div>
      </div>
    );
  }

  if (!hasVideos) {
    return (
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
            <VideoOffIcon className="h-16 w-16 text-muted-foreground" />
          </motion.div>
          <div className="max-w-sm space-y-2">
            <p className="font-semibold">No meetings found</p>
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t find any meetings. Try checking back later or
              contact support if you think this is an error.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen space-y-8 py-8"
    >
      {/* Header Section */}
      <motion.div
        variants={itemVariants}
        className="relative mx-auto mb-12 max-w-2xl text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="absolute -left-4 top-0 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-primary/5 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="absolute -right-4 top-0 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <motion.h1
          variants={itemVariants}
          className="relative mb-4 text-4xl font-bold tracking-tight lg:text-5xl"
        >
          Your Meetings
        </motion.h1>
        <motion.p
          variants={itemVariants}
          className="relative mb-8 text-lg text-muted-foreground"
        >
          Discover insights from your recorded meetings
        </motion.p>

        {/* Search Bar */}
        <motion.div
          variants={itemVariants}
          className="relative mx-auto max-w-md"
        >
          <SearchBar
            placeholder="Search meetings..."
            value={searchQuery}
            onSearch={setSearchQuery}
          />
        </motion.div>
      </motion.div>

      {/* No Results Message */}
      {videos && videos.length === 0 && debouncedSearchQuery && (
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
              No meetings found matching your search
            </p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search terms or clear the search to see all
              meetings.
            </p>
          </div>
        </motion.div>
      )}

      {/* Video Grid */}
      {(!debouncedSearchQuery || (videos && videos.length > 0)) && (
        <motion.div variants={itemVariants}>
          <VideoGrid videos={videos ?? []} />
        </motion.div>
      )}

      {/* Load More Trigger */}
      <div ref={loadMoreRef} className="mt-12 w-full">
        {isFetchingNextPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-8"
          >
            <CameraIcon className="h-8 w-8 animate-pulse text-primary" />
          </motion.div>
        )}

        {!hasNextPage && videos && videos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-4 pt-8"
          >
            <div>
              <CheckCheckIcon className="h-10 w-10 text-green-500" />
            </div>
            <div className="text-center">
              <p className="font-medium">You&apos;re all caught up! 🎉</p>
              <p className="text-sm text-muted-foreground">
                Check back later for new meetings
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
