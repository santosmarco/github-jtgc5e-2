"use client";

import { X } from "lucide-react";
import * as React from "react";
import { SiZoom } from "react-icons/si";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";

import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

// Animation variants for the container
const containerVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -100,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for smooth entry
      delay: 0.3, // Delay to let sidebar load
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.4,
      ease: "easeInOut",
    },
  },
};

// Animation variants for children elements
const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 15,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

// Special animation variant for the button
const buttonVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
  hover: {
    scale: 1.05,
    boxShadow: "0px 5px 15px rgba(0, 0, 0, 0.1)",
    transition: {
      duration: 0.2,
    },
  },
};

// Define separate variant types for custom animations
const zoomIconVariants = {
  hidden: {
    opacity: 0,
    scale: 0.7,
    rotate: -10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      delay: 0.2,
    },
  },
};

// Separate pulse animation to avoid type issues
const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 1.5,
    repeat: Number.POSITIVE_INFINITY,
    repeatType: "reverse" as const,
    ease: "easeInOut",
  },
};

// Banner pulse animation for attention
const bannerPulseAnimation = {
  boxShadow: [
    "0px 0px 0px rgba(124, 58, 237, 0)",
    "0px 0px 8px rgba(124, 58, 237, 0.3)",
    "0px 0px 0px rgba(124, 58, 237, 0)",
  ],
  transition: {
    duration: 2.5,
    repeat: Number.POSITIVE_INFINITY,
    repeatType: "reverse" as const,
    ease: "easeInOut",
    delay: 10, // Start pulsing after 10 seconds of inactivity
  },
};

// Close button animation
const closeButtonVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      delay: 0.5,
      duration: 0.3,
    },
  },
  hover: {
    rotate: 90,
    scale: 1.1,
    transition: { duration: 0.2 },
  },
  tap: {
    scale: 0.9,
  },
};

export function ZoomIntegrationBanner() {
  const [dismissed, setDismissed] = React.useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [userInteracted, setUserInteracted] = React.useState(false);
  const router = useRouter();
  const { data: user } = api.auth.getUser.useQuery();

  // Check if user has connected Zoom
  const hasConnectedZoom =
    user?.app_metadata?.integration_providers?.includes("zoom");

  // Check localStorage for banner dismissal on component mount
  React.useEffect(() => {
    const isDismissed = localStorage.getItem("zoomBannerDismissed") === "true";
    setDismissed(isDismissed || !!hasConnectedZoom);
  }, [hasConnectedZoom]);

  // Reset user interaction tracking when mouse moves over the banner
  const handleUserInteraction = () => {
    setUserInteracted(true);
  };

  const handleDismiss = () => {
    setShowConfirmDialog(true);
  };

  const confirmDismiss = () => {
    // Store the dismissal in localStorage
    localStorage.setItem("zoomBannerDismissed", "true");
    setDismissed(true);
    setShowConfirmDialog(false);
  };

  const handleGoToIntegrations = () => {
    router.push("/integrations");
  };

  return (
    <>
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            className="w-full overflow-hidden border-b border-border bg-card shadow-sm"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseOver={handleUserInteraction}
            onFocus={handleUserInteraction}
            onClick={handleUserInteraction}
            whileInView={!userInteracted ? bannerPulseAnimation : undefined}
          >
            <div className="mx-auto flex items-center justify-between gap-4 px-4 py-4">
              <div className="flex items-center gap-3">
                <motion.div
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"
                  variants={zoomIconVariants}
                  initial="hidden"
                  animate="visible"
                  whileInView={pulseAnimation}
                >
                  <SiZoom className="h-5 w-5 text-primary" />
                </motion.div>
                <div>
                  <motion.h3 className="font-medium" variants={itemVariants}>
                    Zoom Integration ✨ Upgraded
                  </motion.h3>
                  <motion.p
                    className="text-sm text-muted-foreground"
                    variants={itemVariants}
                  >
                    We've supercharged your meeting analytics with enhanced Zoom
                    processing — upgrade now
                  </motion.p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <motion.div variants={buttonVariants} whileHover="hover">
                  <Button onClick={handleGoToIntegrations} size="sm">
                    Upgrade Now
                  </Button>
                </motion.div>
                <motion.div
                  variants={closeButtonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismiss}
                    className="h-8 w-8 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enhanced Zoom Integration</DialogTitle>
            <DialogDescription>
              Our new Zoom integration provides advanced analytics and deeper
              insights for your meetings. Would you like to upgrade your
              experience?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="default"
              onClick={handleGoToIntegrations}
              className="w-full sm:w-auto"
            >
              Upgrade Zoom
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={confirmDismiss}
              className="w-full sm:w-auto"
            >
              I don't use Zoom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
