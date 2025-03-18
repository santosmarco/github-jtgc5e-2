"use client";

import { useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";
import type { JsonObject } from "type-fest";

/**
 * Custom hook for PostHog feature flags
 * Handles loading states and keeps flag state in sync
 *
 * @param flagName The name of the feature flag to check
 * @param defaultValue The default value to use if the flag is not found (defaults to false)
 * @returns Whether the feature flag is enabled
 */
export function useFeatureFlag(
  flagName: string,
  defaultValue = false,
): boolean {
  const posthog = usePostHog();
  const [isEnabled, setIsEnabled] = useState<boolean>(defaultValue);
  const [flagLoaded, setFlagLoaded] = useState(false);

  useEffect(() => {
    if (!posthog) return;

    // Initial check for the flag
    const checkFlag = () => {
      try {
        // Check if feature flags are loaded
        if (
          posthog.isFeatureEnabled &&
          typeof posthog.isFeatureEnabled === "function"
        ) {
          const enabled = posthog.isFeatureEnabled(flagName);
          setIsEnabled(enabled ?? defaultValue);

          if (!flagLoaded) {
            setFlagLoaded(true);
          }
        }
      } catch (error) {
        console.error(`Error checking feature flag ${flagName}:`, error);
        setIsEnabled(defaultValue);
      }
    };

    // Check immediately if flags are already loaded
    checkFlag();

    // Set up listener for when flags load or change
    const handleFlagsChanged = () => {
      checkFlag();
    };

    // PostHog v1.71.0+ supports onFeatureFlags
    let unsubscribe: (() => void) | undefined;
    if (posthog.onFeatureFlags) {
      unsubscribe = posthog.onFeatureFlags(handleFlagsChanged);
    }

    return () => {
      // Clean up listener using the unsubscribe function if available
      try {
        if (unsubscribe && typeof unsubscribe === "function") {
          unsubscribe();
        }
      } catch (error) {
        // Silently fail cleanup
      }
    };
  }, [posthog, flagName, defaultValue, flagLoaded]);

  return isEnabled;
}

/**
 * Hook to get the payload value of a feature flag
 * Feature flags can have associated payload data to control configuration
 *
 * @param flagName The name of the feature flag
 * @returns The payload data as a JSON object, or undefined if not available
 */
export function useFeatureFlagPayload<T extends JsonObject = JsonObject>(
  flagName: string,
): T | undefined {
  const posthog = usePostHog();
  const [payload, setPayload] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!posthog) return;

    // Get the flag payload
    const getPayload = () => {
      try {
        if (
          posthog.getFeatureFlagPayload &&
          typeof posthog.getFeatureFlagPayload === "function"
        ) {
          const flagPayload = posthog.getFeatureFlagPayload(flagName) as
            | T
            | undefined;
          setPayload(flagPayload);
        }
      } catch (error) {
        console.error(
          `Error getting feature flag payload for ${flagName}:`,
          error,
        );
      }
    };

    // Check immediately
    getPayload();

    // Set up listener for flag changes
    const handleFlagsChanged = () => {
      getPayload();
    };

    // PostHog v1.71.0+ supports onFeatureFlags
    let unsubscribe: (() => void) | undefined;
    if (posthog.onFeatureFlags) {
      unsubscribe = posthog.onFeatureFlags(handleFlagsChanged);
    }

    return () => {
      // Clean up listener using the unsubscribe function if available
      try {
        if (unsubscribe && typeof unsubscribe === "function") {
          unsubscribe();
        }
      } catch (error) {
        // Silently fail cleanup
      }
    };
  }, [posthog, flagName]);

  return payload;
}
