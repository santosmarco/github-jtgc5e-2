import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { safeParseAsync } from "zod-error";

import { env } from "~/env";
import {
  sendExploreUnlockedEmail,
  sendMeetingRecapEmail,
  sendSkillReportReadyEmail,
} from "~/lib/email";
import { logger } from "~/lib/logging/server";
import {
  type SupabaseServerClient,
  createClient as createSupabaseClient,
} from "~/lib/supabase/server";

const RequestBody = z.discriminatedUnion("templateId", [
  z.object({
    templateId: z.literal("explore-unlocked"),
    variables: z.object({
      profile_id: z.string().min(1, "Required").uuid("Invalid profile ID"),
    }),
  }),
  z.object({
    templateId: z.literal("meeting-recap"),
    variables: z.object({
      meeting_id: z.string().min(1, "Required"),
      sections: z
        .array(z.enum(["topics-discussed", "action-items"]))
        .default(["topics-discussed", "action-items"]),
    }),
  }),
  z.object({
    templateId: z.literal("skill-report-ready"),
    variables: z.object({
      report_id: z.string().min(1, "Required"),
    }),
  }),
]);
type RequestBody = z.infer<typeof RequestBody>;

type ResponseBody =
  | { success: true; messageId: string | null }
  | { success: false; error: string };

function createErrorResponse(
  error: string,
  status: number,
): NextResponse<ResponseBody> {
  return NextResponse.json({ success: false, error }, { status });
}

function createSuccessResponse(
  messageId: string | null,
): NextResponse<ResponseBody> {
  return NextResponse.json({ success: true, messageId }, { status: 200 });
}

async function handleExploreUnlockedEmail(
  supabase: SupabaseServerClient,
  profileId: string,
): Promise<NextResponse<ResponseBody>> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (profileError) {
      logger.error("Failed to fetch profile", {
        error: profileError,
        profileId,
      });
      return createErrorResponse(profileError.message, 404);
    }

    if (!profile) {
      logger.error("Profile not found", { profileId });
      return createErrorResponse("Profile not found", 404);
    }

    const emailData = await sendExploreUnlockedEmail({
      profile,
    });

    logger.info("Successfully sent explore unlocked email", {
      profileId,
      messageId: emailData.id,
    });

    return createSuccessResponse(emailData.id);
  } catch (error) {
    logger.error("Failed to send explore unlocked email", { error });
    return createErrorResponse((error as Error).message, 500);
  }
}

async function handleMeetingRecapEmail(
  supabase: SupabaseServerClient,
  meetingId: string,
  sections: ("topics-discussed" | "action-items")[],
): Promise<NextResponse<ResponseBody>> {
  try {
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .select(
        "*, profile:profiles(*), topics:meeting_topics(*), actionItems:meeting_action_items(*, assignees:meeting_action_item_assignees(assignee:entities(*)))",
      )
      .eq("video_api_id", meetingId)
      .single();

    if (meetingError) {
      logger.error("Failed to fetch meeting", {
        error: meetingError,
        meetingId,
      });
      return createErrorResponse(meetingError.message, 404);
    }

    if (!meeting) {
      logger.error("Meeting not found", { meetingId });
      return createErrorResponse("Meeting not found", 404);
    }

    if (!meeting.profile) {
      logger.error("Meeting profile not found", { meetingId });
      return createErrorResponse("Meeting profile not found", 404);
    }

    const emailData = await sendMeetingRecapEmail({
      meeting: {
        ...meeting,
        profile: meeting.profile,
      },
      sections,
    });

    logger.info("Successfully sent meeting recap email", {
      meetingId,
      messageId: emailData.id,
    });

    return createSuccessResponse(emailData.id);
  } catch (error) {
    logger.error("Failed to send meeting recap email", { error });
    return createErrorResponse((error as Error).message, 500);
  }
}

async function handleSkillReportReadyEmail(
  supabase: SupabaseServerClient,
  reportId: string,
): Promise<NextResponse<ResponseBody>> {
  try {
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("id, profile_id")
      .eq("id", reportId)
      .single();

    if (reportError) {
      logger.error("Failed to fetch report", { error: reportError, reportId });
      return createErrorResponse(reportError.message, 404);
    }

    if (!report) {
      logger.error("Report not found", { reportId });
      return createErrorResponse("Report not found", 404);
    }

    if (!report.profile_id) {
      logger.error("Report profile ID not found", { reportId });
      return createErrorResponse("Report profile ID not found", 404);
    }

    const emailData = await sendSkillReportReadyEmail(report.id, supabase);

    if (!emailData) {
      logger.info("Skipping email send for report", { reportId });
      return createSuccessResponse(null);
    }

    logger.info("Successfully sent skill report ready email", {
      reportId,
      messageId: emailData.id,
    });

    return createSuccessResponse(emailData.id);
  } catch (error) {
    logger.error("Failed to send skill report ready email", { error });
    return createErrorResponse((error as Error).message, 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } },
): Promise<NextResponse<ResponseBody>> {
  try {
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey || apiKey !== env.API_KEY) {
      logger.warn("Unauthorized request - invalid or missing API key");
      return createErrorResponse("Unauthorized", 401);
    }

    const requestBodyParseResult = await safeParseAsync(RequestBody, {
      templateId: params.templateId,
      ...(await request.json()),
    });

    if (!requestBodyParseResult.success) {
      logger.warn("Invalid request body", {
        error: requestBodyParseResult.error,
      });
      return createErrorResponse(requestBodyParseResult.error.message, 400);
    }

    const { data: parsedBody } = requestBodyParseResult;
    const supabase = await createSupabaseClient();

    if (parsedBody.templateId === "explore-unlocked") {
      return handleExploreUnlockedEmail(
        supabase,
        parsedBody.variables.profile_id,
      );
    }

    if (parsedBody.templateId === "meeting-recap") {
      return handleMeetingRecapEmail(
        supabase,
        parsedBody.variables.meeting_id,
        parsedBody.variables.sections,
      );
    }

    if (parsedBody.templateId === "skill-report-ready") {
      return handleSkillReportReadyEmail(
        supabase,
        parsedBody.variables.report_id,
      );
    }

    logger.warn("Invalid template ID received", {
      templateId: params.templateId,
    });

    return createErrorResponse("Invalid template ID", 400);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Unexpected error in email send endpoint", { error });
    return createErrorResponse(errorMessage, 500);
  }
}
