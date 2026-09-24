import { NextResponse, after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getSubscription, resolveCreditOwnerId, isBillable } from "@/lib/auth/session";
import { consumeCredit, refundCredit } from "@/lib/credits/consume";
import { generatePoster } from "@/lib/openai/poster";
import { uploadGeneratedImage } from "@/lib/supabase/storage";
import { checkRateLimit } from "@/lib/rate-limit";
import { MAX_PENDING_POSTERS, failPosterJob, failStalePosterJobs } from "@/lib/posters/jobs";
import { FONT_STYLES, TEMPLATE_FIELDS, getTemplate, templateInputPath } from "@/lib/templates/catalog";
import { HEX_COLOR, buildPosterPrompt } from "@/lib/templates/prompt";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const hexColor = z.string().regex(HEX_COLOR).optional();

const bodySchema = z.object({
  template: z.string().min(1).max(80),
  instructions: z.string().trim().min(1).max(600),
  fields: z.record(z.string(), z.string().trim().max(400)).default({}),
  colors: z
    .object({ background: hexColor, text: hexColor, accent: hexColor })
    .default({}),
  font: z.enum(FONT_STYLES.map((f) => f.key) as [string, ...string[]]).optional(),
});

function parseJsonField(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || !value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`ai:poster:${user.id}`, 6, 60);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse({
    template: form.get("template"),
    instructions: form.get("instructions"),
    fields: parseJsonField(form.get("fields")),
    colors: parseJsonField(form.get("colors")),
    font: form.get("font") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { instructions, colors, font } = parsed.data;

  const template = getTemplate(parsed.data.template);
  if (!template) {
    return NextResponse.json({ error: "unknown_template" }, { status: 400 });
  }

  // Keep only the details this template actually has, so stray keys never reach the prompt.
  const fields: Record<string, string> = {};
  for (const key of TEMPLATE_FIELDS) {
    const value = parsed.data.fields[key]?.trim();
    if (value && template.fields.includes(key)) fields[key] = value;
  }

  let photo: { buffer: Buffer; contentType: string } | undefined;
  const photoEntry = form.get("photo");
  if (photoEntry instanceof File && photoEntry.size > 0) {
    if (!template.photoSlot) {
      return NextResponse.json({ error: "photo_not_supported" }, { status: 400 });
    }
    if (!PHOTO_TYPES.includes(photoEntry.type) || photoEntry.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "invalid_photo" }, { status: 400 });
    }
    photo = { buffer: Buffer.from(await photoEntry.arrayBuffer()), contentType: photoEntry.type };
  }

  const profile = await getProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  const subscription = await getSubscription(profile);
  if (!subscription || !isBillable(subscription)) {
    return NextResponse.json({ error: "subscription_required" }, { status: 402 });
  }

  const ownerId = resolveCreditOwnerId(profile);
  const admin = createAdminClient();

  await failStalePosterJobs(user.id, ownerId);
  const { count: pendingCount } = await admin
    .from("poster_generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "pending");
  if ((pendingCount ?? 0) >= MAX_PENDING_POSTERS) {
    return NextResponse.json({ error: "too_many_pending" }, { status: 429 });
  }

  const { success, remaining } = await consumeCredit(ownerId, "image", 1);
  if (!success) {
    return NextResponse.json({ error: "insufficient_credits", remaining }, { status: 402 });
  }

  const prompt = buildPosterPrompt(template, {
    fields,
    instructions,
    colors,
    font: FONT_STYLES.find((f) => f.key === font)?.key,
    hasPhoto: Boolean(photo),
  });

  const options: Record<string, string> = { ...colors };
  if (font) options.font = font;

  const { data: job, error: insertError } = await admin
    .from("poster_generations")
    .insert({
      user_id: user.id,
      team_id: profile.team_id,
      template_slug: template.slug,
      fields,
      options,
      instructions,
      prompt_used: prompt,
      used_photo: Boolean(photo),
      status: "pending",
    })
    .select()
    .single();

  if (insertError || !job) {
    console.error("Poster job insert failed", insertError);
    await refundCredit(ownerId, "image", 1);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }

  // The template image is a public static file on this same site.
  const templateUrl = new URL(templateInputPath(template.slug), request.url).toString();

  // Editing takes about a minute, longer than the gateway holds a response, so
  // finish after answering; the page polls /api/ai/poster/jobs for the result.
  after(async () => {
    try {
      const templateRes = await fetch(templateUrl);
      if (!templateRes.ok) throw new Error(`Template image not found (${templateRes.status})`);
      const templateBuffer = Buffer.from(await templateRes.arrayBuffer());

      const png = await generatePoster({
        prompt,
        template: { buffer: templateBuffer, contentType: "image/jpeg" },
        photo,
      });
      const imageUrl = await uploadGeneratedImage({ userId: user.id, buffer: png });

      const { error: updateError } = await admin
        .from("poster_generations")
        .update({ status: "completed", image_url: imageUrl })
        .eq("id", job.id);
      if (updateError) throw updateError;

      await admin.from("ai_usage_log").insert({
        user_id: user.id,
        team_id: profile.team_id,
        plan_code: subscription.plan_code,
        feature: "poster",
        model: "gpt-image-1",
        image_count: 1,
      });
    } catch (err) {
      console.error("Poster generation failed", err);
      await failPosterJob(job.id, ownerId).catch((refundErr) =>
        console.error("Poster refund failed", refundErr),
      );
    }
  });

  return NextResponse.json({ generation: { id: job.id, status: job.status }, credits_remaining: remaining }, { status: 202 });
}
