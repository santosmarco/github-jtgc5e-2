"use client";

import { useEffect, useState } from "react";

/**
 * A hook that observes size changes of a DOM element using ResizeObserver
 * @param elementRef React ref object for the element to observe
 * @returns Current width and height of the observed element
 */
export function useResizeObserver<T extends HTMLElement>(
  elementRef: React.RefObject<T>,
) {
  const [dimensions, setDimensions] = useState<{
    width: number | undefined;
    height: number | undefined;
  }>({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    if (!elementRef.current) return;

    const element = elementRef.current;

    // Create observer instance
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;

      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    // Start observing
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [elementRef]);

  return dimensions;
}
