import { Link, Text } from "@react-email/components";

import type { Tables } from "~/lib/supabase/database.types";

import { Button } from "./_components/button";
import { COMPANY_NAME } from "./_components/constants";
import { EmailContainer } from "./_components/email-container";
import { SectionContainer } from "./_components/section-container";

type SuggestedTopic = {
  id: string;
  title_summarized: string | null;
  title: string | null;
  description: string | null;
  isHidden: boolean;
  order: number;
};

export type SuggestedTopicsEmailProps = {
  profile: Pick<Tables<"profiles">, "nickname" | "email" | "coach_id"> & {
    coach?: Pick<Tables<"profiles">, "nickname" | "email">;
  };
  suggested_topics: SuggestedTopic[];
  meetingHours: number;
};

export function SuggestedTopicsEmail({
  profile,
  suggested_topics,
  meetingHours,
}: SuggestedTopicsEmailProps) {
  const previewText = "Suggested Topics for Your Next Coaching Session";
  const sessionsUrl = "https://app.withtitan.com/sessions";

  // Sort topics by order
  const sortedTopics = [...suggested_topics].sort((a, b) => a.order - b.order);
  // Filter visible topics
  const visibleTopics = sortedTopics.filter(
    (topic) => !topic.isHidden && topic.description,
  );

  // Helper function to extract parts of the description
  const extractDescriptionParts = (description: string | null) => {
    if (!description) return { pastContext: "", whyDiscuss: "" };

    const sentences = description.split(". ");
    const whyDiscuss = sentences.pop() || "";
    const pastContext = sentences.slice(1).join(". ");

    return { pastContext, whyDiscuss };
  };

  return (
    <EmailContainer previewText={previewText}>
      <Text className="text-sm leading-6 text-gray-800">
        Hi {profile.nickname},
      </Text>

      <Text className="mb-4 text-pretty text-sm leading-6 text-gray-600">
        We&apos;ve analyzed <strong>{meetingHours} hours</strong> of meetings
        and pulled out the most relevant topics for your next session with{" "}
        {profile.coach?.nickname ? (
          <strong>{profile.coach.nickname}</strong>
        ) : (
          "your coach"
        )}
        .
      </Text>

      {visibleTopics.map((topic, index) => {
        const { pastContext, whyDiscuss } = extractDescriptionParts(
          topic.description,
        );

        return (
          <Link
            key={`topic-${topic.id}`}
            href={sessionsUrl}
            className="block no-underline"
          >
            <SectionContainer
              title={`${index + 1}. ${topic.title_summarized || ""}`}
              titleClassName="text-sm font-bold leading-6 text-gray-800 mb-3"
              className={`mb-4 mt-4 rounded-lg ${
                index % 2 === 0 ? "bg-slate-50" : "bg-sky-50"
              } border-l-2 px-4 py-3 ${
                index % 2 === 0 ? "border-slate-300" : "border-sky-300"
              } transition-shadow duration-150 hover:shadow-md`}
            >
              <div className="mb-4">
                <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Summary
                </Text>
                <Text className="text-pretty text-sm leading-6 text-gray-800">
                  {topic.title}
                </Text>
              </div>

              <div className="mb-4">
                <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Past Context
                </Text>
                <Text className="text-pretty text-sm leading-6 text-gray-800">
                  {pastContext}.
                </Text>
              </div>

              <div>
                <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Why Discuss
                </Text>
                <Text className="text-pretty text-sm leading-6 text-gray-800">
                  {whyDiscuss}
                </Text>
              </div>
            </SectionContainer>
          </Link>
        );
      })}

      <Button href={sessionsUrl}>Learn More</Button>

      <Text className="text-sm leading-6 text-gray-800">
        Best regards,
        <br />
        The {COMPANY_NAME} Team
      </Text>
    </EmailContainer>
  );
}

const previewProps = {
  profile: {
    nickname: "Dhruv",
    email: "dhruv@example.com",
    coach_id: "123",
  },
  suggested_topics: [
    {
      id: "92f3b5b8-c03c-48fe-8bd3-564b98b80150",
      title_summarized: "Symbiont Overstocked 40 Prosthetic Hands",
      description:
        "You're staring down this weird Symbiont overstock situation—40 hands just sitting there and nobody really knows what's next. In the past, you and Barry have talked about how it's easy to start spiraling when the path forward is uncertain, and how building self-trust and acting decisively is a work in progress. If you want to keep moving from reactive to proactive (instead of letting the 'what ifs' take over), it might be a good idea to talk with Barry about how you're planning your next move here.",
      title:
        "You're dealing with Symbiont's excess inventory of 40 prosthetic hands, creating uncertainty about future sales and revenue. You talked with Stanley about inventory-demand mismatch and risks of relying on a single buyer.",
      isHidden: false,
      order: 1,
    },
    {
      id: "4b76f7a3-a8e3-4ab7-a45b-7c11ae9353bf",
      title_summarized: "Coordinating Romanian Arm Repair Across Borders",
      description: null,
      title:
        "You're managing a complex cross-border repair for a Romanian arm case with shipping logistics and battery installation challenges. The team needs to coordinate between production, logistics, and Polish teams to minimize patient wait times.",
      isHidden: true,
      order: 12,
    },
    {
      id: "bd06616b-9eed-4ff5-a362-8be48e133ac8",
      title_summarized: "Addressing Paint Chipping on Prosthetic Hands",
      description:
        "You keep running into this paint chipping thing—even demo units are flaking. You and Barry have explored in your sessions how logging issues and digging into the data helps you feel more in control and less like you're just firefighting. If you're serious about making data-driven fixes (instead of letting things slide or just relying on gut), it might be worth workshopping with Barry how you're closing the loop on these quality problems.",
      title:
        "You're dealing with recurring quality issues where painted prosthetic hands are deteriorating quickly, with chipping even on demo units. The team planned to log incidents, track batch numbers, and work with Vickas on finding the root cause.",
      isHidden: true,
      order: 8,
    },
    {
      id: "e4b778b6-98bc-4652-970a-4e096105a900",
      title_summarized: "Piloting 3D Scanning for Prosthetic Fitting",
      description: null,
      title:
        "You're piloting a 3D scanning/printing process for prosthetic fitting in Ukraine to overcome traditional limitations. You've scheduled the first insurance-reimbursed fitting and need to decide about licensing or acquiring the technology from InnovaMed.",
      isHidden: true,
      order: 11,
    },
    {
      id: "34200b9e-5f87-41c5-8898-b95f32880c0b",
      title_summarized: "Terminating an Underperforming Prosthetist",
      description:
        "You finally pulled the trigger on letting that prosthetist go—no severance, just straight to the point. In your coaching sessions, Barry has helped you recognize how you sometimes build up these big scenarios in your head, but then end up delivering the message in a soft way. If you want to keep getting better at leading with the headline and not burying the lede, maybe talk through this case and see what you'd do differently next time.",
      title:
        "You talked with Stanley about terminating the underperforming prosthetist without severance. You outlined offboarding steps and planned to bring in the Polish specialist temporarily while monitoring the technical team.",
      isHidden: false,
      order: 3,
    },
    {
      id: "ee6ac934-c98a-43f6-ab19-52d678dbad9e",
      title_summarized: "Shifting CIS Market to Performance-Based Distribution",
      description:
        "You're ditching exclusivity in the CIS market—now it's all about who delivers. You and Barry have discussed in your sessions how using real data (not just gut feel) gives you more leverage with partners and your own team. If you want to double down on that data-driven influence, maybe hash out with Barry how you'll actually communicate and enforce this new model.",
      title:
        "You're shifting the CIS market from exclusive distribution to a performance-based model where partners earn exclusivity by delivering 25+ units monthly. You submitted a tender for 50 units using regional variations to gain advantage over Motorica.",
      isHidden: true,
      order: 7,
    },
    {
      id: "25628742-d528-41e4-a932-bb09a70071f6",
      title_summarized: "Preparing for Autobox Acquisition Talks",
      description:
        "Autobox is coming and you know it's one of those make-or-break meetings. In your coaching work with Barry, you've explored how being clear on your own boundaries and leverage helps you show up way stronger. If you want to keep building that muscle, it might be smart to use your time with Barry to prep your game plan—so you're not winging it, but actually leading the conversation.",
      title:
        "You're preparing for high-stakes talks with Autobox about partnership or acquisition, focusing on product enhancements and strategic value. You're considering funding options and negotiating a technology acquisition deal with clear milestones.",
      isHidden: false,
      order: 2,
    },
    {
      id: "4e70b21d-1f02-49bc-a1af-96074e3bdeb2",
      title_summarized: "Cleaning Up US Marketing Contact Lists",
      description:
        "You're still wrangling the mess with HubSpot and those US marketing contacts. You and Barry have worked on how giving clear, actionable feedback gets things moving—but it's easy to slip back into being vague. If you want to make sure your directness is landing, maybe bring this up with Barry and break down what worked and what didn't.",
      title:
        "You're addressing the fragmentation in sales/marketing with incompatible HubSpot usage across regions. You provided feedback on cleaning US marketing contacts with specific deletion criteria and asked Faith to review non-US contacts.",
      isHidden: true,
      order: 9,
    },
    {
      id: "dc2bf756-5bf8-4f5a-9644-6626ee341cd4",
      title_summarized: "Creating Five-Year Plan for Autobahn Meeting",
      description:
        ". You and Barry have hammered on 'headline first, data always' messaging in your sessions. If you want to keep leveling up your clarity with investors, maybe walk through your draft with Barry and see if your main point is coming through loud and clear.",
      title:
        "You discussed with Dr. Marcus about preparing a five-year plan for the Autobahn meetings. You're focusing on metrics-driven messaging and balancing acquisition potential with your bigger company ambitions.",
      isHidden: false,
      order: 4,
    },
    {
      id: "7dbca465-72bf-426c-9fdf-22a01de5cf51",
      title_summarized: "Launching Gen2 Water-Resistant Prosthetic Hand",
      description:
        "Gen2 is about to drop—smaller, faster, water-resistant. In your coaching conversations, you and Barry have explored how turning specs into a story is what gets the team and investors aligned, not just rattling off features. If you want to get even better at using data for influence, maybe test-drive your Gen2 pitch with Barry and see if it actually resonates.",
      title:
        "You're launching the Gen2 prosthetic hand with smaller size, doubled speed, and water resistance (IP44). The team discussed these enhancements and clarified the distinction between water resistance and full waterproofing.",
      isHidden: true,
      order: 6,
    },
    {
      id: "8d86ccf0-4e50-4dd9-8941-d831c616ba9b",
      title_summarized: "Implementing 120 Euro Daily Travel Allowance",
      description:
        "You're finally ditching the old expense reports for a 120 euro per diem. You and Barry have discussed how putting systems in place (and explaining the why) is how you move from messy to scalable. If you want to lock in that data-driven approach, maybe use your session with Barry to check if this new process is really landing with the team.",
      title:
        "You're simplifying travel expenses by implementing a fixed 120 euros/day allowance instead of detailed reports. You asked Stanley to review tax implications and adjust processes to streamline reimbursements.",
      isHidden: true,
      order: 10,
    },
    {
      id: "3f81b032-227b-4941-9014-ba62187fcdc6",
      title_summarized: "Updating Sales Commission Structure and Payroll",
      description:
        "You're updating the sales commission structure and you know how easy it is for these things to get lost in translation. In your coaching relationship with Barry, you've worked on being the kind of leader who leads with the headline and leaves zero ambiguity. If you want to stress-test your clarity, maybe walk through how you rolled this out and see if there's anywhere you could be sharper.",
      title:
        "You're finalizing the new sales commission structure and need to send updates for payroll processing. You emphasized the importance of timely processing and clear communication with payroll administration.",
      isHidden: false,
      order: 5,
    },
  ],
  meetingHours: 56,
};

SuggestedTopicsEmail.PreviewProps = previewProps;

export default SuggestedTopicsEmail;
