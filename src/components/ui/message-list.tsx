import type { UIMessage } from "ai";
import { useMemo } from "react";

import {
  ChatMessage,
  type ChatMessageProps,
} from "~/components/ui/chat-message";
import { TypingIndicator } from "~/components/ui/typing-indicator";

type AdditionalMessageOptions = Omit<ChatMessageProps, keyof UIMessage>;

interface MessageListProps {
  messages: UIMessage[];
  showTimeStamps?: boolean;
  isTyping?: boolean;
  messageOptions?:
    | AdditionalMessageOptions
    | ((message: UIMessage) => AdditionalMessageOptions);
}

export function MessageList({
  messages,
  showTimeStamps = true,
  isTyping = false,
  messageOptions,
}: MessageListProps) {
  // Memoize message option calculation if it's a function
  const getMessageOptions = useMemo(() => {
    if (typeof messageOptions === "function") {
      return messageOptions;
    }
    return () => messageOptions;
  }, [messageOptions]);

  return (
    <div className="space-y-4 overflow-visible">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          showTimeStamp={showTimeStamps}
          {...message}
          {...getMessageOptions(message)}
        />
      ))}
      {isTyping && <TypingIndicator />}
    </div>
  );
}
