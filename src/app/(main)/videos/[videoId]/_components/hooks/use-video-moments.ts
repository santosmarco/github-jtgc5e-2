import _ from "lodash";
import { useMemo, useState } from "react";

import type { VideoMoment } from "~/lib/schemas/video-moment";
import { handleMomentCategorySort } from "~/lib/videos";

export function useVideoMoments(moments: VideoMoment[]) {
  const [activeCategory, setActiveCategory] = useState<string | undefined>();

  // Derive categories from moments
  const categories = useMemo(() => {
    if (!moments || moments.length === 0) return [];

    const uniqueActivities = _.uniq(
      moments.map((moment) => moment.activity || "Uncategorized"),
    );

    // Sort categories using the existing utility
    uniqueActivities.sort(handleMomentCategorySort);

    return uniqueActivities.map((activity) => {
      const count = moments.filter(
        (m) => (m.activity || "Uncategorized") === activity,
      ).length;

      return {
        label: activity.replace(/_.*$/, ""),
        value: activity.replace(/_.*$/, ""),
        count,
        originalActivity: activity,
      };
    });
  }, [moments]);

  // Set default category if not set
  useMemo(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]?.value);
    }
  }, [categories, activeCategory]);

  // Filter moments by active category
  const filteredMoments = useMemo(() => {
    if (!activeCategory) return moments;

    const currentCategory = categories.find((c) => c.value === activeCategory);
    if (!currentCategory) return moments;

    return moments.filter(
      (moment) =>
        (moment.activity || "Uncategorized") ===
        currentCategory.originalActivity,
    );
  }, [moments, activeCategory, categories]);

  return {
    categories,
    activeCategory,
    setActiveCategory,
    filteredMoments,
  };
}
