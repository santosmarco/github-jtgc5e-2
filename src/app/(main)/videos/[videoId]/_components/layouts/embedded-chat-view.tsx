"use client";

import type { Editor as TiptapEditor } from "@tiptap/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, MessageSquare, MessageSquareText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import dedent from "ts-dedent";

import { ChatInput } from "~/components/chat/chat-input";
import { useChatContext } from "~/components/floating-chat/chat-context-provider";
import { usePlayer } from "~/components/player/provider";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { ChatMessages } from "~/components/ui/chat";
import { MessageList } from "~/components/ui/message-list";
import type { PageContext } from "~/lib/ai/data";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";

export type EmbeddedChatViewProps = {
  videoId: string;
  currentTab: string;
  className?: string;
};

export function EmbeddedChatView({
  videoId,
  currentTab,
  className,
}: EmbeddedChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<TiptapEditor | null>(null);
  const [selectedMoments, setSelectedMoments] = useState<
    NonNullable<React.ComponentProps<typeof ChatInput>["selectedMoments"]>
  >([]);

  const {
    currentTime,
    isControlsVisible,
    isFullscreen,
    isMuted,
    isPlaying,
    volume,
  } = usePlayer();

  const { data: meeting } = api.meetings.getAllRelevantDataForVideo.useQuery({
    apiVideoId: videoId,
  });

  const { data: conversationSuggestions } =
    api.ai.getMeetingConversationSuggestions.useQuery(
      {
        apiVideoId: videoId,
      },
      {
        enabled: !!videoId,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    );

  const { messages, append, status, stop, error, setCurrentContext } =
    useChatContext();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages.length]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (status === "streaming") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [status]);

  const handleEditorReady = useCallback((editor: TiptapEditor) => {
    editorRef.current = editor;
  }, []);

  // Create a function to build the page context
  const buildPageContext = useCallback(
    (
      meeting: RouterOutputs["meetings"]["getAllRelevantDataForVideo"],
    ): PageContext => {
      return {
        currentPath: window.location.pathname,
        viewDescription: dedent`
          This interface presents a sophisticated dual-panel layout featuring an interactive meeting video player on the right and an intelligent AI chat system on the left. The video section includes a well-organized tabbed navigation system providing access to:
          - Meeting Summary: A comprehensive synthesis of essential discussion points and decisions made during the meeting, highlighting key takeaways, conclusions, and important context. If no summary is available, a message indicating this will be shown.
          - Topics Discussed: A methodically arranged breakdown of conversation themes. Users can click on topics to jump to the corresponding timestamp in the video.
          - Key Moments: A list of key moments from the meeting, clickable to navigate the video.
          - Action Items: A list of actionable tasks extracted from the meeting content, allowing users to track follow-ups and responsibilities.
          - Transcript: A complete, fully searchable textual documentation of the entire conversation with speaker identification and timestamped entries. Users can click on words in the transcript to navigate to that point in the video.

          The AI chat system on the left allows users to ask questions about meeting content, request summaries, search for specific information, extract action items, and analyze discussion patterns. The chat interface supports rich text entry with markdown formatting, drag-and-drop functionality, and direct reference to meeting moments. Users can reference specific timestamps, topics, or speakers to get targeted information from the AI assistant.

          The interface also provides powerful navigation controls including video playback speed adjustment, timestamp jumping, and synchronized highlighting between transcript and video position. The responsive layout adapts to different screen sizes while maintaining optimal usability.
        `,
        viewContext: dedent`
          The user is currently reviewing the meeting recording <meeting_title>${meeting.name ?? "[untitled meeting]"}</meeting_title> through Titan's advanced interactive video analysis platform.
          They have the <current_tab_name>${currentTab}</current_tab_name> tab visible in their interface. The content of this tab is as follows:
            - If 'Meeting Summary': A text summary of the meeting.
            - If 'Topics Discussed': A list of discussion topics, clickable to navigate the video.
            - If 'Key Moments': A list of key moments from the meeting, clickable to navigate the video.
            - If 'Action Items': A list of tasks derived from the meeting.
            - If 'Transcript': The full meeting transcript, with clickable words for video navigation.
          The video playback is currently positioned at <video_time_in_seconds>${currentTime}</video_time_in_seconds> seconds.
          
          Player state:
          - Playback status: ${isPlaying ? "Playing" : "Paused"}
          - Audio: ${isMuted ? "Muted" : `Volume at ${Math.round(volume * 100)}%`}
          - Display mode: ${isFullscreen ? "Fullscreen" : "Normal view"}
          - Controls: ${isControlsVisible ? "Visible" : "Hidden"}
          
          The user can interact with the video by:
          - Playing/pausing using the control bar or keyboard shortcuts
          - Clicking on transcript entries or topic markers to jump to specific timestamps
          - Adjusting playback speed (0.5x to 2x)
          - Toggling captions/subtitles
          - Using the AI chat to search for information or request analysis based on the video content and its associated data (summary, topics, action items, transcript).
          
          The user's current workspace context suggests they're analyzing meeting content for:
          - Key decisions and action items
          - Important discussion points from the summary or topics tab
          - Participant contributions (if available in tags) and engagement through transcript analysis
          - Timeline of topics and conversation flow using the topics and transcript tabs
          
          The interface provides AI assistance for meeting analysis through the embedded chat system, which can answer questions, summarize sections, extract action items, identify speakers, and provide insights about the meeting content by leveraging all available information including the currently selected tab.
        `,
        contentContext: {
          type: "video",
          data: meeting,
        },
      };
    },
    [
      currentTab,
      currentTime,
      isPlaying,
      isMuted,
      volume,
      isFullscreen,
      isControlsVisible,
    ],
  );

  const handleSubmit = useCallback(
    async (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.();

      if (status === "streaming") {
        stop();
        return;
      }

      const text = editorRef.current?.getText() ?? "";
      if (!text.trim()) return;

      if (meeting) {
        const pageContext = buildPageContext(meeting);
        setCurrentContext(pageContext);
      }

      await append({ content: text, role: "user" });

      editorRef.current?.commands.clearContent();
    },
    [append, status, stop, meeting, buildPageContext, setCurrentContext],
  );

  const handleSelectMoment = useCallback<
    NonNullable<React.ComponentProps<typeof ChatInput>["onSelectMoment"]>
  >((moment) => {
    setSelectedMoments((prev) => [...prev, moment]);
  }, []);

  const handleUnselectMoment = useCallback<
    NonNullable<React.ComponentProps<typeof ChatInput>["onUnselectMoment"]>
  >((moment) => {
    setSelectedMoments((prev) => prev.filter((m) => m.id !== moment.id));
  }, []);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (editorRef.current) {
        const editor = editorRef.current;
        editor.commands.setContent(suggestion);

        setTimeout(() => {
          void handleSubmit();
          editor.commands.clearContent();
        }, 0);
      }
    },
    [handleSubmit],
  );

  const isTyping = status === "submitted" || status === "streaming";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    },
  };

  return (
    <div className={cn("flex h-full flex-col bg-muted/30", className)}>
      <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
        {messages.length > 0 ? (
          <ChatMessages messages={messages} className="pt-2">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}
            <MessageList messages={messages} isTyping={isTyping && !error} />
            <div ref={messagesEndRef} />
          </ChatMessages>
        ) : (
          <motion.div
            className="flex h-full flex-col items-center justify-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={itemVariants}
              className="flex max-w-md flex-col items-center gap-4 text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">
                Ask AI about this meeting
              </h2>
              <p className="text-muted-foreground">
                Get insights, summaries, or ask specific questions about the
                discussion topics and action items.
              </p>
            </motion.div>

            {/* Conversation suggestions with improved animations */}
            <AnimatePresence>
              {conversationSuggestions &&
                conversationSuggestions.length > 0 && (
                  <motion.div
                    className="mt-12 flex w-full max-w-md flex-col gap-3 px-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 25,
                      delay: 0.4,
                    }}
                  >
                    <div className="mb-3 flex items-center gap-2.5 text-sm text-muted-foreground">
                      <MessageSquareText className="h-4 w-4" />
                      <span>Suggested conversation starters:</span>
                    </div>

                    <div className="space-y-2.5">
                      {conversationSuggestions.map((suggestion, index) => (
                        <motion.button
                          key={`suggestion-${suggestion.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                          className="w-full cursor-pointer rounded-lg border border-border bg-card p-3 text-left text-sm shadow-sm transition-colors hover:bg-accent/50"
                          onClick={() => handleSuggestionClick(suggestion)}
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            visible: {
                              opacity: 1,
                              y: 0,
                              transition: {
                                type: "spring",
                                stiffness: 400,
                                damping: 30,
                              },
                            },
                          }}
                          initial="hidden"
                          animate="visible"
                          transition={{
                            delay: 0.5 + index * 0.09,
                          }}
                          whileHover={{
                            scale: 1.01,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                          }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {suggestion}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
      <div className="border-t p-3">
        <ChatInput
          onSubmit={handleSubmit}
          stop={stop}
          isGenerating={isTyping}
          frameworks={[]} // Populate if frameworks are used
          onEditorReady={handleEditorReady}
          disabled={false}
          videos={null}
          selectedVideos={null}
          onSelectVideo={null}
          onUnselectVideo={null}
          moments={
            (meeting?.moments ?? []) as unknown as React.ComponentProps<
              typeof ChatInput
            >["moments"]
          }
          selectedMoments={selectedMoments}
          onSelectMoment={handleSelectMoment}
          onUnselectMoment={handleUnselectMoment}
          onClick={() => {
            /* No action needed for embedded */
          }}
          buttonPosition="top" // Positions the button at the top
        />
      </div>
    </div>
  );
}
