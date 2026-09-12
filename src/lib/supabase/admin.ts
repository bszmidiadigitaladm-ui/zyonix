import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Service-role client — bypasses RLS entirely. Server-only: never import this
// file from a "use client" component or expose SUPABASE_SERVICE_ROLE_KEY publicly.
// Used exclusively by: Stripe webhook handler, cron routes, and safety-critical
// writes (e.g. crisis_flags) that must succeed regardless of the caller's RLS grants.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
