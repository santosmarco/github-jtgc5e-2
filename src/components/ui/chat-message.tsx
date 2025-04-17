"use client";

import type { UIMessage } from "ai";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import {
  BookOpen,
  BrainIcon,
  Database,
  Eye,
  FileText,
  Link,
  List,
  Navigation,
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
  ThinkToolOutput,
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

type Animation = "none" | "slide" | "scale" | "fade";

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

export interface ChatMessageProps extends UIMessage {
  showTimeStamp?: boolean;
  animation?: Animation;
  actions?: React.ReactNode;
}

const CONTEXT_REGEX = /^.*<context>.*<\/context>.*---\n\n/s;

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

  const cleanContent = (text: string): string =>
    text.replace(CONTEXT_REGEX, "");

  const renderUserContent = (): React.ReactNode => (
    <div className={isUser ? "text-primary-foreground" : "text-foreground"}>
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
      <MarkdownRenderer>{cleanContent(content)}</MarkdownRenderer>
    </div>
  );

  const renderDataMessage = (): React.ReactNode => {
    try {
      const data = JSON.parse(content);

      if (data.type === "user_navigation") {
        return (
          <div className="flex flex-col text-xs text-muted-foreground">
            <div className="mb-1 flex items-center gap-1 leading-none">
              <Navigation className="h-3.5 w-3.5" />
              <span className="font-medium">Navigation:</span> {data.pathname}
            </div>
            <div className="mt-1 flex items-center">
              <div>{data.context}</div>
            </div>
          </div>
        );
      }

      // Handle other data message types as needed
      return (
        <div className="text-xs text-muted-foreground">
          {data.context || JSON.stringify(data)}
        </div>
      );
    } catch (e) {
      return <div className="text-xs text-muted-foreground">{content}</div>;
    }
  };

  const getToolLoadingMessage = (toolName: string): string => {
    const toolMessages: Record<string, string> = {
      displayMoment: "Analyzing moment...",
      listMeetings: "Searching across all your meetings...",
      searchMoments: "Finding relevant moments...",
      discoverKeyEntities: "Discovering key entities...",
      findEntityRelationships: "Finding entity relationships...",
      findRelatedTopics: "Finding related topics...",
      entityLookup: "Looking up entity information...",
      entitySemanticSearch: "Searching for relevant entities...",
      listEntityNames: "Listing entity names...",
      listRelationshipTypes: "Listing relationship types...",
      listEntityTypes: "Listing entity types...",
      listReports: "Finding reports...",
      think: "Thinking...",
    };

    return toolMessages[toolName] || "Processing...";
  };

  const renderToolInvocationResult = (
    toolInvocation: NonNullable<
      Extract<
        UIMessage["parts"][number],
        { type: "tool-invocation" }
      >["toolInvocation"]
    >,
  ): React.ReactNode => {
    if (toolInvocation.state !== "result") {
      return (
        <LoadingIndicator
          key={toolInvocation.toolCallId}
          message={getToolLoadingMessage(toolInvocation.toolName)}
        />
      );
    }

    switch (toolInvocation.toolName) {
      case "displayMoment": {
        const { id, moment } = toolInvocation.result as {
          id: string;
          reasoning: string;
          moment: VideoMoment;
        };

        if (!moment) return null;

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

      case "listMeetings": {
        const { data } = toolInvocation.result as ListMeetingsToolOutput;

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

      case "searchMoments": {
        const { results } = toolInvocation.result as SearchMomentsToolOutput;

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

      case "discoverKeyEntities": {
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

      case "findEntityRelationships": {
        const { entityName, relationships, totalRelationships } =
          toolInvocation.result as FindEntityRelationshipsToolOutput;

        const formattedRelationships =
          relationships?.map((rel) => ({
            relationship: rel.relationshipType,
            subject:
              rel.direction === "outgoing" ? entityName : rel.otherEntity,
            object: rel.direction === "outgoing" ? rel.otherEntity : entityName,
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

      case "findRelatedTopics": {
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

      case "entityLookup": {
        const { entityName, entity, observations, relationships } =
          toolInvocation.result as EntityLookupToolOutput;

        if (!entity) return null;

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
                    observations: observations?.map((obs) => obs.text),
                  },
                ]}
              />

              {relationships && relationships.length > 0 && (
                <div className="mt-4">
                  <h5 className="mb-2 text-sm font-medium">Relationships</h5>
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

      case "entitySemanticSearch": {
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

              {results?.relationships && results.relationships.length > 0 && (
                <div>
                  <h5 className="mb-2 text-sm font-medium">
                    Relationships ({results.relationships.length})
                  </h5>
                  <RelationshipList
                    relationships={results.relationships.map((r) => ({
                      ...r,
                      subject: r.subject,
                      object: r.object,
                    }))}
                  />
                </div>
              )}

              {results?.observations && results.observations.length > 0 && (
                <div>
                  <h5 className="mb-2 text-sm font-medium">
                    Observations ({results.observations.length})
                  </h5>
                  <ObservationList observations={results.observations} />
                </div>
              )}
            </div>
          </CollapsibleSection>
        );
      }

      case "listEntityNames":
      case "listRelationshipTypes":
      case "listEntityTypes": {
        const result = toolInvocation.result as
          | ListEntityNamesToolOutput
          | ListRelationshipTypesToolOutput
          | ListEntityTypesToolOutput;

        let items: Array<{ name: string }> = [];
        let title = "";

        if (result?.success) {
          if ("entities" in result) {
            items =
              result.entities?.map((entity) => ({
                name: entity.name,
              })) || [];
            title = "Entity Names";
          } else if ("relationshipTypes" in result) {
            items = result.relationshipTypes.map((type) => ({
              name: type,
            }));
            title = "Relationship Types";
          } else if ("entityTypes" in result) {
            items =
              result.entityTypes?.map((type) => ({
                name: type,
              })) || [];
            title = "Entity Types";
          }
        }

        return (
          <CollapsibleSection
            key={toolInvocation.toolCallId}
            title={title}
            icon={List}
            count={items.length}
            args={toolInvocation.args}
          >
            <SimpleList icon={List} items={items} />
          </CollapsibleSection>
        );
      }

      case "listReports": {
        const result = toolInvocation.result as ListReportsToolOutput;

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

      case "think": {
        const { thought } = toolInvocation.result as ThinkToolOutput;

        return (
          <CollapsibleSection
            key={toolInvocation.toolCallId}
            title="Thinking Process"
            icon={BrainIcon}
            args={toolInvocation.args}
          >
            <div className="space-y-4 px-1">
              <MarkdownRenderer>{thought}</MarkdownRenderer>
            </div>
          </CollapsibleSection>
        );
      }

      default:
        return null;
    }
  };

  const renderAssistantContent = (): React.ReactNode => {
    const relevantParts = parts?.filter(
      (part) => part.type === "tool-invocation" || part.type === "text",
    );

    if (!relevantParts?.length) return null;

    return (
      <div className="min-w-full space-y-2">
        {relevantParts.map((part) => {
          if (part.type === "text") {
            return (
              <MarkdownRenderer key={`${id}-${part.text}`}>
                {cleanContent(part.text)}
              </MarkdownRenderer>
            );
          }

          return renderToolInvocationResult(part.toolInvocation);
        })}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          chatBubbleVariants({ isUser, animation }),
          "sm:max-w-[70%]",
          "space-y-3",
        )}
      >
        {role === "data" && renderDataMessage()}

        {role === "user" && renderUserContent()}

        {role === "assistant" && actions && (
          <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 opacity-0 transition-opacity group-hover/message:opacity-100">
            {actions}
          </div>
        )}

        {role === "assistant" && renderAssistantContent()}
      </div>

      {showTimeStamp && createdAt && (
        <span
          className={cn(
            "mt-1 block px-1 text-xs opacity-50",
            animation !== "none" && "duration-500 animate-in fade-in-0",
          )}
        >
          {formattedTime}
        </span>
      )}
    </div>
  );
};
