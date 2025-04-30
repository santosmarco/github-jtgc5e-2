"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useProfile } from "~/hooks/use-profile";
import { api } from "~/trpc/react";

interface MergedEntity {
  id: string;
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

  // Reuse the same data query as the knowledge graph
  const { data, isLoading } = api.entities.getKnowledgeGraph.useQuery(
    { profileId: profile?.id || "" },
    { enabled: !!profile?.id },
  );

  const toggleEntityExpansion = (entityId: string) => {
    setExpandedEntities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      } else {
        newSet.add(entityId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="mb-6 grid w-full gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-36 animate-pulse bg-muted/30">
            <CardHeader className="pb-2">
              <div className="h-5 w-24 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="mb-2 h-4 w-12 rounded bg-muted" />
              <div className="h-12 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data?.nodes.length) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6 text-center text-muted-foreground">
          No entities found in your knowledge graph.
        </CardContent>
      </Card>
    );
  }

  // Merge entities by [name, type]
  const mergedEntitiesMap = new Map<string, MergedEntity>();

  for (const node of data.nodes) {
    const key = `${node.name.toLowerCase()}_${node.type.toLowerCase()}`;
    const existing = mergedEntitiesMap.get(key);

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
      mergedEntitiesMap.set(key, {
        id: node.id,
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

  // Filter entities based on selected type
  const filteredEntities =
    activeTab === "all"
      ? mergedEntities
      : mergedEntities.filter((entity) => entity.type === activeTab);

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="mb-2 flex flex-wrap">
          {entityTypes.map((type) => (
            <TabsTrigger key={type} value={type} className="capitalize">
              {type}
              <Badge variant="secondary" className="ml-2">
                {type === "all"
                  ? mergedEntities.length
                  : mergedEntities.filter((e) => e.type === type).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mb-6 grid w-full gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredEntities.map((entity) => {
          const isExpanded = expandedEntities.has(entity.id);

          return (
            <Card
              key={entity.id}
              className="flex flex-col justify-between transition-all duration-200"
            >
              <CardHeader
                className="cursor-pointer pb-2"
                onClick={() => toggleEntityExpansion(entity.id)}
              >
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="truncate">{entity.name}</span>
                  <div className="flex items-center gap-2">
                    {entity.mergeCount > 1 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant="secondary"
                              className="h-5 rounded-full px-1.5"
                            >
                              {entity.mergeCount}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Merged from {entity.mergeCount} occurrences</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Badge variant="outline" className="shrink-0">
                      {entity.type}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pb-4">
                  {entity.observations.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto text-xs text-muted-foreground">
                      <p className="mb-1 font-medium">Observations:</p>
                      <ul className="space-y-1">
                        {entity.observations.map((observation) => (
                          <li
                            key={`obs-${entity.id.split(",")[0]}-${observation.substring(0, 20).replace(/\s+/g, "-")}`}
                            className="line-clamp-3"
                          >
                            • {observation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs italic text-muted-foreground">
                      No observations available
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
