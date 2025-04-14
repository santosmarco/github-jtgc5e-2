"use client";

import type { UIMessage } from "ai";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import {
  BookOpen,
  Database,
  Eye,
  FileText,
  Link,
  List,
  Tag,
  TagIcon,
  Users,
  VideoIcon,
} from "lucide-react";
import type * as React from "react";

import type { ChatRequestBody } from "~/app/api/chat/route";
import { CollapsibleSection } from "~/components/chat/collapsible-section";
import { EntityList } from "~/components/chat/entity-list";
import { LoadingIndicator } from "~/components/chat/loading-indicator";
import { ChatMeetingList } from "~/components/chat/meeting-list";
import { MomentDisplay } from "~/components/chat/moment-display";
import { ChatMomentList } from "~/components/chat/moment-list";
import { ObservationList } from "~/components/chat/observation-list";
import { RelationshipList } from "~/components/chat/relationship-list";
import { ReportList } from "~/components/chat/report-list";
import { SimpleList } from "~/components/chat/simple-list";
import { TopicList } from "~/components/chat/topic-list";
import { MarkdownRenderer } from "~/components/ui/markdown-renderer";
import type {
  ListMeetingsToolOutput,
  ListReportsToolOutput,
  SearchMomentsToolOutput,
} from "~/lib/ai/tools";
import type {
  DiscoverKeyEntitiesToolOutput,
  EntityLookupToolOutput,
  EntitySemanticSearchToolOutput,
  FindEntityRelationshipsToolOutput,
  FindRelatedTopicsToolOutput,
  ListEntityNamesToolOutput,
  ListEntityTypesToolOutput,
  ListRelationshipTypesToolOutput,
} from "~/lib/processing/ai-search-tools";
import type { VideoMoment } from "~/lib/schemas/video-moment";
import { cn } from "~/lib/utils";

import { Badge } from "./badge";

const chatBubbleVariants = cva(
  "group/message relative break-words rounded-lg p-3 text-sm",
  {
    variants: {
      isUser: {
        true: "bg-primary",
        false: "bg-muted",
      },
      animation: {
        none: "",
        slide: "duration-300 animate-in fade-in-0",
        scale: "duration-300 animate-in fade-in-0 zoom-in-75",
        fade: "duration-500 animate-in fade-in-0",
      },
    },
    compoundVariants: [
      {
        isUser: true,
        animation: "slide",
        class: "slide-in-from-right",
      },
      {
        isUser: false,
        animation: "slide",
        class: "slide-in-from-left",
      },
      {
        isUser: true,
        animation: "scale",
        class: "origin-bottom-right",
      },
      {
        isUser: false,
        animation: "scale",
        class: "origin-bottom-left",
      },
    ],
  },
);

type Animation = VariantProps<typeof chatBubbleVariants>["animation"];

export interface ChatMessageProps extends UIMessage {
  showTimeStamp?: boolean;
  animation?: Animation;
  actions?: React.ReactNode;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  id,
  role,
  content,
  createdAt,
  showTimeStamp = false,
  animation = "scale",
  actions,
  parts,
}) => {
  const isUser = role === "user";
  const formattedTime = createdAt?.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const pinnedMomentsMatch =
    /VERY IMPORTANT: FOCUS \*\*ONLY\*\* ON THESE MOMENTS:\n```\n([\s\S]*?)\n```/s.exec(
      content,
    );
  const pinnedVideosMatch =
    /VERY IMPORTANT: FOCUS \*\*ONLY\*\* ON THESE VIDEOS:\n```\n([\s\S]*?)\n```/s.exec(
      content,
    );

  const pinnedMoments = pinnedMomentsMatch?.[1]
    ? JSON.parse(pinnedMomentsMatch[1])
    : [];
  const pinnedVideos = pinnedVideosMatch?.[1]
    ? JSON.parse(pinnedVideosMatch[1])
    : [];
  const pinnedContent = [...pinnedMoments, ...pinnedVideos] as NonNullable<
    ChatRequestBody["selectedMoments" | "selectedVideos"]
  >[number][];

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          chatBubbleVariants({ isUser, animation }),
          "sm:max-w-[70%]",
          "space-y-3",
        )}
      >
        {role === "user" && (
          <div
            className={isUser ? "text-primary-foreground" : "text-foreground"}
          >
            {pinnedContent.length > 0 && (
              <div className="flex flex-wrap gap-1 pb-2">
                {pinnedContent.map((item) => (
                  <Badge
                    key={"id" in item ? item.id : item.videoId}
                    variant="outline"
                    className="flex items-center gap-1.5 border-border bg-accent font-normal"
                  >
                    {"videoId" in item ? (
                      <VideoIcon className="h-3 w-3" />
                    ) : (
                      <TagIcon className="h-3 w-3" />
                    )}
                    {item.title}
                  </Badge>
                ))}
              </div>
            )}
            <MarkdownRenderer>
              {content.replace(/^.*<context>.*<\/context>.*---\n\n/s, "")}
            </MarkdownRenderer>
          </div>
        )}

        {role === "assistant" && actions ? (
          <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 opacity-0 transition-opacity group-hover/message:opacity-100">
            {actions}
          </div>
        ) : null}

        {role === "assistant" &&
          !!parts?.filter(
            (part) => part.type === "tool-invocation" || part.type === "text",
          ).length && (
            <div className="min-w-full space-y-2">
              {parts
                ?.filter(
                  (part) =>
                    part.type === "tool-invocation" || part.type === "text",
                )
                .map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <MarkdownRenderer key={`${id}-${part.text}`}>
                        {part.text.replace(
                          /^.*<context>.*<\/context>.*---\n\n/s,
                          "",
                        )}
                      </MarkdownRenderer>
                    );
                  }

                  const toolInvocation = part.toolInvocation;

                  if (toolInvocation.state !== "result") {
                    return (
                      <LoadingIndicator
                        key={toolInvocation.toolCallId}
                        message={
                          toolInvocation.toolName === "displayMoment"
                            ? "Analyzing moment..."
                            : toolInvocation.toolName === "listMeetings"
                              ? "Searching across all your meetings..."
                              : toolInvocation.toolName === "searchMoments"
                                ? "Finding relevant moments..."
                                : toolInvocation.toolName ===
                                    "discoverKeyEntities"
                                  ? "Discovering key entities..."
                                  : toolInvocation.toolName ===
                                      "findEntityRelationships"
                                    ? "Finding entity relationships..."
                                    : toolInvocation.toolName ===
                                        "findRelatedTopics"
                                      ? "Finding related topics..."
                                      : toolInvocation.toolName ===
                                          "entityLookup"
                                        ? "Looking up entity information..."
                                        : toolInvocation.toolName ===
                                            "entitySemanticSearch"
                                          ? "Searching for relevant entities..."
                                          : toolInvocation.toolName ===
                                              "listEntityNames"
                                            ? "Listing entity names..."
                                            : toolInvocation.toolName ===
                                                "listRelationshipTypes"
                                              ? "Listing relationship types..."
                                              : toolInvocation.toolName ===
                                                  "listEntityTypes"
                                                ? "Listing entity types..."
                                                : toolInvocation.toolName ===
                                                    "listReports"
                                                  ? "Finding reports..."
                                                  : "Processing..."
                        }
                      />
                    );
                  }

                  if (toolInvocation.toolName === "displayMoment") {
                    const { id, moment } = toolInvocation.result as {
                      id: string;
                      reasoning: string;
                      moment: VideoMoment;
                    };

                    if (!moment) {
                      return null;
                    }

                    return (
                      <CollapsibleSection
                        key={toolInvocation.toolCallId}
                        title={moment.title}
                        icon={Tag}
                        args={toolInvocation.args}
                      >
                        <MomentDisplay id={id} />
                      </CollapsibleSection>
                    );
                  }

                  if (toolInvocation.toolName === "listMeetings") {
                    const { data } =
                      toolInvocation.result as ListMeetingsToolOutput;

                    return (
                      <CollapsibleSection
                        key={toolInvocation.toolCallId}
                        title="Found Meetings"
                        icon={VideoIcon}
                        count={data?.length ?? 0}
                        args={toolInvocation.args}
                      >
                        <ChatMeetingList meetings={data} />
                      </CollapsibleSection>
                    );
                  }

                  if (toolInvocation.toolName === "searchMoments") {
                    const { results } =
                      toolInvocation.result as SearchMomentsToolOutput;

                    return (
                      <CollapsibleSection
                        key={toolInvocation.toolCallId}
                        title="Found Moments"
                        icon={Tag}
                        count={results?.length ?? 0}
                        args={toolInvocation.args}
                      >
                        <ChatMomentList moments={results} />
                      </CollapsibleSection>
                    );
                  }

                  if (toolInvocation.toolName === "discoverKeyEntities") {
                    const { entities, totalEntitiesFound } =
                      toolInvocation.result as DiscoverKeyEntitiesToolOutput;

                    return (
                      <CollapsibleSection
                        key={toolInvocation.toolCallId}
                        title="Key Entities"
                        icon={Database}
                        count={totalEntitiesFound ?? 0}
                        args={toolInvocation.args}
                      >
                        <EntityList entities={entities || []} />
                      </CollapsibleSection>
                    );
                  }

                  if (toolInvocation.toolName === "findEntityRelationships") {
                    const { entityName, relationships, totalRelationships } =
                      toolInvocation.result as FindEntityRelationshipsToolOutput;

                    const formattedRelationships =
                      relationships?.map((rel) => ({
                        relationship: rel.relationshipType,
                        subject:
                          rel.direction === "outgoing"
                            ? entityName
                            : rel.otherEntity,
                        object:
                          rel.direction === "outgoing"
                            ? rel.otherEntity
                            : entityName,
                        otherEntity: rel.otherEntity,
                        isSubject: rel.direction === "outgoing",
                        topicTitle: rel.topicTitle,
                        topicId: rel.topicId,
                        confidence: rel.confidence,
                      })) || [];

                    return (
                      <CollapsibleSection
                        key={toolInvocation.toolCallId}
                        title={`Relationships for "${entityName}"`}
                        icon={Link}
                        count={totalRelationships ?? 0}
                        args={toolInvocation.args}
                      >
                        <RelationshipList
                          relationships={formattedRelationships}
                          entityName={entityName}
                        />
                      </CollapsibleSection>
                    );
                  }

                  if (toolInvocation.toolName === "findRelatedTopics") {
                    const { topics, totalTopicsFound } =
                      toolInvocation.result as FindRelatedTopicsToolOutput;

                    return (
                      <CollapsibleSection
                        key={toolInvocation.toolCallId}
                        title="Related Topics"
                        icon={BookOpen}
                        count={totalTopicsFound ?? 0}
                        args={toolInvocation.args}
                      >
                        <TopicList topics={topics || []} />
                      </CollapsibleSection>
                    );
                  }

                  if (toolInvocation.toolName === "entityLookup") {
                    const { entityName, entity, observations, relationships } =
                      toolInvocation.result as EntityLookupToolOutput;

                    if (!entity) {
                      return null;
                    }

                    return (
                      <CollapsibleSection
                        key={toolInvocation.toolCallId}
                        title={`Entity: ${entityName}`}
                        icon={Users}
                        args={toolInvocation.args}
                      >
                        <div className="space-y-4">
                          <EntityList
                            entities={[
                              {
                                ...entity,
                                observations: observations?.map(
                                  (obs) => obs.text,
                                ),
                              },
                            ]}
                          />

                          {relationships && relationships.length > 0 && (
                            <div className="mt-4">
                              <h5 className="mb-2 text-sm font-medium">
                                Relationships
                              </h5>
                              <RelationshipList
                                relationships={relationships}
                                entityName={entityName}
                              />
                            </div>
                          )}
                        </div>
                      </CollapsibleSection>
                    );
                  }

                  if (toolInvocation.toolName === "entitySemanticSearch") {
                    const { results, totalResults } =
                      toolInvocation.result as EntitySemanticSearchToolOutput;

                    const totalCount = totalResults
                      ? totalResults.entities +
                        totalResults.relationships +
                        totalResults.observations
                      : 0;

                    return (
                      <CollapsibleSection
                        key={toolInvocation.toolCallId}
                        title="Semantic Search Results"
                        icon={Eye}
                        count={totalCount}
                        args={toolInvocation.args}
                      >
                        <div className="space-y-6">
                          {results?.entities && results.entities.length > 0 && (
                            <div>
                              <h5 className="mb-2 text-sm font-medium">
                                Entities ({results.entities.length})
                              </h5>
                              <EntityList entities={results.entities} />
                            </div>
                          )}

                          {results?.relationships &&
                            results.relationships.length > 0 && (
                              <div>
                                <h5 className="mb-2 text-sm font-medium">
                                  Relationships ({results.relationships.length})
                                </h5>
                                <RelationshipList
                                  relationships={results.relationships.map(
                                    (r) => ({
                                      ...r,
                                      subject: r.subject,
                                      object: r.object,
                                    }),
                                  )}
                                />
                              </div>
                            )}

                          {results?.observations &&
                            results.observations.length > 0 && (
                              <div>
                                <h5 className="mb-2 text-sm font-medium">
                                  Observations ({results.observations.length})
                                </h5>
                                <ObservationList
                                  observations={results.observations}
                                />
                              </div>
                            )}
                        </div>
                      </CollapsibleSection>
                    );
                  }

                  if (
                    [
                      "listEntityNames",
                      "listRelationshipTypes",
                      "listEntityTypes",
                    ].includes(toolInvocation.toolName)
                  ) {
                    const result = toolInvocation.result as
                      | ListEntityNamesToolOutput
                      | ListRelationshipTypesToolOutput
                      | ListEntityTypesToolOutput;

                    let items: Array<{ name: string }> = [];

                    if (result?.success) {
                      if ("entities" in result) {
                        items =
                          result.entities?.map((entity) => ({
                            name: entity.name,
                          })) || [];
                      } else if ("relationshipTypes" in result) {
                        items = result.relationshipTypes.map((type) => ({
                          name: type,
                        }));
                      } else if ("entityTypes" in result) {
                        items =
                          result.entityTypes?.map((type) => ({
                            name: type,
                          })) || [];
                      }
                    }

                    return (
                      <CollapsibleSection
                        key={toolInvocation.toolCallId}
                        title={
                          toolInvocation.toolName === "listEntityNames"
                            ? "Entity Names"
                            : toolInvocation.toolName ===
                                "listRelationshipTypes"
                              ? "Relationship Types"
                              : "Entity Types"
                        }
                        icon={List}
                        count={items.length}
                        args={toolInvocation.args}
                      >
                        <SimpleList icon={List} items={items} />
                      </CollapsibleSection>
                    );
                  }

                  if (toolInvocation.toolName === "listReports") {
                    const result =
                      toolInvocation.result as ListReportsToolOutput;

                    return (
                      <CollapsibleSection
                        key={toolInvocation.toolCallId}
                        title="Reports"
                        icon={FileText}
                        count={result?.flatMap((r) => r.reports).length ?? 0}
                        args={toolInvocation.args}
                      >
                        <ReportList reports={result || []} />
                      </CollapsibleSection>
                    );
                  }

                  return null;
                })}
            </div>
          )}
      </div>

      {showTimeStamp && createdAt ? (
        <span
          className={cn(
            "mt-1 block px-1 text-xs opacity-50",
            animation !== "none" && "duration-500 animate-in fade-in-0",
          )}
        >
          {formattedTime}
        </span>
      ) : null}
    </div>
  );
};
