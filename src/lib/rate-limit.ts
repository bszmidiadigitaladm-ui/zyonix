import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limit backed by the check_rate_limit Postgres RPC (row-locked,
 * race-safe — see 0035_rate_limits.sql). Fails open on infrastructure errors so a
 * bug in this defensive layer never blocks legitimate requests.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Rate limit check failed", error);
    return true;
  }

  return data;
}
