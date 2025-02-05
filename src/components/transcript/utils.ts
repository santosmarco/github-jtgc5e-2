import { TIME_WINDOW } from "./constants";
import type { TranscriptWord } from "./types";

export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const pad = (num: number) => num.toString().padStart(2, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
}

export function isWordActive(
  word: TranscriptWord,
  currentTime: number,
): boolean {
  if (word.start_time === null || word.end_time === null) return false;
  const midpoint = (word.start_time + word.end_time) / 2;
  return Math.abs(currentTime - midpoint) <= TIME_WINDOW;
}
