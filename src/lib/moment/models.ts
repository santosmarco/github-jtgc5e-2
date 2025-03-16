import { z } from "zod";
import type { Tables } from "~/lib/supabase/database.types";

/**
 * Input type for moment identification tasks
 */
export const MomentIdentificationTaskInput = z.object({
  apiVideoId: z.string(),
  momentType: z.string(),
});
export type MomentIdentificationTaskInput = z.infer<
  typeof MomentIdentificationTaskInput
>;

/**
 * Base meeting model
 */
export const MeetingModel = z.object({
  video_api_id: z.string(),
  profile_id: z.string().nullable(),
  name: z.string().nullable(),
  speaker: z.string().nullable(),
  date: z.string().nullable(),
  duration_in_ms: z.number().nullable(),
  summary: z.string().nullable(),
  tags: z.string().nullable(),
  original_vtt_file: z.string().nullable(),
  clean_vtt_file: z.string().nullable(),
  provider: z.enum(["meeting_baas", "recall"]).nullable(),
  vectorized: z.boolean(),
  thumbnail_url: z.string().nullable(),
  preprocessing_payload: z.record(z.any()).nullable(),
  meeting_baas_original_json: z.record(z.any()).nullable(),
  created_at: z.string(),
  db_created_at: z.string().nullable(),
}) satisfies z.ZodType<Omit<Tables<"meetings">, "searchable">>;
export type MeetingModel = z.infer<typeof MeetingModel>;

/**
 * Meeting observation model
 */
export const MeetingObservationModel = z.object({
  id: z.string(),
  api_video_id: z.string(),
  profile_id: z.string(),
  meeting_topic_id: z.string(),
  observation: z.string(),
  created_at: z.string(),
  latest: z.boolean(),
}) satisfies z.ZodType<Tables<"meeting_observations_v2">>;
export type MeetingObservationModel = z.infer<typeof MeetingObservationModel>;

/**
 * Meeting topic model
 */
export const MeetingTopicModel = z.object({
  id: z.string(),
  api_video_id: z.string(),
  profile_id: z.string(),
  title: z.string(),
  summary: z.string(),
  start_segment_id: z.number(),
  end_segment_id: z.number(),
  index: z.number(),
  latest: z.boolean(),
  created_at: z.string(),
}) satisfies z.ZodType<Tables<"meeting_topics_v2">>;
export type MeetingTopicModel = z.infer<typeof MeetingTopicModel>;

/**
 * Meeting topic event model
 */
export const MeetingTopicEventModel = z.object({
  id: z.string(),
  api_video_id: z.string(),
  profile_id: z.string(),
  meeting_topic_id: z.string(),
  event: z.string(),
  timestamp: z.string(),
  latest: z.boolean(),
  created_at: z.string(),
}) satisfies z.ZodType<Tables<"meeting_topic_events_v2">>;
export type MeetingTopicEventModel = z.infer<typeof MeetingTopicEventModel>;

/**
 * Meeting entity model
 */
export const MeetingEntityModel = z.object({
  id: z.string(),
  api_video_id: z.string(),
  profile_id: z.string(),
  meeting_topic_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  latest: z.boolean(),
  created_at: z.string(),
}) satisfies z.ZodType<Tables<"meeting_entities_v2">>;
export type MeetingEntityModel = z.infer<typeof MeetingEntityModel>;

/**
 * Meeting entity observation model
 */
export const MeetingEntityObservationModel = z.object({
  api_video_id: z.string(),
  created_at: z.string(),
  id: z.string(),
  latest: z.boolean(),
  meeting_entity_id: z.string(),
  meeting_topic_id: z.string(),
  observation: z.string(),
  profile_id: z.string(),
}) satisfies z.ZodType<Tables<"meeting_entity_observations_v2">>;
export type MeetingEntityObservationModel = z.infer<
  typeof MeetingEntityObservationModel
>;

/**
 * Meeting entity relationship model
 */
export const MeetingEntityRelationshipModel = z.object({
  id: z.string(),
  api_video_id: z.string(),
  profile_id: z.string(),
  meeting_topic_id: z.string(),
  subject_entity_name: z.string(),
  object_entity_name: z.string(),
  relationship_type: z.string(),
  latest: z.boolean(),
  created_at: z.string(),
}) satisfies z.ZodType<Tables<"meeting_entity_relationships_v2">>;
export type MeetingEntityRelationshipModel = z.infer<
  typeof MeetingEntityRelationshipModel
>;

/**
 * Meeting entity relationship observation model
 */
export const MeetingEntityRelationshipObservationModel = z.object({
  api_video_id: z.string(),
  created_at: z.string(),
  id: z.string(),
  latest: z.boolean(),
  meeting_entity_relationship_id: z.string(),
  meeting_topic_id: z.string(),
  observation: z.string(),
  profile_id: z.string(),
}) satisfies z.ZodType<Tables<"meeting_entity_relationship_observations_v2">>;
export type MeetingEntityRelationshipObservationModel = z.infer<
  typeof MeetingEntityRelationshipObservationModel
>;

/**
 * Representation of a moment in the meeting
 */
export const MomentLLM = z
  .object({
    type: z
      .string()
      .describe(
        "Specific category or classification of the moment (e.g., Feedback, Decision Making)",
      ),
    title: z
      .string()
      .describe(
        "Concise, descriptive title that captures the essence of the moment",
      ),
    summary: z
      .string()
      .describe(
        "Comprehensive overview explaining what occurred during this moment and its significance",
      ),
    transcript_start_index: z
      .number()
      .describe(
        "Starting index position of this moment within the meeting transcript",
      ),
    transcript_end_index: z
      .number()
      .describe(
        "Ending index position of this moment within the meeting transcript",
      ),
    transcript_peak_index: z
      .number()
      .describe(
        "Peak index position of this moment within the meeting transcript",
      ),
    quality: z
      .string()
      .describe(
        "Qualitative assessment of the moment's execution, categorized as either 'exemplary' or 'needs improvement'",
      ),
    effectiveness_assessment: z
      .string()
      .describe(
        "Professional evaluation of how effectively the interaction was handled and its impact",
      ),
    leadership_insights: z
      .string()
      .describe(
        "Actionable takeaways or learning opportunities for the founder's leadership development",
      ),
    strategic_relevance: z
      .string()
      .describe(
        "Analysis of how this moment connects to or impacts broader organizational goals and objectives",
      ),
    impact: z
      .string()
      .describe(
        "Assessment of the positive or negative impact this moment had on the team or meeting",
      ),
    improvement_suggestion: z
      .string()
      .describe(
        "Specific recommendation for how to improve or reinforce this leadership behavior",
      ),
    score: z
      .number()
      .describe(
        "Numerical evaluation based on effectiveness, alignment with best practices, impact, and founder's assessment",
      ),
    score_justification: z
      .string()
      .describe("Brief explanation of the reasoning behind the assigned score"),
    observations: z
      .array(z.string())
      .describe(
        "Collection of analytical notes, insights, or comments about patterns observed in this moment",
      ),
  })
  .describe(
    "Structured representation of a significant interaction moment identified within a meeting",
  );
export type MomentLLM = z.infer<typeof MomentLLM>;

/**
 * Representation of a topic in the meeting
 */
export const MeetingTopicLLM = z
  .object({
    founderName: z
      .string()
      .optional()
      .describe("Name of the founder for whom the topic is being analyzed"),
    index: z
      .number()
      .describe(
        "Sequential position of this topic within the overall meeting structure",
      ),
    title: z
      .string()
      .describe(
        "Clear, descriptive title that summarizes the main subject of this topic segment",
      ),
    summary: z
      .string()
      .describe(
        "Detailed overview capturing the key points, decisions, and context discussed in this topic",
      ),
    transcript: z
      .array(
        z.object({
          index: z
            .number()
            .describe(
              "Sequential position of this segment within the complete transcript",
            ),
          start_timestamp: z
            .string()
            .describe(
              "Starting time of this segment in standardized format 'HH:MM:SS.mmm'",
            ),
          end_timestamp: z
            .string()
            .describe(
              "Ending time of this segment in standardized format 'HH:MM:SS.mmm'",
            ),
          speaker: z
            .string()
            .describe(
              "Name or identifier of the person speaking in this segment",
            ),
          text: z
            .string()
            .describe(
              "Verbatim transcribed content spoken by the identified speaker",
            ),
        }),
      )
      .describe(
        "Chronological sequence of conversation segments comprising this topic",
      ),
    meeting: z
      .object({
        title: z
          .string()
          .describe("Official title or name of the complete meeting"),
        summary: z
          .string()
          .describe(
            "Comprehensive summary capturing the purpose and key outcomes of the entire meeting",
          ),
      })
      .describe(
        "Contextual information about the parent meeting containing this topic",
      ),
    timeline: z
      .array(
        z.object({
          timestamp: z
            .string()
            .describe("Specific time point when the event occurred"),
          event: z
            .string()
            .describe(
              "Description of a significant action, decision, or occurrence at this timestamp",
            ),
        }),
      )
      .describe(
        "Chronological sequence of key events and milestones within this topic",
      ),
    entities: z
      .array(
        z.object({
          name: z
            .string()
            .describe(
              "Unique identifier or name of the entity mentioned in the discussion",
            ),
          description: z
            .string()
            .nullable()
            .describe(
              "Comprehensive explanation of the entity and its relevance to the discussion",
            ),
          type: z
            .string()
            .describe(
              "Classification category of the entity (e.g., person, project, concept, organization)",
            ),
          observations: z
            .array(z.string())
            .describe(
              "Collection of analytical notes or insights about this entity's role or significance",
            ),
        }),
      )
      .describe(
        "Key people, projects, concepts, or other entities that play significant roles in this topic",
      ),
    entity_relationships: z
      .array(
        z.object({
          subject_entity_name: z
            .string()
            .describe(
              "Name of the entity that initiates or is the source of the relationship",
            ),
          object_entity_name: z
            .string()
            .describe(
              "Name of the entity that receives or is the target of the relationship",
            ),
          relationship_type: z
            .string()
            .describe(
              "Nature of the connection or interaction between the two entities",
            ),
          observations: z
            .array(z.string())
            .describe(
              "Analytical notes about the significance or implications of this relationship",
            ),
        }),
      )
      .describe(
        "Network of connections and interactions between entities identified in this topic",
      ),
    observations: z
      .array(z.string())
      .describe(
        "Analytical insights, patterns, or notable aspects identified across this topic segment",
      ),
  })
  .describe(
    "Comprehensive structured representation of a distinct topic segment within a meeting",
  );
export type MeetingTopicLLM = z.infer<typeof MeetingTopicLLM>;

/**
 * Representation of the output of moment extraction
 */
export const MomentExtractionOutput = z
  .array(MomentLLM)
  .describe("List of moments identified in the report");
export type MomentExtractionOutput = z.infer<typeof MomentExtractionOutput>;

export const LLMNote = z
  .object({
    note: z
      .string()
      .describe(
        "Comprehensive textual content of the note capturing insights, observations, or analysis",
      ),
    embedding: z
      .array(z.number())
      .describe(
        "Vector representation of the note's semantic content for similarity search and retrieval",
      ),
    metadata: z
      .record(z.any())
      .describe(
        "Structured contextual information associated with the note such as timestamps, sources, or categories",
      ),
  })
  .describe(
    "Structured representation of an AI-generated note with semantic embedding for knowledge management",
  );
export type LLMNote = z.infer<typeof LLMNote>;

/**
 * Representation of a moment with additional context for output
 */
export interface MomentWithContext {
  title: string;
  summary: string;
  transcript_start_index: number;
  transcript_end_index: number;
  transcript_start_timestamp: string | null;
  transcript_end_timestamp: string | null;
  transcript_start_timestamp_in_seconds: number;
  transcript_end_timestamp_in_seconds: number;
  moment_url: string;
  observations: string;
  topicIndex: number;
  topicTitle: string;
  apiVideoId: string;
  momentType: string;
}

// import { z } from "zod";

// export type JsonPrimitive = string | number | boolean | null;
// export type JsonArray = JsonValue[];
// export type JsonObject = { [key: string]: JsonValue };
// export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

// export const JsonValue = z.lazy(
//   (): z.ZodUnion<
//     [
//       z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
//       z.ZodArray<z.ZodType<JsonValue>>,
//       z.ZodRecord<z.ZodString, z.ZodType<JsonValue>>,
//     ]
//   > => {
//     const JsonPrimitive = z.union([
//       z.string(),
//       z.number(),
//       z.boolean(),
//       z.null(),
//     ]);
//     const JsonArray = z.array(JsonValue);
//     const JsonObject = z.record(z.string(), JsonValue);

//     return z.union([JsonPrimitive, JsonArray, JsonObject]);
//   },
// );

// export const [JsonPrimitive, JsonArray, JsonObject] = JsonValue.schema
//   .options satisfies [
//   z.ZodType<JsonPrimitive>,
//   z.ZodType<JsonArray>,
//   z.ZodType<JsonObject>,
// ];

// export const Client = z.object({
//   autoId: z.number(),
//   id: z.string(),
//   name: z.string(),
//   email: z.string(),
//   createdAt: z.string(),
//   updatedAt: z.string(),
//   apiKey: z.string().optional(),
//   webhookURL: z.string().optional(),
//   eventWebhookURL: z.string().optional(),
//   webhookSecret: z.string().optional(),
//   triggersEnabled: z.boolean(),
//   lastSubscribedAt: z.string().optional(),
//   plan: z.string(),
//   isNewWebhook: z.boolean(),
// });
// export type Client = z.infer<typeof Client>;

// export const Member = z.object({
//   id: z.string(),
//   orgId: z.string(),
//   name: z.string(),
//   role: z.string(),
//   createdAt: z.string(),
//   updatedAt: z.string(),
//   deletedAt: z.string().optional(),
// });
// export type Member = z.infer<typeof Member>;

// export const ClientInfoAPIKeyRes = z.object({
//   id: z.string(),
//   name: z.string(),
//   clientId: z.string(),
//   memberId: z.string(),
//   createdAt: z.string(),
//   updatedAt: z.string(),
//   deletedAt: z.string().optional(),
//   key: z.string(),
//   member: Member,
//   lastUsed: z.string(),
//   apiKey: z.string(),
// });
// export type ClientInfoAPIKeyRes = z.infer<typeof ClientInfoAPIKeyRes>;

// export const ClientInfoRes = z.object({
//   client: Client,
//   apiKey: ClientInfoAPIKeyRes,
// });
// export type ClientInfoRes = z.infer<typeof ClientInfoRes>;

// export const ProjectReq = z.object({ name: z.string() });
// export type ProjectReq = z.infer<typeof ProjectReq>;

// export const ProjectRes = z.object({
//   id: z.string(),
//   name: z.string(),
//   createdAt: z.string(),
//   primaryApiKey: z.string(),
// });
// export type ProjectRes = z.infer<typeof ProjectRes>;

// export const BadRequestError = z.object({
//   details: JsonObject,
//   type: z.literal("BadRequestError"),
//   status: z.number(),
//   message: z.string().min(1),
//   requestId: z.string(),
// });
// export type BadRequestError = z.infer<typeof BadRequestError>;

// export const projectId = z.string().regex(/[^\\/#\?]+?/);
// export type projectId = z.infer<typeof projectId>;

// export const DeleteRowAPI = z.object({
//   status: z.enum(["success", "failed"]),
//   count: z.number(),
// });
// export type DeleteRowAPI = z.infer<typeof DeleteRowAPI>;

// export const ProjectIdNotFoundError = z.object({
//   name: z.literal("ProjectNotFoundError"),
//   status: z.number(),
//   message: z.string().min(1),
//   requestId: z.string(),
//   details: JsonObject,
//   type: z.literal("BadRequestError"),
// });
// export type ProjectIdNotFoundError = z.infer<typeof ProjectIdNotFoundError>;

// export const ProjectListRes = z.object({ items: z.array(ProjectRes) });
// export type ProjectListRes = z.infer<typeof ProjectListRes>;

// export const OrgApiKeyRes = z.object({ apiKey: z.string() });
// export type OrgApiKeyRes = z.infer<typeof OrgApiKeyRes>;

// export const OrgApiKeyRegenerateRes = z.object({ newApiKey: z.string() });
// export type OrgApiKeyRegenerateRes = z.infer<typeof OrgApiKeyRegenerateRes>;

// export const InviteMemberReq = z.object({
//   email: z.string().email(),
//   name: z.string(),
//   verifyHost: z.string(),
//   role: z.enum(["admin", "developer"]).optional(),
// });
// export type InviteMemberReq = z.infer<typeof InviteMemberReq>;

// export const MemberRes = z.object({
//   email: z.string(),
//   id: z.string(),
//   name: z.string(),
//   createdAt: z
//     .string()
//     .regex(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+Z?/)
//     .optional(),
//   role: z.enum(["admin", "developer"]),
//   updatedAt: z
//     .string()
//     .regex(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+Z?/)
//     .optional(),
// });
// export type MemberRes = z.infer<typeof MemberRes>;

// export const GenerateAPIKeyReq = z.object({ name: z.string() });
// export type GenerateAPIKeyReq = z.infer<typeof GenerateAPIKeyReq>;

// export const APIKeyRes = z.object({
//   id: z.string(),
//   name: z.string(),
//   createdAt: z
//     .string()
//     .regex(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+Z?/),
//   updatedAt: z
//     .string()
//     .regex(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+Z?/),
//   key: z.string(),
//   isHidden: z.boolean(),
//   lastUsed: z
//     .string()
//     .regex(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+Z?/)
//     .optional(),
//   member: JsonObject,
// });
// export type APIKeyRes = z.infer<typeof APIKeyRes>;

// export const DeleteAPIKeyResponse = z.object({ deleted: z.boolean() });
// export type DeleteAPIKeyResponse = z.infer<typeof DeleteAPIKeyResponse>;

// export const AppListCategoriesRes = z.object({ items: z.array(z.string()) });
// export type AppListCategoriesRes = z.infer<typeof AppListCategoriesRes>;

// export const category = z.string().optional();
// export type category = z.infer<typeof category>;

// export const includeLocal = z
//   .enum(["true", "false"])
//   .optional()
//   .default("false");
// export type includeLocal = z.infer<typeof includeLocal>;

// export const sortBy = z
//   .enum(["alphabet", "usage", "no_sort"])
//   .optional()
//   .default("alphabetically");
// export type sortBy = z.infer<typeof sortBy>;

// export const TestConnector = z.object({
//   id: z.string(),
//   name: z.string(),
//   authScheme: z.enum([
//     "OAUTH2",
//     "OAUTH1",
//     "OAUTH1A",
//     "API_KEY",
//     "BASIC",
//     "BEARER_TOKEN",
//     "GOOGLE_SERVICE_ACCOUNT",
//     "NO_AUTH",
//     "BASIC_WITH_JWT",
//     "COMPOSIO_LINK",
//     "CALCOM_AUTH",
//   ]),
// });
// export type TestConnector = z.infer<typeof TestConnector>;

// export const AppInfoResponse = z.object({
//   appId: z.string(),
//   key: z.string(),
//   name: z.string(),
//   description: z.string(),
//   logo: z.string(),
//   categories: z.string(),
//   tags: z.string().optional(),
//   auth_schemes: z.unknown().optional(),
//   testConnectors: TestConnector.optional(),
//   enabled: z.boolean(),
//   no_auth: z.boolean().optional(),
//   createdAt: z.string(),
//   updatedAt: z.string(),
// });
// export type AppInfoResponse = z.infer<typeof AppInfoResponse>;

// export const AppListRes = z.object({
//   items: z.array(AppInfoResponse),
//   totalPages: z.number(),
// });
// export type AppListRes = z.infer<typeof AppListRes>;

// export const SingleAppInfoRes = z.object({
//   appId: z.string(),
//   key: z.string(),
//   name: z.string(),
//   description: z.string(),
//   logo: z.string().optional(),
//   categories: z.array(z.string()).optional(),
//   docs: z.string().optional(),
//   configuration_docs_text: z.string().optional(),
//   status: z.string().optional(),
//   documentation_doc_text: z.string().optional(),
//   testConnectors: z.array(JsonObject).optional(),
//   no_auth: z.boolean().optional(),
//   auth_schemes: z.array(JsonObject).optional(),
//   meta: z.unknown().optional(),
// });
// export type SingleAppInfoRes = z.infer<typeof SingleAppInfoRes>;

// export const NotFoundError = z.object({
//   type: z.literal("NotFoundError"),
//   status: z.number(),
//   message: z.string().min(1),
//   requestId: z.string(),
// });
// export type NotFoundError = z.infer<typeof NotFoundError>;

// export const AuthConfig = z
//   .object({ scopes: z.array(z.string()), user_scopes: z.array(z.string()) })
//   .partial();
// export type AuthConfig = z.infer<typeof AuthConfig>;

// export const CreateConnectorPayload = z.object({
//   name: z.string(),
//   authScheme: z.string().optional(),
//   authConfig: AuthConfig.optional(),
//   useComposioAuth: z.boolean().optional(),
//   appId: z.string().optional(),
//   appName: z.string().optional(),
//   forceNewIntegration: z.boolean().optional(),
//   limitedActions: z.array(z.string()).optional(),
// });
// export type CreateConnectorPayload = z.infer<typeof CreateConnectorPayload>;

// export const ExpectedInputFields = z.object({
//   name: z.string(),
//   type: z.string(),
//   description: z.string(),
//   display_name: z.string(),
//   default: JsonObject,
//   required: z.boolean(),
//   expected_from_customer: z.boolean(),
//   is_secret: z.boolean(),
// });
// export type ExpectedInputFields = z.infer<typeof ExpectedInputFields>;

// export const GetConnectorInfoRes = z.object({
//   id: z.string().optional(),
//   authScheme: z.string().optional(),
//   name: z.string().optional(),
//   createdAt: z
//     .string()
//     .regex(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+Z?/)
//     .optional(),
//   updatedAt: z
//     .string()
//     .regex(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+Z?/)
//     .optional(),
//   enabled: z.boolean(),
//   deleted: z.boolean().optional(),
//   appId: z.string(),
//   defaultConnectorId: z.string().optional(),
//   authConfig: JsonObject,
//   expectedInputFields: z.array(ExpectedInputFields),
//   logo: z.string(),
//   appName: z.string(),
//   useComposioAuth: z.boolean(),
//   limitedActions: z.array(z.string()),
// });
// export type GetConnectorInfoRes = z.infer<typeof GetConnectorInfoRes>;

// export const MemberInfoRes = z.object({
//   id: z.string().uuid(),
//   orgId: z.string().uuid(),
//   email: z.string().email(),
//   name: z.string(),
//   role: z.enum(["admin", "developer"]),
//   metadata: JsonObject.optional(),
//   createdAt: z.string(),
//   updatedAt: z.string(),
//   deletedAt: z.string().optional(),
// });
// export type MemberInfoRes = z.infer<typeof MemberInfoRes>;

// export const ConnectorListItem = z.object({
//   appName: z.string(),
//   _count: JsonObject,
//   connections: z.array(JsonObject),
//   id: z.string(),
//   member: MemberInfoRes,
//   name: z.string(),
//   authScheme: z.string(),
//   createdAt: z.string(),
//   updatedAt: z.string(),
//   enabled: z.boolean(),
//   deleted: z.boolean().optional(),
//   appId: z.string(),
//   defaultConnectorId: z.string().optional(),
// });
// export type ConnectorListItem = z.infer<typeof ConnectorListItem>;

// export const GetConnectorListRes = z.object({
//   items: z.array(ConnectorListItem),
//   totalPages: z.number(),
//   page: z.number(),
// });
// export type GetConnectorListRes = z.infer<typeof GetConnectorListRes>;

// export const PatchConnectorReq = z
//   .object({
//     authConfig: JsonObject,
//     limitedActions: z.array(z.string()),
//     enabled: z.boolean(),
//   })
//   .partial();
// export type PatchConnectorReq = z.infer<typeof PatchConnectorReq>;

// export const PatchConnectorRes = z.object({ status: z.string() });
// export type PatchConnectorRes = z.infer<typeof PatchConnectorRes>;

// export const Page = z.number().gte(1).optional();
// export type Page = z.infer<typeof Page>;

// export const showActiveOnly = z.boolean().optional();
// export type showActiveOnly = z.infer<typeof showActiveOnly>;

// export const integrationId = z.string().uuid().optional();
// export type integrationId = z.infer<typeof integrationId>;

// export const ConnectionParams = z.object({
//   integrationId: z.string(),
//   connectionParams: JsonObject.optional(),
//   isDisabled: z.boolean(),
//   invocationCount: z.number(),
//   id: z.string(),
//   clientUniqueUserId: z.string().optional(),
//   status: z.string(),
//   data: JsonObject.optional(),
//   deleted: z.boolean().optional(),
//   enabled: z.boolean().optional(),
//   createdAt: z.string(),
//   updatedAt: z.string(),
//   appUniqueId: z.string(),
//   appName: z.string(),
//   logo: z.string().optional(),
//   authConfig: JsonObject.optional(),
//   member: JsonObject,
//   labels: z.array(z.string()).optional(),
// });
// export type ConnectionParams = z.infer<typeof ConnectionParams>;

// export const GetConnectionsResponse = z.object({
//   items: z.array(ConnectionParams),
//   totalPages: z.number(),
//   page: z.number(),
// });
// export type GetConnectionsResponse = z.infer<typeof GetConnectionsResponse>;

// export const InitiateConnectionPayload = z.object({
//   data: JsonObject,
//   integrationId: z.string().min(1),
//   redirectUri: z.string().optional(),
//   userUuid: z.string().optional(),
//   entityId: z.string().optional(),
//   labels: z.array(z.string()).optional(),
// });
// export type InitiateConnectionPayload = z.infer<
//   typeof InitiateConnectionPayload
// >;

// export const InitiateConnectionResponse = z.object({
//   connectionStatus: z.string().min(1),
//   connectedAccountId: z.string().min(1),
//   redirectUrl: z.string().optional(),
// });
// export type InitiateConnectionResponse = z.infer<
//   typeof InitiateConnectionResponse
// >;

// export const UpdateConnectionLabelsPayload = z.object({
//   labels: z.array(z.string()),
// });
// export type UpdateConnectionLabelsPayload = z.infer<
//   typeof UpdateConnectionLabelsPayload
// >;

// export const ReinitiateConnectionPayload = z.object({
//   data: JsonObject,
//   redirectUri: z.string().optional(),
// });
// export type ReinitiateConnectionPayload = z.infer<
//   typeof ReinitiateConnectionPayload
// >;

// export const ConnectedAccountNotFoundError = z.object({
//   name: z.literal("ConnectedAccountNotFoundError"),
//   status: z.number(),
//   message: z.string().min(1),
//   requestId: z.string(),
//   type: z.literal("NotFoundError"),
// });
// export type ConnectedAccountNotFoundError = z.infer<
//   typeof ConnectedAccountNotFoundError
// >;

// export const DeleteConnectionResponse = z.object({ status: z.string() });
// export type DeleteConnectionResponse = z.infer<typeof DeleteConnectionResponse>;

// export const Meta = z.object({ app: JsonObject });
// export type Meta = z.infer<typeof Meta>;

// export const ConnectedAccountResponse = z.object({
//   integrationId: z.string().uuid(),
//   appUniqueId: z.string(),
//   memberInfo: MemberInfoRes.optional(),
//   meta: Meta.optional(),
//   isDisabled: z.boolean().optional(),
//   id: z.string().uuid(),
//   clientUniqueUserId: z.string(),
//   appName: z.string(),
//   entityId: z.string(),
//   status: z.enum(["INITIATED", "ACTIVE", "FAILED", "EXPIRED"]),
//   enabled: z.boolean().optional(),
//   createdAt: z.string(),
//   updatedAt: z.string(),
// });
// export type ConnectedAccountResponse = z.infer<typeof ConnectedAccountResponse>;

// export const Parameter = z.object({
//   name: z.string(),
//   in: z.enum(["query", "header"]),
//   value: z.string(),
// });
// export type Parameter = z.infer<typeof Parameter>;

// export const GetConnectionInfoResponse = z.object({
//   base_url: z.string(),
//   parameters: z.array(Parameter),
//   body: JsonObject,
// });
// export type GetConnectionInfoResponse = z.infer<
//   typeof GetConnectionInfoResponse
// >;

// export const ToggleConnectedAccountResponse = z.object({ status: z.string() });
// export type ToggleConnectedAccountResponse = z.infer<
//   typeof ToggleConnectedAccountResponse
// >;

// export const TriggerRes = z.object({
//   name: z.string(),
//   display_name: z.string(),
//   description: z.string().optional(),
//   enabled: z.boolean().optional(),
//   config: JsonObject.optional(),
//   payload: JsonObject.optional(),
//   logo: z.string().optional(),
//   count: z.number().optional(),
//   appKey: z.string(),
//   appId: z.string(),
//   appName: z.string(),
//   instructions: z.string().optional(),
//   type: z.string().optional(),
// });
// export type TriggerRes = z.infer<typeof TriggerRes>;

// export const WehbookNewFormat = z.object({
//   id: z.string(),
//   isNewWebhook: z.boolean(),
// });
// export type WehbookNewFormat = z.infer<typeof WehbookNewFormat>;

// export const EnableTriggerBody = z.object({
//   triggerConfig: JsonObject,
//   verifyHost: z.string().optional(),
// });
// export type EnableTriggerBody = z.infer<typeof EnableTriggerBody>;

// export const TriggerResponse = z.object({
//   status: z.string(),
//   message: z.string().optional(),
//   triggerId: z.string().optional(),
//   isNew: z.boolean().optional(),
// });
// export type TriggerResponse = z.infer<typeof TriggerResponse>;

// export const TriggerConfig = z.object({
//   webhook_timeframe_error_threshold: z.number().optional(),
//   pusher_timeframe_error_threshold: z.number().optional(),
//   repo: z.string(),
//   owner: z.string(),
// });
// export type TriggerConfig = z.infer<typeof TriggerConfig>;

// export const ActiveTriggerInstance = z.object({
//   id: z.string().optional(),
//   connectionId: z.string(),
//   triggerName: z.string(),
//   triggerData: z.string().optional(),
//   triggerConfig: TriggerConfig,
//   createdAt: z.string().datetime({ offset: true }),
//   updatedAt: z.string().datetime({ offset: true }),
//   disabledAt: z.string().datetime({ offset: true }).nullish(),
// });
// export type ActiveTriggerInstance = z.infer<typeof ActiveTriggerInstance>;

// export const PageInfo = z.object({
//   currentPage: z.number(),
//   perPage: z.number(),
//   totalPages: z.number(),
// });
// export type PageInfo = z.infer<typeof PageInfo>;

// export const ActiveTriggersRes = z.object({
//   triggers: z.array(ActiveTriggerInstance),
//   PageInfo: z.array(PageInfo),
// });
// export type ActiveTriggersRes = z.infer<typeof ActiveTriggersRes>;

// export const SwitchTriggerStatusBody = z.object({ enabled: z.boolean() });
// export type SwitchTriggerStatusBody = z.infer<typeof SwitchTriggerStatusBody>;

// export const SetCallbackUrlBody = z.object({ callbackURL: z.string() });
// export type SetCallbackUrlBody = z.infer<typeof SetCallbackUrlBody>;

// export const WebhookURLResponse = z.object({
//   status: z.string(),
//   callbackURL: z.string().optional(),
// });
// export type WebhookURLResponse = z.infer<typeof WebhookURLResponse>;

// export const TriggerLogItem = z.object({
//   clientId: z.string(),
//   connectionId: z.string(),
//   triggerType: z.enum(["poll", "webhook"]).optional(),
//   errorTrigger: z.string().nullish(),
//   triggerClientError: z.string().nullish(),
//   triggerClientPayload: z.string().nullish(),
//   triggerClientResponse: JsonObject.nullish(),
//   triggerProviderPayload: z.string().nullish(),
//   triggerName: z.string().nullish(),
//   id: z.string(),
//   appKey: z.string(),
//   createdAt: z.string().datetime({ offset: true }),
// });
// export type TriggerLogItem = z.infer<typeof TriggerLogItem>;

// export const TriggerLogsRes = z.object({
//   data: z.array(TriggerLogItem),
//   PageInfo: PageInfo,
// });
// export type TriggerLogsRes = z.infer<typeof TriggerLogsRes>;

// export const GenerateCLISessionRes = z.object({ key: z.string() });
// export type GenerateCLISessionRes = z.infer<typeof GenerateCLISessionRes>;

// export const key = z.string();
// export type key = z.infer<typeof key>;

// export const GetCLISessionRes = z.object({
//   clientId: z.string(),
//   cliCode: z.string(),
// });
// export type GetCLISessionRes = z.infer<typeof GetCLISessionRes>;

// export const VerifyCLICodeRes = z.object({
//   clientId: z.string(),
//   cliCode: z.string(),
//   apiKey: z.string(),
// });
// export type VerifyCLICodeRes = z.infer<typeof VerifyCLICodeRes>;

// export const time = z
//   .enum(["5m", "30m", "6h", "1d", "1w", "1month", "1y"])
//   .optional();
// export type time = z.infer<typeof time>;

// export const status = z.enum(["all", "success", "error"]).optional();
// export type status = z.infer<typeof status>;

// export const limit = z.number().optional().default(10);
// export type limit = z.infer<typeof limit>;

// export const logsType = z.enum(["action", "trigger"]).optional();
// export type logsType = z.infer<typeof logsType>;

// export const LogsRes = z.object({
//   nextCursor: z.string().optional(),
//   data: z.array(JsonObject),
// });
// export type LogsRes = z.infer<typeof LogsRes>;

// export const IngestData = z.object({
//   connectionId: z.string().optional(),
//   sessionId: z.string().optional(),
//   logsType: z.string().optional(),
//   entityId: z.string().optional(),
//   providerName: z.string(),
//   actionName: z.string(),
//   request: JsonObject,
//   response: JsonObject,
//   isError: z.boolean(),
//   traceLogs: z.array(JsonObject).optional(),
// });
// export type IngestData = z.infer<typeof IngestData>;

// export const IngestDataResponse = z.object({
//   isIngested: z.boolean(),
//   traceLogs: JsonObject,
// });
// export type IngestDataResponse = z.infer<typeof IngestDataResponse>;

// export const startDate = z
//   .string()
//   .regex(/\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d.\d+Z?/);
// export type startDate = z.infer<typeof startDate>;

// export const interval = z
//   .enum(["5m", "30m", "6h", "1d", "1w", "1month", "1y"])
//   .optional()
//   .default("1d");
// export type interval = z.infer<typeof interval>;

// export const ActionsTagsResponse = z.object({ items: z.array(z.string()) });
// export type ActionsTagsResponse = z.infer<typeof ActionsTagsResponse>;

// export const ActionDetails = z.object({
//   parameters: JsonObject,
//   response: JsonObject,
//   appKey: z.string(),
//   appName: z.string(),
//   appId: z.string(),
//   version: z.string(),
//   available_versions: z.array(JsonObject),
//   no_auth: z.boolean(),
//   description: z.string(),
//   displayName: z.string(),
//   logo: z.string(),
//   name: z.string(),
//   tags: z.array(z.string()),
//   deprecated: z.boolean().optional(),
// });
// export type ActionDetails = z.infer<typeof ActionDetails>;

// export const ActionsListResponse = z.object({
//   items: z.array(ActionDetails),
//   page: z.number(),
//   totalPages: z.number(),
// });
// export type ActionsListResponse = z.infer<typeof ActionsListResponse>;

// export const sortBy__2 = z.enum(["alphabet", "usage", "no_sort"]).optional();
// export type sortBy__2 = z.infer<typeof sortBy__2>;

// export const SessionInfo = z
//   .object({
//     sessionId: z.string(),
//     metadata: JsonObject,
//   })
//   .partial();
// export type SessionInfo = z.infer<typeof SessionInfo>;

// export const CustomAuth = z.object({
//   base_url: z.string().optional(),
//   parameters: z.array(Parameter),
//   body: JsonObject.optional(),
// });
// export type CustomAuth = z.infer<typeof CustomAuth>;

// export const TraceLogs = z.object({
//   type: z.string(),
//   duration: z.number(),
//   status: z.string(),
//   startTime: z.number(),
//   endTime: z.number(),
//   message: z.string(),
//   metadata: JsonObject,
// });
// export type TraceLogs = z.infer<typeof TraceLogs>;

// export const ActionExecutionReq = z
//   .object({
//     connectedAccountId: z.string().uuid(),
//     appName: z.string(),
//     entityId: z.string(),
//     input: JsonObject,
//     sessionInfo: SessionInfo,
//     authConfig: CustomAuth,
//     text: z.string(),
//     customDescription: z.string(),
//     systemPrompt: z.string(),
//     version: z.string(),
//     traceLogs: z.array(TraceLogs),
//     allowTracing: z.boolean().default(false),
//   })
//   .partial();
// export type ActionExecutionReq = z.infer<typeof ActionExecutionReq>;

// export const ActionExecutionRes = z.object({
//   data: JsonObject,
//   error: z.string().optional(),
//   successfull: z.boolean(),
//   successful: z.boolean(),
//   logId: z.string().optional(),
//   sessionInfo: JsonObject.optional(),
// });
// export type ActionExecutionRes = z.infer<typeof ActionExecutionRes>;

// export const ActionGetNLAInputsReq = z.object({
//   text: z.string().min(1),
//   customDescription: z.string().optional(),
//   systemPrompt: z.string().optional(),
// });
// export type ActionGetNLAInputsReq = z.infer<typeof ActionGetNLAInputsReq>;

// export const NLAArgumentsResponse = z
//   .object({
//     arguments: JsonObject,
//     error: z.string(),
//   })
//   .partial();
// export type NLAArgumentsResponse = z.infer<typeof NLAArgumentsResponse>;

// export const ActionNotFoundError = z.object({
//   name: z.literal("ActionNotFoundError"),
//   status: z.number(),
//   message: z.string().min(1),
//   requestId: z.string(),
//   type: z.literal("NotFoundError"),
// });
// export type ActionNotFoundError = z.infer<typeof ActionNotFoundError>;

// export const ActionProxyRequestConfig = z.object({
//   connectedAccountId: z.string(),
//   endpoint: z.string(),
//   method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
//   parameters: z.array(Parameter),
//   body: JsonObject.optional(),
// });
// export type ActionProxyRequestConfig = z.infer<typeof ActionProxyRequestConfig>;

// export const AdvancedUseCaseSearchBody = z
//   .object({ useCase: z.string() })
//   .partial();
// export type AdvancedUseCaseSearchBody = z.infer<
//   typeof AdvancedUseCaseSearchBody
// >;

// export const AdvancedUseCaseSearchTask = z.object({
//   app: z.string(),
//   actions: z.array(z.string()),
//   description: z.string(),
//   order: z.number(),
// });
// export type AdvancedUseCaseSearchTask = z.infer<
//   typeof AdvancedUseCaseSearchTask
// >;

// export const AdvancedUseCaseSearchResponse = z.object({
//   items: z.array(AdvancedUseCaseSearchTask),
// });
// export type AdvancedUseCaseSearchResponse = z.infer<
//   typeof AdvancedUseCaseSearchResponse
// >;

// export const FileInfo = z.object({
//   app: z.string(),
//   action: z.string(),
//   filename: z.string(),
//   mimetype: z.string(),
//   md5: z.string(),
// });
// export type FileInfo = z.infer<typeof FileInfo>;

// export const GetFilesResponse = z.object({ items: FileInfo });
// export type GetFilesResponse = z.infer<typeof GetFilesResponse>;

// export const fileType = z.unknown();
// export type fileType = z.infer<typeof fileType>;

// export const CreateUploadURLResponse = z.object({
//   id: z.string(),
//   url: z.string(),
//   key: z.string(),
//   exists: z.string(),
// });
// export type CreateUploadURLResponse = z.infer<typeof CreateUploadURLResponse>;

// export const SingleTriggerRes = z.object({
//   name: z.string(),
//   displayName: z.string(),
//   description: z.string(),
//   type: z.string(),
//   appId: z.string(),
//   appName: z.string(),
//   instructions: z.string().optional(),
//   payload: JsonObject,
//   config: JsonObject,
// });
// export type SingleTriggerRes = z.infer<typeof SingleTriggerRes>;

// export const OrgProjectListRes = z.object({ projects: z.array(ProjectRes) });
// export type OrgProjectListRes = z.infer<typeof OrgProjectListRes>;

// export const UpdateRowAPI = z.object({
//   status: z.enum(["success", "failed"]),
//   count: z.number(),
// });
// export type UpdateRowAPI = z.infer<typeof UpdateRowAPI>;

// export const AppFilter = z
//   .object({ uniqueKey: z.string(), integrationId: z.string() })
//   .partial();
// export type AppFilter = z.infer<typeof AppFilter>;

// export const ComposioSearchConfig = z.object({
//   useComposioAuth: z.boolean().optional(),
//   authScheme: z.enum([
//     "OAUTH2",
//     "OAUTH1",
//     "OAUTH1A",
//     "API_KEY",
//     "BASIC",
//     "BEARER_TOKEN",
//     "GOOGLE_SERVICE_ACCOUNT",
//     "NO_AUTH",
//     "BASIC_WITH_JWT",
//     "COMPOSIO_LINK",
//     "CALCOM_AUTH",
//   ]),
// });
// export type ComposioSearchConfig = z.infer<typeof ComposioSearchConfig>;

// export const ConnectorSearchFilterV2 = z.object({
//   app: AppFilter,
//   config: ComposioSearchConfig,
// });
// export type ConnectorSearchFilterV2 = z.infer<typeof ConnectorSearchFilterV2>;

// export const ConnectorSearchRes = z.object({
//   matchedIntegrationIds: z.array(z.string()),
//   appInfo: JsonObject,
// });
// export type ConnectorSearchRes = z.infer<typeof ConnectorSearchRes>;

// export const AppInfoPayload = z.object({ uniqueKey: z.string() }).partial();
// export type AppInfoPayload = z.infer<typeof AppInfoPayload>;

// export const ComposioCreateConfig = z
//   .object({
//     name: z.string(),
//     useComposioAuth: z.boolean(),
//     authScheme: z.enum([
//       "OAUTH2",
//       "OAUTH1",
//       "OAUTH1A",
//       "API_KEY",
//       "BASIC",
//       "BEARER_TOKEN",
//       "GOOGLE_SERVICE_ACCOUNT",
//       "NO_AUTH",
//       "BASIC_WITH_JWT",
//       "COMPOSIO_LINK",
//       "CALCOM_AUTH",
//     ]),
//     integrationSecrets: JsonObject,
//   })
//   .partial();
// export type ComposioCreateConfig = z.infer<typeof ComposioCreateConfig>;

// export const ConnectorCreateReq = z.object({
//   app: AppInfoPayload,
//   config: ComposioCreateConfig,
// });
// export type ConnectorCreateReq = z.infer<typeof ConnectorCreateReq>;

// export const CreateConnectorRes = z.object({
//   id: z.string(),
//   integrationId: z.string(),
//   name: z.string(),
//   authScheme: z.string(),
//   createdAt: z.string(),
//   updatedAt: z.string(),
//   enabled: z.boolean(),
//   deleted: z.boolean(),
//   appId: z.string(),
//   appName: z.string(),
//   defaultConnectorId: z.string().optional(),
//   expectedInputFields: z.array(ExpectedInputFields),
// });
// export type CreateConnectorRes = z.infer<typeof CreateConnectorRes>;

// export const GetOrCreateConnectorInfo = z.object({
//   app: AppFilter,
//   config: ComposioCreateConfig,
// });
// export type GetOrCreateConnectorInfo = z.infer<typeof GetOrCreateConnectorInfo>;

// export const GetOrCreateConnectorResV2 = z.object({
//   integrationId: z.string(),
//   isNewIntegration: z.boolean().optional(),
// });
// export type GetOrCreateConnectorResV2 = z.infer<
//   typeof GetOrCreateConnectorResV2
// >;

// export const ConnectionExtraData = z
//   .object({ redirectURL: z.string(), labels: z.array(z.string()) })
//   .partial();
// export type ConnectionExtraData = z.infer<typeof ConnectionExtraData>;

// export const ConnectionInitData = z.object({
//   initiateData: JsonObject,
//   entityId: z.string().optional(),
//   extra: ConnectionExtraData.optional(),
// });
// export type ConnectionInitData = z.infer<typeof ConnectionInitData>;

// export const InitiateConnectionPayloadV2 = z.object({
//   app: AppFilter,
//   config: ComposioCreateConfig,
//   connection: ConnectionInitData,
// });
// export type InitiateConnectionPayloadV2 = z.infer<
//   typeof InitiateConnectionPayloadV2
// >;

// export const IntegrationData = z.object({
//   id: z.string().min(1),
//   isNewIntegration: z.boolean(),
// });
// export type IntegrationData = z.infer<typeof IntegrationData>;

// export const ConnectionResponseV2 = z.object({
//   redirectUrl: z.string().optional(),
//   connectionStatus: z.enum(["INITIATED", "ACTIVE", "FAILED", "EXPIRED"]),
//   connectedAccountId: z.string().min(1),
// });
// export type ConnectionResponseV2 = z.infer<typeof ConnectionResponseV2>;

// export const InitiateConnectionResponseV2 = z.object({
//   integration: IntegrationData,
//   connectionResponse: ConnectionResponseV2,
// });
// export type InitiateConnectionResponseV2 = z.infer<
//   typeof InitiateConnectionResponseV2
// >;

// export const ActionLogFieldOption = z.object({
//   id: z.string(),
//   displayName: z.string(),
//   type: z.string(),
//   regex: z.string().optional(),
// });
// export type ActionLogFieldOption = z.infer<typeof ActionLogFieldOption>;

// export const ActionLogFieldsResponse = z.object({
//   fields: z.record(z.array(ActionLogFieldOption)),
// });
// export type ActionLogFieldsResponse = z.infer<typeof ActionLogFieldsResponse>;

// export const SearchActionLogsParams = z.object({
//   operation: z.string(),
//   field: z.enum([
//     "action_key",
//     "app_key",
//     "entity_id",
//     "connected_account_id",
//     "integration_id",
//     "execution_status",
//     "response",
//   ]),
//   value: z.string(),
// });
// export type SearchActionLogsParams = z.infer<typeof SearchActionLogsParams>;

// export const ActionLogsSearchParams = z.object({
//   cursor: z.number().optional(),
//   limit: z.number().optional(),
//   caseSensitive: z.boolean().optional(),
//   searchParams: z.array(SearchActionLogsParams),
//   from: z.number().optional(),
//   to: z.number().optional(),
// });
// export type ActionLogsSearchParams = z.infer<typeof ActionLogsSearchParams>;

// export const ActionLogsRes = z.object({
//   nextCursor: z.number().optional(),
//   data: z.array(JsonObject),
// });
// export type ActionLogsRes = z.infer<typeof ActionLogsRes>;

// export const ActionApp = z.object({
//   name: z.string(),
//   uniqueId: z.string(),
//   icon: z.string(),
// });
// export type ActionApp = z.infer<typeof ActionApp>;

// export const ActionConnection = z.object({
//   id: z.string().uuid().optional(),
//   entity: z.string(),
// });
// export type ActionConnection = z.infer<typeof ActionConnection>;

// export const NetworkCallRequest = z.object({
//   method: z.string(),
//   url: z.string(),
//   headers: JsonObject.optional(),
//   params: JsonObject.optional(),
//   timeout: z.number().optional(),
//   json: JsonObject.optional(),
// });
// export type NetworkCallRequest = z.infer<typeof NetworkCallRequest>;

// export const NetworkCallResponse = z.object({
//   status: z.number(),
//   time: z.string(),
// });
// export type NetworkCallResponse = z.infer<typeof NetworkCallResponse>;

// export const LogCall = z.object({
//   type: z.string(),
//   level: z.string(),
//   message: z.string(),
//   requestId: z.string().uuid(),
//   time: z.number(),
//   request: NetworkCallRequest,
//   response: NetworkCallResponse,
// });
// export type LogCall = z.infer<typeof LogCall>;

// export const ToolExecutionStep = z.object({
//   type: z.string(),
//   startTime: z.number(),
//   endTime: z.number(),
//   totalDuration: z.number(),
//   status: z.string(),
//   message: z.string(),
//   metadata: JsonObject.optional(),
//   logs: z.array(LogCall).optional(),
// });
// export type ToolExecutionStep = z.infer<typeof ToolExecutionStep>;

// export const ActionData = z.object({
//   actionLogId: z.string(),
//   actionId: z.string(),
//   status: z.string(),
//   app: ActionApp,
//   version: z.string(),
//   connection: ActionConnection,
//   session: JsonObject,
//   executionMetadata: JsonObject,
//   steps: z.array(ToolExecutionStep),
//   payloadReceived: JsonObject,
//   startTime: z.number(),
//   endTime: z.number(),
//   totalDuration: z.string(),
//   response: JsonObject,
//   error: JsonObject,
// });
// export type ActionData = z.infer<typeof ActionData>;
