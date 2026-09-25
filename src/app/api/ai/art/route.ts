import { NextResponse, after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getSubscription, resolveCreditOwnerId, isBillable } from "@/lib/auth/session";
import { getPlanLimits } from "@/lib/credits/config";
import { consumeCredit, refundCredit } from "@/lib/credits/consume";
import {
  ART_QUALITY_CHOICES,
  ART_STYLES,
  OUTPUT_FORMATS,
  buildArtPrompt,
  generateBibleArt,
} from "@/lib/openai/art";
import { uploadGeneratedImage } from "@/lib/supabase/storage";
import { awardBadge } from "@/lib/badges/award";
import { checkRateLimit } from "@/lib/rate-limit";
import { MAX_PENDING_JOBS, failArtJob, failStaleArtJobs } from "@/lib/art/jobs";
import { bibleArtCostUsd } from "@/lib/ai/cost";

const bodySchema = z
  .object({
    verse_reference: z.string().trim().max(200).optional(),
    theme: z.string().trim().max(200).optional(),
    style: z.enum(ART_STYLES),
    output_format: z.enum(OUTPUT_FORMATS),
    quality: z.enum(ART_QUALITY_CHOICES).default("medium"),
    variation_of: z.string().uuid().optional(),
  })
  .refine((v) => v.verse_reference || v.theme, {
    message: "Provide a verse reference or a theme",
  });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`ai:art:${user.id}`, 10, 60);
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
  const { verse_reference, theme, style, output_format, variation_of } = parsed.data;

  const profile = await getProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  const subscription = await getSubscription(profile);
  if (!subscription || !isBillable(subscription)) {
    return NextResponse.json({ error: "subscription_required" }, { status: 402 });
  }

  const limits = await getPlanLimits(subscription.plan_code);
  const ownerId = resolveCreditOwnerId(profile);
  const admin = createAdminClient();

  // Free up (and refund) anything a stopped function left behind, then cap how
  // many images can be in flight so a stuck retry loop cannot drain credits.
  await failStaleArtJobs(user.id, ownerId);
  const { count: pendingCount } = await admin
    .from("bible_art_generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");
  if ((pendingCount ?? 0) >= MAX_PENDING_JOBS) {
    return NextResponse.json({ error: "too_many_pending" }, { status: 429 });
  }

  // Plans with reduced-quality art keep that fixed setting; the picker only
  // applies to plans without the watermark/quality reduction.
  const quality = limits.watermark ? "low" : parsed.data.quality;

  let sourceId: string | null = null;
  if (variation_of) {
    // The user-scoped client only returns rows this person may see (own or team).
    const { data: source } = await supabase
      .from("bible_art_generations")
      .select("id")
      .eq("id", variation_of)
      .maybeSingle();
    sourceId = source?.id ?? null;
  }

  const { success, remaining } = await consumeCredit(ownerId, "image", 1);
  if (!success) {
    return NextResponse.json({ error: "insufficient_credits", remaining }, { status: 402 });
  }

  const prompt = buildArtPrompt({
    verseReference: verse_reference,
    theme,
    style,
    variation: Boolean(sourceId),
  });

  const { data: job, error: insertError } = await admin
    .from("bible_art_generations")
    .insert({
      user_id: user.id,
      team_id: profile.team_id,
      verse_reference: verse_reference ?? null,
      theme: theme ?? null,
      style,
      output_format,
      prompt_used: prompt,
      image_url: null,
      resolution: limits.max_output_resolution,
      watermarked: limits.watermark,
      status: "pending",
      quality,
      source_generation_id: sourceId,
    })
    .select()
    .single();

  if (insertError || !job) {
    console.error("Bible art job insert failed", insertError);
    await refundCredit(ownerId, "image", 1);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }

  // The image takes tens of seconds, longer than the gateway will hold a
  // response open. Answer now and finish the work after the response is sent;
  // the page polls /api/ai/art/jobs for the result.
  after(async () => {
    try {
      const { buffer } = await generateBibleArt({ prompt, format: output_format, quality });
      const imageUrl = await uploadGeneratedImage({ userId: user.id, buffer });

      const { error: updateError } = await admin
        .from("bible_art_generations")
        .update({ status: "completed", image_url: imageUrl })
        .eq("id", job.id);
      if (updateError) throw updateError;

      await admin.from("ai_usage_log").insert({
        user_id: user.id,
        team_id: profile.team_id,
        plan_code: subscription.plan_code,
        feature: "bible_art",
        model: "gpt-image-1",
        image_count: 1,
        estimated_cost_usd: bibleArtCostUsd(quality, output_format),
      });

      await awardBadge(user.id, "first_art");
    } catch (err) {
      console.error("Bible art generation failed", err);
      await failArtJob(job.id, ownerId).catch((refundErr) =>
        console.error("Bible art refund failed", refundErr),
      );
    }
  });

  return NextResponse.json({ generation: job, credits_remaining: remaining }, { status: 202 });
}
