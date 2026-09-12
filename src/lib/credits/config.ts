import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanLimits } from "@/lib/types/database.types";
import type { PlanCode } from "@/lib/config";

// plan_limits is the one tunable source for credit quantities/caps (see
// supabase/migrations/0004_plans_and_limits.sql) — this module is the one place
// the app reads it, cached briefly so a config tweak in the DB takes effect
// within a minute without a redeploy.
let cache: { data: Record<string, PlanLimits>; expiresAt: number } | null = null;
const TTL_MS = 60_000;

async function getAllPlanLimits(): Promise<Record<string, PlanLimits>> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("plan_limits").select("*");
  if (error) throw error;

  const byCode = Object.fromEntries((data ?? []).map((row) => [row.plan_code, row]));
  cache = { data: byCode, expiresAt: Date.now() + TTL_MS };
  return byCode;
}

export async function getPlanLimits(planCode: PlanCode): Promise<PlanLimits> {
  const all = await getAllPlanLimits();
  const limits = all[planCode];
  if (!limits) throw new Error(`No plan_limits row for plan "${planCode}"`);
  return limits;
}
