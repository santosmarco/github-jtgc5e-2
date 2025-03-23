import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { EntityExtractionService } from "~/lib/backend/services/entity-extraction/entity-extraction.service";
import { createClient } from "~/lib/supabase/client";

export const EntityExtractionInput = z.object({
  api_video_id: z.string(),
});
export type EntityExtractionInput = z.infer<typeof EntityExtractionInput>;

export const entityExtraction = schemaTask({
  id: "entity-extraction",
  schema: EntityExtractionInput,
  maxDuration: 60 * 10, // 10 minutes
  run: async (input, { ctx }) => {
    const supabase = createClient();
    const entityExtractionService = new EntityExtractionService(supabase);
    await entityExtractionService.runEntityExtraction(input, {
      ...ctx,
      logger,
    });
  },
});
