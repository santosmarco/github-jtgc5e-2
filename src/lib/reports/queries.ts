import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import _ from "lodash";

import type { Database, Enums, Tables } from "../supabase/database.types";
import { isTruthy } from "../utils";

dayjs.extend(isSameOrAfter);

/**
 * Represents a report list item
 */
export type ReportListItem = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  summary: string | null;
  personality_text: string | null;
  personality_icon: string | null;
  personality_color: string | null;
  created_at: string;
  skill: {
    id: string;
    title: string;
    icon: string | null;
  } | null;
  processing_status: {
    id: string;
    status: Enums<"processing_status">;
    created_at: string;
    group_processing_status: {
      id: string;
      status: Enums<"processing_status"> | null;
    };
  } | null;
};

/**
 * Represents a detailed report
 */
export type ReportDetail = Tables<"reports"> & {
  skill: {
    id: string;
    title: string;
    icon: string | null;
    scales: Tables<"skill_scales">[] | null;
  } | null;
  report_sections: Tables<"report_sections">[] | null;
  report_goals:
    | (Tables<"report_goals"> & {
        goal:
          | (Tables<"goals"> & {
              signals: Tables<"goal_signals">[] | null;
            })
          | null;
      })[]
    | null;
  report_moments:
    | (Tables<"report_moments"> & {
        moment:
          | (Tables<"moments"> & {
              subtags: Tables<"moment_subtags">[] | null;
            })
          | null;
      })[]
    | null;
  report_comments:
    | (Tables<"report_comments"> & {
        user: Tables<"profiles"> | null;
      })[]
    | null;
  processing_status: {
    id: string;
    status: Enums<"processing_status">;
    created_at: string;
    group_processing_status: {
      id: string;
      status: Enums<"processing_status"> | null;
    };
  } | null;
};

/**
 * Represents an adjacent report
 */
export type AdjacentReport = {
  id: string;
  created_at: string;
  skill: {
    id: string;
    title: string;
  } | null;
  start_date: string | null;
  end_date: string | null;
};

/**
 * Represents a set of adjacent reports
 */
export type AdjacentReports = {
  current: AdjacentReport | null;
  previous: AdjacentReport | null;
  next: AdjacentReport | null;
};

/**
 * Filters for fetching profile historical reports list
 */
export type ProfileHistoricalReportsListFilters = {
  skillId?: string;
  startDate?: string;
  endDate?: string;
};

/**
 * Represents historical score data for a skill
 */
export type HistoricalSkillScore = {
  reportId: string;
  groupId: string | null | undefined;
  startDate: string | null;
  endDate: string | null;
  score: number;
  positiveTagCount: number;
  negativeTagCount: number;
  totalTagCount: number;
};

/**
 * Result of a skill score calculation
 */
export type SkillScoreResult = {
  positiveTagCounts: number;
  negativeTagCounts: number;
  totalTagCounts: number;
  score: number;
};

/**
 * Report with date period information
 */
export type ReportWithPeriod = {
  id: string;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
};

/**
 * Skill with scales to calculate scores for
 */
export type SkillWithScales = {
  id: string;
  scales: Pick<
    Tables<"skill_scales">,
    "positive_tag_title" | "negative_tag_title"
  >[];
};

/**
 * Report moment with visibility and subtags information
 */
export type ReportMomentWithSubtags = Pick<
  Tables<"report_moments">,
  "is_visible" | "omission_reason" | "report_id"
> & {
  moment: Pick<Tables<"moments">, "_internal_thumbs_down"> & {
    subtags: Pick<Tables<"moment_subtags">, "tag">[];
  };
};

/**
 * Options for fetching visible moments
 */
export type MomentFetchOptions = {
  limit?: number;
  page?: number;
};

/**
 * Custom error class for report-related errors
 */
export class ReportError extends Error {
  constructor(
    message: string,
    public readonly originalError?: PostgrestError | Error,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ReportError";
  }
}

/**
 * Service class for report-related operations
 */
export class ReportsService {
  private readonly supabase: SupabaseClient<Database>;

  /**
   * Create a new ReportsService instance
   *
   * @param supabaseClient - Supabase client to use for database access
   */
  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient;
  }

  /**
   * Handle Supabase errors with context
   *
   * @param error - The error to handle
   * @param operation - The operation that caused the error
   * @param context - Additional context for the error
   * @returns Never
   */
  private handleError(
    error: PostgrestError | Error,
    operation: string,
    context?: Record<string, unknown>,
  ): never {
    const postgrestError = error as PostgrestError;
    throw new ReportError(
      `Error during ${operation}: ${postgrestError.message || error.message}`,
      error,
      context,
    );
  }

  /**
   * Check if a moment should be included in score calculations
   *
   * @param reportMoment - The moment to check
   * @returns True if the moment should be included, false otherwise
   */
  private isValidMoment(
    reportMoment: Pick<
      ReportMomentWithSubtags,
      "is_visible" | "omission_reason" | "moment"
    >,
  ): boolean {
    return !!(
      (!reportMoment.moment._internal_thumbs_down ||
        reportMoment.moment._internal_thumbs_down <= 0) &&
      reportMoment.is_visible &&
      !reportMoment.omission_reason
    );
  }

  /**
   * Check if a tag matches any scales in the provided skill
   *
   * @param tag - The tag to check
   * @param skill - The skill with scales to check
   * @param isPositive - Whether to check for positive or negative tags
   * @returns True if the tag matches any scales, false otherwise
   */
  private matchesSkillTags(
    tag: string | null,
    skill: Pick<SkillWithScales, "scales">,
    isPositive: boolean,
  ): boolean {
    if (!tag) return false;

    return skill.scales.some((scale) => {
      const tagField = isPositive ? "positive_tag_title" : "negative_tag_title";
      return scale[tagField]
        .split(",")
        .map((t) => t.trim())
        .includes(tag);
    });
  }

  /**
   * Count tags that match skill scales
   *
   * @param reportMoments - The moments to analyze
   * @param skill - The skill with scales to analyze
   * @param isPositive - Whether to count positive or negative tags
   * @returns The number of matching tags
   */
  private countMatchingTags(
    reportMoments: ReportMomentWithSubtags[],
    skill: Pick<SkillWithScales, "scales">,
    isPositive: boolean,
  ): number {
    return _.sumBy(reportMoments, (rm) => {
      if (!this.isValidMoment(rm)) return 0;

      return rm.moment.subtags.filter((s) =>
        this.matchesSkillTags(s.tag, skill, isPositive),
      ).length;
    });
  }

  /**
   * Calculate skill score based on moment tags
   *
   * @param skill - The skill with scales to calculate score for
   * @param reportMoments - The moments to analyze
   * @returns Object containing score and tag counts
   */
  public calculateSkillScore(
    skill: Pick<SkillWithScales, "scales">,
    reportMoments: ReportMomentWithSubtags[],
  ): SkillScoreResult {
    const validMoments = reportMoments.filter((rm) => this.isValidMoment(rm));

    const positiveTagCounts = this.countMatchingTags(validMoments, skill, true);
    const negativeTagCounts = this.countMatchingTags(
      validMoments,
      skill,
      false,
    );
    const totalTagCounts = positiveTagCounts + negativeTagCounts;

    // Calculate score as a value between 0 and 1
    // A higher positive tag ratio yields a higher score (0-1 range)
    // NOTE: This formula maps scores to [0.5, 1.0] range.
    const score =
      totalTagCounts > 0
        ? 0.5 + 0.5 * (positiveTagCounts / totalTagCounts)
        : 0.5;

    return {
      positiveTagCounts,
      negativeTagCounts,
      totalTagCounts,
      score,
    };
  }

  /**
   * Format a date to day precision (YYYY-MM-DD)
   *
   * @param date - The date to format
   * @returns The formatted date
   */
  private formatToDay(date: string | null): string {
    return date ? dayjs(date).startOf("day").format("YYYY-MM-DD") : "";
  }

  /**
   * Create a unique period key for a report based on start and end dates
   *
   * @param report - The report to create a period key for
   * @returns The period key
   */
  private createPeriodKey(report: ReportWithPeriod): string {
    const startDay = this.formatToDay(report.start_date);
    const endDay = this.formatToDay(report.end_date);
    return `${startDay}_${endDay}`;
  }

  /**
   * Converts a ReportListItem to an AdjacentReport
   *
   * @param report - The report to convert
   * @returns The converted AdjacentReport
   */
  private toAdjacentReport(report: ReportListItem): AdjacentReport | null {
    if (!report.processing_status) {
      return null;
    }

    return {
      id: report.processing_status.group_processing_status.id,
      created_at: report.processing_status.created_at,
      skill: report.skill,
      start_date: report.start_date,
      end_date: report.end_date,
    };
  }

  /**
   * Utility function to deduplicate reports by their date periods
   * Reports with the same start_date and end_date (normalized to day) are considered duplicates
   * When duplicates exist, only the most recently created report is kept
   *
   * @param reports - Array of reports to deduplicate
   * @returns Array of deduplicated reports, sorted by date
   */
  public dedupeReports<T extends ReportWithPeriod>(reports: T[]): T[] {
    if (!reports.length) return [];

    // Create normalized date keys for each report
    const reportsWithKey = reports.map((report) => {
      // Create a normalized date representation for comparison
      const startDate = report.start_date
        ? dayjs(report.start_date).startOf("day")
        : null;
      const endDate = report.end_date
        ? dayjs(report.end_date).startOf("day")
        : null;

      // Generate a unique key for this date period
      const periodKey =
        startDate && endDate
          ? `${startDate.format("YYYY-MM-DD")}_${endDate.format("YYYY-MM-DD")}`
          : `${report.start_date ?? ""}_${report.end_date ?? ""}`;

      return {
        report,
        periodKey,
        createdAt: report.created_at ? dayjs(report.created_at) : null,
      };
    });

    // Group reports by their period key
    type ReportWithKey = (typeof reportsWithKey)[number];
    const groupedByPeriod = reportsWithKey.reduce<
      Record<string, ReportWithKey[]>
    >((acc, item) => {
      const key = item.periodKey;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    // For each group, keep only the report with the most recent created_at
    const deduplicated = Object.values(groupedByPeriod)
      .map((group) => {
        // If no created_at dates available or only one report, return the first one
        if (group.length === 1 || !group[0]?.createdAt) return group[0]?.report;

        // Find report with most recent created_at
        const mostRecent = group.reduce<ReportWithKey>((latest, current) => {
          if (!current.createdAt) return latest;
          if (!latest.createdAt) return current;
          return current.createdAt.isAfter(latest.createdAt) ? current : latest;
        }, group[0]);

        return mostRecent.report;
      })
      .filter(isTruthy);

    // Sort by start_date (or end_date if start_date is null)
    return _.orderBy(
      deduplicated,
      [
        (report) => {
          // Primary sort by start date
          if (report.start_date) {
            return dayjs(report.start_date).valueOf();
          }
          // Secondary sort by end date
          if (report.end_date) {
            return dayjs(report.end_date).valueOf();
          }
          // Fallback value for reports with no dates
          return 0;
        },
      ],
      ["asc"],
    );
  }

  /**
   * Get the report ID from a group report processing status ID
   *
   * @param groupId - The group ID to fetch the report ID for
   * @returns The report ID
   */
  public async getIdsFromGroupReportProcessingStatusId(
    groupId: string,
  ): Promise<{
    processing_status_id: string;
    report_id: string;
    skill_id: string | null;
  }> {
    try {
      const {
        data: reportProcessingStatuses,
        error: reportProcessingStatusesError,
      } = await this.supabase
        .from("report_processing_status")
        .select("id, report_id, created_at, report:reports!inner(skill_id)")
        .eq("status", "completed")
        .eq("group_processing_status_id", groupId);

      if (reportProcessingStatusesError) {
        this.handleError(
          reportProcessingStatusesError,
          "fetching report id from group report processing status id",
          { groupId },
        );
      }

      const reportProcessingStatus = _.last(
        _.sortBy(reportProcessingStatuses, (status) =>
          dayjs(status.created_at).valueOf(),
        ),
      );

      if (!reportProcessingStatus?.report_id) {
        throw new ReportError(
          "No report id found for group report processing status id",
        );
      }

      return {
        processing_status_id: reportProcessingStatus.id,
        report_id: reportProcessingStatus.report_id,
        skill_id: reportProcessingStatus.report?.skill_id ?? null,
      };
    } catch (error) {
      if (error instanceof ReportError) throw error;
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "fetching report id from group report processing status id",
        { groupId },
      );
    }
  }

  /**
   * Get a lightweight list of reports for a profile, sorted by date
   *
   * @param profileId - The profile ID to fetch reports for
   * @param filters - Optional filters for the query
   * @returns Array of report list items with basic info
   */
  public async getProfileHistoricalReportsList(
    profileId: string,
    filters?: ProfileHistoricalReportsListFilters,
  ): Promise<ReportListItem[]> {
    try {
      const query = this.supabase
        .from("reports")
        .select(
          `
            id,
            start_date,
            end_date,
            summary,
            personality_text,
            personality_icon,
            personality_color,
            created_at,
            skill:skills(id, title, icon),
            processing_statuses:report_processing_status!inner(
              id,
              status,
              created_at,
              group_processing_status:group_report_processing_status!inner(
                id,
                status,
                created_at
              )
            )
          `,
        )
        .eq("profile_id", profileId)
        .eq("is_hidden", false)
        .eq("processing_statuses.status", "completed")
        .eq("processing_statuses.group_processing_status.status", "completed")
        .order("start_date", { ascending: true, nullsFirst: true });

      if (filters?.skillId) query.eq("skill_id", filters.skillId);
      if (filters?.startDate) query.gte("start_date", filters.startDate);
      if (filters?.endDate) query.lte("end_date", filters.endDate);

      const { data: reports, error } = await query;

      if (error) {
        this.handleError(error, "fetching profile reports", { profileId });
      }

      // Deduplicate reports by their date periods
      const dedupedReports = this.dedupeReports(reports);

      // Remove the processing_status field before returning
      return _.map(dedupedReports, (report) => {
        const processingStatus = _.last(
          _.sortBy(report.processing_statuses, (status) =>
            dayjs(status.created_at).valueOf(),
          ),
        );

        if (!processingStatus) {
          throw new ReportError("No processing status found for report");
        }

        return {
          ..._.omit(
            report,
            "processing_statuses" satisfies keyof typeof report,
          ),
          processing_status: processingStatus,
        };
      });
    } catch (error) {
      if (error instanceof ReportError) throw error;
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "fetching profile reports",
        { profileId },
      );
    }
  }

  /**
   * Get detailed information for a specific report
   *
   * @param reportId - The report ID to fetch
   * @returns Detailed report data including sections, goals, and visible moments
   */
  public async getReportDetail(reportId: string): Promise<ReportDetail | null> {
    try {
      const { data: report, error } = await this.supabase
        .from("reports")
        .select(
          `
            *,
            processing_statuses:report_processing_status!inner(
              id,
              status,
              created_at,
              group_processing_status:group_report_processing_status!inner(
                id,
                status
              )
            ),
            skill:skills(
              id, 
              title, 
              icon,
              scales:skill_scales(*)
            ),
            report_sections(*),
            report_goals(
              *,
              goal:goals!inner(*, signals:goal_signals(*))
            ),
            report_moments!inner(
              *,
              moment:moments!inner(*, subtags:moment_subtags(*))
            ),
            report_comments(*, user:profiles!inner(*))
          `,
        )
        .eq("id", reportId)
        .eq("is_hidden", false)
        .eq("processing_statuses.status", "completed")
        .eq("processing_statuses.group_processing_status.status", "completed")
        .eq("report_moments.is_visible", true)
        .is("report_moments.omission_reason", null)
        .single();

      if (error) {
        this.handleError(error, "fetching report detail", { reportId });
      }

      const processingStatus = _.last(
        _.sortBy(
          report.processing_statuses,
          "created_at" satisfies keyof (typeof report.processing_statuses)[number],
        ),
      );

      if (!processingStatus) {
        throw new ReportError("No processing status found for report");
      }

      return {
        ..._.omit(report, "processing_statuses" satisfies keyof typeof report),
        processing_status: processingStatus,
      };
    } catch (error) {
      if (error instanceof ReportError) throw error;
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "fetching report detail",
        { reportId },
      );
    }
  }

  /**
   * Get visible moments for a specific report
   *
   * @param reportId - The report ID to fetch moments for
   * @param options - Optional pagination parameters
   * @returns Array of visible moments with their associated data
   */
  public async getReportVisibleMoments(
    reportId: string,
    options: MomentFetchOptions = {},
  ) {
    try {
      const limit = options.limit || 50;
      const page = options.page || 1;
      const startIndex = (page - 1) * limit;

      const { data: moments, error } = await this.supabase
        .from("report_moments")
        .select(
          `
            *,
            moment:moments(
              *,
              subtags:moment_subtags(*)
            ),
            report_goal_signal:report_goal_signals(*)
          `,
        )
        .eq("report_id", reportId)
        .eq("is_visible", true)
        .is("omission_reason", null)
        .range(startIndex, startIndex + limit - 1)
        .order("score", { ascending: false });

      if (error) {
        this.handleError(error, "fetching report moments", {
          reportId,
          ...options,
        });
      }

      return moments || [];
    } catch (error) {
      if (error instanceof ReportError) throw error;
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "fetching report moments",
        { reportId, ...options },
      );
    }
  }

  /**
   * Get all goals for a specific report with their signals
   *
   * @param reportId - The report ID to fetch goals for
   * @returns Array of goals with their associated signals
   */
  public async getReportGoals(reportId: string) {
    try {
      const { data: goals, error } = await this.supabase
        .from("report_goals")
        .select(
          `
            *,
            goal:goals!inner(
              *,
              signals:goal_signals(*)
            )
          `,
        )
        .eq("report_id", reportId);

      if (error) {
        this.handleError(error, "fetching report goals", { reportId });
      }

      return goals || [];
    } catch (error) {
      if (error instanceof ReportError) throw error;
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "fetching report goals",
        { reportId },
      );
    }
  }

  /**
   * Get comments for a specific report
   *
   * @param reportId - The report ID to fetch comments for
   * @returns Array of comments with user information
   */
  public async getReportComments(reportId: string) {
    try {
      const { data: comments, error } = await this.supabase
        .from("report_comments")
        .select(
          `
            *,
            user:profiles!inner(*)
          `,
        )
        .eq("report_id", reportId)
        .order("created_at", { ascending: true });

      if (error) {
        this.handleError(error, "fetching report comments", { reportId });
      }

      return comments || [];
    } catch (error) {
      if (error instanceof ReportError) throw error;
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "fetching report comments",
        { reportId },
      );
    }
  }

  /**
   * Get adjacent reports for a profile
   *
   * @param profileId - The profile ID to fetch reports for
   * @param currentGroupId - The current group ID to find adjacent reports for
   * @returns Object containing current, previous, and next reports
   */
  public async getAdjacentReports(
    profileId: string,
    currentGroupId: string,
  ): Promise<AdjacentReports> {
    try {
      const { report_id: reportId, skill_id: skillId } =
        await this.getIdsFromGroupReportProcessingStatusId(currentGroupId);

      const allReports = await this.getProfileHistoricalReportsList(profileId, {
        skillId: skillId ?? undefined,
      });

      const currentReportIndex = allReports.findIndex(
        (report) => report.id === reportId,
      );

      if (currentReportIndex === -1) {
        return {
          current: null,
          previous: null,
          next: null,
        };
      }

      const currentReport = allReports[currentReportIndex];
      const previousReport = allReports[currentReportIndex - 1];
      const nextReport = allReports[currentReportIndex + 1];

      return {
        current: currentReport ? this.toAdjacentReport(currentReport) : null,
        previous: previousReport ? this.toAdjacentReport(previousReport) : null,
        next: nextReport ? this.toAdjacentReport(nextReport) : null,
      };
    } catch (error) {
      if (error instanceof ReportError) throw error;
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "getting adjacent reports",
        { profileId, currentGroupId },
      );
    }
  }

  /**
   * Calculate historical skill scores for a profile across multiple reports
   * Returns an array of report dates and their calculated scores
   *
   * @deprecated Use calculateHistoricalSkillScoresBatched instead to avoid N+1 query issues
   * @param profileId - ID of the profile to calculate scores for
   * @param skillId - ID of the skill to calculate scores for
   * @returns Array of historical score data, ordered chronologically
   */
  public async calculateHistoricalSkillScores(
    profileId: string,
    skillId: string,
  ): Promise<HistoricalSkillScore[]> {
    try {
      // First, get the skill with its scales
      const { data: skill, error: skillError } = await this.supabase
        .from("skills")
        .select(
          `
            id,
            scales:skill_scales(positive_tag_title, negative_tag_title)
          `,
        )
        .eq("id", skillId)
        .single();

      if (skillError) {
        this.handleError(skillError, "fetching skill", { skillId });
      }

      if (!skill) {
        return [];
      }

      // Get all completed reports for this profile and skill
      const { data: reports, error: reportsError } = await this.supabase
        .from("reports")
        .select(
          `
            id,
            start_date,
            end_date,
            processing_status:report_processing_status!inner(status, group_processing_status_id)
          `,
        )
        .eq("profile_id", profileId)
        .eq("skill_id", skillId)
        .eq("is_hidden", false)
        .eq("processing_status.status", "completed")
        .order("start_date", { ascending: true });

      if (reportsError) {
        this.handleError(reportsError, "fetching reports", {
          profileId,
          skillId,
        });
      }

      if (!reports?.length) return [];

      // Deduplicate reports by their date periods
      const dedupedReports = this.dedupeReports(reports);

      // For each report, fetch the visible moments with their subtags
      const results = await Promise.all(
        dedupedReports.map(async (report) => {
          const { data: reportMoments, error: momentsError } =
            await this.supabase
              .from("report_moments")
              .select(
                `
                  report_id,
                  is_visible,
                  omission_reason,
                  moment:moments!inner(
                    _internal_thumbs_down,
                    subtags:moment_subtags(tag)
                  )
                `,
              )
              .eq("report_id", report.id)
              .eq("is_visible", true)
              .is("omission_reason", null);

          if (momentsError) {
            this.handleError(momentsError, "fetching moments", {
              reportId: report.id,
            });
          }

          // Calculate score using the existing function
          const {
            score,
            positiveTagCounts,
            negativeTagCounts,
            totalTagCounts,
          } = this.calculateSkillScore(skill, reportMoments || []);

          return {
            reportId: report.id,
            groupId: report.processing_status?.[0]?.group_processing_status_id,
            startDate: report.start_date,
            endDate: report.end_date,
            score: Math.round(score * 100), // Convert to percentage
            positiveTagCount: positiveTagCounts,
            negativeTagCount: negativeTagCounts,
            totalTagCount: totalTagCounts,
          };
        }),
      );

      // Sort results by date in ascending order
      return results.sort(
        (a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf(),
      );
    } catch (error) {
      if (error instanceof ReportError) throw error;
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "calculating historical skill scores",
        { profileId, skillId },
      );
    }
  }

  /**
   * Optimized version of calculateHistoricalSkillScores that reduces database calls
   * by batching the moment fetching in a single query
   *
   * @param profileId - ID of the profile to calculate scores for
   * @param skillId - ID of the skill to calculate scores for
   * @returns Array of historical score data, ordered chronologically
   */
  public async calculateHistoricalSkillScoresBatched(
    profileId: string,
    skillId: string,
  ): Promise<HistoricalSkillScore[]> {
    try {
      // First, get the skill with its scales
      const { data: skill, error: skillError } = await this.supabase
        .from("skills")
        .select(
          `
            id,
            scales:skill_scales(positive_tag_title, negative_tag_title)
          `,
        )
        .eq("id", skillId)
        .single();

      if (skillError) {
        this.handleError(skillError, "fetching skill", { skillId });
      }

      if (!skill?.scales?.length) {
        return [];
      }

      // Get all completed reports for this profile and skill
      const { data: reports, error: reportsError } = await this.supabase
        .from("reports")
        .select(
          `
            id,
            start_date,
            end_date,
            processing_status:report_processing_status!inner(status, group_processing_status_id)
          `,
        )
        .eq("profile_id", profileId)
        .eq("skill_id", skillId)
        .eq("is_hidden", false)
        .eq("processing_status.status", "completed")
        .order("start_date", { ascending: true });

      if (reportsError) {
        this.handleError(reportsError, "fetching reports", {
          profileId,
          skillId,
        });
      }

      if (!reports?.length) return [];

      // Deduplicate reports by their date periods
      const dedupedReports = this.dedupeReports(reports);

      // Get report IDs
      const reportIds = dedupedReports.map((report) => report.id);

      // Fetch all moments for all reports in a single query
      const { data: allReportMoments, error: momentsError } =
        await this.supabase
          .from("report_moments")
          .select(
            `
              is_visible,
              omission_reason,
              report_id,
              moment:moments(
                _internal_thumbs_down,
                subtags:moment_subtags(tag)
              )
            `,
          )
          .in("report_id", reportIds)
          .eq("is_visible", true)
          .is("omission_reason", null);

      if (momentsError) {
        this.handleError(momentsError, "fetching all moments", { reportIds });
      }

      // Group moments by report ID
      const momentsByReport = _.groupBy(allReportMoments || [], "report_id");

      // Calculate scores for each report
      const results = dedupedReports
        .map((report) => {
          const reportMoments = momentsByReport[report.id] || [];

          if (!reportMoments.length) return;

          const {
            score,
            positiveTagCounts,
            negativeTagCounts,
            totalTagCounts,
          } = this.calculateSkillScore(skill, reportMoments);

          return {
            reportId: report.id,
            groupId: report.processing_status?.[0]?.group_processing_status_id,
            startDate: report.start_date,
            endDate: report.end_date,
            score: Math.round(score * 100), // Convert to percentage
            positiveTagCount: positiveTagCounts,
            negativeTagCount: negativeTagCounts,
            totalTagCount: totalTagCounts,
          };
        })
        .filter(isTruthy);

      // Sort results by date in ascending order
      return results.sort(
        (a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf(),
      );
    } catch (error) {
      if (error instanceof ReportError) throw error;
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "calculating historical skill scores (batched)",
        { profileId, skillId },
      );
    }
  }
}
