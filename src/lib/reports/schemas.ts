import { z } from "zod";

export const ReportPersonalityColor = z.enum([
  "bg-purple-600",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-fuchsia-600",
]);
export type ReportPersonalityColor = z.infer<typeof ReportPersonalityColor>;

export const ReportPersonality = z.object({
  personality_text: z
    .string()
    .describe("1-3 words that encapsulate the founder's leadership style"),
  personality_description: z
    .string()
    .describe("2-3 sentences that expand on the personality text"),
  badges: z
    .array(z.string())
    .describe(
      "3-5 badge titles that highlight key strengths or notable characteristics",
    ),
  icon: z.object({
    name: z.string(),
    reason: z.string(),
  }),
  color: z.object({
    name: ReportPersonalityColor,
    reason: z.string(),
  }),
});
export type ReportPersonality = z.infer<typeof ReportPersonality>;
