export type ModuleCategory = {
  slug: string;
  name: string;
};

export type TermDefinition = {
  term: string;
  definition: string;
};

export type ModuleDefinition = {
  category: ModuleCategory;
  title: string;
  description: string;
  introduction: string;
  definitions: TermDefinition[];
};

function category<TSlug extends string>(slug: TSlug, name: string) {
  return { slug, name } as const satisfies ModuleCategory;
}

function definition<TTerm extends string>(term: TTerm, definition: string) {
  return { term, definition } as const satisfies TermDefinition;
}

function defineModule<const T extends ModuleDefinition>(definition: T) {
  return definition satisfies ModuleDefinition;
}

const core = defineModule({
  category: category("core", "Platform"),
  title: "Core System",
  description: "Fundamental concepts of the Titan platform and its purpose.",
  introduction:
    "This module defines Titan, an AI-powered system. Titan bridges the gap between founders and coaches by analyzing corporate meetings to provide actionable insights for leadership development. It functions as both a meeting intelligence tool and a coaching enhancement platform.",
  definitions: [
    definition(
      "Titan",
      "Is: An AI-powered meeting intelligence and coaching enhancement system. Example: Titan records a sales meeting, identifies moments of strong negotiation, and presents these to a coach to help the founder refine their sales techniques. Significance: Titan connects real-world leadership behaviors with targeted skill development, making coaching more data-driven and effective.",
    ),
  ],
});

const meetings = defineModule({
  category: category("meetings", "Data Collection"),
  title: "Meeting Processing",
  description:
    "How Titan captures and processes meeting data from various session types.",
  introduction:
    "This module outlines how Titan processes different session types for founder development. It details the meeting capture process, from bot scheduling and recording to transcription and initial data product generation (summaries, action items, topics).",
  definitions: [
    definition(
      "Meetings",
      "Are: Corporate gatherings recorded by Titan. Example: A weekly team sync where a founder discusses project updates and team challenges. Significance: Meetings provide raw behavioral data and real-world examples of a founder's leadership in action, serving as the primary evidence for coaching analysis.",
    ),
    definition(
      "Coaching Sessions",
      "Are: Structured discussions between founders and their coaches. Example: A session where a coach reviews a founder's recent feedback delivery moments and discusses improvement strategies. Significance: Coaching Sessions guide the founder's development journey and shape priorities, representing the 'training ground' rather than raw behavioral data.",
    ),
    definition(
      "Meeting Capture",
      "Is: The multi-step process Titan uses to collect meeting data. Example: A Titan bot joins a scheduled Google Calendar event, records the audio/video, and uploads it for transcription. Significance: This process ensures systematic and privacy-respecting data collection, forming the foundation for all subsequent analysis.",
    ),
    definition(
      "Meeting Bots",
      "Are: Automated participants scheduled by Titan to join and record meetings. Example: 'TitanRecorder@example.com' appearing as an attendee in a virtual meeting. Significance: Meeting Bots act as passive observers, enabling data collection without disrupting the meeting's natural flow.",
    ),
    definition(
      "Meeting Summary",
      "Is: A concise overview of a meeting's key discussion points, decisions, and interactions. Example: A bullet-point list of main topics covered and resolutions made in a one-hour meeting. Significance: Provides a quick understanding of meeting outcomes without needing to review the full transcript, distilling hours of conversation into actionable highlights.",
    ),
    definition(
      "Action Items",
      "Are: Specific tasks or follow-up commitments identified during meetings, including assignees and due dates. Example: 'John to finalize budget proposal by Friday.' Significance: Action Items track concrete next steps and accountability emerging from meetings.",
    ),
    definition(
      "Topics Discussed",
      "Is: An organized list of conversation themes from a meeting, with titles and descriptions. Example: A meeting's topics could include 'Q3 Marketing Strategy,' 'New Product Launch Plan,' and 'Competitor Analysis.' Significance: This categorization maps the meeting's content landscape, providing structure to complex discussions.",
    ),
  ],
});

const analysis = defineModule({
  category: category("analysis", "Intelligence"),
  title: "Analytical Capabilities",
  description:
    "How Titan analyzes meeting data to extract meaningful insights, both within and across meetings.",
  introduction:
    "This module details Titan's analytical processes. Titan divides meetings into sequential topics and conducts multi-dimensional analysis (entity, relationship, general observations). It also applies cross-meeting analysis to reveal deeper patterns over time, transforming raw data into actionable intelligence.",
  definitions: [
    definition(
      "Meeting Topics",
      "Are: Connected segments of a meeting focused on a particular subject area, preserving conversational flow. Example: A 10-minute segment of a meeting dedicated to 'Reviewing Customer Feedback from Last Week.' Significance: Meeting Topics provide contextual units for detailed analysis, breaking down long meetings into manageable, analyzable parts.",
    ),
    definition(
      "Entity Analysis",
      "Is: The identification and examination of people, projects, or concepts mentioned within meeting topics. Example: Noting that 'Sarah (Engineer)' contributed significantly to the 'Scalability Discussion' topic. Significance: Entity Analysis helps understand the roles, contributions, and behaviors of key elements within a discussion.",
    ),
    definition(
      "Relationship Analysis",
      "Is: The mapping and assessment of connections between different entities within a meeting topic. Example: Observing 'tension between the Marketing and Sales teams when discussing lead handoff procedures.' Significance: Relationship Analysis reveals interaction dynamics, collaboration patterns, and potential conflicts.",
    ),
    definition(
      "General Observations",
      "Are: Noteworthy patterns, themes, or insights about specific meeting topics beyond individual entities or relationships. Example: Identifying that 'decision-making on Topic X was data-driven but slow.' Significance: General Observations capture meta-level aspects of interactions, such as process effectiveness or communication styles.",
    ),
    definition(
      "Longitudinal Relationship Analysis",
      "Is: The tracking of how professional relationships evolve over time across multiple meetings. Example: Observing that a founder's interactions with their Head of Product have become more collaborative over three months. Significance: This analysis reveals trends in interpersonal dynamics, crucial for understanding team cohesion and leadership impact.",
    ),
    definition(
      "Decision Pattern Recognition",
      "Is: The identification of recurring decision-making habits across different contexts. Example: A founder consistently seeks consensus before making key hires. Significance: Reveals a leader's typical approach to decision-making, highlighting strengths or areas for development.",
    ),
    definition(
      "Feedback Response Tracking",
      "Is: The analysis of how a founder responds to coaching advice and feedback over time. Example: Noting a founder increasingly applies techniques for active listening discussed in coaching. Significance: Tracks the effectiveness of coaching and the founder's adaptability and growth.",
    ),
    definition(
      "Contextual Correlation",
      "Is: The connection of seemingly unrelated moments across different meetings to reveal deeper patterns. Example: Linking a founder's comment about risk in one meeting to their cautious approach in a strategic decision weeks later. Significance: Uncovers underlying themes or influences that might not be obvious from isolated interactions.",
    ),
    definition(
      "Thematic Consistency Detection",
      "Is: The identification of themes that consistently appear across multiple meetings. Example: A recurring theme of 'resource constraints' appears in discussions about new projects, team expansion, and Q4 goals. Significance: Reveals persistent underlying issues or focus areas in a founder's environment or leadership approach.",
    ),
    definition(
      "Blind Spot Identification",
      "Is: The recognition of areas where a founder may have consistent challenges but limited awareness. Example: The system notes a founder frequently interrupts others during brainstorming sessions, though they aim to be inclusive. Significance: Highlights potential development opportunities that the founder may not perceive themselves.",
    ),
    definition(
      "Opportunity Mapping",
      "Is: The highlighting of upcoming situations where previously identified growth areas can be practiced. Example: Identifying an upcoming all-hands meeting as an opportunity for a founder to practice 'public speaking skills.' Significance: Creates a forward-looking approach to development by linking growth areas to future practical application.",
    ),
  ],
});

const coaching = defineModule({
  category: category("coaching", "Coaching"),
  title: "Coaching Integration",
  description:
    "How Titan integrates and processes coaching sessions to support founder development.",
  introduction:
    "This module explains how Titan handles coaching sessions. These sessions focus on guiding development, not just collecting behavioral data. Titan generates summaries, action items, and insights from coaching sessions, and tracks overarching coaching themes.",
  definitions: [
    definition(
      "Coaching Sessions",
      "Are: Structured discussions between founders and their coaches, processed differently by Titan. Example: A monthly session where a coach and founder review progress on 'strategic thinking' goals using specific 'Moments' as evidence. Significance: Coaching Sessions are the 'training ground' for development, directly shaping the founder's growth priorities based on feedback and strategic discussion.",
    ),
    definition(
      "Coaching Session Summary",
      "Is: A concise overview of a coaching session, capturing key themes, advice, and commitments. Example: A summary stating 'Discussed delegation challenges; agreed on founder trying a new task-assignment framework.' Significance: Serves as a record of the coaching conversation, tracking the evolution of the coaching relationship and focus areas.",
    ),
    definition(
      "Coaching Action Items",
      "Are: Development-focused tasks or commitments for the founder, identified during coaching sessions. Example: 'Founder to practice the new feedback model with two direct reports this week.' Significance: These differ from meeting action items as they directly target skill building, behavior change, or reflective practice, driving professional development.",
    ),
    definition(
      "Insights",
      "Are: Valuable guidance, observations, or advice provided by coaches during coaching sessions. Example: A coach observes, 'Your tendency to jump to solutions quickly might be hindering team brainstorming.' Significance: Insights capture the coach's expertise and perspective, cataloged by Titan for reference and integration into the coaching journey.",
    ),
    definition(
      "Coaching Themes",
      "Are: Key areas of professional development tracked for each user, generated by AI analysis. Example: 'Effective Communication,' 'Strategic Delegation,' or 'Building Accountability.' Significance: Coaching Themes organize evidence (like Moments) and guide coaching conversations, structuring the founder's development journey into coherent focus areas.",
    ),
  ],
});

const leadership = defineModule({
  category: category("leadership", "Development"),
  title: "Leadership Resources",
  description:
    "Curated resources provided by Titan for leadership development in key competency domains.",
  introduction:
    "This module describes Titan's provision of leadership resources. These curated materials, primarily books, support self-directed learning and complement the coaching process by targeting specific leadership competencies.",
  definitions: [
    definition(
      "Communication Resources",
      "Are: Recommended books to master clear and concise messaging. Example: 'Smart Brevity' by VandeHei, Allen, Schwartz. Significance: Provide founders with tools and techniques to improve their communication effectiveness, a core leadership skill.",
    ),
    definition(
      "Feedback Resources",
      "Are: Essential books for giving and receiving feedback effectively. Example: 'Radical Candor' by Kim Scott. Significance: Equip leaders to build a strong feedback culture, crucial for team growth and performance.",
    ),
    definition(
      "Decision Making Resources",
      "Are: Books that enhance decision-making capabilities. Example: 'Thinking in Bets' by Annie Duke. Significance: Help founders develop robust frameworks for making sound decisions under uncertainty.",
    ),
    definition(
      "Accountability Resources",
      "Are: Books focused on building individual and team accountability. Example: 'Extreme Ownership' by Jocko Willink & Leif Babin. Significance: Guide leaders in fostering a culture of ownership and responsibility.",
    ),
    definition(
      "Team Conflict Resources",
      "Are: Books addressing team conflict resolution. Example: 'The 5 Dysfunctions of a Team' by Patrick Lencioni. Significance: Provide strategies for navigating and resolving conflicts constructively, improving team dynamics.",
    ),
    definition(
      "Delegation Resources",
      "Are: Books on effective delegation. Example: 'The One Minute Manager Meets the Monkey' by Blanchard et al. Significance: Help leaders master delegation to empower their teams and manage their own workload effectively.",
    ),
  ],
});

const moments = defineModule({
  category: category("moments", "Evidence"),
  title: "Moment Identification",
  description:
    "How Titan identifies, refines, and utilizes significant 'Moments' from meetings as coaching evidence.",
  introduction:
    "This module details how Titan identifies 'Moments' – important meeting segments showing coaching themes in action. It covers the refinement process to select high-value examples and how Titan uses these moments to build progress narratives, grounding coaching in concrete evidence.",
  definitions: [
    definition(
      "Moments",
      "Are: Important segments of meetings where high-value coaching themes emerge naturally in a founder's workplace interactions. Example: A 2-minute clip where a founder successfully de-escalates a tense discussion about project deadlines. Significance: Moments serve as concrete, real-world evidence of behaviors relevant to development goals, forming the backbone of data-driven coaching.",
    ),
    definition(
      "Moment Refinement",
      "Is: The multi-step filtering and prioritization process Titan applies to initially identified moments. Example: An AI model scores potential moments for 'clarity' and 'relevance to active goals,' discarding low-scoring ones. Significance: Ensures only the most insightful and high-value examples are preserved for coaching, preventing information overload and focusing on developmental impact.",
    ),
    definition(
      "Progress Narrative Construction",
      "Is: The development of coherent narratives around specific skills by connecting moments over time. Example: A narrative showing a founder's journey from struggling with delegation (early moments) to effectively empowering their team (later moments). Significance: Illustrates the arc of development, providing context for successes and challenges in a founder's growth.",
    ),
  ],
});

const skills = defineModule({
  category: category("skills", "Development"),
  title: "Skills Framework",
  description:
    "Titan's structured framework for organizing and tracking professional development through Skills, Goals, and Signals.",
  introduction:
    "This module describes Titan's hierarchical framework (Skills, Goals, Signals) for professional development. This structure transforms subjective development areas into concrete, observable, and trackable patterns, providing a data-driven foundation for coaching.",
  definitions: [
    definition(
      "Skills",
      "Are: Broad competency domains where a founder aims to grow professionally. Example: 'Strategic Thinking,' 'Team Motivation,' or 'Conflict Resolution.' Significance: Skills serve as high-level organizing frameworks for development priorities, activated based on coaching focus.",
    ),
    definition(
      "Goals",
      "Are: Specific, measurable objectives within a Skill area that focus development efforts. Example: Under the 'Communication' Skill, a Goal might be 'Deliver more concise project updates.' Significance: Goals translate broad skill areas into concrete targets for improvement, making development efforts more focused.",
    ),
    definition(
      "Signals",
      "Are: Specific, observable behaviors (positive or negative) that indicate progress toward Goals. Example: Positive signal for 'Concise Updates' Goal: 'Clearly stated the main point within the first minute.' Negative signal: 'Provided excessive background detail irrelevant to the update.' Significance: Signals make subjective development areas observable and trackable, providing tangible evidence of behavioral change.",
    ),
  ],
});

const reporting = defineModule({
  category: category("reporting", "Insights"),
  title: "Reporting & Recommendations",
  description:
    "How Titan generates comprehensive assessments (Skill Reports) and data-driven discussion points (Suggested Topics) for coaching.",
  introduction:
    "This module covers how Titan produces reports and recommendations. Skill Reports analyze moments against active skills, goals, and signals. Suggested Topics offer sophisticated, data-driven discussion points, ensuring coaching is evidence-based and impactful.",
  definitions: [
    definition(
      "Skill Reports",
      "Are: Comprehensive assessments generated before coaching sessions. Example: A report for the 'Decision Making' skill showing moments where the founder effectively (or ineffectively) gathered data before deciding. Significance: Skill Reports organize evidence of strengths and growth opportunities, providing a data-driven foundation for coaching conversations by focusing on specific behaviors.",
    ),
    definition(
      "Scoring System",
      "Is: A quantitative method in Skill Reports measuring the frequency and quality of positive/negative signals over time. Example: A score indicating a 30% increase in 'asking clarifying questions' (positive signal) over the last month. Significance: This system quantifies the development journey, transforming subjective observations into objective measurements of growth or areas needing focus.",
    ),
    definition(
      "Suggested Topics",
      "Are: Data-driven discussion points generated by Titan to guide productive coaching conversations. Example: 'Discuss the pattern of avoiding direct feedback to senior team members, observed in three recent project meetings.' Significance: Represent Titan's most sophisticated analytical output, integrating diverse data to identify the most valuable areas for coaching focus, moving beyond simple reminders.",
    ),
  ],
});

const systemDefinitionModules = {
  core,
  meetings,
  coaching,
  leadership,
  analysis,
  moments,
  skills,
  reporting,
} as const;

export type SystemDefinitionModule = keyof typeof systemDefinitionModules;

const systemDefinitionModulesRecord = Object.fromEntries(
  Object.entries(systemDefinitionModules).map(([key, value]) => [key, value]),
);

export function getSystemDefinitions(modules?: SystemDefinitionModule[]) {
  const moduleKeys = modules ?? Object.keys(systemDefinitionModulesRecord);

  let result = "<system_definition>\n";

  for (const moduleKey of moduleKeys) {
    const moduleDefinition = systemDefinitionModulesRecord[moduleKey];
    if (!moduleDefinition) continue;

    result += `  <module name="${moduleDefinition.title}">\n`;

    result += `    <category id="${moduleDefinition.category.slug}">${moduleDefinition.category.name}</category>\n`;
    result += `    <description>${moduleDefinition.description}</description>\n`;
    result += `    <introduction>${moduleDefinition.introduction}</introduction>\n`;

    result += "    <key_terms>\n";
    for (const { term, definition } of moduleDefinition.definitions) {
      result += `      <term_definition name="${term}">${definition}</term_definition>\n`;
    }
    result += "    </key_terms>\n";

    result += "  </module>\n";
  }

  result += "</system_definition>";

  return result;
}
