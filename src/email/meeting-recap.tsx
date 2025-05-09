import { Button, Hr, Section, Text } from "@react-email/components";
import type { Except } from "type-fest";

import type { Tables } from "~/lib/supabase/database.types";
import type { RouterOutputs } from "~/trpc/react";

import { ActionItemsSection } from "./_components/action-items-section";
import { BASE_URL, COMPANY_NAME } from "./_components/constants";
import { EmailContainer } from "./_components/email-container";
import { MeetingSummarySection } from "./_components/meeting-summary-section";

export type MeetingRecapEmailProps = {
  meeting: Pick<
    Tables<"meetings">,
    "video_api_id" | "name" | "summary" | "date"
  > & {
    profile: Pick<Tables<"profiles">, "nickname" | "email">;
    topics: Pick<Tables<"meeting_topics">, "title" | "summary">[];
    actionItems:
      | Except<
          NonNullable<RouterOutputs["actionItems"]["getByVideoId"]>[number],
          "meeting"
        >[]
      | null;
  };
  sections: ("topics-discussed" | "action-items")[];
};

export function MeetingRecapEmail({
  meeting,
  sections,
}: MeetingRecapEmailProps) {
  const previewText = "Your meeting insights are ready";
  const meetingUrl = new URL(`/videos/${meeting.video_api_id}`, BASE_URL);

  return (
    <EmailContainer previewText={previewText}>
      <Text className="text-sm leading-6 text-gray-800">
        Hi {meeting.profile.nickname}! 👋
      </Text>

      <Text className="text-pretty text-sm leading-6 text-gray-800">
        We&apos;ve analyzed your meeting{" "}
        <strong>&quot;{meeting.name}&quot;</strong> and prepared some valuable
        insights just for you. Here&apos;s what we discovered:
      </Text>

      {sections.map((section, index) => {
        if (section === "topics-discussed") {
          return (
            <MeetingSummarySection
              key={`${section}-${index}`}
              summary={meeting.summary}
            />
          );
        }

        if (section === "action-items") {
          return (
            <ActionItemsSection
              key={`${section}-${index}`}
              actionItems={meeting.actionItems}
            />
          );
        }
      })}

      <Section className="my-8 text-center">
        <Button
          className="rounded bg-black px-5 py-3 text-xs font-semibold text-white no-underline hover:bg-gray-900"
          href={meetingUrl.toString()}
        >
          View Detailed Analysis
        </Button>
      </Section>

      <Text className="text-sm leading-6 text-gray-800">
        Have questions or need assistance? Our team is here to help you make the
        most of your meeting insights!
      </Text>

      <Hr />

      <Text className="text-sm leading-6 text-gray-800">
        Best regards,
        <br />
        The {COMPANY_NAME} Team
      </Text>
    </EmailContainer>
  );
}

const previewProps: MeetingRecapEmailProps = {
  meeting: {
    date: "2024-01-01",
    video_api_id: "1",
    name: "Weekly Strategy Sync",
    summary:
      "Discussed Q1 objectives, reviewed project timelines, and aligned on next steps for the product launch.",
    profile: {
      nickname: "John",
      email: "john@example.com",
    },
    topics: [
      {
        title: "Q1 Objectives Review",
        summary:
          "Reviewed and updated progress on key Q1 goals, identifying areas needing additional focus.",
      },
      {
        title: "Project Timeline Review",
        summary:
          "Reviewed and updated progress on key Q1 goals, identifying areas needing additional focus.",
      },
    ],
    actionItems: [
      {
        id: "1",
        api_video_id: "1",
        text: "Update project timeline",
        created_at: new Date().toISOString(),
        completed_at: null,
        deleted_at: null,
        due_date: null,
        vtt_start_segment_id: null,
        vtt_end_segment_id: null,
        assignees: [
          {
            assignee: {
              id: "1",
              name: "John Doe",
              created_at: "2021-01-01",
              master_profile_id: "1",
              attributes: {},
              is_test: false,
              type: "Person",
            },
          },
        ],
        server_deleted_at: null,
        completed: false,
        completed_date: null,
      },
    ],
  },
  sections: ["topics-discussed", "action-items"],
};

MeetingRecapEmail.PreviewProps = previewProps;

export default MeetingRecapEmail;
