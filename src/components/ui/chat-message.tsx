"use client";

import type { UIMessage } from "ai";
import * as React from "react";

import type { ChatRequestBody } from "~/app/api/chat/route";
import {
  type ChatBubbleAnimation,
  ChatMessageBubble,
} from "~/components/chat/message/chat-message-bubble";
import { AssistantMessageContent } from "~/components/chat/message/parts/assistant-message-content";
import { DataMessageContent } from "~/components/chat/message/parts/data-message-content";
import { UserMessageContent } from "~/components/chat/message/parts/user-message-content";

export type ChatMessageProps = UIMessage & {
  showTimeStamp?: boolean;
  animation?: ChatBubbleAnimation;
  actions?: React.ReactNode;
};

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

  const contentWithoutContext = React.useMemo(
    () => content.replace(CONTEXT_REGEX, ""),
    [content],
  );

  const hasToolInvocation = parts?.some(
    (part) => part.type === "tool-invocation",
  );

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

  return (
    <ChatMessageBubble
      role={role}
      createdAt={createdAt}
      showTimeStamp={showTimeStamp}
      animation={animation}
      actions={role === "assistant" ? actions : undefined}
      isUser={role === "user"}
      className="w-full"
    >
      {role === "user" && (
        <UserMessageContent
          id={id}
          pinnedContent={pinnedContent}
          content={contentWithoutContext}
        />
      )}
      {role === "assistant" && parts && (
        <AssistantMessageContent id={id} parts={parts} />
      )}
      {role === "data" && <DataMessageContent content={content} />}
      {role === "system" && (
        <div className="text-xs italic text-muted-foreground">{content}</div>
      )}
    </ChatMessageBubble>
  );
};

ChatMessage.displayName = "ChatMessage";
