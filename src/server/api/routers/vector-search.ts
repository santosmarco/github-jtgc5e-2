import { type CoreMessage, generateObject } from "ai";
import dayjs from "dayjs";
import _ from "lodash";
import { z } from "zod";

import { four_point_one_nano } from "~/lib/ai/models/openai";
import { embedText } from "~/lib/pinecone/embeddings";
import { getCacheKey } from "~/lib/search/vector/cache-utils";
import { vectorSearch } from "~/lib/search/vector/queries";
import { VectorSearchOptions } from "~/lib/search/vector/schemas";
import { transformJsonIntoXml } from "~/lib/suggested-topics/utils";
import { createClient } from "~/lib/supabase/server";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const vectorSearchRouter = createTRPCRouter({
  search: protectedProcedure
    .input(VectorSearchOptions)
    .query(async ({ input }) => {
      return vectorSearch(input);
    }),

  ragSearch: protectedProcedure
    .input(
      VectorSearchOptions.omit({
        namespace: true,
      }).extend({
        conversationHistory: z.array(z.custom<CoreMessage>()),
      }),
    )
    .query(async ({ input }) => {
      const startTime = performance.now();
      const now = dayjs();
      const supabase = await createClient();
      const cacheKey = getCacheKey(input);

      // Check cache
      const { data: cached } = await supabase
        .from("search_cache")
        .select("*")
        .eq("cache_key", cacheKey)
        .gt("expires_at", now.toISOString())
        .maybeSingle();

      if (cached?.results) {
        return { results: cached.results, source: "cache", took: 0 };
      }

      // 1. Classify query
      const { object: queryContextualization } = await generateObject({
        model: four_point_one_nano,
        schemaName: "QueryContextualization",
        schema: z.object({
          contextualized_query: z
            .string()
            .describe(
              "The rewritten query that preserves ALL essential information while incorporating relevant context from the conversation history",
            ),
          needs_retrieval: z
            .boolean()
            .describe(
              "Whether vector database lookup is necessary to properly respond to this query",
            ),
        }),
        system: `
          You are an expert linguist specializing in executive coaching. You are renowned for your ability to understand complex ideas and rewrite them in an easily understandable manner—and, MOST IMPORTANTLY, you do this while preserving ALL essential information.
          You also excel at determining when a realtime lookup on a vector database is necessary to respond to a user query.
          You grasp the nuances of the Titan system and recognize the importance of context in understanding user inquiries.
        `,
        prompt: `
          You will be given the last 5 messages of a conversation history and the most recent user query. Your task is to rewrite the user query with necessary context and determine if a realtime lookup (retrieval) is required to respond.

          Here is the conversation history:
          ${transformJsonIntoXml(
            input.conversationHistory.slice(-5),
            "conversation_history",
          )}

          And here is the most recent user query:
          <user_query>
          ${input.query}
          </user_query>

          First, rewrite the user query to include any necessary context from the conversation history. If the query is self-contained or a simple acknowledgment (like "Thank you"), leave it as is.

          Next, determine whether responding to the full, contextualized query requires doing a realtime lookup.
          A realtime lookup is typically needed when the query requires accessing specific meeting data, moments, entity relationships, or coaching insights from the Titan system. This includes requests about meeting summaries, action items, topics discussed, moments showing specific behaviors, skills reports, entity relationships, or longitudinal patterns across meetings.

          Provide your response in the following JSON format:
          <output_format>
          {
            contextualized_query: "[contextualized query]",
            needs_retrieval: [true/false]
          }
          </output_format>

          Where:
          - [contextualized_query] is the rewritten query with necessary context
          - [needs_retrieval] indicates whether retrieval is required (true) or not (false)

          Examples:
          <examples>
          <example>
            Inputs:
              - Conversation History: [{user: "Show me recent moments related to Decision Making."}, {assistant: "Okay, in your product strategy meeting last Thursday, there was a key moment titled 'Decision on Feature X Prioritization' where you weighed input from sales and engineering before making a call. The summary notes you facilitated a structured discussion."}, {user: "Interesting. That specific moment."}]
              - User Query: Who were the main contributors to that discussion besides me?
            Outputs:
              - Contextualized Query: In the 'Decision on Feature X Prioritization' moment from last Thursday's product strategy meeting, who were the main contributors to the discussion besides me?
              - Needs Retrieval: true
          </example>
          <example>
            Inputs:
              - Conversation History: [{user: "How was my 'Accountability' demonstrated in the meeting with Marketing on Monday?"}, {assistant: "In Monday's marketing meeting, you followed up on three previously assigned action items and clearly assigned ownership for two new tasks that emerged. This demonstrates holding yourself and others accountable."}, {user: "Good. And what about the one-on-one with Sarah yesterday?"}, {assistant: "In your one-on-one with Sarah, you discussed her ownership of the Q3 report, and she committed to a new deadline. You both agreed on check-in points."}, {user: "Okay, seems like I'm doing alright there."}]
              - User Query: Are there any blind spots for me around accountability in general?
            Outputs:
              - Contextualized Query: Considering my recent demonstrations of accountability in the marketing meeting and with Sarah, are there any general blind spots or recurring challenges related to accountability that the system has identified for me across other interactions?
              - Needs Retrieval: true
          </example>
          <example>
            Inputs:
              - Conversation History: [{user: "What were the key topics in my last coaching session?"}, {assistant: "Your last coaching session on June 5th focused on 'Delegation Effectiveness' and 'Managing Team Conflict'. Key insights included a framework for situational delegation and strategies for mediating disputes proactively."}, {user: "The framework for situational delegation, that's what I was thinking of."}]
              - User Query: Was that the one with the four quadrants?
            Outputs:
              - Contextualized Query: Regarding the framework for situational delegation discussed in my June 5th coaching session, was that the model that uses four quadrants?
              - Needs Retrieval: false
          </example>
          </examples>
          
          Please provide your output based on the given conversation history and user query.
        `,
        experimental_telemetry: {
          isEnabled: true,
        },
      });

      if (!queryContextualization.needs_retrieval) {
        const endTime = performance.now();
        const took = endTime - startTime;
        return { results: [], source: "none", took };
      }

      // 2. Generate 3 high-quality search query variants using a second LLM
      // You are the best AI prompt engineer in the world. Write 3 variants of the perfect search query for the user's intent.
      const { object: queryVariantsObj } = await generateObject({
        model: four_point_one_nano,
        schema: z.object({
          variants: z
            .array(z.string().describe("A search query variant"))
            .describe("An array of AT LEAST 3 search query variants"),
        }),
        system: `
          You are the most brilliant AI prompt engineer in the world.
          You are especially good at generating search queries for vector databases.
        `,
        prompt: `
          You are an expert AI prompt engineer specializing in vector database search query optimization. Your task is to generate three highly effective search queries for a vector database, given a user query and conversation context.

          Here is the conversation history for context:
          <conversation_history>
          ${transformJsonIntoXml(
            input.conversationHistory.slice(-5),
            "conversation_history",
          )}
          </conversation_history>

          Here is the user's query:
          <user_query>
          ${queryContextualization.contextualized_query}
          </user_query>

          Please generate three variant search queries that will maximize the retrieval of relevant information from a vector database. Each variant should:
          1. Be clear and concise.
          2. Use synonyms, rephrasings, or different angles to cover the user's intent.
          3. Avoid redundancy with the other variants.
          4. Be optimized for vector search performance.

          Before generating the final queries, analyze the user query, consider the conversation context, and plan your approach for each variant inside <query_analysis> tags. In your analysis:

          1. Break down the user query into key concepts and overall intent.
          2. List any relevant information from the conversation history that could inform the query variants.
          3. Brainstorm potential synonyms and rephrasings for each key concept.
          4. Consider different angles or perspectives on the query.
          5. Note any vector search optimization techniques you plan to use, such as:
            - Identifying key concepts and their relationships
            - Considering semantic similarity
            - Incorporating relevant contextual information from the conversation history

          After your analysis, provide the three variant queries in a JSON object with the following structure:
          {
            "variants": [
              "variant1",
              "variant2",
              "variant3"
            ]
          }

          Here's an example of the expected output format (using generic placeholders):
          {
            "variants": [
              "optimized query variant 1",
              "optimized query variant 2",
              "optimized query variant 3"
            ]
          }

          Examples:
          <examples>
          <example>
            Conversation History: [{user: "I need to improve how I handle team conflict."}, {assistant: "Okay, focusing on 'Team Conflict' is a valuable skill. We can look for moments where this was relevant."}, {user: "Remember that tense discussion in the Q2 budget review meeting?"}, {assistant: "Yes, I have a record of the Q2 budget review meeting on April 15th. There were differing views on resource allocation between the product and sales teams."}]
            User Query: Find moments in the Q2 budget review meeting (April 15th) where I attempted to mediate the conflict between the product and sales teams regarding resource allocation.
            Expected Output:
            {
              "variants": [
                "Mediation attempts during product vs sales conflict in Q2 budget review (April 15th)",
                "My conflict resolution behaviors: Q2 budget meeting resource allocation disagreement between product and sales",
                "How I managed differing views on budget between product and sales teams (April 15th meeting)"
              ]
            }
          </example>
          <example>
            Conversation History: [{user: "The launch of Project Chimera was delayed."}, {assistant: "Yes, Project Chimera's launch was postponed by two weeks from its original date."}, {user: "I want to understand my decision-making process that led to that."}]
            User Query: Analyze my decision-making patterns and key decisions in meetings related to Project Chimera in the month leading up to its eventual delay.
            Expected Output:
            {
              "variants": [
                "Founder's decision-making process Project Chimera pre-delay meetings",
                "Key decisions and contributing factors to Project Chimera launch postponement analysis",
                "Meeting discussions and choices regarding Project Chimera timeline and risks prior to delay"
              ]
            }
          </example>
          <example>
            Conversation History: [{user: "How is my communication with David (Head of Engineering)?"}, {assistant: "Your interactions with David often focus on technical feasibility and roadmap alignment. The system has logged several 'Moments' from your one-on-ones."}, {user: "That's useful."}]
            User Query: Show me instances or moments where David, Head of Engineering, gave me positive feedback on my communication style or clarity in our recent one-on-one meetings.
            Expected Output:
            {
              "variants": [
                "Positive feedback from David (Engineering Head) on my communication in one-on-one meetings",
                "Moments where David complimented my clarity or communication style (recent 1:1s)",
                "David's affirmations of my effective communication during our one-on-one discussions"
              ]
            }
          </example>
          </examples>

          Please ensure that each variant is truly distinct and approaches the user's query from a different angle while maintaining relevance and optimizing for vector search performance.
        `,
        experimental_telemetry: {
          isEnabled: true,
        },
      });

      const queryVariants = queryVariantsObj.variants;

      const queries = await Promise.all(
        queryVariants.map(async (query) => {
          const vector = await embedText(query);
          return { query, vector };
        }),
      );

      // Run vector searches in parallel across different namespaces for each query variant
      const allResults = await Promise.all(
        queries.map(async ({ query, vector }) =>
          Promise.all([
            vectorSearch({
              ...input,
              query,
              vector,
              hybridSearch: input.hybridSearch !== false,
            }),
            vectorSearch({
              ...input,
              query,
              vector,
              hybridSearch: input.hybridSearch !== false,
              namespace: "entities",
            }),
            vectorSearch({
              ...input,
              query,
              vector,
              hybridSearch: input.hybridSearch !== false,
              namespace: "relationships",
            }),
            vectorSearch({
              ...input,
              query,
              vector,
              hybridSearch: input.hybridSearch !== false,
              namespace: "observations",
            }),
          ]),
        ),
      );

      // Flatten and deduplicate results
      const flatResults = allResults.flatMap((results) =>
        results.flatMap(({ results }) => results),
      );
      const results = _.orderBy(
        _.uniqBy(flatResults, (result) => result.id),
        [(result) => result?.score],
        ["desc"],
      );

      // Calculate actual duration
      const endTime = performance.now();
      const took = endTime - startTime;

      // Return top chunks with actual duration
      return { results, source: "pinecone", took };
    }),
});

// Helper function for cosine similarity calculation (for deduplication)
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aValue = a[i];
    const bValue = b[i];

    if (aValue === undefined || bValue === undefined) continue;

    dotProduct += aValue * bValue;
    normA += aValue * aValue;
    normB += bValue * bValue;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
