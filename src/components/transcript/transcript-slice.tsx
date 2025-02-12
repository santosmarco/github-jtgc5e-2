import { motion } from "framer-motion";

import { cn } from "~/lib/utils";

import { usePlayer } from "../player/provider";
import { TranscriptWord } from "./transcript-word";
import type { TranscriptSlice as TranscriptSliceType } from "./types";
import { formatTimestamp } from "./utils";

export type TranscriptSliceProps = {
  slice: TranscriptSliceType;
  wordRefs: React.MutableRefObject<(HTMLSpanElement | null)[][]>;
  speakerColorMap: Record<string, string | undefined>;
  onWordClick: (time: number) => void;
};

export function TranscriptSlice({
  slice,
  wordRefs,
  speakerColorMap,
  onWordClick,
}: TranscriptSliceProps) {
  const { currentTime } = usePlayer();

  return (
    <motion.div
      key={slice.id}
      id={`slice-${slice.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("space-y-1 px-4 py-2 text-xs", slice.index === 0 && "pt-4")}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={cn(
          "flex items-center gap-x-2",
          speakerColorMap[slice.speaker_name || "Speaker"],
        )}
        onClick={() => {
          const firstWord = slice.words[0];
          if (firstWord?.start_time) {
            onWordClick(firstWord.start_time);
          }
        }}
        style={{
          cursor: slice.words[0]?.start_time ? "pointer" : "default",
        }}
      >
        <div className="flex items-center gap-x-2">
          <h3 className="text-sm font-semibold">
            {slice.speaker_name || "Speaker"}
          </h3>
          {slice.words[0]?.start_time && (
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(slice.words[0].start_time)}
            </span>
          )}
        </div>
        <div className="h-[1px] flex-1 bg-border" />
      </motion.div>

      <div className="flex flex-wrap">
        {slice.words.map((word) => (
          <TranscriptWord
            key={`${slice.id}-${word.id}`}
            slice={slice}
            word={word}
            currentTime={currentTime}
            onWordClick={onWordClick}
            setWordRef={(el) => {
              const refs = wordRefs.current;
              if (!refs[slice.index]) {
                refs[slice.index] = [];
              }
              const sliceRefs = refs[slice.index];
              if (word.index !== null && sliceRefs) {
                sliceRefs[word.index] = el;
              }
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
