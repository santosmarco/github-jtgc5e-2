import { motion } from "framer-motion";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useRef } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export type SearchResult = {
  matches: {
    sliceIndex: number;
    wordIndex: number;
    matchLength: number;
  }[];
  currentMatchIndex: number;
};

export type TranscriptSearchProps = {
  setSearchQuery: (query: string) => void;
  searchResult: SearchResult;
  handleNextMatch: () => void;
  handlePreviousMatch: () => void;
};

export function TranscriptSearch({
  setSearchQuery,
  searchResult,
  handleNextMatch,
  handlePreviousMatch,
}: TranscriptSearchProps) {
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const handleSearchChange = (value: string) => {
    if (debounceTimerRef.current) {
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      setSearchQuery(value);
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
    }, 100);
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="relative border-b border-border bg-muted/50 backdrop-blur-sm"
    >
      <div className="flex h-9 items-center gap-x-2 px-4">
        <SearchIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search transcript..."
          className="h-7 flex-1 border-none bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
          autoFocus
        />
        <div className="flex items-center gap-x-0.5">
          {searchResult.matches.length > 0 && (
            <>
              <span className="pr-1 text-xs tabular-nums leading-none text-muted-foreground">
                {searchResult.currentMatchIndex + 1}/
                {searchResult.matches.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-sm hover:bg-accent"
                onClick={handlePreviousMatch}
              >
                <ChevronUpIcon className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-sm hover:bg-accent"
                onClick={handleNextMatch}
              >
                <ChevronDownIcon className="h-3 w-3" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-sm hover:bg-accent"
            onClick={() => setSearchQuery("")}
          >
            <XIcon className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
