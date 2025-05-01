import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircleIcon,
  FileTextIcon,
  Loader2Icon,
  RefreshCcwIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { ProfileDevelopmentTheme } from "./profile-development-theme";

export interface ProfileDevelopmentThemesProps {
  profileId: string | null;
  shouldShowThemeRegenerationButton: boolean;
  hasDossier: boolean;
}

// Loading state phrases for theme generation
const generatingPhrases = [
  "Analyzing your profile...",
  "Identifying key strengths...",
  "Discovering growth areas...",
  "Mapping career patterns...",
  "Evaluating leadership potential...",
  "Assessing communication style...",
  "Examining decision-making approach...",
  "Recognizing unique capabilities...",
  "Uncovering hidden talents...",
  "Synthesizing professional insights...",
  "Crafting development themes...",
  "Refining growth opportunities...",
  "Prioritizing development areas...",
  "Polishing recommendations...",
  "Finalizing insights...",
  "Almost there...",
];

export function ProfileDevelopmentThemes({
  profileId,
  shouldShowThemeRegenerationButton,
  hasDossier = false,
}: ProfileDevelopmentThemesProps) {
  const [progressValue, setProgressValue] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const progressAnimationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const {
    data: themes,
    isLoading,
    refetch: refetchThemes,
  } = api.profile.getProfileDevelopmentThemes.useQuery(
    { profileId: profileId ?? "" },
    { enabled: Boolean(profileId) },
  );

  const { mutate: generateProfileDevelopmentThemes, isPending: isGenerating } =
    api.profile.generateDevelopmentThemes.useMutation({
      onSuccess: () => {
        setProgressValue(100);
        void refetchThemes();
        toast.success("Development themes generated successfully");
      },
      onError: (error) => {
        setProgressValue(0);
        toast.error("Failed to generate development themes", {
          description: error.message,
        });
      },
    });

  const handleGenerateThemes = () => {
    if (!hasDossier) {
      toast.error("Cannot generate themes", {
        description:
          "Please add profile information first to generate development themes.",
      });
      return;
    }

    generateProfileDevelopmentThemes({ profileId: profileId ?? "" });
  };

  // Rotate through phrases during generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setPhraseIndex((prev) =>
          prev >= generatingPhrases.length - 1 ? 0 : prev + 1,
        );
      }, 3000); // Increased from 2000ms to 3000ms to make each phrase display longer
    }
    return () => {
      if (interval) clearInterval(interval);
      setPhraseIndex(0);
    };
  }, [isGenerating]);

  // Smooth progress animation using requestAnimationFrame
  useEffect(() => {
    const animateProgress = (timestamp: number) => {
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
      }

      const elapsed = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      setProgressValue((prevProgress) => {
        // Calculate the next progress value with non-linear easing
        // The closer to 90%, the slower it gets
        let increment = 0;

        if (prevProgress < 20) {
          increment = 0.02 * elapsed; // Slower initial progress
        } else if (prevProgress < 40) {
          increment = 0.015 * elapsed;
        } else if (prevProgress < 60) {
          increment = 0.008 * elapsed;
        } else if (prevProgress < 75) {
          increment = 0.004 * elapsed;
        } else if (prevProgress < 85) {
          increment = 0.002 * elapsed;
        } else {
          increment = 0.001 * elapsed; // Even slower near the end
        }

        const nextProgress = prevProgress + increment;

        // Cap at 90% until completion
        return nextProgress >= 90 ? 90 : nextProgress;
      });

      if (isGenerating) {
        progressAnimationRef.current = requestAnimationFrame(animateProgress);
      }
    };

    if (isGenerating) {
      setProgressValue(2); // Start at an even smaller value
      progressAnimationRef.current = requestAnimationFrame(animateProgress);
    } else {
      // Reset when not generating
      lastTimestampRef.current = null;
    }

    return () => {
      if (progressAnimationRef.current) {
        cancelAnimationFrame(progressAnimationRef.current);
        progressAnimationRef.current = null;
      }

      if (!isGenerating) {
        setProgressValue(0);
      }
    };
  }, [isGenerating]);

  return (
    <div className="space-y-4">
      {themes && themes.length > 0 && shouldShowThemeRegenerationButton && (
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleGenerateThemes}
            disabled={isLoading || isGenerating || !hasDossier}
            title={
              !hasDossier
                ? "Add profile information first"
                : "Regenerate themes"
            }
          >
            <RefreshCcwIcon className="h-3.5 w-3.5" />
            Regenerate
          </Button>
        </div>
      )}

      {isGenerating && (!themes || themes.length === 0) && (
        <div className="space-y-2">
          <Progress value={progressValue} className="h-2 w-full" />
          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
            <AnimatePresence mode="wait">
              <motion.p
                key={phraseIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                {generatingPhrases[phraseIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      )}

      <div className="relative">
        {isGenerating && themes && themes.length > 0 && (
          <div className="absolute inset-0 z-10 rounded-lg bg-background/70 backdrop-blur-sm">
            <div className="space-y-2 text-center">
              <Progress value={progressValue} className="h-2 w-full" />
              <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                <AnimatePresence mode="wait">
                  <motion.p
                    key={phraseIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="text-center"
                  >
                    {generatingPhrases[phraseIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[120px] w-full rounded-lg" />
            <Skeleton className="h-[120px] w-full rounded-lg" />
          </div>
        ) : themes && themes.length > 0 ? (
          <div className={cn("space-y-3", isGenerating && "opacity-80")}>
            {themes.map((theme) => (
              <ProfileDevelopmentTheme
                key={theme.id}
                developmentTheme={theme}
              />
            ))}
          </div>
        ) : (
          <motion.div
            className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed border-muted-foreground/30 p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className={cn(
                "rounded-full p-3",
                hasDossier ? "bg-primary/10" : "bg-amber-500/10",
              )}
            >
              {hasDossier ? (
                <FileTextIcon className="h-6 w-6 text-primary" />
              ) : (
                <AlertCircleIcon className="h-6 w-6 text-amber-500" />
              )}
            </motion.div>
            <motion.h3
              className="text-lg font-medium leading-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              {hasDossier
                ? "No development themes yet"
                : "Profile information needed"}
            </motion.h3>
            <motion.p
              className="max-w-sm text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              {hasDossier
                ? "Generate personalized development themes based on your profile information to discover growth opportunities."
                : "Please add information to your profile first. Development themes are generated based on your profile details."}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <Button
                variant={hasDossier ? "default" : "outline"}
                size="sm"
                className={cn(
                  "mt-4 flex gap-1.5",
                  !hasDossier &&
                    "border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-500",
                )}
                onClick={handleGenerateThemes}
                disabled={isGenerating || !hasDossier}
              >
                {hasDossier ? (
                  <>
                    <RefreshCcwIcon className="h-4 w-4" />
                    Generate Themes
                  </>
                ) : (
                  <>
                    <FileTextIcon className="h-4 w-4" />
                    Complete Profile First
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
