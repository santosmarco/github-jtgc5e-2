import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { dedent } from "ts-dedent";
import { z } from "zod";

import { four_point_one } from "~/lib/ai/models/openai";
import type { Database, Tables } from "~/lib/supabase/database.types";

import { transformJsonIntoXml } from "../suggested-topics/utils";
import { formatReportToMarkdown } from "./formatting";

export type ReportForAI = {
  id: string;
  skill: {
    id: string;
    title: string;
    icon: string;
    description: string;
    internal_title: string;
    created_at: string;
    goals: Tables<"goals">[];
  };
  profile?: {
    id: string;
    nickname: string;
    development_themes?: Array<{
      id: string;
      title: string;
      description: string;
      key_points: string[];
      is_enabled: boolean;
      order: number;
    }>;
  };
  report_moments?: Array<{
    id: string;
    moment: {
      id: string;
      vtt: string;
      title: string;
      summary: string;
      version: string;
      activity: string;
      relevant: boolean;
      topic_id: string;
      intensity: number;
      created_at: string;
      video_api_id: string;
      _internal_thumbs_down: boolean;
      segment_end_timestamp_in_seconds: number;
      segment_start_timestamp_in_seconds: number;
      segment_start_timestamp_in_seconds_ideal: number;
      subtags: Tables<"moment_subtags">[];
    };
    report_goal_signal?: (Tables<"report_goal_signals"> & {
      goal_signal: Tables<"goal_signals">;
    })[];
  }>;
  report_comments?: (Tables<"report_comments"> & {
    user: Tables<"profiles">;
  })[];
  report_goals?: (Tables<"report_goals"> & {
    goal: Tables<"goals">;
  })[];
  report_goal_signals?: (Tables<"report_goal_signals"> & {
    goal_signal: Tables<"goal_signals">;
  })[];
};

export const ReportSections = z.object({
  strengthSections: z
    .array(
      z.object({
        id: z.string().describe("A unique identifier for this section"),
        title: z.string().describe("A clear title for this strength area"),
        summary: z
          .string()
          .describe(
            "A detailed explanation of this strength with specific examples or metrics",
          ),
        relatedThemes: z
          .array(z.string())
          .describe(
            "Titles of development themes that relate to this strength",
          ),
      }),
    )
    .describe(
      "Three evidence-based strength sections highlighting leadership behaviors the person excels at",
    ),
  growthSections: z
    .array(
      z.object({
        id: z.string().describe("A unique identifier for this section"),
        title: z.string().describe("A clear title for this growth opportunity"),
        summary: z
          .string()
          .describe(
            "A constructive explanation with specific improvement suggestions",
          ),
        relatedThemes: z
          .array(z.string())
          .describe(
            "Titles of development themes that relate to this growth area",
          ),
      }),
    )
    .describe(
      "Three constructive growth sections highlighting leadership behaviors the person could improve",
    ),
  keyMoments: z
    .array(
      z.object({
        id: z.string().describe("A unique identifier for this moment"),
        title: z
          .string()
          .describe("A clear title that summarizes this leadership moment"),
        summary: z
          .string()
          .describe("A factual narrative of what happened and why it matters"),
        people: z
          .array(z.string())
          .describe("Names of people involved in this moment"),
        relatedThemes: z
          .array(z.string())
          .describe(
            "Titles of development themes that this moment exemplifies",
          ),
      }),
    )
    .describe(
      "Two or three pivotal leadership moments that demonstrate important behaviors or patterns",
    ),
});
export type ReportSections = z.infer<typeof ReportSections>;

export const ReportTeaser = z.object({
  reportTeaser: z
    .string()
    .describe(
      "A 1-3 sentence teaser that creates curiosity about the report's insights",
    ),
});
export type ReportTeaser = z.infer<typeof ReportTeaser>;

/**
 * Formats development themes into an easy-to-read markdown format
 *
 * @param developmentThemes - Array of development themes
 * @returns Formatted markdown string of development themes
 */
function formatDevelopmentThemesToMarkdown(
  developmentThemes: Pick<
    Tables<"profile_development_themes">,
    "id" | "title" | "description" | "key_points" | "is_enabled" | "order"
  >[],
): string {
  if (!developmentThemes?.length) {
    return "No development themes available.";
  }

  return developmentThemes
    .filter((theme) => theme.is_enabled)
    .sort((a, b) => a.order - b.order)
    .map(
      (theme) => dedent`
        ### ${theme.title}
        ${theme.description}
        
        **Key Points:**
        ${theme.key_points.map((point) => `- ${point}`).join("\n")}
      `,
    )
    .join("\n\n");
}

/**
 * Generates report sections including strengths, growth areas, and key moments.
 *
 * @param reportId - The unique identifier of the report
 * @param supabaseClient - The authenticated Supabase client
 * @param icpType - The type of ICP (Ideal Customer Profile) to generate sections for
 * @returns A Promise resolving to an object containing strength sections, growth sections, key moments, and teaser
 */
export async function generateReportSections(
  reportId: string,
  supabaseClient: SupabaseClient<Database>,
) {
  // First query to get the basic report data
  const { data: reportBasic, error: reportBasicError } = await supabaseClient
    .from("reports")
    .select(
      `
        *,
        profile:profiles(
          id,
          nickname,
          development_themes:profile_development_themes(
            id,
            title,
            description,
            key_points,
            is_enabled,
            order
          )
        )
      `,
    )
    .eq("id", reportId)
    .eq("profile.development_themes.is_enabled", true)
    .is("profile.development_themes.deleted_at", null)
    .single();

  if (reportBasicError) {
    throw reportBasicError;
  }

  // Second query to get skill-related data
  const { data: reportSkills, error: reportSkillsError } = await supabaseClient
    .from("reports")
    .select(
      `
        skill:skills!inner(
          id,
          title,
          icon,
          description,
          internal_title,
          created_at,
          goals!inner(
            id,
            text,
            progress,
            is_current,
            is_default,
            hidden_text,
            user_provided_context,
            completed_at,
            previous_goal_id,
            created_at,
            deleted_at,
            profile_id,
            skill_id
          ),
          scales:skill_scales(
            id,
            positive_tag_title,
            negative_tag_title,
            positive_tag_description,
            negative_tag_description
          ),
          statuses:group_report_processing_status(
            id,
            status,
            goal_ids,
            created_at,
            profile_id,
            skill_id
          ),
          goal_templates(
            id,
            text,
            context,
            is_current,
            created_at,
            skill_id
          )
        )
      `,
    )
    .eq("id", reportId)
    .single();

  if (reportSkillsError) {
    throw reportSkillsError;
  }

  // Third query to get report sections and goals
  const { data: reportSectionsAndGoals, error: reportSectionsError } =
    await supabaseClient
      .from("reports")
      .select(
        `
          report_sections(*),
          report_goals(
            *,
            goal:goals(
              *,
              signals:goal_signals(*)
            )
          ),
          report_goal_signals(
            *,
            goal_signal:goal_signals(
              *,
              goal_id
            ),
            direction
          )
        `,
      )
      .eq("id", reportId)
      .single();

  if (reportSectionsError) {
    throw reportSectionsError;
  }

  // Fourth query to get report moments
  const { data: reportMoments, error: reportMomentsError } =
    await supabaseClient
      .from("reports")
      .select(
        `
          report_moments(
            *,
            moment:moments!inner(
              id,
              vtt,
              title,
              latest,
              summary,
              version,
              activity,
              relevant,
              topic_id,
              intensity,
              created_at,
              video_api_id,
              _internal_thumbs_down,
              segment_end_timestamp_in_seconds,
              segment_start_timestamp_in_seconds,
              segment_start_timestamp_in_seconds_ideal,
              subtags:moment_subtags(
                id,
                tag,
                moment_id,
                profile_id,
                reasoning,
                confidence,
                created_at
              )
            ),
            report_goal_signal:report_goal_signals(
              *,
              goal_signal:goal_signals(
                *,
                goal_id
              )
            )
          ),
          report_comments(*, user:profiles(*))
        `,
      )
      .eq("id", reportId)
      .eq("report_moments.is_visible", true)
      .is("report_moments.omission_reason", null)
      .eq("report_moments.moment.latest", true)
      .eq("report_moments.moment.relevant", true)
      .single();

  if (reportMomentsError) {
    throw reportMomentsError;
  }

  // Combine all the data into a single report object
  const report = {
    ...reportBasic,
    skill: reportSkills.skill,
    report_sections: reportSectionsAndGoals.report_sections,
    report_goals: reportSectionsAndGoals.report_goals,
    report_goal_signals: reportSectionsAndGoals.report_goal_signals,
    report_moments: reportMoments.report_moments,
    report_comments: reportMoments.report_comments,
  };

  const developmentThemesMarkdown =
    report.profile?.development_themes &&
    formatDevelopmentThemesToMarkdown(report.profile.development_themes);

  // Generate the report sections using AI
  const { object } = await generateObject({
    model: four_point_one,
    schemaName: "ReportSections",
    schemaDescription:
      "A structured collection of leadership sections for a performance report email, designed to highlight strengths, growth areas, and key leadership moments.",
    schema: ReportSections,
    prompt: dedent`
      You're creating a factual, information-dense leadership report for a founder/CEO.
      
      Analyze this data and generate THREE types of sections:
      1. STRENGTH SECTIONS: Areas where the leader excels
      2. GROWTH SECTIONS: Areas where the leader can improve
      3. KEY MOMENTS: Specific leadership moments that illustrate important patterns
      
      Here's the report data:
      <report_data>
      ${formatReportToMarkdown(report)}
      </report_data>
      
      You are working for:
      <profile_data>
      Nickname: ${report.profile?.nickname || "User"}
      </profile_data>
      
      The leader has the following DEVELOPMENT THEMES that should be prioritized in your analysis:
      <development_themes>
      ${developmentThemesMarkdown ?? "No development themes available."}
      </development_themes>
      
      INSTRUCTIONS FOR STRENGTH SECTIONS:
      - Create THREE distinct strength sections
      - Use professional titles that clearly identify each strength area
      - Include specific names, numbers and examples
      - Prioritize strengths that align with the leader's development themes
      - Use language that's positive and encouraging but not exaggerated
      - Address the leader directly as "You" throughout the content
      - Keep summaries under 100 words, clear and impactful
      - Use <highlight> tags sparingly to emphasize key points (max 1 per section)
      - Reference which development theme(s) each strength supports
      
      INSTRUCTIONS FOR GROWTH SECTIONS:
      - Create THREE distinct growth sections
      - Frame as opportunities for improvement, not criticisms
      - Use titles that clearly identify the growth area
      - Include specific evidence from the report
      - Focus especially on growth areas that align with development themes
      - Suggest ONE clear, actionable next step
      - Use "You" and "Your" consistently throughout
      - Keep summaries under 100 words, focused on key actions
      - Use <highlight> tags sparingly to emphasize key points (max 1 per section)
      - For each growth area, note which development theme(s) it relates to
      
      INSTRUCTIONS FOR KEY MOMENTS:
      - Identify 2-3 leadership moments that clearly demonstrate important patterns
      - Prioritize moments that exemplify the leader's development themes
      - Focus on moments with measurable impact or clear lessons
      - Always include WHO was involved by name
      - Write straightforward, factual titles that describe what happened
      - Provide detailed summaries (75-100 words) with comprehensive context
      - List all people involved for reference
      - Address the leader directly as "You" throughout
      - Use <highlight> tags sparingly to emphasize key points (max 1 per section)
      - Explicitly connect each moment to specific development themes
      
      For all sections:
      - Use plain, direct language without jargon
      - Focus on specific behaviors and outcomes, not personality traits
      - Provide factual analysis without exaggeration
      - Consistently use second-person "You" perspective
      - Be thorough but clear
      - Avoid marketing language, superlatives, or unnecessary drama
      - Reference development themes consistently throughout your analysis
      - Start all sentences with "You" or "Your" to maintain direct address
      
      Format your response as a structured JSON object conforming to the specified schema.
    `,
    temperature: 0.7,
    experimental_telemetry: {
      isEnabled: true,
    },
  });

  /**
   * Processes a section to generate a shortened summary
   *
   * @param section - The section to process
   * @returns The section with a shortened summary added
   */
  async function processSection<T extends { summary: string }>(
    section: T,
  ): Promise<T & { shortenedSummary: string }> {
    const {
      object: { shortenedSummary },
    } = await generateObject({
      model: four_point_one,
      schemaName: "ShortenedSummary",
      schemaDescription: "A shortened summary of the section",
      schema: z.object({
        shortenedSummary: z
          .string()
          .describe("A shortened summary of the section"),
      }),
      prompt: dedent`
        Input: "You consistently drive results by assigning tasks with laser-sharp clarity. Whether directing Marco to meet tough ship dates or guiding Divya through app testing, you make sure everyone knows what, when, and why. This <highlight>decisive delegation style</highlight> keeps your team moving fast and focused."
        Output: "You consistently drive results by assigning tasks with <highlight>clear instructions</highlight>."

        Input: "You turn every assignment into a roadmap for success. When you tasked Tim with building new daily metrics or mapped out the QA review with Margot, you paired detailed steps with clear expectations. This <highlight>precision in direction</highlight> means your team always knows exactly how to win."
        Output: "You provide <highlight>detailed instructions</highlight> when delegating tasks, helping your team understand expectations."

        Input: "You don't just assign tasks—you encourage ownership and creativity. By inviting Marvin to redesign his role or giving Alex the reins for the coaching program, you foster a culture where initiative thrives. Your <highlight>trust in others</highlight> sparks bold ideas and real growth."
        Output: "You encourage <highlight>ownership and creativity</highlight> when delegating responsibilities."

        Input: "Your ability to navigate difficult conversations sets you apart as a leader. When addressing Sarah's performance issues or mediating the conflict between engineering and design teams, you maintained composure while being direct. This <highlight>balanced communication approach</highlight> builds trust and resolves tensions effectively."
        Output: "You excel at <highlight>difficult conversations</highlight>, maintaining both directness and respect."

        Input: "You've created a culture where feedback flows naturally in all directions. From your weekly roundtables with department heads to your open-door policy with junior staff, you've made constructive criticism feel safe and valuable. This <highlight>feedback-rich environment</highlight> accelerates learning and prevents small issues from becoming major problems."
        Output: "You've built a <highlight>feedback-rich culture</highlight> that promotes continuous improvement across the organization."

        Input: "Your strategic vision consistently translates into actionable plans. When pivoting the product roadmap or restructuring the sales territory, you break down complex goals into clear milestones. This <highlight>strategic clarity</highlight> helps everyone understand how their daily work connects to the company's bigger mission."
        Output: "You excel at translating <highlight>strategic vision</highlight> into clear, actionable plans for your team."

        Input: "You sometimes struggle to maintain composure during high-pressure situations. In the budget review meeting with the executive team and when responding to client escalations, your reactions appeared reactive rather than measured. Developing a <highlight>consistent emotional regulation strategy</highlight> would help you navigate these challenging moments more effectively and maintain team confidence."
        Output: "You can increase your impact by <highlight>preparing before meetings</highlight> to better regulate emotions and respond effectively during high-stakes conversations."

        Input: "You need to establish clearer consequences for missed targets. When reviewing quarterly goals with the sales team or discussing project timelines with developers, you often acknowledge shortfalls without defining specific repercussions. Implementing a <highlight>structured accountability framework</highlight> would help team members understand the importance of meeting commitments and drive better performance."
        Output: "You should clarify and communicate <highlight>specific consequences</highlight> for unmet targets to reinforce accountability and drive performance."

        Input: "Your follow-through on initiatives sometimes lacks consistency. After setting ambitious targets with the marketing team or establishing new processes with operations, the accountability mechanisms often fade over time. Creating a <highlight>systematic check-in protocol</highlight> would ensure sustained focus on key priorities and prevent important initiatives from losing momentum."
        Output: "You can improve by implementing <highlight>consistent follow-up</highlight> after setting targets to strengthen accountability and clarify expectations."

        Input: "${section.summary}"
        Output:
      `,
      temperature: 0.3,
      experimental_telemetry: {
        isEnabled: true,
      },
    });

    return {
      ...section,
      shortenedSummary: shortenedSummary.replace(/^"|"$/g, ""),
    };
  }

  // Process all sections in parallel for better performance
  const [strengthSections, growthSections, keyMoments] = await Promise.all([
    Promise.all(object.strengthSections.map(processSection)),
    Promise.all(object.growthSections.map(processSection)),
    Promise.all(object.keyMoments.map(processSection)),
  ]);

  const reportSections = {
    strengthSections,
    growthSections,
    keyMoments,
  };

  // Generate teaser after producing report sections
  const {
    object: { reportTeaser },
  } = await generateObject({
    model: four_point_one,
    schemaName: "ReportTeaser",
    schemaDescription:
      "A concise, engaging teaser for a leadership development report",
    schema: ReportTeaser,
    prompt: dedent`
      Craft a compelling, curiosity-inducing teaser (1-3 sentences) for this leadership development report.
      This teaser must hook the reader immediately and create anticipation about specific insights.

      Here's the report data:
      <report_data>
      ${formatReportToMarkdown(report)}
      </report_data>

      ${transformJsonIntoXml(reportSections, "report_sections")}

      You are working for:
      <profile_data>
      Nickname: ${report.profile?.nickname || "User"}
      </profile_data>

      Your teaser must:
      <guidelines>
      - Be 1-3 sentences (maximum 60 words)
      - Address the reader directly using "you" or "your"
      - Reference specific meetings, conversations, or interactions (e.g., "your strategy session with Alex" or "that critical product launch meeting")
      - Mention actual people by name from the report (team members, stakeholders)
      - Highlight one concrete strength and one specific growth opportunity
      - Connect to at least one development theme
      - Create genuine curiosity through specific, intriguing details
      - Maintain a positive, forward-looking tone
      - Avoid generic language, marketing speak, or hyperbole
      - Wrap strengths in <highlight:strength> tags, growth areas in <highlight:growth> tags, and key moments in <highlight:moment> tags to emphasize them
      </guidelines>

      Structure your teaser as follows:
      <structure>
      - Start with "In this report," followed by specific facts and strengths
      - Use "but" or "—but" to transition to growth opportunities
      - End with a call to action
      </structure>

      Examples of exceptional teasers:
      <examples>
      - "In this report, we analyzed your interactions with Marco during the <highlight:moment>Zoom vulnerability project</highlight:moment> where your <highlight:strength>decisive delegation</highlight:strength> and clear expectations set the team up for success—but your <highlight:growth>follow-up process after rapid-fire assignments</highlight:growth> to Marvin and Tim revealed opportunities to strengthen accountability. Discover how small adjustments could significantly enhance your team's performance!"
      - "In this report, your delegation meetings with Marco and Tim demonstrate your ability to provide <highlight:strength>clear, detailed instructions</highlight:strength> that drive results—but your <highlight:growth>overly informal communication style</highlight:growth> in certain contexts may be reducing clarity and undermining the urgency of important tasks. See how consistent communication can transform your team dynamics!"
      - "In this report, your session with Marvin about <highlight:moment>redefining his role</highlight:moment> showcases your strength in <highlight:strength>empowering ownership and creativity</highlight:strength> among team members—but inconsistencies in <highlight:growth>ownership tracking and follow-up</highlight:growth> with Tim and Marco suggest an opportunity to prevent confusion and missed deadlines. Learn practical strategies to balance autonomy with accountability!"
      </examples>
    `,
    temperature: 0.7,
  });

  return {
    ...reportSections,
    teaser: reportTeaser,
  };
}
