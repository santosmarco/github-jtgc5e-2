import { useEffect } from "react";
import { useChatVisibility } from "~/components/floating-chat/chat-visibility-provider";

/**
 * Hook to programmatically hide or show the floating chat
 * @param shouldHide Boolean indicating if the chat should be hidden
 * @returns Object containing functions to show and hide the chat
 */
export function useFloatingChat(shouldHide?: boolean) {
  const { hideChat, showChat } = useChatVisibility();

  // Automatically hide/show based on the shouldHide prop
  useEffect(() => {
    if (shouldHide) {
      hideChat();
    } else if (shouldHide === false) {
      showChat();
    }
  }, [shouldHide, hideChat, showChat]);

  return {
    hideChat,
    showChat,
  };
}
