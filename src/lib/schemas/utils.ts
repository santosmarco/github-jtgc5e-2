import { z } from "zod";

export const JsonDate = z
  .string()
  .datetime()
  .or(z.date().transform((d) => d.toISOString()));
export type JsonDate = z.infer<typeof JsonDate>;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };
export const JsonValue: z.ZodLazy<
  z.ZodUnion<
    [
      z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>,
      z.ZodArray<z.ZodType<JsonValue>>,
      z.ZodRecord<z.ZodString, z.ZodType<JsonValue>>,
    ]
  >
> = z.lazy(() =>
  z.union([
    z.union([z.string(), z.number(), z.boolean(), z.null()]),
    z.array(JsonValue),
    z.record(JsonValue),
  ]),
);

export const JsonPrimitive = JsonValue.schema.options[0];
export type JsonPrimitive = z.infer<typeof JsonPrimitive>;

export const JsonArray = JsonValue.schema.options[1];
export type JsonArray = z.infer<typeof JsonArray>;

export const JsonObject = JsonValue.schema.options[2];
export type JsonObject = z.infer<typeof JsonObject>;
