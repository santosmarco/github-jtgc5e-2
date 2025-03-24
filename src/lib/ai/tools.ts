import type { CoreMessage } from "ai";
import { tool as coreTool } from "ai";
import _ from "lodash";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { api } from "~/trpc/server";

import { IndexMetadata } from "../pinecone/client";
import { searchSimilar } from "../pinecone/search";
import { VideoMoment } from "../schemas/video-moment";
import { meetingsRowSchema } from "../supabase/schemas";
import { createClient } from "../supabase/server";

export function tool<TParameters extends z.ZodTypeAny, TResult>(tool: {
  description: string;
  parameters: TParameters;
  output: z.ZodType<TResult>;
  execute: (
    args: z.infer<TParameters>,
    options: {
      messages: CoreMessage[];
      abortSignal?: AbortSignal;
    },
  ) => PromiseLike<TResult>;
}) {
  return Object.assign(coreTool(tool), {
    _def: {
      description: tool.description,
      parameters: tool.parameters,
      output: tool.output,
    },
  });
}

export type Tool<
  TParameters extends z.ZodTypeAny = z.ZodTypeAny,
  TResult = any,
> = ReturnType<typeof tool<TParameters, TResult>>;

export type ToolOutput<T extends Tool> = z.output<T["_def"]["output"]>;

export function explainTools<T extends Record<string, Tool>>(
  tools: T,
  includeExplain = true,
) {
  return _({ ...tools, ...(includeExplain && { explain: explainTool(tools) }) })
    .toPairs()
    .map(
      ([name, tool]) =>
        `- \`${name}\`: ${tool._def.description}\n${JSON.stringify({
          parameters: zodToJsonSchema(tool._def.parameters),
          ...(tool._def.output && {
            output: zodToJsonSchema(tool._def.output),
          }),
        })}`,
    )
    .join("\n\n")
    .valueOf();
}

export const explainTool = <T extends Record<string, Tool>>(tools: T) =>
  tool({
    description: "Useful for explaining a tool.",
    parameters: z.object({
      toolName: z
        .enum(Object.keys(tools) as [string, ...string[]])
        .describe("The name of the tool to explain."),
    }),
    output: z.object({
      error: z
        .string()
        .optional()
        .describe("A description of an error, if applicable."),
      description: z
        .string()
        .optional()
        .describe("The description of the tool."),
      parameters: z
        .unknown()
        .optional()
        .describe("The parameters of the tool."),
      output: z.unknown().optional().describe("The output of the tool."),
    }),
    execute: async ({ toolName }) => {
      const tool = tools[toolName];

      if (!tool) {
        return { error: `Tool ${toolName} not found.` };
      }

      return {
        description: tool._def.description,
        parameters: tool._def.parameters,
        output: tool._def.output,
      };
    },
  });

export const displayMomentTool = tool({
  description:
    "Useful for displaying a moment in the chat. Pass the moment ID and the reasoning for displaying it.",
  parameters: z
    .object({
      id: z.string().describe("(Required) The ID of the moment to display."),
      reasoning: z
        .string()
        .describe("(Required) The reasoning for displaying the moment."),
    })
    .describe("The arguments for the displayMoment tool."),
  output: z.object({
    id: z.string(),
    reasoning: z.string(),
    moment: VideoMoment.nullable(),
  }),
  execute: async ({ id, reasoning }) => {
    try {
      const moment = await api.moments.getOneById({ momentId: id });
      return { id, reasoning, moment };
    } catch (error) {
      console.error("Failed to get moment", { error });
      return { id, reasoning, moment: null };
    }
  },
});

export const listMeetingsTool = (profileId: string, apiVideoIds?: string[]) =>
  tool({
    description:
      "Useful when you need to get data about one or more meetings from the database.",
    parameters: z
      .object({
        filters: z
          .object({
            meetingId: z
              .string()
              .optional()
              .describe(
                "(Optional) The ID, aka `video_api_id`, of the meeting.",
              ),
            speaker: z
              .string()
              .optional()
              .describe(
                "(Optional) The speaker, aka `target_person`, to filter the meetings by. Generally, this is the person you are coaching.",
              ),
            startDate: z
              .string()
              .optional()
              .describe("(Optional) The start date to filter the meetings by."),
            endDate: z
              .string()
              .optional()
              .describe("(Optional) The end date to filter the meetings by."),
          })
          .describe("(Optional) The filters to apply to the meetings."),
        page: z
          .number()
          .optional()
          .describe("(Optional) The page number to fetch (starts at 1)."),
        pageSize: z
          .number()
          .optional()
          .describe("(Optional) Number of items per page. Defaults to 10."),
      })
      .describe("The arguments for the listMeetings tool."),
    output: z.object({
      data: z
        .array(
          meetingsRowSchema
            .pick({
              name: true,
              summary: true,
              date: true,
              speaker: true,
            })
            .extend({
              id: z.string(),
              momentIds: z.array(z.string()),
            }),
        )
        .nullable(),
      error: z.string().nullable(),
      page: z.number(),
      pageSize: z.number(),
      hasMore: z.boolean().nullable(),
    }),
    execute: async ({
      filters: { meetingId, speaker, startDate, endDate },
      page,
      pageSize,
    }) => {
      const supabase = await createClient();

      page ??= 1;
      pageSize ??= 10;

      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      const query = supabase
        .from("meetings")
        .select("*, moments(*)")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false, nullsFirst: false })
        .range(start, end);

      if (apiVideoIds?.length) {
        query.in("video_api_id", apiVideoIds);
      }

      if (meetingId) {
        query.eq("video_api_id", meetingId);
      }
      if (speaker) {
        query.eq("speaker", speaker);
      }
      if (startDate) {
        query.gte("created_at", startDate);
      }
      if (endDate) {
        query.lte("created_at", endDate);
      }

      const result = await query;

      const data =
        result.data?.map((meeting) => ({
          id: meeting.video_api_id,
          name: meeting.name,
          date: meeting.created_at,
          speaker: meeting.speaker,
          summary: meeting.summary,
          momentIds: meeting.moments?.map((moment) => moment.id) ?? [],
        })) ?? null;

      return {
        data,
        error: result.error?.message ?? null,
        page,
        pageSize,
        hasMore: result.data && result.data.length === pageSize,
      };
    },
  });

export type ListMeetingsToolOutput = ToolOutput<
  ReturnType<typeof listMeetingsTool>
>;

export const searchMomentsTool = (profileId: string, apiVideoIds?: string[]) =>
  tool({
    description: "Useful for searching for moments in the database.",
    parameters: z
      .object({
        query: z.string().describe("(Required) The query to search for."),
        topK: z
          .number()
          .optional()
          .describe(
            "(Optional) The number of results to return. Defaults to 10.",
          ),
      })
      .describe("The arguments for the searchMoments tool."),
    output: z.object({
      results: z.array(
        z.object({
          moment: VideoMoment,
          metadata: IndexMetadata.optional(),
        }),
      ),
    }),
    execute: async ({ query, topK }) => {
      const results = await searchSimilar(query, {
        topK: topK ?? 10,
        minScore: 0.2,
        filter: {
          $and: [
            { profile_id: { $eq: profileId } },
            { type: { $eq: "moments" } },
            ...(apiVideoIds?.length
              ? [{ api_video_id: { $in: apiVideoIds } }]
              : []),
          ],
        },
      });

      const resultsWithMoments = await Promise.all(
        results.map(async (result) => {
          if (!result.metadata?.moments_id) return null;

          try {
            const moment = await api.moments.getOneById({
              momentId: result.metadata.moments_id,
            });

            return { ...result, moment: VideoMoment.parse(moment) };
          } catch (error) {
            console.error("Failed to get moment", { error });
            return null;
          }
        }),
      );

      return {
        results: resultsWithMoments.filter(
          (r): r is NonNullable<typeof r> => r !== null,
        ),
      };
    },
  });

export type SearchMomentsToolOutput = ToolOutput<
  ReturnType<typeof searchMomentsTool>
>;
