import type { RouterOutputs } from "~/trpc/react";

export type Transcript = RouterOutputs["transcripts"]["getOne"];

export type TranscriptSlice = Transcript[number];

export type TranscriptWord = TranscriptSlice["words"][number];
