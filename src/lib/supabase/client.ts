"use client";

import { createBrowserClient } from "@supabase/ssr";

import { env } from "~/env";

import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: "pkce",
      },
    },
  );
}

export type SupabaseBrowserClient = ReturnType<typeof createClient>;
