"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { ProfileStore } from "~/hooks/use-profile";

function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsubHydrate = ProfileStore.persist.onHydrate(() =>
      setHydrated(false),
    );

    const unsubFinishHydration = ProfileStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );

    setHydrated(ProfileStore.persist.hasHydrated());

    return () => {
      unsubHydrate();
      unsubFinishHydration();
    };
  }, []);

  useEffect(() => {
    void ProfileStore.persist.rehydrate();
  }, []);

  return hydrated;
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const isHydrated = useHydration();

  if (!isHydrated) {
    return (
      <div className="fixed inset-x-0 top-0 mt-32 flex justify-center bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="flex flex-col items-center gap-y-3 text-xs font-medium text-primary/70">
            <motion.div
              className="h-8 w-8 rounded-full border-2 border-primary/70 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{
                duration: 1.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
