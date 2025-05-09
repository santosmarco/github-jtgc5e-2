"use client";

import { UsersIcon } from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";

import { Badge } from "~/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import type { Select } from "~/lib/utils/types";
import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

export type VideoTagsProps = {
  video: Select<RouterOutputs["videos"]["getOne"], "videoId" | "tags">;
};

function findBestEntityMatch(
  tag: string,
  entities: RouterOutputs["entities"]["getEntitiesByVideoId"],
) {
  const tagLower = tag.toLowerCase();

  let bestMatch: (typeof entities)[number] | null = null;
  let bestScore = 0;

  for (const entity of entities) {
    const nameLower = entity.name.toLowerCase();

    // Calculate simple similarity score
    let score = 0;

    // Exact match gets highest score
    if (nameLower === tagLower) score = 100;
    // Contains whole tag
    else if (nameLower.includes(tagLower)) score = 70;
    // Tag contains whole name
    else if (tagLower.includes(nameLower)) score = 60;
    // Partial match
    else {
      const tagWords = tagLower.split(/\s+/);
      const nameWords = nameLower.split(/\s+/);

      // Check for word overlap
      for (const tagWord of tagWords) {
        for (const nameWord of nameWords) {
          if (nameWord.includes(tagWord) || tagWord.includes(nameWord)) {
            score += 20 / Math.max(tagWords.length, nameWords.length);
          }
        }
      }
    }

    // If this is the best match so far, update
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entity;
    }
  }

  // Only return matches with a minimum score
  return bestScore > 10 ? bestMatch : null;
}

export function VideoTags({ video }: VideoTagsProps) {
  const participants = useMemo(
    () => video.tags.filter((tag) => !z.string().uuid().safeParse(tag).success),
    [video.tags],
  );

  const { data: videoEntities, isLoading } =
    api.entities.getEntitiesByVideoId.useQuery(
      {
        videoId: video.videoId,
      },
      {
        refetchOnWindowFocus: false,
      },
    );

  const entityMatches = useMemo(() => {
    const matches: Record<
      string,
      RouterOutputs["entities"]["getEntitiesByVideoId"][number] | null
    > = Object.fromEntries(
      participants.map((participant) => [participant, null]),
    );

    if (!videoEntities) return matches;

    // Find the best match for each tag
    for (const tag of participants) {
      matches[tag] = findBestEntityMatch(tag, videoEntities);
    }

    return matches;
  }, [videoEntities, participants]);

  if (!participants.length) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <UsersIcon className="h-4 w-4" />
        Participants
      </div>
      <div className="flex flex-wrap gap-2">
        {isLoading
          ? // Show skeletons while loading
            participants.map((participant) => (
              <Skeleton key={participant} className="h-6 w-16 rounded-full" />
            ))
          : participants.map((participant) => {
              const entityMatch = entityMatches[participant];

              return (
                <Popover key={participant}>
                  <PopoverTrigger>
                    <Badge
                      variant="outline"
                      className="h-6 border px-2 transition-colors hover:bg-background"
                    >
                      {participant}
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" sideOffset={5}>
                    <div className="flex flex-col space-y-1.5 p-4">
                      <div className="text-lg font-medium">
                        {entityMatch?.name || participant}
                      </div>

                      {entityMatch && (
                        <>
                          <div
                            className={cn("text-sm font-medium", {
                              "text-blue-500": entityMatch.type === "person",
                              "text-green-500":
                                entityMatch.type === "organization",
                              "text-red-500": entityMatch.type === "location",
                              "text-purple-500": entityMatch.type === "product",
                              "text-orange-500": entityMatch.type === "event",
                              "text-gray-500": entityMatch.type === "other",
                            })}
                          >
                            {entityMatch.type}
                          </div>

                          {entityMatch.description && (
                            <p className="text-sm text-muted-foreground">
                              {entityMatch.description}
                            </p>
                          )}

                          {entityMatch.observations &&
                            entityMatch.observations.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs font-medium uppercase text-muted-foreground">
                                  Observations
                                </div>
                                <ul className="ml-2 mt-1 max-h-40 overflow-y-auto text-sm text-muted-foreground">
                                  {entityMatch.observations.map(
                                    (observation) => (
                                      <li key={observation.id} className="mt-1">
                                        • {observation.observation}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                            )}
                        </>
                      )}

                      {!entityMatch && (
                        <p className="text-sm text-muted-foreground">
                          No detailed information available for this
                          participant.
                        </p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
      </div>
    </div>
  );
}
