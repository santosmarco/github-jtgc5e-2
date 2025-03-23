import type { Context, logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";

export const ProcessingStepId = z.enum([
  "topic-segmentation",
  "entity-extraction",
  "moment-identification",
]);
export type ProcessingStepId = z.infer<typeof ProcessingStepId>;

export type ProcessingContext = Context & { logger: typeof logger };
