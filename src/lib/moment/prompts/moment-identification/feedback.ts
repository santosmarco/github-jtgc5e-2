import { MeetingTopicLLM } from "@/lib/meeting-topic";
import dedent from "ts-dedent";
import { makeMomentIdentificationPromptFactories } from "./_base";

export const FeedbackIdentification = makeMomentIdentificationPromptFactories({
  identificationGuidelines: dedent`
1. Definition:
Feedback is a leadership behavior where information, observations, evaluations, or suggestions about performance, behavior, or output are provided to individuals or teams with the intent to acknowledge strengths or identify areas for improvement. In meetings, feedback manifests as a purposeful exchange where a leader (or sometimes a peer) offers specific insights on past or current actions, typically with the goal of reinforcing positive behaviors or facilitating development.

2. Key Characteristics:
- Specificity: References particular behaviors, actions, outputs, or situations rather than generalizations
- Evaluative content: Contains assessment language that indicates judgment of quality, appropriateness, or effectiveness
- Action-orientation: Includes suggestions, recommendations, or guidance for future behavior
- Evidence-based: References specific examples, data, observations, or outcomes
- Recipient-focused: Directed at a specific individual, subgroup, or the entire team

3. Verbal Cues:
- Assessment phrases: "I noticed that you...", "What worked well was...", "An area for improvement is...", "I appreciated how you..."
- Contrast structures: "Rather than [observed behavior], consider [suggested behavior]", "Instead of X, try Y"
- Outcome linking: "When you did X, it resulted in Y", "Your approach led to...", "The impact of your decision was..."
- Future-oriented guidance: "Next time, you might want to...", "In the future, consider...", "Going forward, I'd recommend..."
- Inquiry about receptivity: "Would you like some feedback on...?", "Can I share an observation about...?", "May I offer a suggestion?"

4. Non-verbal Indicators:
- Transitional pauses or phrases that signal a shift to evaluative content (e.g., "Let me pause here to reflect on...")
- Changes in speaking cadence, such as slowing down when delivering important feedback points
- Emphasis on key words that highlight assessment (transcripts might indicate this through capitalization or notation)
- Tone shifts that indicate constructive criticism (might be noted in transcript as "[speaking carefully]" or through punctuation)
- Extended focus on a single individual's contribution, unlike general discussion which tends to move between topics

5. Participant Roles:
- Feedback provider: Typically a person with evaluative authority (formal leader, project manager, client) or relevant expertise, who observes and assesses performance
- Feedback recipient: Individual(s) whose work, behavior, or output is being assessed
- Witnesses: Other meeting participants who observe the feedback exchange and may learn vicariously
- Facilitators: May help structure the feedback process, especially in formal reviews
- Supporters/contributors: May add perspectives or examples that enhance the primary feedback

In some instances, roles may be fluid, such as in peer feedback sessions where participants alternate between provider and recipient roles.

6. Context Considerations:
- Meeting purpose: Feedback is more expected and detailed in review meetings, one-on-ones, and project debriefs than in planning or information-sharing meetings
- Organizational culture: Feedback style varies based on cultural norms around directness, formality, and hierarchy
- Relationship history: The established dynamic between provider and recipient influences how feedback is framed and delivered
- Privacy level: More sensitive or critical feedback may be reserved for private settings rather than group meetings
- Timing relative to events: Feedback is typically more detailed when closer to the relevant performance or behavior
- Power dynamics: Feedback often flows differently up versus down the organizational hierarchy
- Industry contexts: Technical fields may emphasize accuracy and precision, while creative fields might focus on impact and innovation

7. Example Indicators:
- "John, I reviewed your report, and I was particularly impressed with the data visualization. The executive summary, however, was longer than our standard format. For the next quarterly report, please limit it to two pages and emphasize the key metrics we discussed."
- "Team, I want to acknowledge how well you handled the system outage yesterday. The communication was timely, and customers were kept informed. One thing we could improve is the escalation process—there was about a 20-minute delay before senior support was notified."
- "Sarah, when you presented the marketing strategy, you clearly articulated the value proposition. What I think could be stronger is the competitive analysis section. Have you considered using the framework we discussed last month to make the differentiators more explicit?"
- "I've been observing our client interactions over the past few weeks, and I noticed that you, Michael, consistently follow up with summary emails, which clients have mentioned they appreciate. That's a practice I'd like everyone on the team to adopt."
- "The launch didn't meet our expectations in terms of user adoption. What worked well was the technical implementation—zero downtime is impressive. Where we fell short was in user communication. Next time, we need to involve the customer success team earlier in the process."

8. Common Misconceptions:
- Confusing information sharing with feedback: Simply providing data or facts without evaluation is not feedback
- Misidentifying general discussion of problems as feedback: Problem-solving without specific assessment of past performance is not feedback
- Overlooking positive feedback: Recognition and appreciation are forms of feedback, not just constructive criticism
- Mistaking instructions or directions for feedback: Forward-looking guidance without reference to past or current performance is direction-setting, not feedback
- Confusing personal opinions with feedback: True feedback is grounded in observed behaviors or outcomes, not merely personal preferences

9. Variations:
- Real-time process feedback: Immediate observations about meeting dynamics or collaboration (e.g., "We're getting off-topic here, and I notice several people haven't had a chance to speak yet.")
- Performance feedback: Assessment of completed work against established standards or expectations (e.g., "The quarterly results show that your region exceeded targets in two categories but missed the customer satisfaction benchmark.")
- Developmental feedback: Observations focused on growth and skill building rather than specific outputs (e.g., "I've noticed your presentations have become more confident over the past three months. The area I'd encourage you to develop next is handling challenging questions.")
- 360-degree feedback: Synthesized observations from multiple perspectives, often shared by a leader but incorporating peer and subordinate views (e.g., "The feedback from across departments indicates that your technical expertise is highly valued, but several stakeholders mentioned communication timeliness as a concern.")
- Cultural/behavioral feedback: Assessment of how actions align with organizational values or expected behaviors (e.g., "In yesterday's customer meeting, you demonstrated our value of transparency by directly addressing the implementation challenges rather than minimizing them.")

10. Additional Considerations:
- Feedback sandwich detection: Recognize the pattern of positive-improvement-positive feedback sequences, which may indicate a deliberate feedback structure
- Feedback request indicators: Participants sometimes explicitly solicit feedback (e.g., "How do you think that went?" or "Do you have any thoughts on my approach?")
- Reflection prompts: Leaders often encourage self-assessment before providing feedback (e.g., "What do you think worked well?" or "Where do you see room for improvement?")
- Documentation references: Feedback often refers to formal standards or documentation (e.g., "According to our project rubric..." or "Based on the competency framework...")
- Feedback acceptance signals: Look for recipient responses that acknowledge feedback (e.g., "That's helpful," "I understand," or "I'll work on that")
- Clarification exchanges: Feedback often includes follow-up questions from recipients seeking to understand the assessment better
- Cultural considerations: Different cultures have varying norms for how direct feedback can be, requiring attention to subtle cues in some contexts
- Specialized frameworks:
  * SBI (Situation-Behavior-Impact): Identifies feedback that describes the situation, specific behaviors observed, and resulting impact
  * "Start, Stop, Continue" structure: Recognizes feedback organized around behaviors to begin, cease, or maintain
  * "What, So What, Now What" pattern: Identifies feedback that describes observations, explains significance, and suggests next steps
  * "Feedforward" approach: Focuses primarily on future actions rather than extensive analysis of past performance
  `,
  doingWellGuidelines: `
  `,
  growthAreasGuidelines: `
  `,
});
