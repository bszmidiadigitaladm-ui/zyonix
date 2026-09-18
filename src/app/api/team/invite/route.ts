import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitResponse } from "@/lib/rate-limit";

const bodySchema = z.object({ email: z.string().email() });

const INVITE_TTL_DAYS = 7;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const limited = await rateLimitResponse(`team:invite:${user.id}`, 20, 3600);
  if (limited) return limited;

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id, team_role")
    .eq("id", user.id)
    .single();

  if (!profile?.team_id || profile.team_role !== "owner") {
    return NextResponse.json({ error: "not_team_owner" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("plan_code")
    .eq("team_id", profile.team_id)
    .single();

  const [{ count: seatCount }, { data: limits }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("team_id", profile.team_id),
    subscription
      ? admin.from("plan_limits").select("max_team_seats").eq("plan_code", subscription.plan_code).single()
      : Promise.resolve({ data: null }),
  ]);

  if (limits?.max_team_seats && (seatCount ?? 0) >= limits.max_team_seats) {
    return NextResponse.json({ error: "seat_limit_reached" }, { status: 403 });
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error } = await admin
    .from("team_invites")
    .insert({
      team_id: profile.team_id,
      email: parsed.data.email,
      invited_by: user.id,
      token,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "invite_create_failed" }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  return NextResponse.json({
    invite,
    accept_url: `${siteUrl}/team/accept/${token}`,
  });
}
