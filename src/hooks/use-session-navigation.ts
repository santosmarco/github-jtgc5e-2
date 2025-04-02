import { useCallback, useEffect, useRef, useState } from "react";
import type { RouterOutputs } from "~/trpc/shared";

type SessionType = RouterOutputs["sessions"]["getAllSessionsForUser"][number];

interface UseSessionNavigationOptions {
  /**
   * Threshold for intersection observer
   * @default 0.3
   */
  threshold?: number;
  /**
   * Scroll behavior for session navigation
   * @default "smooth"
   */
  scrollBehavior?: ScrollBehavior;
  /**
   * Whether to highlight the active session in navigator when it comes into view
   * @default true
   */
  highlightOnScroll?: boolean;
}

/**
 * Custom hook to handle session navigation functionality with scroll tracking
 */
export function useSessionNavigation(
  sessions: SessionType[],
  options: UseSessionNavigationOptions = {},
) {
  const {
    threshold = 0.3,
    scrollBehavior = "smooth",
    highlightOnScroll = true,
  } = options;

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const sessionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isManualScrolling, setIsManualScrolling] = useState(false);

  // Set up intersection observer to detect which session is in view
  useEffect(() => {
    if (sessions.length === 0 || !highlightOnScroll) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Don't update active session during manual scrolling initiated by handleSessionClick
        if (isManualScrolling) return;

        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("session-", "");
            setActiveSessionId(id);
          }
        }
      },
      { threshold },
    );

    // Observe each session element
    for (const ref of Object.values(sessionRefs.current)) {
      if (ref) observer.observe(ref);
    }

    return () => {
      observer.disconnect();
    };
  }, [sessions, threshold, highlightOnScroll, isManualScrolling]);

  // Function to set session ref
  const setSessionRef = (id: string) => (el: HTMLDivElement | null) => {
    sessionRefs.current[id] = el;
  };

  // Get closest visible session
  const getClosestVisibleSession = useCallback(() => {
    if (sessions.length === 0) return null;

    // Find all visible sessions
    const visibleSessions = sessions.filter((session) => {
      const ref = sessionRefs.current[session.id];
      if (!ref) return false;

      const rect = ref.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });

    if (visibleSessions.length === 0) return sessions[0]?.id || null;
    return visibleSessions[0]?.id || null;
  }, [sessions]);

  // Handle session selection from navigator
  const handleSessionClick = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      const sessionRef = sessionRefs.current[sessionId];

      if (sessionRef) {
        // Temporarily disable the scroll observer to prevent it from
        // triggering during programmatic scrolling
        setIsManualScrolling(true);

        // Scroll to the session
        sessionRef.scrollIntoView({
          behavior: scrollBehavior,
          block: "start",
        });

        // Re-enable the scroll observer after scrolling completes
        const timeout = scrollBehavior === "smooth" ? 1000 : 100;
        const timer = setTimeout(() => {
          setIsManualScrolling(false);
        }, timeout);

        return () => clearTimeout(timer);
      }

      return sessionRef !== null;
    },
    [scrollBehavior],
  );

  // Init active session on load
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      // Set the first session as active if none is active
      const firstSessionId = getClosestVisibleSession();
      if (firstSessionId) {
        setActiveSessionId(firstSessionId);
      }
    }
  }, [sessions, activeSessionId, getClosestVisibleSession]);

  return {
    activeSessionId,
    setActiveSessionId,
    sessionRefs,
    setSessionRef,
    handleSessionClick,
    getClosestVisibleSession,
  };
}
