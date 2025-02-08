import { z } from "zod";

export const FeedbackType = z.enum(["suggestion", "improvement", "bug"]);
export type FeedbackType = z.infer<typeof FeedbackType>;

export const CriticalityLevel = z.enum(["low", "medium", "high"]);
export type CriticalityLevel = z.infer<typeof CriticalityLevel>;

export const FeedbackInput = z.object({
  type: FeedbackType,
  criticality: CriticalityLevel,
  description: z.string().min(1),
  screenshot: z.string(),
});
export type FeedbackInput = z.infer<typeof FeedbackInput>;
