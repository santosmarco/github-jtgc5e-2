import type { Index } from "@pinecone-database/pinecone";
import { TRPCError } from "@trpc/server";
import { cosineSimilarity } from "ai";
import dayjs from "dayjs";
import _ from "lodash";
import { z } from "zod";

import { getIndex } from "~/lib/pinecone/client";
import { embedText, embedTextHybrid } from "~/lib/pinecone/embeddings";
import { createClient } from "~/lib/supabase/server";

import { getCacheKey } from "./cache-utils";
import { DEFAULT_SEARCH_OPTIONS } from "./constants";
import type { PineconeMetadata } from "./schemas";
import { PineconeRecord, VectorSearchOptions } from "./schemas";

export async function vectorSearch(
  options: z.input<typeof VectorSearchOptions>,
) {
  try {
    // Ensure required fields are present with defaults if missing
    const safeOptions = {
      ...DEFAULT_SEARCH_OPTIONS,
      ...options,
    };

    const {
      query,
      vector,
      topK,
      minScore,
      namespace,
      filter,
      includeValues,
      includeMetadata,
      hybridSearch,
      hybridAlpha,
      cacheResults,
      deduplicate,
      deduplicationThreshold,
      fetchMetadataFields,
    } = VectorSearchOptions.parse(safeOptions);

    // Get current time
    const now = dayjs();

    // Instantiate Supabase client
    const supabase = await createClient();

    // Retrieve cache key
    const cacheKey = getCacheKey(safeOptions);

    // Check if results exist in cache when caching is enabled
    if (cacheResults) {
      const { data: cachedResults } = await supabase
        .from("search_cache")
        .select("*")
        .eq("cache_key", cacheKey)
        .gt("expires_at", now.toISOString())
        .maybeSingle();

      if (cachedResults?.results) {
        try {
          // Parse the JSON string and then validate with Zod
          const parsedResults = z
            .array(PineconeRecord)
            .parse(cachedResults.results);
          return {
            results: parsedResults,
            source: "cache",
            took: 0,
          };
        } catch (e) {
          console.error(
            "Failed to parse/validate cached search results. Falling back to fresh search.",
            e,
          );
          // Fall through to fetch fresh results if cache is corrupt or invalid
        }
      }
    }

    // Start timing the search operation
    const startTime = performance.now();

    let index: Index<PineconeMetadata>;
    let queryEmbedding: number[];
    let sparseVector: { indices: number[]; values: number[] } | undefined;

    // Use provided vector if available, otherwise generate embedding
    if (vector) {
      queryEmbedding = vector;
      index = await getIndex().then((idx) =>
        namespace ? idx.namespace(namespace) : idx,
      );
    } else if (hybridSearch) {
      [index, { dense: queryEmbedding, sparse: sparseVector }] =
        await Promise.all([
          getIndex().then((idx) =>
            namespace ? idx.namespace(namespace) : idx,
          ),
          embedTextHybrid(query),
        ]);
    } else {
      [index, queryEmbedding] = await Promise.all([
        getIndex().then((idx) => (namespace ? idx.namespace(namespace) : idx)),
        embedText(query),
      ]);
    }

    const queryOptions = {
      vector: queryEmbedding,
      topK,
      includeValues,
      includeMetadata,
      ...(filter && { filter }),
    };

    const searchParams = hybridSearch
      ? { ...queryOptions, alpha: hybridAlpha, sparseVector }
      : queryOptions;

    // Execute the query
    const searchResult = await index.query(searchParams);

    // Filter results by minimum score threshold
    let filteredMatches = searchResult.matches.filter(
      (match) => (match.score ?? 0) >= minScore,
    );

    // Deduplicate results if requested
    if (deduplicate && filteredMatches.length > 1) {
      const uniqueMatches = [];
      const processedIds = new Set<string>();

      for (const match of filteredMatches) {
        if (!processedIds.has(match.id)) {
          uniqueMatches.push(match);
          processedIds.add(match.id);

          // Find and mark similar matches for exclusion
          for (const otherMatch of filteredMatches) {
            if (
              !processedIds.has(otherMatch.id) &&
              match.id !== otherMatch.id &&
              cosineSimilarity(match.values ?? [], otherMatch.values ?? []) >=
                deduplicationThreshold
            ) {
              processedIds.add(otherMatch.id);
            }
          }
        }
      }
      filteredMatches = uniqueMatches;
    }
    // Filter metadata fields if specified, otherwise return all metadata
    if (fetchMetadataFields && fetchMetadataFields.length > 0) {
      filteredMatches = filteredMatches.map((match) => {
        if (!match.metadata) return match;
        const metadata = Object.fromEntries(
          Object.entries(match.metadata).filter(([key]) =>
            _.includes(fetchMetadataFields, key),
          ),
        );
        return { ...match, metadata };
      });
    }

    // Calculate search duration
    const endTime = performance.now();
    const searchDuration = endTime - startTime;

    // Save results to cache if caching is enabled
    if (cacheResults) {
      // Cache expires in 1 hour
      const expiresAt = now.add(1, "hour");

      await supabase.from("search_cache").upsert(
        {
          cache_key: cacheKey,
          results: JSON.stringify(filteredMatches),
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "cache_key" },
      );
    }

    return {
      results: filteredMatches,
      source: "pinecone",
      took: searchDuration,
    };
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Vector search failed: ${(error as Error).message}`,
      cause: error,
    });
  }
}
