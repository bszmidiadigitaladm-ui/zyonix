import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { activateSubscriptionForProfile } from "@/lib/hotmart/activation";
import type { PlanCode } from "@/lib/config";

const reason = z.string().trim().min(5).max(500);
const bodySchema = z.discriminatedUnion("action", [
  // The buyer signed up with a different email than they paid with: attach the purchase to that account.
  z.object({ action: z.literal("attach"), reason, email: z.string().trim().toLowerCase().email() }),
  z.object({ action: z.literal("delete"), reason }),
]);

export async function POST(request: Request, { params }: RouteContext<"/api/admin/pending/[id]">) {
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
  const input = parsed.data;

  const admin = createAdminClient();
  const { data: pending } = await admin.from("pending_activations").select("*").eq("id", id).maybeSingle();
  if (!pending) return NextResponse.json({ error: "Pending purchase not found" }, { status: 404 });

  try {
    if (input.action === "delete") {
      await logAdminAction(auth.ctx, {
        action: "pending.delete",
        targetEmail: pending.email,
        reason: input.reason,
        details: { plan: pending.plan_code, transaction: pending.transaction_code },
      });
      await admin.from("pending_activations").delete().eq("id", id);
      return NextResponse.json({ ok: true, message: "Pending purchase removed" });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, full_name, team_id")
      .eq("email", input.email)
      .maybeSingle();
    if (!profile) return NextResponse.json({ error: "No account with that email yet" }, { status: 404 });

    await logAdminAction(auth.ctx, {
      action: "pending.attach",
      targetUserId: profile.id,
      targetEmail: profile.email,
      reason: input.reason,
      details: { paid_with: pending.email, plan: pending.plan_code, transaction: pending.transaction_code },
    });
    await activateSubscriptionForProfile(admin, {
      profile,
      planCode: pending.plan_code as PlanCode,
      isAnnual: pending.is_annual,
      transactionCode: pending.transaction_code,
      subscriberCode: pending.subscriber_code,
    });
    await admin.from("pending_activations").delete().eq("id", id);
    return NextResponse.json({ ok: true, message: `Plan activated for ${profile.email}` });
  } catch (err) {
    console.error("Admin pending action failed", err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
