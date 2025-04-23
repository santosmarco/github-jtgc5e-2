"use client";

import { motion } from "framer-motion";
import { CogIcon } from "lucide-react";

import { Settings } from "~/components/settings";
import { useFloatingChat } from "~/hooks/use-floating-chat";
import { useProfile } from "~/hooks/use-profile";
import { api } from "~/trpc/react";

export default function SettingsPage() {
  const { profile } = useProfile();
  const { data: user, isLoading: userLoading } = api.auth.getUser.useQuery(
    undefined,
    { refetchOnWindowFocus: false },
  );
  const { data: settings, isLoading: settingsLoading } =
    api.settings.retrieveForProfile.useQuery(
      { profileId: profile?.id },
      { enabled: !!profile?.id },
    );

  // Hide the floating chat on this page
  useFloatingChat(true);

  if (!profile || !user || !settings || settingsLoading || userLoading) {
    return (
      <div className="mt-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <CogIcon className="h-10 w-10 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </motion.div>
      </div>
    );
  }

  return <Settings user={user} settings={settings} />;
}
