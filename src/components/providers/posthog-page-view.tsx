"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

export default function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  // Track pageviews
  useEffect(() => {
    if (pathname && posthog) {
      try {
        let url = window.origin + pathname;
        if (searchParams?.toString()) {
          url = `${url}?${searchParams.toString()}`;
        }

        // Check if posthog is properly loaded before capturing
        if (posthog.capture && typeof posthog.capture === "function") {
          posthog.capture("$pageview", {
            $current_url: url,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        // Silently handle errors to prevent app from breaking
        console.log("Error capturing pageview:", error);
      }
    }
  }, [pathname, searchParams, posthog]);

  return null;
}
