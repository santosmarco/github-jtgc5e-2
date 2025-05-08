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

import { logger } from "./logging/server";
import { generateReportSections } from "./reports/ai";
import {
  fetchReportsForHistoricalSkillScore,
  getHistoricalReportScores,
  getReportScores,
} from "./reports/scoring";
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
    const supabase = await createClient();

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select(
        `
          id,
          skill_id,
          profile_id,
          start_date,
          end_date,
          skill:skills!inner(
            id,
            title,
            internal_title,
            scales:skill_scales(*)
          ),
          report_moments!inner(
            id,
            moment:moments!inner(
              id,
              meeting:meetings!inner(
                video_api_id,
                duration_in_ms
              )
            )
          ),
          profile:profiles!inner(
            id,
            email,
            nickname,
            user_settings(
              report_email_template
            )
          )
        `,
      )
      .eq("id", reportId)
      .single();

    if (reportError) {
      throw reportError;
    }

    if (!report.skill) {
      throw new Error("Report has no skill");
    }

    if (!report.profile) {
      throw new Error("Report has no profile");
    }

    const reports = await fetchReportsForHistoricalSkillScore(
      report.skill.id,
      report.profile.id,
      supabase,
    );

    const scorableReport = reports.find(
      (historicalReport) => historicalReport.id === report.id,
    );
    if (!scorableReport) {
      logger.info(`Report ${report.id} has no scores, skipping email`, {
        report,
      });
      return;
    }

    const emailVariant =
      report.profile.user_settings[0]?.report_email_template ??
      "skill-report-ready-founder";
    const previewText = `📊 Your ${report.skill.internal_title} insights report is ready to view`;
    const baseReportUrl = `https://app.withtitan.com/goals/reports/${report.id}`;
    const historicalScores = getHistoricalReportScores(
      report.skill.id,
      reports,
    ).scores;

    const { teaser, ...sections } = await generateReportSections(
      reportId,
      supabaseClient,
    );

    const meetingMinutes = report.report_moments.reduce(
      (total, moment) =>
        total + (moment.moment.meeting?.duration_in_ms ?? 0) / 1000 / 60,
      0,
    );

    // Render the email
    const emailHtml = await render(
      SkillReportReadyEmail({
        variant: emailVariant,
        previewText,
        baseReportUrl,
        report: {
          ...report,
          skill: report.skill,
          profile: report.profile,
          scores: getReportScores(scorableReport),
        },
        historicalScores,
        teaser,
        sections,
        meetingMinutes,
      }),
    );

    // Create a descriptive subject line
    const skillTitle = report.skill?.title || "Leadership";
    const subject = `Your ${skillTitle} Performance Report is Ready`;

    // Send the email
    const data = await resend.emails.send({
      from: "Titan <onboarding@emails.withtitan.com>",
      to: IS_TESTING_REPORT_READY_EMAIL
        ? `marco+${_.camelCase(report.profile.nickname ?? report.profile.id)}@withtitan.com`
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
