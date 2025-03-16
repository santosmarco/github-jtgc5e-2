"use client";

import { usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";
import { canUseSessionRecording, isLocalhost } from "~/lib/posthog-utils";

/**
 * This component handles session recording initialization and retries
 * It attempts to start recording in different ways to overcome ad blockers
 */
export default function PostHogSessionController() {
  const posthog = usePostHog();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!posthog || initialized || isLocalhost()) return;

    // Try to start session recording
    const startRecording = () => {
      try {
        if (posthog.startSessionRecording && canUseSessionRecording(posthog)) {
          // Try with overrides to bypass any flag checks
          posthog.startSessionRecording({
            linked_flag: true,
            sampling: true,
          });
          setInitialized(true);
          return true;
        }
      } catch (error) {
        console.log("Could not start session recording normally");
      }
      return false;
    };

    // Fallback approach - call directly after a delay
    const fallbackStartRecording = () => {
      setTimeout(() => {
        try {
          if (posthog.startSessionRecording && !initialized) {
            posthog.startSessionRecording();
            setInitialized(true);
          }
        } catch (error) {
          console.log("Could not start session recording with fallback");
        }
      }, 2000);
    };

    // Start recording and set up fallbacks
    if (!startRecording()) {
      fallbackStartRecording();
    }

    // Try every 30 seconds if still not initialized
    const intervalId = setInterval(() => {
      if (!initialized && canUseSessionRecording(posthog)) {
        startRecording();
      } else if (initialized) {
        clearInterval(intervalId);
      }
    }, 30000);

    return () => {
      clearInterval(intervalId);
      if (initialized && posthog.stopSessionRecording) {
        try {
          posthog.stopSessionRecording();
        } catch (error) {
          // Silently fail
        }
      }
    };
  }, [posthog, initialized]);

  return null;
}
