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
import { env } from "~/env";

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
}: MeetingRecapEmailProps) {
  const emailHtml = await render(MeetingRecapEmail({ meeting }));

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
