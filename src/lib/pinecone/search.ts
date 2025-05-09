import _ from "lodash";

import { getIndex } from "./client";
import { embedText } from "./embeddings";

export async function searchSimilar(
  query: string,
  options?: {
    topK?: number;
    minScore?: number;
    filter?: Record<string, unknown>;
  },
) {
  const { topK = 5, minScore = 0.4, filter } = options ?? {};

  const queryEmbedding = await embedText(query);
  const index = await getIndex();

  const result = await index.query({
    vector: queryEmbedding,
    topK,
    filter,
    includeMetadata: true,
  });

  return _.orderBy(
    result.matches.filter((match) => (match.score ?? 0) >= minScore),
    [(match) => match.score ?? 0],
    ["desc"],
  );
}
