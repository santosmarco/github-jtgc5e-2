"use client";

import { motion } from "framer-motion";
import _ from "lodash";
import { Heart, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

export type VideoCardProps = React.ComponentProps<typeof motion.div> & {
  video: RouterOutputs["videos"]["listAll"][number];
};

export const VideoCard = React.forwardRef<
  React.ElementRef<typeof motion.div>,
  VideoCardProps
>(({ video, className, ...props }, ref) => {
  const moments = video.moments;
  const momentsByCategory = _.groupBy(moments, (moment) => moment.activity);
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      ref={ref}
      className={cn(
        "group relative h-[280px] overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg transition-all duration-500 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl",
        className,
      )}
      whileHover="hover"
      initial="initial"
      {...props}
    >
      <Link href={`/videos/${video.videoId}`} className="block h-full">
        {/* Thumbnail Section */}
        <div className="relative h-[60%] overflow-hidden">
          {imgError ? (
            <div className="h-full w-full bg-black" />
          ) : (
            <Image
              src={video.assets?.thumbnail ?? ""}
              alt={video.title ?? "Video"}
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-700 will-change-transform group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          )}

          {/* Hover Overlay Gradient */}
          <motion.div
            variants={{
              initial: { opacity: 0 },
              hover: { opacity: 1 },
            }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
          />

          {/* Play Button */}
          <motion.div
            variants={{
              initial: { opacity: 0, scale: 0.8 },
              hover: { opacity: 1, scale: 1 },
            }}
            transition={{ duration: 0.2 }}
            className="absolute left-[calc(50%-1.5rem)] top-[calc(50%-1.5rem)] flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg"
          >
            <Play className="h-6 w-6 text-primary-foreground" />
          </motion.div>

          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {formatDuration(
              video.details?.encoding?.metadata?.duration /* in seconds */ ??
                (video.meeting?.duration_in_ms // this is actually in seconds
                  ? video.meeting.duration_in_ms
                  : 0),
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex h-[40%] flex-col justify-between p-4">
          <div className="h-full space-y-2">
            <h3 className="line-clamp-2 flex-1 text-base font-semibold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
              {video.title}
            </h3>

            {/* Categories */}
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(momentsByCategory).map(([category, moments]) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="flex items-center gap-1.5 border border-primary/40 px-1.5 py-0 text-xs font-normal"
                >
                  {category}
                  <span className="flex h-5 items-center justify-center border-l border-primary/40 pl-1.5 font-mono text-[10px] font-medium">
                    {moments.length}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Link>

      {/* Like Button */}
      <motion.div
        variants={{
          initial: { opacity: 0, scale: 0.8 },
          hover: { opacity: 1, scale: 1 },
        }}
        transition={{ duration: 0.2 }}
        className="absolute right-2 top-2"
      >
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-black/60 backdrop-blur-sm hover:bg-black/80"
          onClick={(e) => {
            e.preventDefault();
            // TODO: Implement like functionality
          }}
        >
          <Heart className="h-4 w-4 text-white" />
        </Button>
      </motion.div>
    </motion.div>
  );
});
VideoCard.displayName = "VideoCard";

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
