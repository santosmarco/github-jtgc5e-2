"use client";

import { motion } from "framer-motion";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

export type SettingsProps = {
  user: RouterOutputs["auth"]["getUser"];
  settings: RouterOutputs["settings"]["retrieveForProfile"];
};

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export function Settings({ user, settings: initialSettings }: SettingsProps) {
  const utils = api.useUtils();
  const updateSettingMutation = api.settings.updateSetting.useMutation();
  const isCoach = user.role === "coach";
  const [botName, setBotName] = useState(initialSettings.bot_name ?? "");
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const updateSetting = useCallback(
    async (
      key: Parameters<typeof updateSettingMutation.mutateAsync>[0]["key"],
      value: Parameters<typeof updateSettingMutation.mutateAsync>[0]["value"],
    ) => {
      // we are enabling coaches to change client settings for now @marco
      if (/* isCoach || */ initialSettings[key] === value) return;

      // Optimistically update the UI
      utils.settings.retrieveForProfile.setData(
        { profileId: initialSettings.profile_id },
        (old) => (old ? { ...old, [key]: value } : old),
      );

      // Update in database
      try {
        await updateSettingMutation.mutateAsync({
          profileId: initialSettings.profile_id,
          key,
          value,
        });

        // Invalidate to ensure consistency
        await utils.settings.retrieveForProfile.invalidate({
          profileId: initialSettings.profile_id,
        });

        toast.success("Saved");
      } catch (error) {
        // Revert optimistic update on error
        utils.settings.retrieveForProfile.setData(
          { profileId: initialSettings.profile_id },
          initialSettings,
        );
        toast.error("Failed to save setting");
      }
    },
    [
      // isCoach,
      utils.settings.retrieveForProfile,
      initialSettings,
      updateSettingMutation,
    ],
  );

  const debouncedUpdateBotName = useCallback(
    (value: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        void (async () => {
          if (value !== initialSettings.bot_name) {
            await updateSetting("bot_name", value);
          }
        })();
      }, 500);
    },
    [initialSettings.bot_name, updateSetting],
  );

  const handleBotNameBlur = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (botName !== initialSettings.bot_name) {
      await updateSetting("bot_name", botName);
    }
  }, [botName, initialSettings.bot_name, updateSetting]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const settings =
    utils.settings.retrieveForProfile.getData({
      profileId: initialSettings.profile_id,
    }) ?? initialSettings;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="text-foreground"
    >
      <motion.div variants={fadeIn} className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">
            Meeting Preferences
          </h1>
        </div>

        <motion.div
          variants={fadeIn}
          className="rounded-xl border border-border bg-card shadow-sm"
        >
          <div className="space-y-6 divide-y divide-border">
            <div className="p-6 md:p-8">
              <div className="flex flex-col space-y-2">
                <h2 className="text-lg font-medium text-foreground">
                  Notetaker Preferences
                </h2>

                <p className="text-sm text-muted-foreground">
                  Customize how your notetaker appears and behaves in meetings.
                </p>
              </div>

              <div className="space-y-4 pt-6">
                <div className="flex flex-col space-y-3">
                  <label htmlFor="bot-name" className="text-sm font-medium">
                    Notetaker name
                  </label>
                  <Input
                    id="bot-name"
                    placeholder="Enter your bot's name"
                    value={botName}
                    onChange={(e) => {
                      setBotName(e.target.value);
                      debouncedUpdateBotName(e.target.value);
                    }}
                    onBlur={handleBotNameBlur}
                    // disabled={isCoach}
                    className="max-w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is how your notetaker will appear in meetings
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-foreground">
                  Joining Preferences
                </h2>

                <p className="text-sm text-muted-foreground">
                  Choose which meetings on your calendar you&apos;d like Titan
                  to automatically join.
                </p>
              </div>

              <div className="space-y-4 pt-6">
                <h3 className="text-base font-medium text-foreground">
                  Include these meetings
                </h3>

                <div className="space-y-3">
                  <ToggleSetting
                    value={settings.should_join_team_meetings}
                    onChange={(value) =>
                      updateSetting("should_join_team_meetings", value)
                    }
                    title="Team meetings"
                    description={
                      <p>
                        Meetings where everyone invited has{" "}
                        {settings.profile?.email ? (
                          <>
                            an{" "}
                            <span className="rounded-sm bg-accent px-1 py-0.5 text-foreground/80 transition-all group-hover:bg-accent-foreground/10 group-hover:text-foreground">
                              {settings.profile?.email?.split("@")?.[1]}
                            </span>{" "}
                            email address
                          </>
                        ) : (
                          "a company email"
                        )}
                      </p>
                    }
                    // disabled={isCoach}
                  />

                  <ToggleSetting
                    value={settings.should_join_external_meetings}
                    onChange={(value) =>
                      updateSetting("should_join_external_meetings", value)
                    }
                    title="External meetings"
                    description={
                      <>
                        Meetings where some people invited don&apos;t have{" "}
                        {settings.profile?.email ? (
                          <>
                            an{" "}
                            <span className="rounded-sm bg-accent px-1 py-0.5 text-foreground/80 transition-all group-hover:bg-accent-foreground/10 group-hover:text-foreground">
                              {settings.profile?.email?.split("@")?.[1]}
                            </span>{" "}
                            email address
                          </>
                        ) : (
                          "a company email"
                        )}
                      </>
                    }
                    // disabled={isCoach}
                  />

                  <ToggleSetting
                    value={!settings.should_not_join_pending_meetings}
                    onChange={(value) =>
                      updateSetting("should_not_join_pending_meetings", !value)
                    }
                    title="Pending meetings"
                    description="Meetings you haven't yet accepted or declined"
                    // disabled={isCoach}
                  />

                  <ToggleSetting
                    value={!settings.should_not_join_owned_by_others_meetings}
                    onChange={(value) =>
                      updateSetting(
                        "should_not_join_owned_by_others_meetings",
                        !value,
                      )
                    }
                    title="Meetings organized by others"
                    description="Meetings where you are an invitee, not the organizer"
                    // disabled={isCoach}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

type ToggleSettingProps = {
  title: React.ReactNode;
  description: React.ReactNode;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

function ToggleSetting({
  title,
  description,
  value,
  onChange,
  disabled,
}: ToggleSettingProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            variants={fadeIn}
            className={cn(
              "group flex cursor-pointer items-center justify-between rounded-lg bg-secondary/40 p-4 transition-all hover:bg-secondary/60",
              disabled && "pointer-events-none opacity-50",
            )}
            onClick={() => !disabled && onChange(!value)}
          >
            <div>
              <p className="text-sm font-medium text-foreground transition-colors group-hover:text-foreground">
                {title}
              </p>
              <p className="text-xs text-muted-foreground transition-colors group-hover:text-muted-foreground">
                {description}
              </p>
            </div>
            <Switch
              checked={value}
              onCheckedChange={onChange}
              disabled={disabled}
              className={cn(
                "transition-all",
                value
                  ? "bg-primary"
                  : "group-hover:bg-secondary-foreground data-[state=unchecked]:bg-foreground/30",
                disabled && "cursor-not-allowed opacity-50",
              )}
            />
          </motion.div>
        </TooltipTrigger>
        {disabled && (
          <TooltipContent>
            <p>You do not have permission to change a client&apos;s settings</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
