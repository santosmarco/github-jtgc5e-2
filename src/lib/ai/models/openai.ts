import { openai } from "@ai-sdk/openai";

export const four_oh_mini = openai("gpt-4o-mini", {
  structuredOutputs: true,
});

export const o3_mini = openai("o3-mini", {
  structuredOutputs: true,
});

export const o3_mini_high = openai("o3-mini", {
  reasoningEffort: "high",
  structuredOutputs: true,
});

export const text_embedding_3_small = openai.embedding(
  "text-embedding-3-small",
);
