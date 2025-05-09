import type { Editor as TiptapEditor } from "@tiptap/core";
import { motion } from "framer-motion";
import { ArrowUp, Square } from "lucide-react";

import { Editor } from "~/components/editor";
import { Button } from "~/components/ui/button";
import type { Tables } from "~/lib/supabase/database.types";
import { cn } from "~/lib/utils";
import type { Select } from "~/lib/utils/types";
import type { VideoOutput } from "~/lib/videos";
import type { RouterOutputs } from "~/trpc/react";

import { ContentSelector } from "./content-selector";
import { SelectedContentList } from "./selected-content-list";

type Moment = NonNullable<
  RouterOutputs["moments"]["listForInsights"]
>["moments"][number];
type MomentsList = NonNullable<
  RouterOutputs["moments"]["listForInsights"]
>["moments"][number][];

export type ChatInputProps = {
  isLandingPage?: boolean;
  frameworks: Tables<"coaching_frameworks">[];
  onSubmit: (event?: { preventDefault?: () => void }) => void;
  stop?: () => void;
  isGenerating: boolean;
  moments?: MomentsList | null;
  videos?: VideoOutput[] | null;
  selectedMoments?: MomentsList | null;
  selectedVideos?: VideoOutput[] | null;
  onSelectMoment?: ((moment: Moment) => void) | null;
  onUnselectMoment?: ((moment: Moment) => void) | null;
  onSelectVideo?: ((video: VideoOutput) => void) | null;
  onUnselectVideo?: ((video: VideoOutput) => void) | null;
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
    (selectedMoments?.length ?? 0) > 0 || (selectedVideos?.length ?? 0) > 0;

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

      {selectedMoments &&
        selectedVideos &&
        onUnselectMoment &&
        onUnselectVideo && (
          <SelectedContentList
            selectedMoments={selectedMoments}
            selectedVideos={selectedVideos}
            onUnselectMoment={onUnselectMoment}
            onUnselectVideo={onUnselectVideo}
          />
        )}

      <motion.div
        className={cn("absolute right-3 flex gap-2")}
        animate={{
          top:
            buttonPosition === "top" ||
            (selectedMoments?.length ?? 0) + (selectedVideos?.length ?? 0) > 0
              ? "0.75rem" // top-3
              : "auto",
          bottom:
            buttonPosition === "top" ||
            (selectedMoments?.length ?? 0) + (selectedVideos?.length ?? 0) > 0
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
          <StopGeneratingButton onClick={stop} />
        ) : (
          <SendMessageButton onClick={onSubmit} disabled={isGenerating} />
        )}
      </motion.div>
    </div>
  );
}

type StopGeneratingButtonProps = {
  onClick: () => void;
};

function StopGeneratingButton({ onClick }: StopGeneratingButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      className="h-8 w-8"
      aria-label="Stop generating"
      onClick={onClick}
    >
      <Square className="h-3 w-3 animate-pulse" fill="currentColor" />
    </Button>
  );
}

type SendMessageButtonProps = {
  onClick: () => void;
  disabled: boolean;
};

function SendMessageButton({ onClick, disabled }: SendMessageButtonProps) {
  return (
    <Button
      type="submit"
      size="icon"
      className="h-8 w-8 transition-opacity"
      aria-label="Send message"
      disabled={disabled}
      onClick={onClick}
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}
