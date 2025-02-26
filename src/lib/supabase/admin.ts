"server-only";

import { createBrowserClient } from "@supabase/ssr";

import { env } from "~/env";

import type { Database } from "./database.types";

export async function __dangerouslyCreateAdminClient__() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        flowType: "pkce",
      },
    },
  );
}

export type SupabaseAdminClient = Awaited<
  ReturnType<typeof __dangerouslyCreateAdminClient__>
>;
