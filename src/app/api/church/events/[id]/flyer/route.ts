import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeamOwnerId, getProfile, getSubscription, isBillable } from "@/lib/auth/session";
import { consumeCredit, refundCredit } from "@/lib/credits/consume";
import { buildEventFlyerPrompt, createEventFlyerImage } from "@/lib/video/runway";
import { uploadGeneratedImage } from "@/lib/supabase/storage";
import { checkRateLimit } from "@/lib/rate-limit";
import { eventFlyerCostUsd } from "@/lib/ai/cost";

export async function POST(_request: Request, { params }: RouteContext<"/api/church/events/[id]/flyer">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`church:flyer:${user.id}`, 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const teamId = await requireTeamOwnerId(supabase, user.id);
  if (!teamId) {
    return NextResponse.json({ error: "not_team_owner" }, { status: 403 });
  }

  const profile = await getProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  const subscription = await getSubscription(profile);
  if (!subscription || !isBillable(subscription)) {
    return NextResponse.json({ error: "subscription_required" }, { status: 402 });
  }

  const { data: event } = await supabase
    .from("church_events")
    .select("*")
    .eq("id", id)
    .eq("team_id", teamId)
    .single();

  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { success, remaining } = await consumeCredit(teamId, "image", 1);
  if (!success) {
    return NextResponse.json({ error: "insufficient_credits", remaining }, { status: 402 });
  }

  const admin = createAdminClient();

  try {
    const prompt = buildEventFlyerPrompt({ title: event.title, description: event.description });
    const { imageUrl: tempUrl } = await createEventFlyerImage({ prompt });

    // Runway's result URL expires in 24-48h, so re-host it in our own storage
    // before persisting it, same as the video generation status route.
    const imageRes = await fetch(tempUrl);
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    const flyerImageUrl = await uploadGeneratedImage({ userId: user.id, buffer });

    const { data: updated, error: updateError } = await admin
      .from("church_events")
      .update({ flyer_image_url: flyerImageUrl })
      .eq("id", id)
      .eq("team_id", teamId)
      .select()
      .single();

    if (updateError) throw updateError;

    await admin.from("ai_usage_log").insert({
      user_id: user.id,
      team_id: teamId,
      plan_code: subscription.plan_code,
      feature: "event_flyer",
      model: "runway-gen4_image",
      image_count: 1,
      estimated_cost_usd: eventFlyerCostUsd(),
    });

    return NextResponse.json({ event: updated, credits_remaining: remaining });
  } catch (err) {
    console.error("Event flyer generation failed", err);
    await refundCredit(teamId, "image", 1);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
