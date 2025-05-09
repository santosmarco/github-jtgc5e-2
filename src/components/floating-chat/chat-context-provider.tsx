"use client";

import { useChat } from "@ai-sdk/react";
import type React from "react";
import { createContext, useContext, useState } from "react";

import type { ChatRequestBody } from "~/app/api/chat/route";
import { useProfile } from "~/hooks/use-profile";
import type { PageContext } from "~/lib/ai/data";

export type ChatContext = ReturnType<typeof useChat> & {
  currentContext: PageContext | null;
  setCurrentContext: (context: PageContext | null) => void;
};

const ChatContext = createContext<ChatContext | undefined>(undefined);

interface ChatContextProviderProps {
  children: React.ReactNode;
}

export function ChatContextProvider({ children }: ChatContextProviderProps) {
  const { profile } = useProfile();

  const [currentContext, setCurrentContext] = useState<PageContext | null>(
    null,
  );

  const chatContext = useChat({
    body: {
      userId: profile?.id,
      mode: "coach",
      pageContext: currentContext,
    } satisfies ChatRequestBody,
  });

  return (
    <ChatContext.Provider
      value={{
        ...chatContext,
        currentContext,
        setCurrentContext,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);

  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatContextProvider");
  }

  return context;
}
