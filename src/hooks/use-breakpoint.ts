import { useEffect, useState } from "react";

// Define standard Tailwind breakpoints
const breakpoints = {
  sm: 640, // Small devices
  md: 768, // Medium devices
  lg: 1024, // Large devices (default breakpoint for desktop view)
  xl: 1280, // Extra large devices
  "2xl": 1536, // 2X large devices
};

export type Breakpoint = keyof typeof breakpoints;

/**
 * A hook that detects if the current viewport meets or exceeds a specified breakpoint width
 *
 * @param breakpoint The breakpoint to check against (default: 'lg')
 * @returns boolean indicating if the viewport is at or above the specified breakpoint
 */
export function useBreakpoint(breakpoint: Breakpoint = "lg"): boolean {
  const [isAboveBreakpoint, setIsAboveBreakpoint] = useState(false);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(
      `(min-width: ${breakpoints[breakpoint]}px)`,
    );

    // Set initial value
    setIsAboveBreakpoint(mediaQuery.matches);

    // Create handler function
    const updateMatches = () => {
      setIsAboveBreakpoint(mediaQuery.matches);
    };

    // Add listener for changes
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateMatches);
      return () => mediaQuery.removeEventListener("change", updateMatches);
    }

    // Legacy support for older browsers
    mediaQuery.addListener(updateMatches);
    return () => mediaQuery.removeListener(updateMatches);
  }, [breakpoint]);

  return isAboveBreakpoint;
}
