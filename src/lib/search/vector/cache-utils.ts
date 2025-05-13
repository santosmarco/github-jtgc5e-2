import _ from "lodash";

import type {
  VectorSearchOptions
} from "~/lib/search/vector/schemas";

export function getCacheKey(
  options: Pick<
    VectorSearchOptions,
    | "query"
    | "topK"
    | "minScore"
    | "namespace"
    | "filter"
    | "hybridSearch"
    | "hybridAlpha"
  >,
) {
  const {
    query,
    topK,
    minScore,
    namespace,
    filter,
    hybridSearch,
    hybridAlpha,
  } = options;

  const normalizedQuery = _.deburr(query).toLowerCase();

  return `vector_search:${normalizedQuery}:${topK}:${minScore}:${namespace ?? "(default)"}:${JSON.stringify(
    filter ?? null,
  )}:${hybridSearch}:${hybridAlpha}`;
}
