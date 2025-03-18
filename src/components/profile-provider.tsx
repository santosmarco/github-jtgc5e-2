"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { ProfileStore } from "~/hooks/use-profile";
import { identifyUser } from "~/lib/analytics";

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

  // Identify user with PostHog when profile is available
  useEffect(() => {
    // Only run once hydration is complete
    if (!isHydrated) return;

    // Get current profile from store
    const profile = ProfileStore.getState().profile;

    // If we have a profile, identify the user
    if (profile?.id) {
      // Extract relevant user properties
      const userProperties = {
        email: profile.email,
        name: profile.nickname,
        role: profile.role,
        created_at: profile.created_at,
        last_seen_at: new Date().toISOString(),
      };

      // Identify user in PostHog
      identifyUser(profile.id, userProperties);

      /*
      // If user has a team, we could also set group information
      if (profile.team_id) {
        // Fetch team info if needed and identify group
        void api.teams.getTeam
          .fetch({ id: profile.team_id })
          .then((team) => {
            if (team) {
              try {
                // Import is inside try-catch to prevent errors if posthog isn't loaded
                import("~/lib/analytics").then(({ identifyGroup }) => {
                  identifyGroup("team", team.id, {
                    name: team.name,
                    member_count: team.member_count || 1,
                    created_at: team.created_at,
                  });
                });
              } catch (error) {
                // Silently fail group identification
              }
            }
          })
          .catch(() => {
            // Silently fail team fetch
          });
      }
      */
    }
  }, [isHydrated]);

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
