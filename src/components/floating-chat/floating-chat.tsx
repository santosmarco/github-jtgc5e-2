"use client";

import type { Editor } from "@tiptap/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatInput } from "~/components/chat/chat-input";
import { ChatMessages } from "~/components/ui/chat";
import { MessageList } from "~/components/ui/message-list";
import { usePageChatContext } from "~/hooks/use-chat-context";
import { cn } from "~/lib/utils";
import type { VideoOutput } from "~/lib/videos";
import type { RouterOutputs } from "~/trpc/react";

import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { ExportChatButton } from "../ui/export-chat-button";
import { useChatContext } from "./chat-context-provider";
import { useChatVisibility } from "./chat-visibility-provider";
import { FloatingChatContainer } from "./floating-chat-container";

interface FloatingChatProps {
  className?: string;
}

export const FloatingChat: React.FC<FloatingChatProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [selectedMoments, setSelectedMoments] = useState<
    NonNullable<RouterOutputs["moments"]["listForInsights"]>["moments"]
  >([]);
  const [selectedVideos, setSelectedVideos] = useState<VideoOutput[]>([]);
  const { messages, append, status, stop, reload, setMessages, error } =
    useChatContext();

  // Use the chat visibility context
  const { isVisible, isAnimating } = useChatVisibility();

  // Initialize page-specific context
  usePageChatContext();

  const resetChat = useCallback(() => {
    stop();
    setMessages([]);
    void reload();
  }, [stop, setMessages, reload]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay before scrolling to bottom
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

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  const handleSubmit = useCallback(
    async (event?: { preventDefault?: () => void }) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }

      if (status === "streaming") {
        stop();
      }

      const text = editorRef.current?.getText() ?? "";
      if (!text.trim()) return;

      // Open the chat and maximize it if it's minimized
      setIsOpen(true);
      setIsMinimized(false);

      await append({
        content: text,
        role: "user",
      });

      editorRef.current?.commands.clearContent();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [append, status],
  );

  const toggleChat = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      setIsMinimized(true);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [isOpen]);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const newState = !prev;
      if (newState) {
        // When entering fullscreen, ensure the chat is open and not minimized
        setIsOpen(true);
        setIsMinimized(false);
      }
      return newState;
    });
  }, []);

  const isTyping = status === "submitted" || status === "streaming";

  // Separate chat input component that will always be visible
  const chatInputComponent = (
    <motion.div
      className={cn("p-3 pt-0", isMinimized && "pt-3")}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.1 }}
    >
      <ChatInput
        onSubmit={handleSubmit}
        stop={stop}
        isGenerating={isTyping}
        frameworks={[]}
        onEditorReady={handleEditorReady}
        disabled={false}
        selectedMoments={selectedMoments}
        selectedVideos={selectedVideos}
        onSelectMoment={(moment) => {
          setIsMinimized(false);
          setSelectedMoments((prev) => [...prev, moment]);
        }}
        onUnselectMoment={(moment) =>
          setSelectedMoments((prev) => prev.filter((m) => m.id !== moment.id))
        }
        onSelectVideo={(video) => {
          setIsMinimized(false);
          setSelectedVideos((prev) => [...prev, video]);
        }}
        onUnselectVideo={(video) =>
          setSelectedVideos((prev) =>
            prev.filter((v) => v.videoId !== video.videoId),
          )
        }
        moments={[]}
        videos={[]}
        onClick={() => {
          if (isMinimized) {
            setIsMinimized(false);
          }
        }}
        buttonPosition="top"
      />
    </motion.div>
  );

  return isVisible || isAnimating ? (
    <FloatingChatContainer
      isOpen={isOpen}
      onToggle={toggleChat}
      className={cn(
        className,
        isAnimating && "duration-300 animate-out fade-out slide-out-to-bottom",
      )}
      chatInputComponent={chatInputComponent}
      isMinimized={isMinimized}
      onMinimizeToggle={toggleMinimize}
      onReset={resetChat}
      isFullscreen={isFullscreen}
      onFullscreenToggle={toggleFullscreen}
      exportChatButton={
        messages.length > 0 ? <ExportChatButton messages={messages} /> : null
      }
    >
      <AnimatePresence>
        <motion.div
          className="flex h-full flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
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
                <MessageList
                  messages={messages}
                  isTyping={isTyping && !error}
                />
                <div ref={messagesEndRef} />
              </ChatMessages>
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-sm text-muted-foreground">
                  Start a conversation with Titan AI
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </FloatingChatContainer>
  ) : null;
};
