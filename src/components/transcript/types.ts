import type { Except, SetOptional } from "type-fest";
import type { RouterOutputs } from "~/trpc/react";

export type TranscriptWord = SetOptional<
  RouterOutputs["transcripts"]["getOne"][number]["words"][number],
  "bot_id" | "created_at" | "transcript_slice_id"
>;

export type TranscriptSlice = Except<
  SetOptional<
    RouterOutputs["transcripts"]["getOne"][number],
    "bot_id" | "created_at"
  >,
  "words"
> & {
  words: TranscriptWord[];
};

export type Transcript = TranscriptSlice[];
