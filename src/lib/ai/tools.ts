import { tool as aiTool, type ToolExecutionOptions } from "ai";
import { z } from "zod";

import { api } from "~/trpc/server";

import { formatReportToMarkdown } from "../reports/formatting";
import { VideoMoment } from "../schemas/video-moment";
import { vectorSearch } from "../search/vector/queries";
import { createClient } from "../supabase/server";
import { isTruthy } from "../utils";

// Tool categories for better organization and documentation
export enum ToolCategory {
  ANALYZE = "ANALYZE",
  EXPLORE = "EXPLORE",
  REFERENCE = "REFERENCE",
  UTILITY = "UTILITY",
}

// Tool metadata interface
export interface ToolMetadata {
  category: ToolCategory;
  priority: number;
  useCases: string[];
  exampleUsage?: string;
  description: string;
}

// Store tool metadata separately for documentation generation
const toolMetadata: Record<string, ToolMetadata> = {};

// Function to register a tool's metadata
export function registerToolMetadata(
  name: string,
  metadata: ToolMetadata,
): void {
  toolMetadata[name] = metadata;
}

// Enhanced tool wrapper
export function tool<TParams extends z.ZodType, TOutput>(
  name: string,
  params: {
    description: string;
    parameters: TParams;
    execute: (
      params: z.infer<TParams>,
      options: ToolExecutionOptions,
    ) => Promise<TOutput>;
    category: ToolCategory;
    priority?: number;
    useCases: string[];
    exampleUsage?: string;
  },
) {
  const { description, category, useCases, exampleUsage, priority } = params;

  // Register metadata for documentation
  registerToolMetadata(name, {
    description,
    category,
    priority: priority ?? 0,
    useCases,
    exampleUsage,
  });

  // Return the standard Vercel AI tool
  return aiTool(params);
}

// Function to generate system prompts from tools metadata
export function generateToolSystemPrompt(
  mode: "insights" | "coach" = "insights",
): string {
  const categorizedTools: Record<
    ToolCategory,
    Array<{ name: string; description: string; priority: number }>
  > = {
    [ToolCategory.ANALYZE]: [],
    [ToolCategory.EXPLORE]: [],
    [ToolCategory.REFERENCE]: [],
    [ToolCategory.UTILITY]: [],
  };

  // Categorize tools based on metadata
  for (const [name, metadata] of Object.entries(toolMetadata)) {
    categorizedTools[metadata.category].push({
      name,
      description: metadata.description,
      priority: metadata.priority,
    });
  }

  // Build prompt sections
  let prompt = "STRATEGIC TOOL UTILIZATION PROTOCOL:";

  // ANALYZE tools
  if (categorizedTools[ToolCategory.ANALYZE].length > 0) {
    prompt +=
      "\n1. ANALYZE: Begin with comprehensive context-mapping using these foundational tools:";
    for (const tool of categorizedTools[ToolCategory.ANALYZE].sort(
      (a, b) => b.priority - a.priority,
    )) {
      prompt += `\n   • ${tool.name} - ${tool.description}`;
    }
  }

  // EXPLORE tools
  if (categorizedTools[ToolCategory.EXPLORE].length > 0) {
    prompt +=
      "\n\n2. EXPLORE: Deepen your contextual understanding with these powerful investigative tools:";
    for (const tool of categorizedTools[ToolCategory.EXPLORE].sort(
      (a, b) => b.priority - a.priority,
    )) {
      prompt += `\n   • ${tool.name} - ${tool.description}`;
    }
  }

  // REFERENCE tools
  if (categorizedTools[ToolCategory.REFERENCE].length > 0) {
    prompt +=
      "\n\n3. REFERENCE: Ground your coaching insights in concrete evidence using:";
    for (const tool of categorizedTools[ToolCategory.REFERENCE].sort(
      (a, b) => b.priority - a.priority,
    )) {
      prompt += `\n   • ${tool.name} - ${tool.description}`;
    }
  }

  // UTILITY tools (if any)
  if (categorizedTools[ToolCategory.UTILITY].length > 0) {
    prompt +=
      "\n\n4. UTILITY: Use these supporting tools to enhance your coaching process:";
    for (const tool of categorizedTools[ToolCategory.UTILITY].sort(
      (a, b) => b.priority - a.priority,
    )) {
      prompt += `\n   • ${tool.name} - ${tool.description}`;
    }
  }

  if (mode === "insights") {
    // Add usage guidelines
    prompt +=
      "\n\nFor each client inquiry, strategically deploy 3-10 tools in sequence, using each tool's output to inform and refine subsequent queries. This methodical, evidence-based approach ensures your coaching delivers personalized, data-driven insights that catalyze transformative results.";
  }

  return prompt;
}

export const thinkTool = () =>
  tool("think", {
    description:
      "A reflective tool that allows you to articulate and document your reasoning process. Use this when you need to think step-by-step through complex problems, explore multiple perspectives, or make your decision-making process transparent to the user.",
    parameters: z
      .object({
        thought: z
          .string()
          .describe(
            "The detailed reasoning, analysis, or reflection you want to document. Include your step-by-step thinking process, considerations of alternatives, and justification for your approach.",
          ),
      })
      .describe("Parameters for capturing your analytical thought process."),
    execute: async ({ thought }) => {
      return { thought };
    },
    category: ToolCategory.UTILITY,
    priority: 5,
    useCases: [
      "Working through complex decision-making",
      "Exploring multiple perspectives on an issue",
      "Making reasoning transparent to the user",
    ],
  });

export type ThinkToolOutput = {
  thought: string;
};

export const listMeetingsTool = (profileId: string, apiVideoIds?: string[]) =>
  tool("listMeetings", {
    description:
      "Retrieves a paginated list of meetings with optional filtering capabilities. Use this when you need to find specific meetings by date range, speaker, or meeting ID, or when you need to provide an overview of recent meetings.",
    parameters: z
      .object({
        filters: z
          .object({
            meetingId: z
              .string()
              .optional()
              .describe(
                "(Optional) The unique identifier (video_api_id) of a specific meeting you want to retrieve.",
              ),
            speaker: z
              .string()
              .optional()
              .describe(
                "(Optional) Filter meetings by the primary speaker or target person. Particularly useful when looking for coaching sessions with a specific individual.",
              ),
            startDate: z
              .string()
              .optional()
              .describe(
                "(Optional) ISO format date string to filter meetings that occurred on or after this date.",
              ),
            endDate: z
              .string()
              .optional()
              .describe(
                "(Optional) ISO format date string to filter meetings that occurred on or before this date.",
              ),
          })
          .describe(
            "(Optional) Criteria to narrow down the meetings returned.",
          ),
        page: z
          .number()
          .optional()
          .describe(
            "(Optional) The page number for pagination, starting at 1. Defaults to first page if not specified.",
          ),
        pageSize: z
          .number()
          .optional()
          .describe(
            "(Optional) Number of meetings to return per page. Defaults to 10 if not specified.",
          ),
      })
      .describe("Parameters for retrieving and filtering meeting records."),
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

      // Get all session video IDs first
      const { data: sessionVideoIds } = await supabase
        .from("sessions")
        .select("api_video_id")
        .not("api_video_id", "is", null);

      const sessionVideoIdSet = new Set(
        sessionVideoIds?.map((s) => s.api_video_id).filter(isTruthy) ?? [],
      );

      const query = supabase
        .from("meetings")
        .select("*, moments(*)")
        .eq("profile_id", profileId)
        .not("video_api_id", "in", Array.from(sessionVideoIdSet))
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
    category: ToolCategory.REFERENCE,
    priority: 10,
    useCases: [
      "Getting an overview of recent meetings",
      "Finding meetings with a specific individual",
      "Identifying meetings within a specific date range",
    ],
  });

export type ListMeetingsToolOutput = Awaited<
  ReturnType<ReturnType<typeof listMeetingsTool>["execute"]>
>;

export const searchMomentsTool = (profileId: string, apiVideoIds?: string[]) =>
  tool("searchMoments", {
    description:
      "Performs semantic search across meeting moments to find relevant content. Use this when you need to locate specific discussions, topics, or insights mentioned during meetings without knowing exact timestamps or meeting details.",
    parameters: z
      .object({
        query: z
          .string()
          .describe(
            "(Required) The natural language search query describing what you're looking for in the meeting moments.",
          ),
        topK: z
          .number()
          .optional()
          .describe(
            "(Optional) Maximum number of most relevant results to return. Higher values provide more comprehensive results but may include less relevant matches. Defaults to 10.",
          ),
      })
      .describe("Parameters for semantic search across meeting moments."),
    execute: async ({ query, topK }) => {
      const { results } = await vectorSearch({
        query,
        topK: topK ?? 10,
        minScore: 0.4,
        filter: {
          $and: [
            { profile_id: { $eq: profileId } },
            { type: { $eq: "moments" } },
            ...(apiVideoIds?.length
              ? [
                  {
                    api_video_id:
                      apiVideoIds.length === 1 && apiVideoIds[0]
                        ? { $eq: apiVideoIds[0] }
                        : { $in: apiVideoIds },
                  },
                ]
              : []),
          ],
        },
      });

      const resultsWithMoments = await Promise.all(
        results.map(async (result) => {
          if (
            !(
              result.metadata &&
              "moments_id" in result.metadata &&
              result.metadata.moments_id
            )
          )
            return;

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
    category: ToolCategory.REFERENCE,
    priority: 9,
    useCases: [
      "Finding specific topics discussed in meetings",
      "Locating mentions of particular concepts or people",
      "Identifying patterns across multiple meetings",
    ],
  });

export type SearchMomentsToolOutput = Awaited<
  ReturnType<ReturnType<typeof searchMomentsTool>["execute"]>
>;

export const listReportsTool = (profileId: string) =>
  tool("listReports", {
    description: "Retrieves a paginated list of reports for a given profile.",
    parameters: z.object({}).describe("Parameters for retrieving reports."),
    execute: async () => {
      const supabase = await createClient();

      const { data: groupReportProcessingStatuses } = await supabase
        .from("group_report_processing_status")
        .select("*")
        .eq("profile_id", profileId)
        .eq("status", "completed")
        .order("created_at", { ascending: false, nullsFirst: false });

      const data = await Promise.all(
        (groupReportProcessingStatuses ?? []).map((r) =>
          api.reports.getGroupReports({
            groupId: r.id,
          }),
        ),
      );

      return data.map((datum) => ({
        ...datum,
        reports: datum.reports.map((r) => ({
          id: r.id,
          summary: r.summary,
          skill: r.skill
            ? {
                title: r.skill.title,
                description: r.skill.description,
              }
            : null,
          start_date: r.start_date,
          end_date: r.end_date,
          markdown: formatReportToMarkdown(r),
        })),
      }));
    },
    category: ToolCategory.REFERENCE,
    priority: 8,
    useCases: [
      "Accessing coaching reports for a user",
      "Reviewing historical assessments and feedback",
      "Finding insights from previous coaching sessions",
    ],
  });

export type ListReportsToolOutput = Awaited<
  ReturnType<ReturnType<typeof listReportsTool>["execute"]>
>;
