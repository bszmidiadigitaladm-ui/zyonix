import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getSubscription, resolveCreditOwnerId, isBillable } from "@/lib/auth/session";
import { consumeCredit, refundCredit } from "@/lib/credits/consume";
import { createVideoGeneration } from "@/lib/video/runway";

const bodySchema = z.object({
  prompt: z.string().trim().min(1).max(1000),
  duration_seconds: z.number().int().min(2).max(10),
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
  const { prompt, duration_seconds } = parsed.data;

  const profile = await getProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  const subscription = await getSubscription(profile);
  if (!subscription || !isBillable(subscription)) {
    return NextResponse.json({ error: "subscription_required" }, { status: 402 });
  }

  const ownerId = resolveCreditOwnerId(profile);
  // Credits are charged 1-per-second so cost scales with what's actually
  // billed by Runway (gen4.5 is $0.12/sec) instead of a flat rate that lets
  // someone pick the max 10s duration for the same price as 2s.
  const { success, remaining } = await consumeCredit(ownerId, "video", duration_seconds);
  if (!success) {
    return NextResponse.json({ error: "insufficient_credits", remaining }, { status: 402 });
  }

  const admin = createAdminClient();

  try {
    const { jobId } = await createVideoGeneration({ prompt, durationSeconds: duration_seconds });

    const { data: row, error: insertError } = await admin
      .from("video_generations")
      .insert({
        user_id: user.id,
        team_id: profile.team_id,
        prompt,
        duration_seconds,
        status: "processing",
        runway_job_id: jobId,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ generation: row, credits_remaining: remaining });
  } catch (err) {
    console.error("Video generation job creation failed", err);
    await refundCredit(ownerId, "video", duration_seconds);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}
