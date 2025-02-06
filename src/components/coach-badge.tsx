"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  MessagesSquareIcon,
  TrophyIcon,
  UserCheck,
  UserPlus,
  UserPlus2Icon,
  Users2Icon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { Link } from "./ui/link";

type CoachBadgeProps = {
  userId: string;
  className?: string;
};

export function CoachBadge({ userId, className }: CoachBadgeProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const { data: coach, isLoading } = api.auth.getCoach.useQuery(
    { userId },
    {
      retry: false,
    },
  );

  if (isLoading) {
    return (
      <Card
        className={cn(
          "h-9 overflow-hidden border-none shadow-lg transition-shadow",
          className,
        )}
      >
        <div className="flex h-full items-center gap-2 px-4">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
          >
            <Skeleton className="h-4 w-4 rounded-full" />
          </motion.div>

          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              delay: 0.2,
            }}
          >
            <Skeleton className="h-4 w-48" />
          </motion.div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "group relative w-full items-center justify-between gap-x-2 rounded-md transition-all",
          !coach &&
            "gap-x-0 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5",
          coach && "pointer-events-none cursor-default",
        )}
        onClick={coach ? undefined : () => setIsInviteDialogOpen(true)}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {coach ? (
            <UserCheck className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <UserPlus2Icon className="h-4 w-4 shrink-0 text-primary" />
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "flex-1 text-left text-sm leading-none",
            !coach && "text-center font-medium text-primary",
          )}
        >
          {coach?.nickname ?? "Get a Coach"}
        </motion.div>

        {coach && (
          <span className="absolute -top-[0.4375rem] right-3 z-20 text-xs leading-none text-muted-foreground">
            Your coach
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isInviteDialogOpen && (
          <Dialog
            open={isInviteDialogOpen}
            onOpenChange={setIsInviteDialogOpen}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-center text-xl font-semibold text-transparent">
                  Unlock Your Leadership Potential
                </DialogTitle>
              </DialogHeader>
              <motion.div
                className="space-y-6 p-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, staggerChildren: 0.1 }}
              >
                <motion.p className="text-center text-sm leading-relaxed">
                  Ready to take your leadership skills to the next level? A
                  professional coach can be your secret weapon in navigating the
                  complexities of modern leadership.
                </motion.p>

                <motion.ul className="space-y-3 pl-2 text-sm text-muted-foreground">
                  <motion.li className="flex items-start">
                    <TrophyIcon className="mr-3 h-5 w-5 text-primary" />
                    <span>Enhance your leadership presence and impact</span>
                  </motion.li>
                  <motion.li className="flex items-start">
                    <Users2Icon className="mr-3 h-5 w-5 text-primary" />
                    <span>Develop strategies for effective team dynamics</span>
                  </motion.li>
                  <motion.li className="flex items-start">
                    <MessagesSquareIcon className="mr-3 h-5 w-5 text-primary" />
                    <span>Master executive communication skills</span>
                  </motion.li>
                </motion.ul>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center text-sm font-medium"
                >
                  Titan&apos;s expert matching process ensures you find the
                  perfect coach for your unique needs and goals.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mx-auto w-full max-w-sm"
                >
                  <Button
                    className="w-full bg-gradient-to-r from-primary to-primary/90 transition-all duration-300 hover:from-primary/90 hover:to-primary"
                    onClick={() => {
                      window.location.href = "mailto:dave@withtitan.com";
                      setIsInviteDialogOpen(false);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      Start Your Coaching Journey
                      <UserPlus className="h-4 w-4" />
                    </span>
                  </Button>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex w-full items-center justify-center gap-x-1.5 text-center text-sm leading-relaxed"
                >
                  <span className="text-muted-foreground">
                    Already have a coach?
                  </span>
                  <Link href="/settings/invite">Invite them instead</Link>
                </motion.p>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
