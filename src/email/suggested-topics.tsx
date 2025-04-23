import { Text } from "@react-email/components";

import type { Tables } from "~/lib/supabase/database.types";

import { COMPANY_NAME } from "./_components/constants";
import { EmailContainer } from "./_components/email-container";
import { SectionContainer } from "./_components/section-container";

type SuggestedTopic = {
  id: string;
  title_summarized: string | null;
  title: string | null;
  description: string | null;
};

export type SuggestedTopicsEmailProps = {
  profile: Pick<Tables<"profiles">, "nickname" | "email" | "coach_id">;
  suggested_topics: SuggestedTopic[];
  meetingHours: number;
};

export function SuggestedTopicsEmail({
  profile,
  suggested_topics,
  meetingHours,
}: SuggestedTopicsEmailProps) {
  const previewText = "Suggested Topics for Your Next Coaching Session";

  return (
    <EmailContainer previewText={previewText}>
      <Text className="text-sm leading-6 text-gray-800">
        Hi {profile.nickname},
      </Text>

      <Text className="mb-4 text-pretty text-sm leading-6 text-gray-600">
        We&apos;ve analyzed <strong>{meetingHours} hours</strong> of meetings
        and pulled out the most relevant topics for your next session with{" "}
        <strong>Barry Shapiro</strong>.
      </Text>

      {suggested_topics
        .filter(
          (topic) => topic.title_summarized || topic.title || topic.description,
        )
        .map((topic, index) => (
          <SectionContainer
            key={`topic-${topic.id}`}
            className={`mb-4 mt-4 rounded-lg ${
              index % 2 === 0 ? "bg-slate-50" : "bg-sky-50"
            } border-l-2 px-4 py-3 ${
              index % 2 === 0 ? "border-slate-300" : "border-sky-300"
            }`}
            title={`${index + 1}. ${topic.title_summarized ?? topic.title ?? topic.description}`}
            titleClassName="text-sm font-semibold leading-6 text-gray-800"
          >
            <Text className="mb-2 text-pretty text-sm leading-6 text-gray-600">
              {topic.title ?? topic.description}
            </Text>
          </SectionContainer>
        ))}

      <Text className="text-sm leading-6 text-gray-800">
        Best regards,
        <br />
        The {COMPANY_NAME} Team
      </Text>
    </EmailContainer>
  );
}

const previewProps: SuggestedTopicsEmailProps = {
  profile: {
    nickname: "Dhruv",
    email: "dhruv@example.com",
    coach_id: "123",
  },
  suggested_topics: [
    {
      id: "1",
      title_summarized: "Terminating an Underperforming Prosthetist",
      description:
        "This pivotal moment tests your CEO mettle – balancing directness with empathy when managing tenured employees. It highlights the emotional tightrope of transitioning from founder-led intuition to process-driven leadership when making tough calls.",
      title:
        "You terminated an underperforming prosthetist with no severance, outlining clear offboarding steps with Stanley. Your temporary solution: bringing in a specialist from Poland while evaluating your current technical team's capabilities.",
    },
    {
      id: "2",
      title_summarized: "Symbiont Overstocked 40 Prosthetic Hands",
      description:
        "This sales challenge exposes a critical vulnerability – your dependence on a single buyer with unpredictable ordering patterns. It's a stress test of your leadership: can you navigate uncertainty while maintaining team confidence and strategic focus?",
      title:
        "You're facing an unexpected sales drought because Symbiont is sitting on roughly 40 prosthetic hands – far more inventory than anticipated. You and Stanley discussed the dangers of this single-buyer dependency and the mismatch between inventory and actual market demand.",
    },
    {
      id: "3",
      title_summarized: "Launching Gen2 Water-Resistant Prosthetic Hand",
      description:
        "This product evolution represents your market positioning gambit. The Gen2 launch tests your ability to differentiate features that matter to users while managing expectations around partial improvements (water resistance vs. waterproofing) – all while keeping marketing, sales, and product teams perfectly aligned.",
      title:
        "You unveiled Gen2 – your next-gen prosthetic hand that's smaller, twice as fast, and water-resistant (IP44). The team strategized how to position these improvements competitively while clearly communicating the distinction between water resistance and full waterproofing (IP67/IP68) to avoid customer confusion.",
    },
    {
      id: "4",
      title_summarized: "Implementing 120 Euro Daily Travel Allowance",
      description:
        "This is a sign of organizational maturation and a shift toward a more process-driven, evidence-based culture. It also provides an opportunity to reinforce positive behaviors and address blind spots in how feedback and accountability are handled, especially as the company scales and cross-border travel increases.",
      title:
        "The team discussed simplifying the travel expense process by moving to a fixed per diem system (120 euros/day for meals and incidentals), replacing detailed expense reports. You delegated the task of reviewing tax implications and process adjustments to Stanley, aiming to streamline reimbursement and reduce administrative complexity.",
    },
    {
      id: "5",
      title_summarized: "Updating Sales Commission Structure and Payroll",
      description:
        "Timely and transparent commission processing is critical for sales team motivation and trust. This is an opportunity to reinforce operational discipline, ensure alignment between leadership and finance, and set a precedent for clear, accountable follow-through on compensation matters.",
      title:
        "You are finalizing a new sales commission structure and committed to sending updated details for payroll processing. The discussion emphasized the importance of timely commission processing and clear communication between leadership and payroll administration.",
    },
    {
      id: "6",
      title_summarized: "Addressing Paint Chipping on Prosthetic Hands",
      description:
        "This is a test of Aether's ability to build a culture of continuous improvement and cross-functional problem-solving. It also highlights the importance of robust quality control and feedback loops as the company scales and enters new markets with higher expectations for durability and aesthetics.",
      title:
        "The team discussed recurring quality issues with painted prosthetic hands, with reports of rapid deterioration (chipping/flaking) even on demo units. The conversation led to a plan for logging incidents, correlating them with batch numbers, and involving key technical staff (e.g., Vickas) for root cause analysis and process improvement.",
    },
    {
      id: "7",
      title_summarized: "Coordinating Romanian Arm Repair Across Borders",
      description:
        "This is a classic scaling challenge for global startups. It tests your ability to build systems that are both robust and flexible, and to lead through ambiguity and competing priorities. It also highlights the importance of operational excellence and customer-centricity in high-stakes, cross-border scenarios.",
      title:
        "You and the team coordinated a complex repair and logistics process for a Romanian arm case, involving cross-border shipping, battery installation in Poland (due to export restrictions from India), and tight coordination among production, logistics, and the Polish team. The process emphasized the need for rapid turnaround and clear communication to minimize patient wait times.",
    },
    {
      id: "8",
      title_summarized: "Shifting CIS Market to Performance-Based Distribution",
      description:
        "This is a key operational scaling challenge that impacts data quality, pipeline visibility, and the ability to run a high-velocity, metrics-driven commercial organization. It also tests your ability to drive change management and build buy-in across diverse teams and partners.",
      title:
        "You outlined a strategic shift in distributor strategy for the CIS market, moving away from exclusive distribution to a performance-based model where any partner delivering 25+ units/month can earn exclusivity. You also described a tender submission for 50 units at $12,000 each, leveraging regional variations in tender documents to gain a competitive edge over Motorica.",
    },
    {
      id: "9",
      title_summarized: "Cleaning Up US Marketing Contact Lists",
      description:
        "This is a key operational scaling challenge that impacts data quality, pipeline visibility, and the ability to run a high-velocity, metrics-driven commercial organization. It also tests your ability to drive change management and build buy-in across diverse teams.",
      title:
        "A major theme is the challenge of cross-regional process fragmentation in sales and marketing operations, with different teams using HubSpot in incompatible ways. The team is working to design a unified qualification and handoff process, but faces resistance and knowledge gaps. You provided clear, actionable feedback on cleaning up the US marketing contact list, setting deletion criteria, and delegating review of non-US contacts to Faith.",
    },
    {
      id: "10",
      title_summarized: "Piloting 3D Scanning for Prosthetic Fitting",
      description:
        "This is a classic scaling challenge for global startups. It tests your ability to build systems that are both robust and flexible, and to lead through ambiguity and competing priorities. It also highlights the importance of operational excellence and customer-centricity in high-stakes, cross-border scenarios.",
      title:
        "You and the team are piloting a scalable, training-based 3D scanning and printing process for prosthetic fitting in Ukraine, aiming to overcome the limitations of traditional, labor-intensive methods. The first insurance-reimbursed sale and patient fitting are scheduled, with plans to generate content and validate the process for broader market adoption. There is also a potential future decision on licensing or acquiring the technology from InnovaMed.",
    },
    {
      id: "11",
      title_summarized: "Preparing for Autobox Acquisition Talks",
      description:
        "This is a critical inflection point for Aether, requiring you to balance risk, operational readiness, and market opportunity. The decision to go 'all in' on product enhancements and strategic partnerships tests your ability to lead through uncertainty, manage cross-functional alignment, and communicate a bold vision.",
      title:
        "You and the team are preparing for a high-stakes partnership/acquisition discussion with Autobox, focusing on product enhancements (motorized thumb, waterproofing, digital platform) and strategic value creation. They are also considering a shift from venture debt to a Convertible Loan Agreement (CLA) to fund these improvements, and are negotiating an option deal for technology acquisition with clear milestones and competitive blocking strategies.",
    },
    {
      id: "12",
      title_summarized: "Creating Five-Year Plan for Autobahn Meeting",
      description:
        "This is a key lever for growth and market leadership. It tests your ability to align product, marketing, and sales, and to anticipate and address investor concerns as the company evolves. The preparation for high-stakes meetings also provides an opportunity to reinforce Aether's value proposition and gather real-time feedback from key stakeholders.",
      title:
        "You and Dr. Marcus discussed the need to prepare a five-year plan and investor deck for upcoming high-stakes meetings (e.g., Autobahn), emphasizing the importance of clear, metrics-driven messaging and sensitivity to geopolitical topics. They also reviewed the need to keep strategic options open in the face of industry consolidation, balancing the potential for acquisition with the ambition to build a billion-dollar company.",
    },
  ],
  meetingHours: 56,
};

SuggestedTopicsEmail.PreviewProps = previewProps;

export default SuggestedTopicsEmail;
