import { AnimatePresence, motion } from "framer-motion";
import { CaptionsIcon, CheckIcon, CopyIcon, SearchIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import type { Transcript } from "./types";
import { formatTimestamp } from "./utils";

export type TranscriptHeaderProps = {
  transcript: Transcript | null | undefined;
  setSearchQuery: (query: string | ((curr: string) => string)) => void;
};

export function TranscriptHeader({
  transcript,
  setSearchQuery,
}: TranscriptHeaderProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!transcript) return;

    try {
      const formattedTranscript = transcript
        .map((slice) => {
          const timestamp = slice.words[0]?.start_time
            ? ` [${formatTimestamp(slice.words[0].start_time)}]`
            : "";
          const text = slice.words
            .map((w) => (w.content ?? "").trim())
            .join(" ");
          return `${slice.speaker_name || "Speaker"}${timestamp}:\n${text}`;
        })
        .join("\n\n");

      void navigator.clipboard.writeText(formattedTranscript).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2_000);
        toast.success("Copied to clipboard");
      });
    } catch {
      toast.error("Failed to copy");
    }
  }, [transcript]);

  return (
    <div className="flex h-9 items-center justify-between border-b border-border px-4 py-2 text-sm">
      <div className="flex items-center gap-x-2">
        <CaptionsIcon className="h-4 w-4 text-primary" />
        <span className="font-medium leading-none">Transcript</span>
      </div>

      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => setSearchQuery((curr) => (curr ? "" : " "))}
              className="relative h-6 w-6 hover:bg-transparent hover:text-muted-foreground"
              disabled={!transcript?.length}
            >
              <SearchIcon className="!h-3.5 !w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={handleCopy}
              className="relative -mr-2 h-6 w-6 hover:bg-transparent hover:text-muted-foreground"
              disabled={!transcript?.length}
            >
              <AnimatePresence mode="wait">
                {isCopied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <CheckIcon className="!h-3.5 !w-3.5 text-green-500" />
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-green-500"
                      initial={{ scale: 0.8, opacity: 1 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                  >
                    <CopyIcon className="!h-3.5 !w-3.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
