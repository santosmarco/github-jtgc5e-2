"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

type CoachingSessionDialogProps = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CoachingSessionDialog({
  isOpen,
  onConfirm,
  onCancel,
}: CoachingSessionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Disable Coaching Sessions?
          </DialogTitle>
          <DialogDescription className="pt-2 text-base text-muted-foreground">
            This will prevent Titan from automatically joining your coaching
            sessions, which will impact core features like automatic meeting
            notes and summaries.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20"
          >
            <h3 className="mb-2 font-medium text-amber-800 dark:text-amber-400">
              Crucial Features That Will Be Affected:
            </h3>
            <ul className="ml-5 list-disc space-y-1 text-sm text-amber-700 dark:text-amber-300">
              <motion.li
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                Automated session summaries
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                Recording and transcription services
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                Progress tracking between sessions
              </motion.li>
            </ul>
          </motion.div>
        </div>

        <DialogFooter className="flex items-center justify-end space-x-2 pt-4 sm:justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-muted-foreground/20"
          >
            Keep Enabled
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive/90 hover:bg-destructive"
          >
            {isLoading ? "Updating..." : "Disable Anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
