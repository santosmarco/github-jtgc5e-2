import type { NextRequest } from "next/server";
import { getVideoSourceUrl } from "~/lib/api-video/videos";
import { createClient } from "~/lib/supabase/server";

type VideoDownloadParams = {
  params: { videoId: string };
};

const createErrorResponse = (message: string, status: number): Response => {
  return new Response(message, { status });
};

/**
 * Downloads a video file for an authenticated user if they have access to it.
 * Handles authentication, authorization, and streaming of video content.
 */
export async function GET(_req: NextRequest, { params }: VideoDownloadParams) {
  try {
    // Authentication check
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return createErrorResponse("Unauthorized", 401);
    }

    const { videoId } = params;
    if (!videoId) {
      return createErrorResponse("Missing videoId", 400);
    }

    // Authorization check - verify user owns the meeting
    const { data: meeting } = await supabase
      .from("meetings")
      .select("video_api_id, name, profile_id")
      .eq("video_api_id", videoId)
      .single();

    if (!meeting) {
      return createErrorResponse("Meeting not found", 404);
    }

    if (meeting.profile_id !== session.user.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    // Fetch video source URL with proper token handling
    const videoSrc = await getVideoSourceUrl(videoId);
    if (!videoSrc) {
      return createErrorResponse("Video not found", 404);
    }

    // Stream video content
    const videoResponse = await fetch(videoSrc);
    if (!videoResponse.ok || !videoResponse.body) {
      return createErrorResponse("Failed to fetch video", 502);
    }

    // Prepare response headers
    const contentType =
      videoResponse.headers.get("content-type") ?? "video/mp4";
    const contentLength = videoResponse.headers.get("content-length");
    const sanitizedFileName = encodeURIComponent(
      meeting.name ?? `meeting-${meeting.video_api_id}`,
    );

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${sanitizedFileName}.mp4"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    return new Response(videoResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[download-video] Unexpected error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
