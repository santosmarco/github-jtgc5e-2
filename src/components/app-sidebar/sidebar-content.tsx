"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  CogIcon,
  GoalIcon,
  LogOut,
  MessageSquare,
  Puzzle,
  Target,
  TrendingUpIcon,
  User,
  User2Icon,
  UsersIcon,
  Video,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LiveMeetingStatus } from "~/components/meetings/live-meeting-status";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { FeedbackDialog } from "~/components/ui/feedback-dialog";
import { useProfile } from "~/hooks/use-profile";
import { createClient } from "~/lib/supabase/client";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

import { CoachBadge } from "../coach-badge";
import { TaskList } from "../onboarding-task-list";

export type SidebarContentProps = {
  user: RouterOutputs["auth"]["getUser"];
  onNavClick?: () => void;
};

export function SidebarContent({ user, onNavClick }: SidebarContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([]);
  const [didSetProfiles, setDidSetProfiles] = useState(false);
  const { profile: selectedProfile, setProfile: setSelectedProfile } =
    useProfile();
  const [authSectionIsHovered, setAuthSectionIsHovered] = useState(false);
  const [showZoomPromo, setShowZoomPromo] = useState(true);
  const { data: tasks } = api.onboarding.getTaskList.useQuery({
    profileId: selectedProfile?.id ?? user.id,
  });

  const { data: events, isLoading: isLoadingEvents } =
    api.calendar.getLiveEvents.useQuery(
      {
        profileId: selectedProfile?.id ?? user.id,
      },
      {
        refetchInterval: 60000, // Refetch every minute
      },
    );

  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    if (didSetProfiles) return;

    async function fetchProfiles() {
      let query = supabase.from("profiles").select("*").order("nickname");
      if (!user.is_admin) {
        query = query.or(`id.eq.${user.id},coach_id.eq.${user.id}`);
      }
      const { data: allProfiles } = await query;
      setProfiles(allProfiles ?? []);
      setDidSetProfiles(true);
    }

    void fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [didSetProfiles]);

  const hasConnectedZoom =
    user.app_metadata.integration_providers?.includes("zoom");

  useEffect(() => {
    if (!didSetProfiles || selectedProfile) return;

    const profile = profiles.find((p) => p.id === user.id);
    if (profile) {
      setSelectedProfile(profile);
    }
  }, [profiles, didSetProfiles, selectedProfile, setSelectedProfile, user.id]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
    }

    localStorage.removeItem("profile");
    router.push("/login");
  };

  const handleProfileChange = async (profile: Tables<"profiles">) => {
    setSelectedProfile(profile);
  };

  const menuItems = [
    {
      href: "/goals",
      icon: <GoalIcon className="h-5 w-5" />,
      label: "Goals",
      isActive: pathname.startsWith("/goals"),
    },
    {
      href: "/insights",
      icon: <Brain className="h-5 w-5" />,
      label: "Explore",
      isActive: pathname.startsWith("/insights"),
    },
    {
      href: "/",
      icon: <Video className="h-5 w-5" />,
      label: "Meetings",
      isActive: pathname === "/" || pathname.startsWith("/videos"),
    },
    {
      href: "/moments",
      icon: <TrendingUpIcon />,
      label: "Moments",
      isActive: pathname.startsWith("/moments"),
    },
    // Add Integrations to main menu with subtle indicator
    !hasConnectedZoom && {
      href: "/integrations",
      icon: (
        <div className="relative">
          <Puzzle className="h-5 w-5" />
          {showZoomPromo && !hasConnectedZoom && (
            <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
      ),
      label: "Integrations",
      isActive: pathname.startsWith("/integrations"),
    },
  ].filter((x): x is Exclude<typeof x, false | undefined> => !!x);

  return (
    <>
      <LiveMeetingStatus
        user={user}
        events={events ?? []}
        isLoading={isLoadingEvents}
        canJoinMeeting={user.id === selectedProfile?.id}
        shouldShowOnMobile={!tasks || tasks.every((task) => task.completed)}
      />

      {/* Navigation */}
      <nav
        className={cn(
          "mt-4 flex-1 space-y-2",
          tasks?.some((task) => !task.completed) && "mt-20 lg:mt-4",
        )}
      >
        <AnimatePresence>
          {menuItems.map((item, index) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={item.href}
                onClick={() => {
                  onNavClick?.();
                  if (item.href === "/integrations") {
                    setShowZoomPromo(false);
                  }
                }}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "group relative flex items-center gap-6 rounded-sm px-8 py-4 text-muted-foreground transition-all hover:bg-primary/10",
                    item.isActive
                      ? "text-primary before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-1.5 before:rounded-r before:bg-primary"
                      : "hover:text-foreground",
                  )}
                >
                  <span>{item.icon}</span>
                  <motion.span
                    initial={{ x: -5, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="text-sm"
                  >
                    {item.label}
                  </motion.span>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </nav>

      {(selectedProfile ?? user).did_complete_post_ten_meeting_onboarding &&
        (!tasks || tasks.some((task) => !task.completed)) && (
          <TaskList tasks={tasks} />
        )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="my-4 w-full px-4"
      >
        <CoachBadge userId={selectedProfile?.id ?? user.id} />
      </motion.div>

      {/* Footer with Auth */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-auto border-t border-border"
      >
        {user && (
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  onHoverStart={() => setAuthSectionIsHovered(true)}
                  onHoverEnd={() => setAuthSectionIsHovered(false)}
                >
                  <Button
                    variant="ghost"
                    className="group relative h-16 w-full justify-start overflow-hidden rounded-none px-4 transition-all hover:bg-none"
                  >
                    {/* Animated background gradient */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10"
                      initial={{ x: "-100%" }}
                      animate={{ x: authSectionIsHovered ? "0%" : "-100%" }}
                      transition={{ duration: 0.3 }}
                    />

                    <div className="relative z-10 flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-border/50 transition-colors group-hover:border-primary/50">
                          <AvatarImage
                            src={
                              !selectedProfile || selectedProfile.id === user.id
                                ? (user.user_metadata.avatar_url as
                                    | string
                                    | undefined)
                                : undefined
                            }
                          />
                          <AvatarFallback className="bg-primary/5">
                            {(selectedProfile?.email ?? user.email)
                              ?.slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <motion.div
                          className="absolute -inset-1 rounded-full bg-primary/10"
                          initial={{ scale: 0, opacity: 0 }}
                          whileHover={{ scale: 1.2, opacity: 0.5 }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>

                      <div className="flex flex-col items-start text-left">
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm font-medium text-foreground"
                        >
                          {selectedProfile?.nickname ??
                            (typeof user.user_metadata.full_name === "string"
                              ? user.user_metadata.full_name
                              : user.email)}
                        </motion.span>
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className="text-xs text-muted-foreground"
                        >
                          {selectedProfile?.email ?? user.email}
                        </motion.span>
                      </div>
                    </div>
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={-64}
                alignOffset={-256}
                className="mb-4 ml-4 w-56"
              >
                {profiles.length > 1 && (
                  <>
                    <DropdownMenuLabel className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                      <div className="flex h-4 w-4 items-center justify-center">
                        <User className="h-3 w-3" />
                      </div>
                      {user.is_admin ? "Admin" : "Coach"} • Switch Profile
                    </DropdownMenuLabel>
                    <div className="max-h-[400px] overflow-y-auto">
                      {profiles.map((profile) => (
                        <DropdownMenuItem
                          key={profile.id}
                          onClick={() => handleProfileChange(profile)}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <div className="flex h-4 w-4 items-center justify-center">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                selectedProfile?.id === profile.id
                                  ? "bg-primary"
                                  : "bg-muted",
                              )}
                            />
                          </div>
                          <span className="flex items-baseline gap-x-2">
                            {profile.nickname}
                            {profile.id === user.id && (
                              <span className="text-xs text-muted-foreground">
                                (You)
                              </span>
                            )}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <Link
                  href="/integrations"
                  onClick={() => {
                    onNavClick?.();
                    setShowZoomPromo(false);
                  }}
                >
                  <DropdownMenuItem className="cursor-pointer gap-2">
                    <Puzzle className="h-4 w-4" />
                    Integrations
                    {showZoomPromo && !hasConnectedZoom && (
                      <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </DropdownMenuItem>
                </Link>

                {(selectedProfile?.role === "coach" ||
                  selectedProfile?.is_admin) && (
                  <Link href="/clients" onClick={onNavClick}>
                    <DropdownMenuItem className="cursor-pointer gap-2">
                      <UsersIcon className="h-4 w-4" />
                      Clients
                    </DropdownMenuItem>
                  </Link>
                )}
                {(user.role === "user" ||
                  (user.is_admin && selectedProfile?.role !== "coach")) && (
                  <Link href="/settings" onClick={onNavClick}>
                    <DropdownMenuItem className="cursor-pointer gap-2">
                      <CogIcon className="h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                  </Link>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setFeedbackOpen(true)}
                  className="cursor-pointer gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Submit feedback
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer gap-2 text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </motion.div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
