import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.discriminatedUnion("action", [
  // Reading a person's message is the most sensitive thing this panel does:
  // it is limited to the single flagged message, needs a reason, and is logged.
  z.object({ action: z.literal("reveal"), reason: z.string().trim().min(5).max(500) }),
  z.object({ action: z.literal("mark_reviewed") }),
]);

export async function POST(request: Request, { params }: RouteContext<"/api/admin/crisis/[id]">) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: flag } = await admin.from("crisis_flags").select("*").eq("id", id).maybeSingle();
  if (!flag) return NextResponse.json({ error: "Flag not found" }, { status: 404 });

  try {
    if (parsed.data.action === "reveal") {
      const { data: profile } = await admin.from("profiles").select("email").eq("id", flag.user_id).maybeSingle();
      await logAdminAction(auth.ctx, {
        action: "crisis.reveal_message",
        targetUserId: flag.user_id,
        targetEmail: profile?.email ?? null,
        reason: parsed.data.reason,
        details: { flag_id: flag.id, message_id: flag.message_id },
      });
      const { data: message } = await admin
        .from("spiritual_chat_messages")
        .select("content, created_at")
        .eq("id", flag.message_id)
        .maybeSingle();
      if (!message) return NextResponse.json({ error: "Message no longer exists" }, { status: 404 });
      return NextResponse.json({ ok: true, content: message.content, created_at: message.created_at });
    }

    await logAdminAction(auth.ctx, {
      action: "crisis.mark_reviewed",
      targetUserId: flag.user_id,
      details: { flag_id: flag.id },
    });
    const { error } = await admin
      .from("crisis_flags")
      .update({ reviewed: true, reviewed_by: auth.ctx.userId, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: "Could not update the flag" }, { status: 500 });
    return NextResponse.json({ ok: true, message: "Marked as reviewed" });
  } catch (err) {
    console.error("Admin crisis action failed", err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
