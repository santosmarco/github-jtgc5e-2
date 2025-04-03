import type { protectedProcedure } from "./trpc";

export type AuthContext = Parameters<
  Parameters<(typeof protectedProcedure)["query"]>[0]
>[0]["ctx"];
