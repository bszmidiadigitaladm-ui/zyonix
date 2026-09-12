import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSubscription, resolveCreditOwnerId, isBillable } from "@/lib/auth/session";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const profile = await getProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  const subscription = await getSubscription(profile);
  if (!subscription) {
    return NextResponse.json({ subscription: null, credits: null });
  }

  const ownerId = resolveCreditOwnerId(profile);
  const { data: credits } = await supabase
    .from("credits_balance")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();

  return NextResponse.json({
    subscription,
    credits,
    billable: isBillable(subscription),
  });
}
