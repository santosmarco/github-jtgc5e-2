import { render } from "@react-email/components";
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

import { ReportsService } from "./reports/queries";
import { getReportScores } from "./reports/scoring";
import { createClient } from "./supabase/server";

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

export async function sendSkillReportReadyEmail({
  profileId,
  reportId,
}: {
  profileId: string;
  reportId: string;
}) {
  // Calculate current score using getReportScores
  const supabase = await createClient();
  const { data: report } = await supabase
    .from("reports")
    .select(
      "*, skill:skills(*, scales:skill_scales(*)), report_moments(*, moment:moments(*, subtags:moment_subtags(*))), report_goals(*), report_processing_status(*, group_report_processing_status(*))",
    )
    .eq("id", reportId)
    .single();

  if (!report) {
    throw new Error("Report not found");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (!profile) {
    throw new Error("Profile not found");
  }

  const currentScoreResult = getReportScores(report);
  const score = Math.round((currentScoreResult.finalScore ?? 0) * 100);

  // Calculate previous score using ReportsService
  let previousScore: number | undefined = undefined;
  if (profileId && report.skill?.id) {
    const supabase = await createClient();
    const reportsService = new ReportsService(supabase);
    const historicalScores =
      await reportsService.calculateHistoricalSkillScoresBatched(
        profileId,
        report.skill.id,
      );
    // Find the previous score (last score before this report's start_date)
    if (historicalScores.length > 0 && report.start_date) {
      const reportStartDate = report.start_date
        ? new Date(report.start_date)
        : undefined;
      const prev = historicalScores
        .filter(
          (r) =>
            r.reportId !== report.id &&
            r.startDate &&
            reportStartDate &&
            new Date(r.startDate) < reportStartDate,
        )
        .sort((a, b) => {
          const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
          return bDate - aDate;
        })[0];
      if (prev) previousScore = prev.score;
    }
  }

  // Compose the report object for the email template
  const reportWithScores = {
    ...report,
    id:
      report.report_processing_status[0]?.group_report_processing_status.id ??
      report.id,
    score,
    previous_score: previousScore,
  };

  const emailHtml = await render(
    SkillReportReadyEmail({ profile, report: reportWithScores }),
  );

  // Get skill name for the subject line if available
  const skillName = report.skill?.title || "Skills";

  // Calculate if score improved (if we have the data)
  const hasScoreData = score !== undefined && previousScore !== undefined;
  const scoreImproved = hasScoreData ? score > (previousScore ?? 0) : false;

  // Create an intriguing subject line - using a variety of click-bait options
  let subject = "";

  // Choose a subject line based on whether we have score data
  if (hasScoreData && scoreImproved) {
    subject = `🚀 Surprising ${skillName} trends: See what's improved`;
  } else if (hasScoreData && !scoreImproved) {
    subject = `⚠️ Important ${skillName} alert: Critical patterns detected`;
  } else {
    // Pick a random intriguing subject line if we don't have score data
    const subjectOptions = [
      `🔎 Revealing: Hidden patterns in your ${skillName}`,
      `👀 See what we uncovered in your ${skillName} analysis`,
      `🔒 Exclusive: Your ${skillName} insights are ready`,
    ];
    subject =
      subjectOptions[Math.floor(Math.random() * subjectOptions.length)] ??
      `🔎 Revealing: Hidden patterns in your ${skillName}`;
  }

  const data = await resend.emails.send({
    from: "Titan <onboarding@emails.withtitan.com>",
    to: profile.email,
    subject,
    html: emailHtml,
  });

  return data;
}
