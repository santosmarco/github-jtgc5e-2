import type { PostHog } from "posthog-js";

/**
 * PostHog utility functions for handling ad blockers and session recording
 */

// Checks if PostHog is being blocked by an ad blocker
export const isPostHogBlocked = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;

  try {
    // Try to fetch a PostHog resource
    const testUrl = "https://us.i.posthog.com/static/array.js";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const response = await fetch(testUrl, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-cache",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return false; // Not blocked
  } catch (error) {
    // If there's an error or timeout, PostHog is likely blocked
    return true;
  }
};

// Creates a session ID for anonymous users
export const createAnonymousSessionId = (): string => {
  return `anon-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Checks if session recording is available
export const canUseSessionRecording = (posthog: PostHog | null): boolean => {
  if (!posthog) return false;

  try {
    return (
      typeof posthog.startSessionRecording === "function" &&
      !isLocalhost() &&
      !hasOptedOut(posthog)
    );
  } catch {
    return false;
  }
};

// Check if the current environment is localhost
export const isLocalhost = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
};

// Check if user has opted out of tracking
export const hasOptedOut = (posthog: PostHog | null): boolean => {
  if (!posthog) return true;
  try {
    return posthog.has_opted_out_capturing?.();
  } catch {
    return true;
  }
};
