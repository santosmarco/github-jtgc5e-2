"use client";

import { useEffect, useState } from "react";

import dynamic from "next/dynamic";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { env } from "~/env";
import {
  createAnonymousSessionId,
  isPostHogBlocked,
} from "~/lib/posthog-utils";
import { identifyUser, trackPerformanceMetric } from "~/lib/analytics";

// Import web-vitals for performance tracking
import { onCLS, onFID, onLCP } from "web-vitals";
import { api } from "~/trpc/react";

const PostHogPageView = dynamic(() => import("./posthog-page-view"), {
  ssr: false,
});

const PostHogSessionController = dynamic(
  () => import("./posthog-session-controller"),
  {
    ssr: false,
  },
);

/**
 * Sets up performance tracking using web-vitals
 */
function setupPerformanceTracking() {
  onCLS((metric) => {
    trackPerformanceMetric("cls", metric.value, {
      id: metric.id,
      rating: metric.rating,
    });
  });

  onFID((metric) => {
    trackPerformanceMetric("fid", metric.value, {
      id: metric.id,
      rating: metric.rating,
    });
  });

  onLCP((metric) => {
    trackPerformanceMetric("lcp", metric.value, {
      id: metric.id,
      rating: metric.rating,
    });
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [_adBlockerDetected, setAdBlockerDetected] = useState(false);

  const { data: user, isLoading: isUserLoading } = api.auth.getUser.useQuery();

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const setupPostHog = async () => {
      try {
        // Check if PostHog is blocked by ad blockers
        const blocked = await isPostHogBlocked();
        setAdBlockerDetected(blocked);

        if (blocked) {
          console.log(
            "Ad blocker detected: PostHog functionality will be limited",
          );
          // Still initialize PostHog with basic config when blocked
          // The session controller will try different approaches to start recording
        }

        // Initialize PostHog
        posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host: env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
          person_profiles: "always",
          capture_pageview: true,
          capture_pageleave: true,
          // Don't disable recording - let controller handle it
          disable_session_recording: false,
          enable_recording_console_log: true,
          respect_dnt: false,
          bootstrap: {
            distinctID: createAnonymousSessionId(),
          },
          // Lower rate limits to reduce chance of blocking
          rate_limiting: {
            events_per_second: 5,
            events_burst_limit: 10,
          },
          loaded: (ph) => {
            if (
              window.location.hostname === "localhost" ||
              window.location.hostname === "127.0.0.1"
            ) {
              ph.opt_out_capturing();
            }
            // Session recording will be handled by PostHogSessionController
          },
        });

        // Setup performance tracking after PostHog is initialized
        setupPerformanceTracking();
      } catch (error) {
        console.error("Error setting up PostHog:", error);
      }
    };

    setupPostHog();

    // Cleanup function
    return () => {
      try {
        if (posthog.__loaded) {
          posthog.reset();
        }
      } catch (error) {
        // Silently fail
      }
    };
  }, []);

  // Identify user when user data is loaded
  useEffect(() => {
    if (!isUserLoading && user) {
      // Identify the user in PostHog with their ID and properties
      identifyUser(user.id, {
        email: user.email,
        name: user.nickname,
        role: user.role,
        created_at: user.created_at,
        last_seen_at: new Date().toISOString(),
      });
    }
  }, [user, isUserLoading]);

  // Still render children even if PostHog fails to load
  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      <PostHogSessionController />
      {children}
    </PHProvider>
  );
}
