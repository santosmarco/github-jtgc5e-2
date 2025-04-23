"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Define the default paths where the chat should be hidden
const DEFAULT_HIDDEN_PATHS = [
  "/settings",
  "/settings/*",
  // Add more paths as needed
];

type ChatVisibilityContextType = {
  isVisible: boolean;
  isAnimating: boolean;
  hiddenPaths: string[];
  setHiddenPaths: (paths: string[]) => void;
  hideChat: () => void;
  showChat: () => void;
};

const ChatVisibilityContext = createContext<
  ChatVisibilityContextType | undefined
>(undefined);

interface ChatVisibilityProviderProps {
  children: ReactNode;
  initialHiddenPaths?: string[];
}

export function ChatVisibilityProvider({
  children,
  initialHiddenPaths = DEFAULT_HIDDEN_PATHS,
}: ChatVisibilityProviderProps) {
  const pathname = usePathname();
  const [hiddenPaths, setHiddenPaths] = useState<string[]>(initialHiddenPaths);
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if the current path matches any hidden path patterns
  useEffect(() => {
    const shouldBeHidden = hiddenPaths.some((path) => {
      // Allow exact matches
      if (path === pathname) return true;
      // Allow wildcard matches (e.g., "/settings/*")
      if (path.endsWith("*") && pathname.startsWith(path.slice(0, -1)))
        return true;
      return false;
    });

    if (shouldBeHidden && isVisible) {
      setIsAnimating(true);
      // Start animation then actually hide
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timeout);
    }

    if (!shouldBeHidden && !isVisible) {
      setIsVisible(true);
    }
  }, [pathname, hiddenPaths, isVisible]);

  const hideChat = () => {
    if (isVisible) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
      }, 300);
    }
  };

  const showChat = () => {
    if (!isVisible) {
      setIsVisible(true);
    }
  };

  return (
    <ChatVisibilityContext.Provider
      value={{
        isVisible,
        isAnimating,
        hiddenPaths,
        setHiddenPaths,
        hideChat,
        showChat,
      }}
    >
      {children}
    </ChatVisibilityContext.Provider>
  );
}

export function useChatVisibility() {
  const context = useContext(ChatVisibilityContext);

  if (context === undefined) {
    throw new Error(
      "useChatVisibility must be used within a ChatVisibilityProvider",
    );
  }

  return context;
}
