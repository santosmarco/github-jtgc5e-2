import { tool } from "ai";
import { z } from "zod";

import { api } from "~/trpc/server";

import { searchSimilar } from "../pinecone/search";
import { formatReportToMarkdown } from "../reports/formatting";
import { VideoMoment } from "../schemas/video-moment";
import { createClient } from "../supabase/server";

export const displayMomentTool = tool({
  description:
    "Displays a specific video moment in the chat interface with contextual reasoning. Use this when you want to highlight a particular moment from a meeting that directly addresses the user's question or provides valuable insights.",
  parameters: z
    .object({
      id: z
        .string()
        .describe(
          "(Required) The unique identifier of the moment you want to display.",
        ),
      reasoning: z
        .string()
        .describe(
          "(Required) A clear explanation of why this moment is relevant to the current conversation or question.",
        ),
    })
    .describe(
      "Parameters needed to display a specific video moment with context.",
    ),
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
        sessionVideoIds?.map((s) => s.api_video_id) ?? [],
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
  });

export type ListMeetingsToolOutput = Awaited<
  ReturnType<ReturnType<typeof listMeetingsTool>["execute"]>
>;

export const searchMomentsTool = (profileId: string, apiVideoIds?: string[]) =>
  tool({
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
      const results = await searchSimilar(query, {
        topK: topK ?? 10,
        minScore: 0.4,
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

export type SearchMomentsToolOutput = Awaited<
  ReturnType<ReturnType<typeof searchMomentsTool>["execute"]>
>;

export const listReportsTool = (profileId: string) =>
  tool({
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
  });

export type ListReportsToolOutput = Awaited<
  ReturnType<ReturnType<typeof listReportsTool>["execute"]>
>;
