import { motion } from "framer-motion";

import { cn } from "~/lib/utils";

import type {
  TranscriptSlice,
  TranscriptWord as TranscriptWordType,
} from "./types";
import { isWordActive } from "./utils";

type TranscriptWordProps = {
  slice: TranscriptSlice;
  word: TranscriptWordType;
  currentTime: number;
  onWordClick: (time: number) => void;
  setWordRef: (el: HTMLSpanElement | null) => void;
};

export function TranscriptWord({
  slice,
  word,
  currentTime,
  onWordClick,
  setWordRef,
}: TranscriptWordProps) {
  if (word.start_time === null || word.end_time === null || !word.content)
    return null;

  const isActive = isWordActive(word, currentTime);
  const prevWord =
    word.index !== null && word.index > 0 ? slice.words[word.index - 1] : null;
  const nextWord =
    word.index !== null && word.index < slice.words.length - 1
      ? slice.words[word.index + 1]
      : null;

  return (
    <motion.span
      key={`${slice.id}-${word.id}`}
      data-active={isActive}
      ref={setWordRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={() => word.start_time && onWordClick(word.start_time)}
      className={cn(
        "cursor-pointer px-0.5 text-sm transition-colors hover:-mx-0.5 hover:px-1",
        isActive && "bg-primary text-foreground",
        !isActive && "hover:bg-accent-foreground/30",
        (!prevWord?.start_time || !isWordActive(prevWord, currentTime)) &&
          "rounded-l-sm",
        (!nextWord?.start_time || !isWordActive(nextWord, currentTime)) &&
          "rounded-r-sm",
      )}
    >
      {word.content}
    </motion.span>
  );
}
