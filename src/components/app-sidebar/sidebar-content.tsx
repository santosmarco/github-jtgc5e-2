"use client";

import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Calendar,
  CogIcon,
  GoalIcon,
  ListTodo,
  LogOut,
  MessageSquare,
  Play,
  Puzzle,
  TextQuote,
  TrendingUpIcon,
  User,
  Users,
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
import { checkUserFlags, Flag } from "~/lib/flags/flags";
import { createClient } from "~/lib/supabase/client";
import type { Tables } from "~/lib/supabase/database.types";
import { cn, isTruthy } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

import { CoachBadge } from "../coach-badge";
import type { MenuItem } from "./menu-types";
import { SidebarGroup } from "./sidebar-group";

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
  const { data: sessions } = api.sessions.getAllSessionsForUser.useQuery({
    profileId: selectedProfile?.id ?? user.id,
  });

  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const hasSessionInTheNext48Hours = sessions?.some(
    (session) =>
      dayjs(session.date).isAfter(dayjs()) &&
      dayjs(session.date).isBefore(dayjs().add(2, "days")),
  );

  useEffect(() => {
    if (didSetProfiles) return;

    async function fetchProfiles() {
      let query = supabase.from("profiles").select("*").order("nickname");
      if (!checkUserFlags(user, [Flag.ALLOW_LIST_ALL_USERS])) {
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

  const handleItemClick =
    (href: string, isIntegrations?: boolean) => (e: React.MouseEvent) => {
      // Prevent navigation if we're already on the page
      if (
        pathname === href ||
        (href === "/" && pathname.startsWith("/videos"))
      ) {
        e.preventDefault();
        return;
      }

      // Only call onNavClick after we've decided not to prevent navigation
      onNavClick?.();
      if (isIntegrations) {
        setShowZoomPromo(false);
      }
    };

  const menuItems = (
    [
      hasSessionInTheNext48Hours
        ? {
            type: "item" as const,
            href: "/sessions",
            icon: (
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "loop",
                }}
                className="relative"
              >
                <Users className="h-5 w-5 text-primary" />
                <motion.div
                  className="absolute -inset-1 rounded-full bg-primary/10"
                  animate={{
                    opacity: [0.1, 0.3, 0.1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "loop",
                  }}
                />
              </motion.div>
            ),
            label: (
              <motion.span
                className="font-medium text-primary"
                animate={{
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: "loop",
                }}
              >
                Upcoming Session
              </motion.span>
            ),
            isActive: pathname.startsWith("/sessions"),
          }
        : null,
      {
        type: "group",
        label: "Growth",
        icon: <TrendingUpIcon className="h-5 w-5" />,
        isActive:
          pathname.startsWith("/goals") ||
          pathname.startsWith("/insights") ||
          (!hasSessionInTheNext48Hours && pathname.startsWith("/sessions")),
        defaultHref: "/goals",
        children: [
          {
            type: "item" as const,
            href: "/goals",
            icon: <GoalIcon className="h-5 w-5" />,
            label: "Skills",
            isActive: pathname.startsWith("/goals"),
          },
          {
            type: "item" as const,
            href: "/insights",
            icon: <Brain className="h-5 w-5" />,
            label: "Explore",
            isActive: pathname.startsWith("/insights"),
          },
          !hasSessionInTheNext48Hours
            ? {
                type: "item" as const,
                href: "/sessions",
                icon: <Users className="h-5 w-5" />,
                label: "Sessions",
                isActive: pathname.startsWith("/sessions"),
              }
            : null,
        ].filter(isTruthy),
      },
      {
        type: "group",
        label: "Meetings",
        icon: <Video className="h-5 w-5" />,
        isActive:
          pathname === "/" ||
          pathname.startsWith("/videos") ||
          pathname.startsWith("/calendar") ||
          pathname.startsWith("/moments"),
        defaultHref: "/",
        children: [
          {
            type: "item",
            href: "/",
            icon: <Play className="h-5 w-5" />,
            label: "Recordings",
            isActive: pathname === "/" || pathname.startsWith("/videos"),
          },
          {
            type: "item",
            href: "/calendar",
            icon: <Calendar className="h-5 w-5" />,
            label: "Calendar",
            isActive: pathname.startsWith("/calendar"),
          },
          {
            type: "item",
            href: "/moments",
            icon: <TextQuote className="h-5 w-5" />,
            label: "Moments",
            isActive: pathname.startsWith("/moments"),
          },
        ],
      },
      {
        type: "group",
        label: "Teams",
        icon: <UsersIcon className="h-5 w-5" />,
        isActive: pathname.startsWith("/action-items"),
        defaultHref: "/action-items",
        children: [
          {
            type: "item",
            href: "/action-items",
            icon: <ListTodo className="h-5 w-5" />,
            label: "Action Items",
            isActive: pathname.startsWith("/action-items"),
          },
        ],
      },
      // Standalone items
      !hasConnectedZoom
        ? {
            type: "item",
            href: "/integrations",
            icon: (
              <div className="relative">
                <Puzzle className="h-5 w-5" />
                {showZoomPromo && !hasConnectedZoom && (
                  <motion.div
                    className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary"
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatType: "loop",
                    }}
                  />
                )}
              </div>
            ),
            label: "Integrations",
            isActive: pathname.startsWith("/integrations"),
          }
        : null,
      {
        type: "item",
        href: "/settings",
        icon: <CogIcon className="h-5 w-5" />,
        label: "Settings",
        isActive: pathname.startsWith("/settings"),
      },
    ] as const satisfies (MenuItem | null)[]
  ).filter(isTruthy);

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
              key={item.type === "item" ? item.href : item.label}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {item.type === "item" ? (
                <Link
                  href={item.href}
                  onClick={handleItemClick(
                    item.href,
                    item.href === "/integrations",
                  )}
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
              ) : (
                <SidebarGroup
                  group={item}
                  onNavClick={onNavClick}
                  pathname={pathname}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </nav>

      {/*
      {(selectedProfile ?? user).did_complete_post_ten_meeting_onboarding &&
        (!tasks || tasks.some((task) => !task.completed)) && (
          <TaskList tasks={tasks} />
        )}
      */}

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
                      className="absolute inset-0 bg-primary/5"
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
                      {checkUserFlags(user, [Flag.ALLOW_LIST_ALL_USERS])
                        ? "Admin"
                        : "Coach"}{" "}
                      • Switch Profile
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
                  onClick={handleItemClick("/integrations")}
                >
                  <DropdownMenuItem className="cursor-pointer gap-2">
                    <Puzzle className="h-4 w-4" />
                    Integrations
                    {showZoomPromo && !hasConnectedZoom && (
                      <motion.span
                        className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary"
                        animate={{
                          opacity: [0.7, 1, 0.7],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                          repeatType: "loop",
                        }}
                      />
                    )}
                  </DropdownMenuItem>
                </Link>

                {checkUserFlags(user, [Flag.ALLOW_CLIENT_ACCESS]) && (
                  <Link href="/clients" onClick={onNavClick}>
                    <DropdownMenuItem className="cursor-pointer gap-2">
                      <UsersIcon className="h-4 w-4" />
                      Clients
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
