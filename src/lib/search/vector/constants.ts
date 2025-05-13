import type { Except } from "type-fest";

import type { VectorSearchOptions } from "./schemas";

export const DEFAULT_SEARCH_TOP_K = 10;
export const DEFAULT_SEARCH_MIN_SCORE = 0.4;
export const DEFAULT_SEARCH_INCLUDE_VALUES = false;
export const DEFAULT_SEARCH_INCLUDE_METADATA = false;
export const DEFAULT_SEARCH_HYBRID_SEARCH = false;
export const DEFAULT_SEARCH_HYBRID_ALPHA = 0.5;
export const DEFAULT_SEARCH_CACHE_RESULTS = false;
export const DEFAULT_SEARCH_DEDUPLICATE = false;
export const DEFAULT_SEARCH_DEDUPLICATION_THRESHOLD = 0.95;

export const DEFAULT_SEARCH_OPTIONS = {
  topK: DEFAULT_SEARCH_TOP_K,
  minScore: DEFAULT_SEARCH_MIN_SCORE,
  includeValues: DEFAULT_SEARCH_INCLUDE_VALUES,
  includeMetadata: DEFAULT_SEARCH_INCLUDE_METADATA,
  hybridSearch: DEFAULT_SEARCH_HYBRID_SEARCH,
  hybridAlpha: DEFAULT_SEARCH_HYBRID_ALPHA,
  cacheResults: DEFAULT_SEARCH_CACHE_RESULTS,
  deduplicate: DEFAULT_SEARCH_DEDUPLICATE,
  deduplicationThreshold: DEFAULT_SEARCH_DEDUPLICATION_THRESHOLD,
} as const satisfies Except<VectorSearchOptions, "query" | "vector">;
