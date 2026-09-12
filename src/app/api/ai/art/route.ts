import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getSubscription, resolveCreditOwnerId, isBillable } from "@/lib/auth/session";
import { getPlanLimits } from "@/lib/credits/config";
import { consumeCredit, refundCredit } from "@/lib/credits/consume";
import { ART_STYLES, OUTPUT_FORMATS, buildArtPrompt, generateBibleArt } from "@/lib/openai/art";
import { uploadGeneratedImage } from "@/lib/supabase/storage";

const bodySchema = z
  .object({
    verse_reference: z.string().trim().max(200).optional(),
    theme: z.string().trim().max(200).optional(),
    style: z.enum(ART_STYLES),
    output_format: z.enum(OUTPUT_FORMATS),
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

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { verse_reference, theme, style, output_format } = parsed.data;

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

  const { success, remaining } = await consumeCredit(ownerId, "image", 1);
  if (!success) {
    return NextResponse.json({ error: "insufficient_credits", remaining }, { status: 402 });
  }

  try {
    const prompt = buildArtPrompt({ verseReference: verse_reference, theme, style });
    const quality = limits.watermark ? "low" : "high";
    const { buffer } = await generateBibleArt({ prompt, format: output_format, quality });
    const imageUrl = await uploadGeneratedImage({ userId: user.id, buffer });

    const admin = createAdminClient();

    const { data: row, error: insertError } = await admin
      .from("bible_art_generations")
      .insert({
        user_id: user.id,
        team_id: profile.team_id,
        verse_reference: verse_reference ?? null,
        theme: theme ?? null,
        style,
        output_format,
        prompt_used: prompt,
        image_url: imageUrl,
        resolution: limits.max_output_resolution,
        watermarked: limits.watermark,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await admin.from("ai_usage_log").insert({
      user_id: user.id,
      team_id: profile.team_id,
      plan_code: subscription.plan_code,
      feature: "bible_art",
      model: "gpt-image-1",
      image_count: 1,
    });

    return NextResponse.json({ generation: row, credits_remaining: remaining });
  } catch (err) {
    console.error("Bible art generation failed", err);
    await refundCredit(ownerId, "image", 1);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
