import type { Message } from "ai";
import { useMemo } from "react";

import {
  ChatMessage,
  type ChatMessageProps,
} from "~/components/ui/chat-message";
import { TypingIndicator } from "~/components/ui/typing-indicator";

type AdditionalMessageOptions = Omit<ChatMessageProps, keyof Message>;

interface MessageListProps {
  messages: Message[];
  showTimeStamps?: boolean;
  isTyping?: boolean;
  messageOptions?:
    | AdditionalMessageOptions
    | ((message: Message) => AdditionalMessageOptions);
}

export function MessageList({
  messages,
  showTimeStamps = true,
  isTyping = false,
  messageOptions,
}: MessageListProps) {
  // Memoize message grouping to prevent unnecessary recalculations
  const groupedMessages = useMemo(() => {
    const result: (Message & { next?: Message[] })[] = [];
    const messagesCopy = [...messages];

    for (let i = 0; i < messagesCopy.length; i++) {
      const currentMsg = messagesCopy[i];

      if (!currentMsg) continue;

      if (currentMsg.role === "assistant" && i < messagesCopy.length - 1) {
        const nextMessages: Message[] = [];
        const peekIndex = i + 1;

        while (
          peekIndex < messagesCopy.length &&
          messagesCopy[peekIndex]?.role === "assistant"
        ) {
          const nextMsg = messagesCopy.splice(peekIndex, 1)[0];
          if (nextMsg) nextMessages.push(nextMsg);
        }

        if (nextMessages.length > 0) {
          result.push({ ...currentMsg, next: nextMessages });
        } else {
          result.push(currentMsg);
        }
      } else {
        result.push(currentMsg);
      }
    }

    return result;
  }, [messages]);

  // Memoize message option calculation if it's a function
  const getMessageOptions = useMemo(() => {
    if (typeof messageOptions === "function") {
      return messageOptions;
    }
    return () => messageOptions;
  }, [messageOptions]);

  return (
    <div className="space-y-4 overflow-visible">
      {groupedMessages.map((message) => (
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
