"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { GoalAnimation } from "./goal-animation";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

type GoalSuccessProps = {
  isOpen: boolean;
  goalText: string;
  onClose: () => void;
  className?: string;
};

export function GoalSuccess({
  isOpen,
  goalText,
  onClose,
  className,
}: GoalSuccessProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "flex max-w-sm flex-col items-center justify-center overflow-hidden rounded-xl border-primary/10 bg-gradient-to-b from-background to-background/95 shadow-xl sm:max-w-md",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {showConfetti &&
            Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={`confetti-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`}
                className="absolute h-3 w-3"
                initial={{
                  opacity: 1,
                  scale: Math.random() * 0.4 + 0.8,
                  top: "-10%",
                  left: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [1, 0.8, 0],
                  y: ["0%", `${Math.random() * 100 + 100}%`],
                  x: [
                    "0%",
                    `${(Math.random() - 0.5) * 50}%`,
                    `${(Math.random() - 0.5) * 100}%`,
                  ],
                  rotate: [0, Math.random() * 720],
                }}
                transition={{
                  duration: Math.random() * 2.5 + 1.5,
                  ease: "easeOut",
                  delay: Math.random() * 0.6,
                }}
                onAnimationComplete={() => {
                  if (i === 49) {
                    setShowConfetti(false);
                  }
                }}
              >
                <div
                  className="h-full w-full rounded-sm"
                  style={{
                    backgroundColor: [
                      "#FF5E5B",
                      "#D8D8D8",
                      "#FFED66",
                      "#00CECB",
                      "#FFAAEE",
                    ][Math.floor(Math.random() * 5)],
                  }}
                />
              </motion.div>
            ))}
        </div>

        <div className="relative z-10 w-full py-2">
          <DialogHeader className="flex flex-col items-center space-y-2 text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="relative mx-auto mb-2"
            >
              <GoalAnimation
                type="completion"
                size="md"
                className="mx-auto my-4"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.4 }}
            >
              <DialogTitle className="text-2xl font-bold text-primary">
                Goal Completed! 🎉
              </DialogTitle>
              <DialogDescription className="mt-2 text-base">
                Congratulations on your achievement!
              </DialogDescription>
            </motion.div>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, duration: 0.4 }}
            className="my-6 rounded-lg border border-primary/10 bg-primary/5 p-4 text-center shadow-inner"
          >
            <p className="text-lg font-medium">{goalText}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.4 }}
            className="mt-4 flex w-full justify-center"
          >
            <Button size="lg" className="min-w-32 px-8" onClick={onClose}>
              Continue
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
