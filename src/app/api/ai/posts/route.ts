import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getSubscription, resolveCreditOwnerId, isBillable } from "@/lib/auth/session";
import { getPlanLimits } from "@/lib/credits/config";
import { consumeCredit, refundCredit } from "@/lib/credits/consume";
import { generateCaption } from "@/lib/openai/text";
import { awardBadge } from "@/lib/badges/award";
import { checkRateLimit } from "@/lib/rate-limit";
import { textCostUsd } from "@/lib/ai/cost";

const bodySchema = z.object({
  template_id: z.string().uuid().optional(),
  art_generation_id: z.string().uuid().optional(),
  overlay_text: z.string().trim().max(400).optional(),
  occasion: z.string().trim().min(1).max(200),
  verse_reference: z.string().trim().max(200).optional(),
  format: z.enum(["feed", "story", "carousel"]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`ai:posts:${user.id}`, 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { template_id, art_generation_id, overlay_text, occasion, verse_reference, format } = parsed.data;

  const profile = await getProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  const subscription = await getSubscription(profile);
  if (!subscription || !isBillable(subscription)) {
    return NextResponse.json({ error: "subscription_required" }, { status: 402 });
  }

  const limits = await getPlanLimits(subscription.plan_code);

  if (format === "carousel" && !limits.allow_carousel_export) {
    return NextResponse.json({ error: "carousel_not_available_on_plan" }, { status: 403 });
  }

  if (template_id) {
    const { data: template } = await supabase
      .from("seasonal_templates")
      .select("is_exclusive")
      .eq("id", template_id)
      .maybeSingle();

    if (template?.is_exclusive && !limits.allow_seasonal_templates) {
      return NextResponse.json({ error: "template_not_available_on_plan" }, { status: 403 });
    }
  }

  // The user-scoped client only returns art this person may see (own or team), so
  // a made-up or foreign id simply resolves to no background.
  let artId: string | null = null;
  if (art_generation_id) {
    const { data: art } = await supabase
      .from("bible_art_generations")
      .select("id")
      .eq("id", art_generation_id)
      .eq("status", "completed")
      .maybeSingle();
    artId = art?.id ?? null;
  }

  const ownerId = resolveCreditOwnerId(profile);
  const { success, remaining } = await consumeCredit(ownerId, "text", 1);
  if (!success) {
    return NextResponse.json({ error: "insufficient_credits", remaining }, { status: 402 });
  }

  try {
    const captionText = await generateCaption({ occasion, verseReference: verse_reference, format });

    const admin = createAdminClient();

    const { data: row, error: insertError } = await admin
      .from("social_post_generations")
      .insert({
        user_id: user.id,
        team_id: profile.team_id,
        template_id: template_id ?? null,
        art_generation_id: artId,
        overlay_text: overlay_text ?? null,
        format,
        caption_text: captionText,
        verse_reference: verse_reference ?? null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await admin.from("ai_usage_log").insert({
      user_id: user.id,
      team_id: profile.team_id,
      plan_code: subscription.plan_code,
      feature: "post_caption",
      model: "gpt-4.1-mini",
      estimated_cost_usd: textCostUsd("post_caption"),
    });

    await awardBadge(user.id, "first_post");

    return NextResponse.json({ generation: row, credits_remaining: remaining });
  } catch (err) {
    console.error("Post caption generation failed", err);
    await refundCredit(ownerId, "text", 1);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
