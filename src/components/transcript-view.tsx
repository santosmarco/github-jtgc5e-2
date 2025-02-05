"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronsUpDownIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TranscriptHeader } from "./transcript/transcript-header";
import { TranscriptSearch } from "./transcript/transcript-search";
import { TranscriptSlice } from "./transcript/transcript-slice";
import type { Transcript } from "./transcript/types";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type TranscriptViewProps = {
  transcript: Transcript | null | undefined;
  currentTime: number;
  onWordClick: (time: number) => void;
};

const TIME_WINDOW = 0.5;
const TIME_JUMP_THRESHOLD = 1;

const SPEAKER_COLORS = [
  "text-primary",
  "text-blue-400",
  "text-indigo-400",
  "text-sky-400",
  "text-cyan-400",
  "text-violet-400",
  "text-blue-300",
  "text-indigo-300",
  "text-sky-300",
  "text-cyan-300",
  "text-violet-300",
] as const;

const LoadingTranscript = () => {
  const items = useMemo(
    () =>
      Array.from({ length: 5 }).map(() => ({
        id: Math.random().toString(),
        words: Array.from({ length: Math.floor(Math.random() * 20) + 10 }).map(
          () => ({
            id: Math.random().toString(),
            width: Math.floor(Math.random() * 40) + 20,
          }),
        ),
      })),
    [],
  );

  return (
    <div className="space-y-6 px-4 py-2">
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-x-2">
            <motion.div
              className="h-4 w-24 rounded-full bg-muted/50"
              animate={{
                opacity: [0.5, 0.7, 0.5],
                scale: [1, 1.01, 1],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="h-[1px] flex-1 bg-muted/50"
              animate={{
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {item.words.map((word) => (
              <motion.div
                key={word.id}
                className="h-4 rounded-sm bg-muted/50"
                style={{
                  width: `${word.width}px`,
                }}
                animate={{
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

type SearchMatch = {
  sliceIndex: number;
  wordIndex: number;
  matchLength: number;
};

type SearchResult = {
  matches: SearchMatch[];
  currentMatchIndex: number;
};

const MIN_SEARCH_LENGTH = 2;

export function TranscriptView({
  transcript,
  currentTime,
  onWordClick,
}: TranscriptViewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[][]>([]);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const lastTimeRef = useRef(currentTime);
  const userScrolledRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult>({
    matches: [],
    currentMatchIndex: -1,
  });

  const speakerColorMap = useMemo(() => {
    if (!transcript?.length) return {};

    const speakerCounts = transcript.reduce<[Record<string, number>, number]>(
      (acc, slice) => {
        const speaker = slice.speaker_name || "Speaker";
        if (typeof acc[0][speaker] === "number") return acc;
        acc[0][speaker] = acc[1];
        acc[1]++;
        return acc;
      },
      [{}, 0],
    );

    return Object.fromEntries<string | undefined>(
      Object.entries(speakerCounts[0]).map(([speaker, count]) => [
        speaker,
        SPEAKER_COLORS[count % SPEAKER_COLORS.length],
      ]),
    );
  }, [transcript]);

  const isWordActive = useCallback(
    (
      word: NonNullable<typeof transcript>[number]["words"][number],
    ): boolean => {
      if (!word.start_time || !word.end_time) return false;
      const midpoint = (word.start_time + word.end_time) / 2;
      return Math.abs(currentTime - midpoint) <= TIME_WINDOW;
    },
    [currentTime],
  );

  const getActiveWord = useCallback(() => {
    if (!transcript?.length) return null;

    for (const slice of transcript) {
      const activeWord = slice.words.find(isWordActive);
      if (activeWord) {
        return wordRefs.current[slice.index]?.[activeWord.index ?? 0];
      }
    }
    return null;
  }, [transcript, isWordActive]);

  useEffect(() => {
    if (!isAutoScrollEnabled || searchQuery) return;

    const activeWord = getActiveWord();
    const viewport = viewportRef.current;
    if (!activeWord || !viewport) return;

    viewport.scrollTo({
      top: activeWord.offsetTop - 100,
      behavior: "smooth",
    });
  }, [isAutoScrollEnabled, getActiveWord, searchQuery]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      if (!userScrolledRef.current) {
        userScrolledRef.current = true;
        setIsAutoScrollEnabled(false);
      }
    };

    viewport.addEventListener("wheel", handleScroll, { passive: true });
    viewport.addEventListener("touchmove", handleScroll, { passive: true });

    return () => {
      viewport.removeEventListener("wheel", handleScroll);
      viewport.removeEventListener("touchmove", handleScroll);
    };
  }, []);

  useEffect(() => {
    const timeDiff = Math.abs(currentTime - lastTimeRef.current);
    if (timeDiff > TIME_JUMP_THRESHOLD) {
      setIsAutoScrollEnabled(true);
      userScrolledRef.current = false;
    }
    lastTimeRef.current = currentTime;
  }, [currentTime]);

  const { searchableText, wordMap } = useMemo(() => {
    if (!transcript?.length) return { searchableText: "", wordMap: new Map() };

    let currentPosition = 0;
    const wordPositions = new Map<
      number,
      { sliceIndex: number; wordIndex: number }
    >();

    const text = transcript
      .map((slice, sliceIndex) =>
        slice.words
          .map((word, wordIndex) => {
            const content = word.content?.trim() || "";
            if (content) {
              for (let i = 0; i < content.length; i++) {
                wordPositions.set(currentPosition + i, {
                  sliceIndex,
                  wordIndex,
                });
              }
              currentPosition += content.length + 1;
              return content;
            }
            return "";
          })
          .filter(Boolean)
          .join(" "),
      )
      .join(" ")
      .toLowerCase();

    return { searchableText: text, wordMap: wordPositions };
  }, [transcript]);

  useEffect(() => {
    if (
      !searchQuery ||
      searchQuery.length < MIN_SEARCH_LENGTH ||
      !searchableText
    ) {
      setSearchResult({ matches: [], currentMatchIndex: -1 });
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const matches: SearchMatch[] = [];
    let startIndex = 0;

    while (true) {
      const matchIndex = searchableText.indexOf(query, startIndex);
      if (matchIndex === -1) break;

      const wordLocation = wordMap.get(matchIndex);
      if (wordLocation) {
        matches.push({
          sliceIndex: wordLocation.sliceIndex,
          wordIndex: wordLocation.wordIndex,
          matchLength: query.length,
        });
      }

      startIndex = matchIndex + 1;
    }

    matches.sort((a, b) => {
      if (a.sliceIndex !== b.sliceIndex) {
        return a.sliceIndex - b.sliceIndex;
      }
      return a.wordIndex - b.wordIndex;
    });

    setSearchResult({
      matches,
      currentMatchIndex: matches.length > 0 ? 0 : -1,
    });
  }, [searchQuery, searchableText, wordMap]);

  useEffect(() => {
    const { currentMatchIndex, matches } = searchResult;
    if (currentMatchIndex === -1) return;

    const match = matches[currentMatchIndex];
    if (!match) return;

    const word = wordRefs.current[match.sliceIndex]?.[match.wordIndex];
    if (!word) return;

    requestAnimationFrame(() => {
      word.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      const wordData = transcript?.[match.sliceIndex]?.words[match.wordIndex];
      if (wordData?.start_time) {
        onWordClick(wordData.start_time);
      }
    });
  }, [searchResult, transcript, onWordClick]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!searchQuery) return;

      if (e.key === "Enter") {
        if (e.shiftKey) {
          handlePreviousMatch();
        } else {
          handleNextMatch();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery]);

  const handleNextMatch = () => {
    if (searchResult.matches.length === 0) return;

    setSearchResult((prev) => ({
      ...prev,
      currentMatchIndex:
        (prev.currentMatchIndex + 1) % searchResult.matches.length,
    }));
  };

  const handlePreviousMatch = () => {
    if (searchResult.matches.length === 0) return;

    setSearchResult((prev) => ({
      ...prev,
      currentMatchIndex:
        (prev.currentMatchIndex - 1 + searchResult.matches.length) %
        searchResult.matches.length,
    }));
  };

  return (
    <div className="-mx-1 w-[calc(100%+8px)] overflow-hidden rounded-md border border-border/70 bg-background/50 data-[state=open]:border-border/50">
      <AnimatePresence>
        {searchQuery && (
          <TranscriptSearch
            setSearchQuery={setSearchQuery}
            searchResult={searchResult}
            handleNextMatch={handleNextMatch}
            handlePreviousMatch={handlePreviousMatch}
          />
        )}
      </AnimatePresence>

      <TranscriptHeader
        transcript={transcript}
        setSearchQuery={setSearchQuery}
      />

      <div
        ref={viewportRef}
        className="relative h-[600px] max-h-screen overflow-y-auto border-b border-border py-4"
      >
        {transcript?.length ? (
          <div className="space-y-6 px-4 py-2 text-xs">
            {transcript.map((slice) => (
              <TranscriptSlice
                key={slice.id}
                slice={slice}
                currentTime={currentTime}
                wordRefs={wordRefs}
                speakerColorMap={speakerColorMap}
                onWordClick={onWordClick}
              />
            ))}
          </div>
        ) : (
          <LoadingTranscript />
        )}

        {transcript?.length && !isAutoScrollEnabled && (
          <div className="sticky bottom-4 right-4 flex w-full justify-end px-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="h-8 w-8 rounded-full border border-border bg-background ease-in-out animate-in fade-in-0 slide-in-from-bottom-1"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setIsAutoScrollEnabled(true);
                    userScrolledRef.current = false;
                  }}
                >
                  <ChevronsUpDownIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end" alignOffset={-8}>
                Reenable auto scrolling
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
