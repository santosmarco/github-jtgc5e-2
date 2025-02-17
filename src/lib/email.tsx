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
  const emailHtml = await render(InvitationEmail({ invite }));

  const data = await resend.emails.send({
    from: "onboarding@emails.withtitan.com",
    to: invite.email,
    subject: "Create Your Account On Titan GameTape",
    html: emailHtml,
  });

  return data;
}

export async function sendExploreUnlockedEmail({
  profile,
}: ExploreUnlockedEmailProps) {
  const emailHtml = await render(ExploreUnlockedEmail({ profile }));

  const data = await resend.emails.send({
    from: "onboarding@emails.withtitan.com",
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

  const data = await resend.emails.send({
    from: "onboarding@emails.withtitan.com",
    to: meeting.profile.email,
    subject: "Your Meeting Recap is Ready",
    html: emailHtml,
  });

  return data;
}
