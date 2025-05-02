import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../supabase/database.types";

export async function getProfileHistoricalReports(
  profileId: string,
  supabaseClient: SupabaseClient<Database>,
) {}
