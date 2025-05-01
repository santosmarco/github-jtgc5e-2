"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileText } from "lucide-react";
import { useState } from "react";

import { ProfileDevelopmentThemes } from "~/components/profile/profile-development-themes";
import { ProfileForm } from "~/components/profile/profile-form";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CopyButton } from "~/components/ui/copy-button";
import { MarkdownRenderer } from "~/components/ui/markdown-renderer";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useProfile } from "~/hooks/use-profile";
import { checkUserFlags, Flag } from "~/lib/flags/flags";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/shared";

type ProfilePageClientProps = {
  user: RouterOutputs["auth"]["getUser"];
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: "easeOut",
    },
  }),
};

const expandVariants = {
  collapsed: { height: "12rem", overflow: "hidden" },
  expanded: {
    height: "auto",
    transition: {
      duration: 0.4,
      ease: [0.04, 0.62, 0.23, 0.98],
      staggerChildren: 0.03,
      delayChildren: 0.1,
    },
  },
};

/**
 * Client-side profile page component that displays user profile information
 * and provides editing capabilities.
 */
export function ProfilePageClient({
  user,
}: ProfilePageClientProps): JSX.Element {
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<"overview" | "edit">("overview");
  const [aboutMeExpanded, setAboutMeExpanded] = useState<boolean>(false);

  const shouldShowThemeRegenerationButton = checkUserFlags(user, [
    Flag.ALLOW_PROFILE_DEVELOPMENT_THEMES_REGENERATION,
  ]);

  const { data: profileEnhancements, isLoading: isLoadingEnhancements } =
    api.profile.getProfileEnhancements.useQuery(
      { profileId: profile?.id ?? user.id },
      { enabled: Boolean(profile?.id ?? user.id) },
    );

  /**
   * Extracts initials from a name for avatar fallback
   */
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (!profile) {
    return (
      <div className="container mx-auto mt-10 max-w-4xl px-4">
        <div className="flex items-center justify-center py-12">
          <p className="text-lg text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-4xl space-y-8"
    >
      <motion.div variants={itemVariants} className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your profile information and view your AI-generated coaching
          themes.
        </p>
      </motion.div>

      <Separator />

      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-start md:space-x-6"
      >
        <div className="mb-6 flex flex-col items-center space-y-4 md:mb-0 md:w-52">
          <Avatar className="h-24 w-24">
            <AvatarImage
              src={profile.image_url || undefined}
              alt={profile.nickname || "User"}
            />
            <AvatarFallback className="text-xl">
              {profile.nickname ? getInitials(profile.nickname) : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h2 className="text-xl font-semibold">
              {profile.nickname || "User"}
            </h2>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <div className="flex-1">
          <Tabs
            defaultValue="overview"
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "overview" | "edit")
            }
            className="w-full"
          >
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="edit">Edit Profile</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    <motion.div variants={listItemVariants} custom={0}>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Email
                      </h3>
                      <p>{profile.email}</p>
                    </motion.div>

                    <motion.div variants={listItemVariants} custom={1}>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Name
                      </h3>
                      <p>{profile.nickname || "Not set"}</p>
                    </motion.div>

                    <motion.div variants={listItemVariants} custom={2}>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        About Me
                      </h3>
                      {isLoadingEnhancements ? (
                        <Skeleton className="h-20 w-full" />
                      ) : (
                        <div className="relative">
                          <AnimatePresence initial={false} mode="wait">
                            {profileEnhancements?.dossier ? (
                              <motion.div
                                key={aboutMeExpanded ? "expanded" : "collapsed"}
                                initial={false}
                                animate={
                                  aboutMeExpanded ? "expanded" : "collapsed"
                                }
                                variants={expandVariants}
                                className={cn(
                                  "mt-2 overflow-hidden rounded-lg border border-border bg-muted p-4 shadow-inner",
                                  aboutMeExpanded && "pb-10",
                                )}
                              >
                                <div className="relative">
                                  <div className="absolute -right-1 -top-1">
                                    <CopyButton
                                      content={profileEnhancements.dossier}
                                      copyMessage="Bio copied to clipboard!"
                                    />
                                  </div>
                                  <MarkdownRenderer className="text-accent-foreground">
                                    {profileEnhancements.dossier}
                                  </MarkdownRenderer>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="empty-state"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="mt-2 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted p-6 text-center shadow-inner"
                              >
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: 0.2, duration: 0.4 }}
                                  className="rounded-full bg-background/80 p-3"
                                >
                                  <FileText className="h-6 w-6 text-muted-foreground" />
                                </motion.div>
                                <motion.h4
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.3, duration: 0.3 }}
                                  className="mt-3 text-sm font-medium"
                                >
                                  No bio yet
                                </motion.h4>
                                <motion.p
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.4, duration: 0.3 }}
                                  className="mt-1.5 text-xs text-muted-foreground"
                                >
                                  Add an &quot;About Me&quot; section in the
                                  Edit Profile tab
                                </motion.p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          {profileEnhancements?.dossier &&
                            profileEnhancements.dossier.length > 200 && (
                              <motion.div
                                className={cn(
                                  "absolute left-0 right-0 flex justify-center",
                                  !aboutMeExpanded &&
                                    "bottom-0 top-[3.75rem] bg-gradient-to-t from-background to-transparent",
                                  aboutMeExpanded && "-bottom-1",
                                )}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "w-full text-xs hover:bg-transparent hover:text-muted-foreground",
                                    !aboutMeExpanded && "mt-[7.5rem]",
                                    aboutMeExpanded && "mb-2.5 mt-24",
                                  )}
                                  onClick={() =>
                                    setAboutMeExpanded((prev) => !prev)
                                  }
                                >
                                  <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    {aboutMeExpanded
                                      ? "Show less"
                                      : "Show more"}
                                  </motion.span>
                                </Button>
                              </motion.div>
                            )}
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Development Themes</CardTitle>
                  <CardDescription>
                    Key areas for growth and development based on interactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfileDevelopmentThemes
                    profileId={profile.id}
                    shouldShowThemeRegenerationButton={
                      shouldShowThemeRegenerationButton
                    }
                    hasDossier={!!profileEnhancements?.dossier}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="edit">
              <Card>
                <CardHeader>
                  <CardTitle>Edit Profile</CardTitle>
                  <CardDescription>
                    Update your profile information and &quot;About Me&quot;
                    description
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProfileForm
                    user={user}
                    profileEnhancements={profileEnhancements || null}
                    onUpdate={() => setActiveTab("overview")}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </motion.div>
  );
}
