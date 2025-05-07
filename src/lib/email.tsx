import { render } from "@react-email/components";
import type { SupabaseClient } from "@supabase/supabase-js";
import _ from "lodash";
import { Resend } from "resend";

import {
  ExploreUnlockedEmail,
  type ExploreUnlockedEmailProps,
} from "~/email/explore-unlocked";
import {
  InvitationEmail,
  type InvitationEmailProps,
} from "~/email/invite-user";
import MeetingRecapEmail, {
  type MeetingRecapEmailProps,
} from "~/email/meeting-recap";
import { SkillReportReadyEmail } from "~/email/skill-report-ready";
import SuggestedTopicsEmail, {
  type SuggestedTopicsEmailProps,
} from "~/email/suggested-topics";
import { env } from "~/env";
import { generateReportSections } from "~/lib/reports/ai";
import { ReportsService } from "~/lib/reports/queries";

import type { Database } from "./supabase/database.types";
import { createClient } from "./supabase/server";

const IS_TESTING_REPORT_READY_EMAIL = true;

const resend = new Resend(env.RESEND_API_KEY);

export async function sendInvitationEmail({ invite }: InvitationEmailProps) {
  try {
    const emailHtml = await render(InvitationEmail({ invite }));

    const data = await resend.emails.send({
      from: "Titan <onboarding@emails.withtitan.com>",
      to: invite.email,
      subject: "Create Your Account On Titan GameTape",
      html: emailHtml,
    });

    if (!data || data.error) {
      console.error("Resend API error:", data?.error);
      throw new Error(data?.error?.message || "Failed to send email");
    }

    return data;
  } catch (error) {
    console.error("Email sending error:", error);
    throw error; // Re-throw to be handled by the caller
  }
}

export async function sendExploreUnlockedEmail({
  profile,
}: ExploreUnlockedEmailProps) {
  const emailHtml = await render(ExploreUnlockedEmail({ profile }));

  const data = await resend.emails.send({
    from: "Titan <onboarding@emails.withtitan.com>",
    to: profile.email,
    subject: "🎉 Congrats! Start Exploring Your Performance with GameTape",
    html: emailHtml,
  });

  return data;
}

export async function sendMeetingRecapEmail({
  meeting,
  sections,
}: MeetingRecapEmailProps) {
  const emailHtml = await render(MeetingRecapEmail({ meeting, sections }));

  // Format date if available
  const meetingDate = meeting.date
    ? new Date(meeting.date).toLocaleDateString()
    : "";

  // Get meeting name or use a fallback
  const meetingName = meeting.name || "Meeting";

  // Get assignees if available (as a representation of attendees)
  let attendeeNames = "";
  if (meeting.actionItems && meeting.actionItems.length > 0) {
    const uniqueAttendees = new Set<string>();

    for (const item of meeting.actionItems) {
      if (item.assignees) {
        for (const assignee of item.assignees) {
          if (assignee.assignee?.name) {
            uniqueAttendees.add(assignee.assignee.name);
          }
        }
      }
    }

    if (uniqueAttendees.size > 0) {
      const attendeesList = Array.from(uniqueAttendees);
      if (attendeesList.length <= 3) {
        attendeeNames = ` with ${attendeesList.join(", ")}`;
      } else {
        attendeeNames = ` with ${attendeesList.slice(0, 2).join(", ")} and ${attendeesList.length - 2} others`;
      }
    }
  }

  // Create a subject that includes date, title, and attendees
  const subject = `Meeting Recap: ${meetingName}${meetingDate ? ` (${meetingDate})` : ""}${attendeeNames}`;

  const data = await resend.emails.send({
    from: "Titan <onboarding@emails.withtitan.com>",
    to: meeting.profile.email,
    subject,
    html: emailHtml,
  });

  return data;
}

export async function sendSuggestedTopicsEmail({
  profile,
  suggested_topics,
  meetingHours,
}: SuggestedTopicsEmailProps) {
  const supabase = await createClient();

  const emailHtml = await render(
    SuggestedTopicsEmail({ profile, suggested_topics, meetingHours }),
  );

  const { data: coach } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profile.coach_id ?? "")
    .single();

  const subject = `Suggested Topics for Your Coaching Session${
    coach?.nickname ? ` with ${coach.nickname}` : ""
  }`;

  const data = await resend.emails.send({
    from: "Titan <onboarding@emails.withtitan.com>",
    to: profile.email,
    subject,
    html: emailHtml,
  });

  return data;
}

export async function sendSkillReportReadyEmail(
  reportId: string,
  supabaseClient: SupabaseClient<Database>,
) {
  try {
    // Create ReportsService instance
    const reportsService = new ReportsService(supabaseClient);

    // Fetch the report data
    const { data: report, error: reportError } = await supabaseClient
      .from("reports")
      .select(
        `
          *,
          profile:profiles(*),
          skill:skills(
            *,
            scales:skill_scales(*)
          ),
          report_goals(*),
          report_moments(
            *,
            moment:moments!inner(
              *,
              subtags:moment_subtags(*)
            )
          )
        `,
      )
      .eq("id", reportId)
      .single();

    if (reportError || !report?.profile) {
      console.error("Error fetching report:", reportError);
      throw new Error(
        reportError?.message || "Failed to fetch report or profile",
      );
    }

    // Get user settings to determine which email template to use
    const { data: userSettings, error: settingsError } = await supabaseClient
      .from("user_settings")
      .select("report_email_template")
      .eq("profile_id", report.profile_id || "")
      .single();

    if (settingsError) {
      console.error("Error fetching user settings:", settingsError);
      // Default to founder template if there's an error
    }

    // Determine the variant based on user settings or default to founder
    const variant: "manager" | "founder" =
      userSettings?.report_email_template === "skill-report-ready-manager"
        ? "manager"
        : "founder";

    // Calculate meeting minutes by fetching all meetings for this profile in the report date range
    let meetingMinutes = 0;
    if (report.start_date && report.end_date) {
      const { data: meetings, error: meetingsError } = await supabaseClient
        .from("meetings")
        .select("duration_in_seconds")
        .eq("profile_id", report.profile_id || "")
        .gte("date", report.start_date)
        .lte("date", report.end_date);

      if (!meetingsError && meetings && meetings.length > 0) {
        meetingMinutes = meetings.reduce((total, meeting) => {
          return total + (meeting.duration_in_seconds || 0) / 60;
        }, 0);
      }
    }

    // Calculate current report score
    const skillScore =
      report.skill && report.report_moments
        ? reportsService.calculateSkillScore(
            {
              scales: report.skill.scales || [],
            },
            report.report_moments,
          )
        : { score: 0.5 }; // Default score if no data

    // Get historical scores
    const historicalScores =
      report.profile_id && report.skill?.id
        ? await reportsService.calculateHistoricalSkillScoresBatched(
            report.profile_id,
            report.skill.id,
          )
        : [];

    // Find previous report score
    const previousScore =
      historicalScores.length > 1
        ? (historicalScores[historicalScores.length - 2]?.score ?? 0) * 100
        : undefined;

    // Generate the sections using AI
    const generatedSections = await generateReportSections(
      reportId,
      supabaseClient,
    );

    // Format historical scores for the email template
    const formattedHistoricalScores = historicalScores.map((score) => ({
      score: score.score * 100, // Convert to percentage
      reportId: score.reportId,
      startDate: score.startDate || "",
    }));

    // Build the report data in the format expected by the email component
    const reportData = {
      id: report.id,
      start_date: report.start_date,
      end_date: report.end_date,
      created_at: report.created_at,
      skill: report.skill
        ? {
            id: report.skill.id,
            title: report.skill.title,
            description: report.skill.description || undefined,
          }
        : undefined,
      report_goals: report.report_goals || [],
      report_moments: report.report_moments || [],
      // Include calculated scores
      score: skillScore.score,
      previous_score: previousScore,
      historical_scores: formattedHistoricalScores,
    };

    // Prepare the email props
    const emailProps = {
      variant,
      profile: {
        nickname: report.profile.nickname || "",
        email: report.profile.email,
        coach_id: report.profile.coach_id,
      },
      report: reportData,
      meetingMinutes: Math.round(meetingMinutes),
      teaser: generatedSections.teaser,
      generatedSections,
    };

    // Render the email
    const emailHtml = await render(SkillReportReadyEmail(emailProps));

    // Create a descriptive subject line
    const skillTitle = report.skill?.title || "Leadership";
    const subject = `Your ${skillTitle} Performance Report is Ready`;

    // Send the email
    const data = await resend.emails.send({
      from: "Titan <onboarding@emails.withtitan.com>",
      to: IS_TESTING_REPORT_READY_EMAIL
        ? `marco+${_.camelCase(emailProps.profile.nickname)}@withtitan.com`
        : report.profile.email,
      subject,
      html: emailHtml,
    });

    if (!data || data.error) {
      console.error("Resend API error:", data?.error);
      throw new Error(data?.error?.message || "Failed to send email");
    }

    return data;
  } catch (error) {
    console.error("Error sending skill report email:", error);
    throw error;
  }
}
