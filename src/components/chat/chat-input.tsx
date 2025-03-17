import type { Editor as TiptapEditor } from "@tiptap/core";
import { motion } from "framer-motion";
import { ArrowUp, Square } from "lucide-react";

import { Editor } from "~/components/editor";
import { Button } from "~/components/ui/button";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
import type { VideoOutput } from "~/lib/videos";

import type { RouterOutputs } from "~/trpc/react";
import { ContentSelector } from "./content-selector";
import { SelectedContentList } from "./selected-content-list";

export type ChatInputProps = {
  isLandingPage?: boolean;
  frameworks: Tables<"coaching_frameworks">[];
  onSubmit: (event?: { preventDefault?: () => void }) => void;
  stop?: () => void;
  isGenerating: boolean;
  moments?: NonNullable<RouterOutputs["moments"]["listForInsights"]>["moments"];
  videos?: VideoOutput[];
  selectedMoments: NonNullable<
    RouterOutputs["moments"]["listForInsights"]
  >["moments"];
  selectedVideos: VideoOutput[];
  onSelectMoment: (
    moment: NonNullable<
      RouterOutputs["moments"]["listForInsights"]
    >["moments"][number],
  ) => void;
  onUnselectMoment: (
    moment: NonNullable<
      RouterOutputs["moments"]["listForInsights"]
    >["moments"][number],
  ) => void;
  onSelectVideo: (video: VideoOutput) => void;
  onUnselectVideo: (video: VideoOutput) => void;
  onEditorReady: (editor: TiptapEditor) => void;
  onClick: () => void;
  disabled: boolean;
  buttonPosition?: "top" | "bottom";
};

export function ChatInput({
  isLandingPage,
  onSubmit,
  stop,
  frameworks,
  isGenerating,
  moments = [],
  videos = [],
  selectedMoments,
  selectedVideos,
  onSelectMoment,
  onUnselectMoment,
  onSelectVideo,
  onUnselectVideo,
  onEditorReady,
  disabled,
  buttonPosition = "bottom",
}: ChatInputProps) {
  const showSelectionsList =
    selectedMoments.length > 0 || selectedVideos.length > 0;

  return (
    <div className="relative mb-4 flex w-full flex-col gap-2">
      <Editor
        placeholderText={
          isLandingPage
            ? "Start with the /moments command to search your meetings for important topics"
            : "Ask AI, or press '/' for commands, '@' for frameworks..."
        }
        frameworks={frameworks}
        onEditorReady={onEditorReady}
        onSubmit={onSubmit}
        className={cn((showSelectionsList || isLandingPage) && "min-h-28")}
        // disabled={isGenerating}
      />

      {!isLandingPage && (
        <span className="absolute -bottom-6 left-0 right-0 text-center text-xs text-muted-foreground">
          Titan AI can make mistakes. Check important info.
        </span>
      )}

      <SelectedContentList
        selectedMoments={selectedMoments}
        selectedVideos={selectedVideos}
        onUnselectMoment={onUnselectMoment}
        onUnselectVideo={onUnselectVideo}
      />

      <motion.div
        className={cn("absolute right-3 flex gap-2")}
        animate={{
          top:
            buttonPosition === "top" ||
            selectedMoments.length + selectedVideos.length > 0
              ? "0.75rem" // top-3
              : "auto",
          bottom:
            buttonPosition === "top" ||
            selectedMoments.length + selectedVideos.length > 0
              ? "auto"
              : "0.75rem", // bottom-3
        }}
        transition={{
          type: "spring",
          damping: 20,
          stiffness: 300,
        }}
      >
        <ContentSelector
          moments={moments}
          videos={videos}
          selectedMoments={selectedMoments}
          selectedVideos={selectedVideos}
          onSelectMoment={onSelectMoment}
          onUnselectMoment={onUnselectMoment}
          onSelectVideo={onSelectVideo}
          onUnselectVideo={onUnselectVideo}
          disabled={disabled}
        />

        {isGenerating && stop ? (
          <Button
            type="button"
            size="icon"
            className="h-8 w-8"
            aria-label="Stop generating"
            onClick={stop}
          >
            <Square className="h-3 w-3 animate-pulse" fill="currentColor" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8 transition-opacity"
            aria-label="Send message"
            disabled={isGenerating}
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
      </motion.div>
    </div>
  );
}
