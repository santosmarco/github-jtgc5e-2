import type { SupabaseServerClient } from "~/lib/supabase/server";

export class BackendService {
  constructor(readonly supabase: SupabaseServerClient) {}
}
