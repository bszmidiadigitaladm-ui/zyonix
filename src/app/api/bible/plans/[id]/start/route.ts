import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: RouteContext<"/api/bible/plans/[id]/start">) {
  const { id: planId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const limited = await rateLimitResponse(`bible:plan-start:${user.id}`, 30, 3600);
  if (limited) return limited;

  const { data: plan } = await supabase.from("reading_plans").select("id").eq("id", planId).maybeSingle();
  if (!plan) {
    return NextResponse.json({ error: "plan_not_found" }, { status: 404 });
  }

  // Only creates a fresh enrollment (current_day: 1) the first time —
  // ignoreDuplicates means an existing enrollment's current_day is left
  // untouched, so "continue" never resets progress back to day 1.
  await supabase
    .from("user_reading_plans")
    .upsert(
      { user_id: user.id, plan_id: planId },
      { onConflict: "user_id,plan_id", ignoreDuplicates: true },
    );

  const { data: userPlan } = await supabase
    .from("user_reading_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("plan_id", planId)
    .single();

  const { data: day } = await supabase
    .from("reading_plan_days")
    .select("*")
    .eq("plan_id", planId)
    .eq("day_number", userPlan!.current_day)
    .maybeSingle();

  return NextResponse.json({ userPlan, day });
}
