"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useDebounce } from "~/hooks/use-debounce";
import { useProfile } from "~/hooks/use-profile";
import { api } from "~/trpc/react";

interface MergedEntity {
  id: string;
  stableKey: string;
  name: string;
  type: string;
  descriptions: string[];
  observations: string[];
  meetingIds: string[];
  mergeCount: number;
}

export default function EntityCards() {
  const { profile } = useProfile();
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(
    new Set(),
  );
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState<number>(16);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Reuse the same data query as the knowledge graph
  const { data, isLoading } = api.entities.getKnowledgeGraph.useQuery(
    { profileId: profile?.id || "" },
    { enabled: !!profile?.id },
  );

  // Reset visible count when tab or search changes
  useEffect(() => {
    setVisibleCount(16);
  }, [activeTab, debouncedSearch]);

  const toggleEntityExpansion = (stableKey: string) => {
    setExpandedEntities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stableKey)) {
        newSet.delete(stableKey);
      } else {
        newSet.add(stableKey);
      }
      return newSet;
    });
  };

  // Merge entities by [name, type]
  const mergedEntitiesMap = new Map<string, MergedEntity>();

  for (const node of data?.nodes ?? []) {
    // Create a consistent and stable key for entity merging
    const normalizedName = node.name.toLowerCase();
    const normalizedType = node.type.toLowerCase();
    const stableKey = `${normalizedName}_${normalizedType}`;

    const existing = mergedEntitiesMap.get(stableKey);

    if (existing) {
      // Merge observations, descriptions, and meetingIds
      existing.observations = [
        ...existing.observations,
        ...(node.observations || []),
      ];
      existing.descriptions = [
        ...existing.descriptions,
        ...(node.descriptions || []),
      ];
      existing.meetingIds = [
        ...existing.meetingIds,
        ...(node.meetingIds || []),
      ];
      // Update the ID to include both
      existing.id = `${existing.id},${node.id}`;
      existing.mergeCount += 1;
    } else {
      mergedEntitiesMap.set(stableKey, {
        id: node.id,
        stableKey,
        name: node.name,
        type: node.type,
        descriptions: node.descriptions || [],
        observations: node.observations || [],
        meetingIds: node.meetingIds || [],
        mergeCount: 1,
      });
    }
  }

  // Convert map to array and remove duplicates from merged arrays
  const mergedEntities = Array.from(mergedEntitiesMap.values()).map(
    (entity) => ({
      ...entity,
      observations: [...new Set(entity.observations)],
      descriptions: [...new Set(entity.descriptions)],
      meetingIds: [...new Set(entity.meetingIds)],
    }),
  );

  // Get unique entity types for tabs
  const entityTypes = [
    "all",
    ...new Set(mergedEntities.map((entity) => entity.type)),
  ];

  // Filter and search entities - moved outside of conditional rendering
  const filteredEntities = useMemo(() => {
    let entities =
      activeTab === "all"
        ? mergedEntities
        : mergedEntities.filter((entity) => entity.type === activeTab);

    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      entities = entities.filter(
        (entity) =>
          entity.name.toLowerCase().includes(searchLower) ||
          entity.observations.some((obs) =>
            obs.toLowerCase().includes(searchLower),
          ),
      );
    }

    return entities;
  }, [mergedEntities, activeTab, debouncedSearch]);

  // Get visible entities based on current count
  const visibleEntities = filteredEntities.slice(0, visibleCount);
  const hasMore = visibleEntities.length < filteredEntities.length;

  // Loading skeleton with staggered animation
  if (isLoading) {
    return (
      <div className="mb-8 grid w-full gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={`skeleton-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Card className="h-40 overflow-hidden bg-muted/30">
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="space-y-3">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }

  if (!data?.nodes.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="mb-8">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground">
            <div className="mb-5 flex justify-center">
              <div className="rounded-full bg-muted/50 p-5">
                <Search className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </div>
            <h3 className="mb-3 text-lg font-medium">No entities found</h3>
            <p>No entities found in your knowledge graph.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <div className="relative mb-5 w-full">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search entities..."
          className="h-11 pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="mb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className="mb-2 flex h-auto w-full flex-wrap rounded-lg bg-muted/60 p-1.5"
            aria-label="Filter entities by type"
          >
            {entityTypes.map((type) => (
              <TabsTrigger
                key={type}
                value={type}
                className="flex h-9 min-w-[80px] items-center justify-center gap-2 px-3 py-1.5 text-sm capitalize"
              >
                <span>{type}</span>
                <Badge
                  variant="secondary"
                  className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-normal"
                >
                  {type === "all"
                    ? mergedEntities.length
                    : mergedEntities.filter((e) => e.type === type).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {filteredEntities.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-8">
            <CardContent className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground">
              <div className="mb-5 flex justify-center">
                <div className="rounded-full bg-muted/50 p-5">
                  <Search className="h-6 w-6 text-muted-foreground/50" />
                </div>
              </div>
              <h3 className="mb-3 text-lg font-medium">No matching entities</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          <div className="mb-8 grid w-full gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {visibleEntities.map((entity, index) => {
                const isExpanded = expandedEntities.has(entity.stableKey);

                return (
                  <motion.div
                    key={entity.stableKey}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.25,
                      delay: Math.min(index * 0.03, 0.5),
                      ease: "easeOut",
                    }}
                  >
                    <Card
                      className={`flex h-full flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-md ${
                        isExpanded ? "shadow-md" : ""
                      }`}
                    >
                      <CardHeader
                        className="cursor-pointer pb-3 pt-4"
                        onClick={() => toggleEntityExpansion(entity.stableKey)}
                      >
                        <CardTitle className="flex items-center justify-between gap-3 text-base">
                          <span className="truncate font-medium">
                            {entity.name}
                          </span>
                          <div className="flex items-center gap-2.5">
                            {entity.mergeCount > 1 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge
                                      variant="secondary"
                                      className="h-6 rounded-full px-2"
                                    >
                                      {entity.mergeCount}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p>
                                      This entity combines {entity.mergeCount}{" "}
                                      similar items found across your meetings
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <Badge
                              variant="outline"
                              className="shrink-0 px-2.5 py-1"
                            >
                              {entity.type}
                            </Badge>
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown size={18} />
                            </motion.div>
                          </div>
                        </CardTitle>
                      </CardHeader>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <CardContent className="px-5 pb-5">
                              {entity.observations.length > 0 ? (
                                <div className="max-h-48 overflow-y-auto rounded-md bg-muted/20 p-3 text-sm text-muted-foreground">
                                  <p className="mb-2 font-medium">
                                    Observations:
                                  </p>
                                  <ul className="space-y-2">
                                    {entity.observations.map(
                                      (observation, index) => (
                                        <li
                                          key={`obs-${entity.stableKey}-${index}`}
                                          className="line-clamp-3"
                                        >
                                          • {observation}
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              ) : (
                                <p className="text-sm italic text-muted-foreground">
                                  No observations available
                                </p>
                              )}
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {hasMore && (
            <div className="mb-10 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((prev) => prev + 16)}
                className="group relative overflow-hidden px-6 py-2.5 text-base"
              >
                <span>Load More</span>
                <motion.div
                  className="absolute bottom-0 left-0 h-0.5 w-full bg-primary"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                />
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
