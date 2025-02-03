import { z } from "zod";

export const GoalSignalDirection = z.enum(["positive", "negative"]);
export type GoalSignalDirection = z.infer<typeof GoalSignalDirection>;

export const GoalSignalInput = z.object({
  text: z
    .string()
    .min(1, "Signal text is required")
    .max(500, "Signal text must be less than 500 characters")
    .describe("A clear, observable behavior or interaction"),
  direction: GoalSignalDirection.describe(
    "The direction of the signal—either 'positive' or 'negative'",
  ),
});
export type GoalSignalInput = z.infer<typeof GoalSignalInput>;

export const GoalCreateInput = z.object({
  profile_id: z.string().uuid("Invalid profile ID"),
  text: z
    .string()
    .min(1, "Goal text is required")
    .max(1000, "Goal text must be less than 1000 characters"),
  signals: z.array(GoalSignalInput).min(1, "At least one signal is required"),
});
export type GoalCreateInput = z.infer<typeof GoalCreateInput>;

export const GoalSignalsGenerationOutput = z.object({
  signals: z
    .array(GoalSignalInput)
    .length(3)
    .describe(
      "An array of exactly 3 signals that indicate progress or challenges toward the goal",
    ),
});
export type GoalSignalsGenerationOutput = z.infer<
  typeof GoalSignalsGenerationOutput
>;

export const GoalContextQuestionsGenerationOutput = z.object({
  questions: z
    .array(z.string())
    .length(3)
    .describe(
      "An array of exactly 3 questions to understand and clarify the goal context",
    ),
});
export type GoalContextQuestionsGenerationOutput = z.infer<
  typeof GoalContextQuestionsGenerationOutput
>;
