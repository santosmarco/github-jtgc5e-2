import { motion } from "framer-motion";
import * as React from "react";

import { Progress } from "~/components/ui/progress";

interface PastEventsLoaderProps {
  isLoading: boolean;
}

export function PastEventsLoader({ isLoading }: PastEventsLoaderProps) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }

    // Reset progress when loading starts
    setProgress(0);

    // Simulate progress
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        // Slow down progress as it gets higher
        const remaining = 100 - oldProgress;
        const increment = Math.max(0.5, remaining * 0.05);
        const newProgress = oldProgress + increment;

        // Cap at 90% until actually complete
        return Math.min(90, newProgress);
      });
    }, 200);

    return () => {
      clearInterval(timer);
    };
  }, [isLoading]);

  if (!isLoading && progress === 100) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      <Progress value={progress} className="h-0.5 rounded-none bg-primary/5" />
    </motion.div>
  );
}
