import { openai } from "@ai-sdk/openai";

export const four_oh_mini = openai("gpt-4o-mini", {
  structuredOutputs: true,
});

export const four_point_one = openai("gpt-4.1", {
  structuredOutputs: true,
});

export const four_point_one_mini = openai("gpt-4.1-mini", {
  structuredOutputs: true,
});

export const four_point_one_mini_chat = openai.chat("gpt-4.1-mini");

export const four_point_one_nano = openai("gpt-4.1-nano", {
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
