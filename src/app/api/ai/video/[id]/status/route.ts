import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundCredit } from "@/lib/credits/consume";
import { getVideoGenerationStatus } from "@/lib/video/runway";
import { uploadGeneratedFile } from "@/lib/supabase/storage";
import { awardBadge } from "@/lib/badges/award";

export async function GET(_request: Request, { params }: RouteContext<"/api/ai/video/[id]/status">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: row } = await supabase.from("video_generations").select("*").eq("id", id).single();
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (row.status !== "processing" || !row.runway_job_id) {
    return NextResponse.json({ generation: row });
  }

  const admin = createAdminClient();
  const ownerId = row.team_id ?? row.user_id;

  try {
    const jobStatus = await getVideoGenerationStatus(row.runway_job_id);

    if (jobStatus.status === "processing") {
      return NextResponse.json({ generation: row });
    }

    if (jobStatus.status === "failed") {
      const { data: updated } = await admin
        .from("video_generations")
        .update({
          status: "failed",
          error_message: jobStatus.errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      await refundCredit(ownerId, "video", 1);
      return NextResponse.json({ generation: updated ?? row });
    }

    // Succeeded: Runway's result URL expires in 24-48h, so re-host it in our
    // own storage before persisting the row.
    const videoRes = await fetch(jobStatus.videoUrl);
    const buffer = Buffer.from(await videoRes.arrayBuffer());
    const videoUrl = await uploadGeneratedFile({
      userId: row.user_id,
      buffer,
      contentType: "video/mp4",
      extension: "mp4",
    });

    const { data: updated, error: updateError } = await admin
      .from("video_generations")
      .update({
        status: "succeeded",
        video_url: videoUrl,
        completed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    const { data: subscription } = await admin
      .from("subscriptions")
      .select("plan_code")
      .eq(row.team_id ? "team_id" : "owner_id", ownerId)
      .maybeSingle();

    await admin.from("ai_usage_log").insert({
      user_id: row.user_id,
      team_id: row.team_id,
      plan_code: subscription?.plan_code ?? "starter",
      feature: "video",
      model: "runway-gen4.5",
    });

    await awardBadge(row.user_id, "first_video");

    return NextResponse.json({ generation: updated });
  } catch (err) {
    console.error("Video generation status check failed", err);
    return NextResponse.json({ generation: row });
  }
}
