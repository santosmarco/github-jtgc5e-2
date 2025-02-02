"use client";

import type { Message } from "ai";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { Tag, TagIcon, VideoIcon } from "lucide-react";
import type * as React from "react";

import type { ChatRequestBody } from "~/app/api/chat/route";
import { CollapsibleSection } from "~/components/chat/collapsible-section";
import { LoadingIndicator } from "~/components/chat/loading-indicator";
import { ChatMeetingList } from "~/components/chat/meeting-list";
import { MomentDisplay } from "~/components/chat/moment-display";
import { ChatMomentList } from "~/components/chat/moment-list";
import { MarkdownRenderer } from "~/components/ui/markdown-renderer";
import type {
  ListMeetingsToolOutput,
  SearchMomentsToolOutput,
} from "~/lib/ai/tools";
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

export interface ChatMessageProps extends Message {
  showTimeStamp?: boolean;
  animation?: Animation;
  actions?: React.ReactNode;
  next?: Message[];
  isNext?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  createdAt,
  showTimeStamp = false,
  animation = "scale",
  actions,
  toolInvocations,
  next,
  isNext,
}) => {
  const isUser = role === "user";
  const formattedTime = createdAt?.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const pinnedMomentsMatch =
    /VERY IMPORTANT: FOCUS \*\*ONLY\*\* ON THESE MOMENTS:\n```\n([^]*?)\n```/s.exec(
      content,
    );
  const pinnedVideosMatch =
    /VERY IMPORTANT: FOCUS \*\*ONLY\*\* ON THESE VIDEOS:\n```\n([^]*?)\n```/s.exec(
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
          !isNext && chatBubbleVariants({ isUser, animation }),
          isNext ? "sm:min-w-full" : "sm:max-w-[70%]",
          "space-y-3",
        )}
      >
        {role !== "data" && (
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

        {!!toolInvocations?.length && (
          <div className="min-w-full space-y-2">
            {toolInvocations?.map((toolInvocation) => {
              if (toolInvocation.state !== "result") {
                return (
                  <LoadingIndicator
                    key={toolInvocation.toolCallId}
                    message={
                      toolInvocation.toolName === "displayMoment"
                        ? "Analyzing moment..."
                        : toolInvocation.toolName === "listMeetings"
                          ? "Searching across all your meetings..."
                          : "Finding relevant moments..."
                    }
                  />
                );
              }

              if (toolInvocation.toolName === "displayMoment") {
                const { id, reasoning, moment } = toolInvocation.result as {
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

              return null;
            })}
          </div>
        )}

        {next?.map((msg) => (
          <ChatMessage key={msg.id} {...msg} isNext={true} />
        ))}
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
