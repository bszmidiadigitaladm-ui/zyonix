import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getSubscription, resolveCreditOwnerId, isBillable } from "@/lib/auth/session";
import { consumeCredit, refundCredit } from "@/lib/credits/consume";
import { generateMessageOutline } from "@/lib/openai/text";

const bodySchema = z.object({
  topic: z.string().trim().min(1).max(300),
  audience: z.string().trim().min(1).max(200),
  duration_minutes: z.number().int().min(5).max(120),
  style: z.string().trim().min(1).max(100),
  tone: z.string().trim().min(1).max(100),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { topic, audience, duration_minutes, style, tone } = parsed.data;

  const profile = await getProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  const subscription = await getSubscription(profile);
  if (!subscription || !isBillable(subscription)) {
    return NextResponse.json({ error: "subscription_required" }, { status: 402 });
  }

  const ownerId = resolveCreditOwnerId(profile);
  const { success, remaining } = await consumeCredit(ownerId, "text", 1);
  if (!success) {
    return NextResponse.json({ error: "insufficient_credits", remaining }, { status: 402 });
  }

  try {
    const outline = await generateMessageOutline({
      topic,
      audience,
      durationMinutes: duration_minutes,
      style,
      tone,
    });

    const admin = createAdminClient();

    const { data: row, error: insertError } = await admin
      .from("message_outlines")
      .insert({
        user_id: user.id,
        team_id: profile.team_id,
        topic,
        audience,
        duration_minutes,
        style,
        tone,
        outline: outline as unknown as Record<string, unknown>,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await admin.from("ai_usage_log").insert({
      user_id: user.id,
      team_id: profile.team_id,
      plan_code: subscription.plan_code,
      feature: "message_outline",
      model: "gpt-4.1-mini",
    });

    return NextResponse.json({ outline: row, credits_remaining: remaining });
  } catch (err) {
    console.error("Message outline generation failed", err);
    await refundCredit(ownerId, "text", 1);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
