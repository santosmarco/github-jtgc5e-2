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
import { isTruthy } from "./utils";

const IS_TESTING_REPORT_READY_EMAIL = true;

const resend = new Resend(env.RESEND_API_KEY);

async function sendEmail(
  element: React.ReactElement,
  { to, subject }: { to: string | string[]; subject: string },
) {
  try {
    logger.info("Sending email", { to, subject });

    const [emailHtml, plainText] = await Promise.all([
      render(element),
      render(element, { plainText: true }),
    ]);

    const { data, error } = await resend.emails.send({
      from: "Titan <onboarding@emails.withtitan.com>",
      to,
      subject,
      html: emailHtml,
      text: plainText,
    });

    if (error) {
      logger.error("Resend API error:", { error });
      throw new Error(error.message || "Failed to send email");
    }

    if (!data) {
      logger.error("No data returned from Resend");
      throw new Error("No data returned from Resend");
    }

    logger.info("Email sent successfully", { data });

    return data;
  } catch (error) {
    logger.error("Email sending error:", { error });
    throw error;
  }
}

export async function sendInvitationEmail({ invite }: InvitationEmailProps) {
  return sendEmail(<InvitationEmail invite={invite} />, {
    to: invite.email,
    subject: "Create Your Account On Titan GameTape",
  });
}

export async function sendExploreUnlockedEmail({
  profile,
}: ExploreUnlockedEmailProps) {
  return sendEmail(<ExploreUnlockedEmail profile={profile} />, {
    to: profile.email,
    subject: "🎉 Congrats! Start Exploring Your Performance with GameTape",
  });
}

export async function sendMeetingRecapEmail({
  meeting,
  sections,
}: MeetingRecapEmailProps) {
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

  return sendEmail(
    <MeetingRecapEmail meeting={meeting} sections={sections} />,
    {
      to: meeting.profile.email,
      subject,
    },
  );
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
          skill:skills(
            id,
            title,
            internal_title,
            scales:skill_scales(*)
          ),
          report_moments(
            id,
            moment:moments(
              id,
              meeting:meetings(
                video_api_id,
                duration_in_ms
              )
            )
          ),
          profile:profiles(
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

    if (report.report_moments.length === 0) {
      logger.info(`Report ${report.id} has no moments, skipping email`, {
        report,
      });
      return;
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

    const meetingMinutes = _.uniqBy(
      report.report_moments
        .map(({ moment }) => moment.meeting)
        .filter(isTruthy),
      (meeting) => meeting.video_api_id,
    ).reduce((total, meeting) => total + meeting.duration_in_ms / 1000 / 60, 0);

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

    const subject = `Your ${report.skill.internal_title} Performance Report is Ready`;

    return sendEmail(
      <SkillReportReadyEmail
        variant={emailVariant}
        previewText={previewText}
        baseReportUrl={baseReportUrl}
        report={{
          ...report,
          skill: report.skill,
          profile: report.profile,
          scores: getReportScores(scorableReport),
        }}
        historicalScores={historicalScores}
        teaser={teaser}
        sections={sections}
        meetingMinutes={meetingMinutes}
      />,
      {
        to: IS_TESTING_REPORT_READY_EMAIL
          ? `marco+${_.camelCase(report.profile.nickname ?? report.profile.id)}@withtitan.com`
          : report.profile.email,
        subject,
      },
    );
  } catch (error) {
    logger.error("Error sending skill report email:", { error });
    throw error;
  }
}
