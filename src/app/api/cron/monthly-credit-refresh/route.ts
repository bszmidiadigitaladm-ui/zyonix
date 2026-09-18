import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

// Credits always refresh monthly, even on an annual Hotmart subscription
// (billing_cycle='annual') whose own renewal webhook only fires once a
// year — this is the thing that actually advances credits_cycle_end in
// between. Run this once a day; it only acts on subscriptions whose
// credits_cycle_end has actually arrived, so running more often than
// needed is harmless.
export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: due } = await admin
    .from("subscriptions")
    .select("id, credits_cycle_end")
    .eq("status", "active")
    .lte("credits_cycle_end", now.toISOString());

  let refreshed = 0;
  let failed = 0;

  for (const sub of due ?? []) {
    // Advance from the scheduled date, not "now", so a cron that runs a few
    // hours late doesn't shift everyone's refresh day over time.
    const cycleStart = sub.credits_cycle_end ? new Date(sub.credits_cycle_end) : now;
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);

    const { error } = await admin.rpc("reset_credits", {
      p_subscription_id: sub.id,
      p_cycle_start: cycleStart.toISOString(),
      p_cycle_end: cycleEnd.toISOString(),
    });

    if (error) {
      console.error("Monthly credit refresh failed for subscription", sub.id, error);
      failed++;
      continue;
    }

    await admin
      .from("subscriptions")
      .update({ credits_cycle_end: cycleEnd.toISOString() })
      .eq("id", sub.id);
    refreshed++;
  }

  return NextResponse.json({ refreshed, failed });
}
